import type { DeadlineDuration, RequestDeadline } from "../lifetime/deadline.ts";
import type { NeloRuntimeContext } from "../lifetime/deferred.ts";
import type { DeliveryContext, RequestDiagnosticsListener } from "../lifetime/request-lifetime.ts";
import type { LifetimeScope } from "../lifetime/scope.ts";
import type { OwnedTask } from "../lifetime/task.ts";

export type { NeloRuntimeContext } from "../lifetime/deferred.ts";

export interface NeloContext {
  readonly req: Request;
  readonly signal: AbortSignal;
  readonly params: Readonly<Record<string, string>>;
  readonly delivery: DeliveryContext;

  json(value: unknown, status?: number): Response;
  text(value: string, status?: number): Response;
  fork<T>(
    name: string,
    operation: (signal: AbortSignal) => T | PromiseLike<T>,
  ): OwnedTask<T>;
  forkScope<T>(
    name: string,
    operation: (scope: LifetimeScope) => T | PromiseLike<T>,
  ): OwnedTask<T>;
  deadline(duration: DeadlineDuration): RequestDeadline;
  defer(
    name: string,
    operation: (signal: AbortSignal) => unknown | PromiseLike<unknown>,
  ): void;
  use<T>(
    name: string,
    acquire: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): Promise<T>;
}

export type NeloHandler = (context: NeloContext) => Response | PromiseLike<Response>;
export type Next = () => Promise<Response>;
export type NeloMiddleware = (
  context: NeloContext,
  next: Next,
) => Response | PromiseLike<Response>;
export type NeloErrorHandler = (
  error: unknown,
  context: NeloContext,
) => Response | PromiseLike<Response>;

export interface NeloOptions {
  readonly mode?: "development" | "test" | "production";
  readonly onError?: NeloErrorHandler;
  readonly diagnostics?: RequestDiagnosticsListener;
  readonly taskSettleTimeout?: number;
}

/** Runtime-owned capabilities supplied by an adapter for one fetch execution. */
export type NeloFetchRuntime = NeloRuntimeContext;
