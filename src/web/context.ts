import type { DeadlineDuration, RequestDeadline } from "../lifetime/deadline.ts";
import type { DeferredWorkRegistrar } from "../lifetime/deferred.ts";
import { DeferredWorkUnavailableError, ScopeClosedError } from "../lifetime/errors.ts";
import type { DeliveryContext, RequestLifetime } from "../lifetime/request-lifetime.ts";
import type { LifetimeScope, RequestScope } from "../lifetime/scope.ts";
import type { OwnedTask } from "../lifetime/task.ts";
import type { NeloContext } from "./types.ts";

export class RequestContext implements NeloContext {
  readonly #scope: RequestScope;
  readonly #lifetime: RequestLifetime;
  readonly #deferredWork?: DeferredWorkRegistrar;
  readonly params: Readonly<Record<string, string>>;
  readonly delivery: DeliveryContext;

  constructor(
    readonly req: Request,
    scope: RequestScope,
    lifetime: RequestLifetime,
    params: Readonly<Record<string, string>>,
    deferredWork?: DeferredWorkRegistrar,
  ) {
    this.#scope = scope;
    this.#lifetime = lifetime;
    this.#deferredWork = deferredWork;
    this.delivery = lifetime.delivery;
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

  forkScope<T>(
    name: string,
    operation: (scope: LifetimeScope) => T | PromiseLike<T>,
  ): OwnedTask<T> {
    return this.#scope.forkScope(name, operation);
  }

  deadline(duration: DeadlineDuration): RequestDeadline {
    return this.#scope.deadline(duration);
  }

  defer(
    name: string,
    operation: (signal: AbortSignal) => unknown | PromiseLike<unknown>,
  ): void {
    if (this.#scope.state !== "open") throw new ScopeClosedError("defer work");
    if (this.#deferredWork === undefined) throw new DeferredWorkUnavailableError();
    const task = this.#deferredWork.defer(this.#lifetime.deferredOwner, name, operation);
    this.#lifetime.trackDeferred(task);
  }

  use<T>(
    name: string,
    acquire: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): Promise<T> {
    return this.#scope.use(name, acquire, cleanup);
  }
}
