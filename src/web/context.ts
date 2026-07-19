import type { RequestScope } from "../lifetime/scope.ts";
import type { OwnedTask } from "../lifetime/task.ts";
import type { NeloContext } from "./types.ts";

export class RequestContext implements NeloContext {
  readonly #scope: RequestScope;
  readonly params: Readonly<Record<string, string>>;

  constructor(
    readonly req: Request,
    scope: RequestScope,
    params: Readonly<Record<string, string>>,
  ) {
    this.#scope = scope;
    this.params = Object.freeze({ ...params });
  }

  get signal(): AbortSignal {
    return this.#scope.signal;
  }

  json(value: unknown, status = 200): Response {
    return Response.json(value, { status });
  }

  text(value: string, status = 200): Response {
    return new Response(value, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  fork<T>(
    name: string,
    operation: (signal: AbortSignal) => T | PromiseLike<T>,
  ): OwnedTask<T> {
    return this.#scope.fork(name, operation);
  }

  use<T>(
    name: string,
    acquire: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): Promise<T> {
    return this.#scope.use(name, acquire, cleanup);
  }
}
