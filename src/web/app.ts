import { diagnosticCode, InvalidResponseError } from "../lifetime/errors.ts";
import { ownResponseDelivery, RequestLifetime } from "../lifetime/request-lifetime.ts";
import { MalformedPathError } from "./errors.ts";
import { RequestContext } from "./context.ts";
import { runMiddleware } from "./middleware.ts";
import { Router } from "./router.ts";
import type {
  NeloContext,
  NeloErrorHandler,
  NeloHandler,
  NeloMiddleware,
  NeloOptions,
} from "./types.ts";

type RouteChain = [...middleware: NeloMiddleware[], handler: NeloHandler];

export class Nelo {
  readonly #router = new Router();
  readonly #middleware: NeloMiddleware[] = [];
  readonly #mode: NonNullable<NeloOptions["mode"]>;
  readonly #onError: NeloErrorHandler;
  readonly #diagnostics?: NeloOptions["diagnostics"];
  readonly #taskSettleTimeout: number;

  constructor(options: NeloOptions = {}) {
    this.#mode = options.mode ?? "production";
    this.#onError = options.onError ?? ((error) => this.#defaultErrorHandler(error));
    this.#diagnostics = options.diagnostics;
    this.#taskSettleTimeout = options.taskSettleTimeout ?? 1_000;
  }

  use(middleware: NeloMiddleware): this {
    this.#middleware.push(middleware);
    return this;
  }

  on(method: string, path: string, ...chain: RouteChain): this {
    const handler = chain.at(-1) as NeloHandler | undefined;
    if (handler === undefined) throw new TypeError("A route handler is required");
    const middleware = chain.slice(0, -1) as NeloMiddleware[];
    this.#router.add(method, path, middleware, handler);
    return this;
  }

  get(path: string, ...chain: RouteChain): this {
    return this.on("GET", path, ...chain);
  }

  post(path: string, ...chain: RouteChain): this {
    return this.on("POST", path, ...chain);
  }

  put(path: string, ...chain: RouteChain): this {
    return this.on("PUT", path, ...chain);
  }

  patch(path: string, ...chain: RouteChain): this {
    return this.on("PATCH", path, ...chain);
  }

  delete(path: string, ...chain: RouteChain): this {
    return this.on("DELETE", path, ...chain);
  }

  async fetch(request: Request): Promise<Response> {
    const lifetime = new RequestLifetime(request.signal, this.#taskSettleTimeout);
    this.#diagnostics !== undefined && lifetime.subscribe(this.#diagnostics);
    const scope = lifetime.handler;
    let context: NeloContext = new RequestContext(request, scope, lifetime.delivery, {});

    try {
      const response = await scope.execute(async () => {
        const match = this.#router.match(request.method, new URL(request.url).pathname);
        let handler: NeloHandler;
        let routeMiddleware: readonly NeloMiddleware[] = [];

        if (match.type === "match") {
          context = new RequestContext(request, scope, lifetime.delivery, match.params);
          routeMiddleware = match.middleware;
          handler = match.handler;
        } else if (match.type === "method_not_allowed") {
          handler = () =>
            new Response("Method Not Allowed", {
              status: 405,
              headers: { allow: match.allowed.join(", ") },
            });
        } else {
          handler = () => new Response("Not Found", { status: 404 });
        }

        const response = await runMiddleware(
          context,
          [...this.#middleware, ...routeMiddleware],
          handler,
        );
        if (!(response instanceof Response)) throw new InvalidResponseError();
        return response;
      });
      return await ownResponseDelivery(response, lifetime);
    } catch (error) {
      try {
        const response = await this.#onError(error, context);
        const boundaryResponse = response instanceof Response
          ? response
          : this.#defaultErrorHandler(
            new InvalidResponseError(),
          );
        return await ownResponseDelivery(boundaryResponse, lifetime);
      } catch (boundaryError) {
        return await ownResponseDelivery(this.#defaultErrorHandler(boundaryError), lifetime);
      }
    }
  }

  #defaultErrorHandler(error: unknown): Response {
    const code = diagnosticCode(error);
    const status = error instanceof MalformedPathError ? 400 : 500;
    const visible = this.#mode === "production" ? `${code}: request failed` : describeError(error);
    return new Response(visible, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

function describeError(error: unknown): string {
  if (error instanceof AggregateError) {
    return [
      `${diagnosticCode(error)}: ${error.message}`,
      ...error.errors.map((nested) => nested instanceof Error ? nested.message : String(nested)),
    ].join("\n");
  }
  return error instanceof Error ? error.message : `${diagnosticCode(error)}: ${String(error)}`;
}
