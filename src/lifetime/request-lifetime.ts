import type { NeloAbortReason } from "./cancellation.ts";
import { cancellationReasonFromSignal } from "./cancellation.ts";
import type { Cleanup } from "./resource-stack.ts";
import { LifetimeScope, RequestScope } from "./scope.ts";
import type { OwnedTask } from "./task.ts";

export type RequestDiagnosticState =
  | "handling"
  | "delivering"
  | "completed"
  | "aborted"
  | "failed";

export interface CleanupFailure {
  readonly phase: "handler" | "delivery";
  readonly error: unknown;
}

export interface RequestDiagnostics {
  readonly state: RequestDiagnosticState;
  readonly handlerTasks: number;
  readonly deliveryTasks: number;
  readonly handlerResources: number;
  readonly deliveryResources: number;
  readonly abortReason?: NeloAbortReason;
  readonly cleanupFailures: readonly CleanupFailure[];
  readonly pendingHandlerTasks: number;
  readonly pendingDeliveryTasks: number;
  readonly forcedTermination: boolean;
}

export type RequestDiagnosticsListener = (diagnostics: RequestDiagnostics) => void;

export interface DeliveryContext {
  readonly signal: AbortSignal;
  readonly aborted: boolean;
  readonly reason?: NeloAbortReason;
  fork<T>(name: string, operation: (signal: AbortSignal) => T | PromiseLike<T>): OwnedTask<T>;
  use(cleanup: Cleanup): void;
  use<T>(
    name: string,
    acquire: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): Promise<T>;
}

export class DeliveryScope extends LifetimeScope implements DeliveryContext {
  get aborted(): boolean {
    return this.signal.aborted;
  }

  get reason(): NeloAbortReason | undefined {
    return this.cancellationReason;
  }

  override use(cleanup: Cleanup): void;
  override use<T>(
    name: string,
    acquire: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): Promise<T>;
  override use<T>(
    nameOrCleanup: string | Cleanup,
    acquire?: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): void | Promise<T> {
    if (typeof nameOrCleanup === "function") {
      this.registerCleanup("delivery cleanup", nameOrCleanup);
      return;
    }
    return super.use(nameOrCleanup, acquire!, cleanup);
  }
}

export class RequestLifetime {
  readonly #controller = new AbortController();
  readonly #cleanupFailures: CleanupFailure[] = [];
  readonly #listeners = new Set<RequestDiagnosticsListener>();
  readonly #history: RequestDiagnostics[] = [];
  readonly #externalSignal: AbortSignal;
  readonly #externalAbort: () => void;
  #state: RequestDiagnosticState = "handling";
  #finalizing?: Promise<void>;

  readonly handler: RequestScope;
  readonly delivery: DeliveryScope;

  constructor(signal: AbortSignal, taskSettleTimeout = 1_000) {
    this.#externalSignal = signal;
    const cleanupFailure = (phase: CleanupFailure["phase"]) => (error: unknown): void => {
      this.#cleanupFailures.push({ phase, error });
      this.#emit();
    };
    this.handler = new RequestScope({
      signal: this.#controller.signal,
      taskSettleTimeout,
      onCleanupFailure: cleanupFailure("handler"),
    });
    this.delivery = new DeliveryScope({
      name: "delivery",
      signal: this.#controller.signal,
      taskSettleTimeout,
      onCleanupFailure: cleanupFailure("delivery"),
    });
    this.#externalAbort = (): void => {
      this.abort(cancellationReasonFromSignal(signal, { type: "client_disconnect" }));
    };
    if (signal.aborted) this.#externalAbort();
    else signal.addEventListener("abort", this.#externalAbort, { once: true });
    this.#emit();
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  snapshot(): RequestDiagnostics {
    const handlerTasks = this.handler.taskSnapshots;
    const deliveryTasks = this.delivery.taskSnapshots;
    const abortReason = this.signal.aborted
      ? cancellationReasonFromSignal(this.signal, {
        type: "request_error",
        error: this.signal.reason,
      })
      : undefined;
    return Object.freeze({
      state: this.#state,
      handlerTasks: handlerTasks.length,
      deliveryTasks: deliveryTasks.length,
      handlerResources: this.handler.snapshot().resourceCount,
      deliveryResources: this.delivery.snapshot().resourceCount,
      ...(abortReason === undefined ? {} : { abortReason }),
      cleanupFailures: Object.freeze([...this.#cleanupFailures]),
      pendingHandlerTasks: handlerTasks.filter((task) => task.state === "running").length,
      pendingDeliveryTasks: deliveryTasks.filter((task) => task.state === "running").length,
      forcedTermination:
        (this.#state === "completed" || this.#state === "aborted" || this.#state === "failed") &&
        [...handlerTasks, ...deliveryTasks].some((task) => task.state === "running"),
    });
  }

  beginDelivery(): void {
    if (this.#state !== "handling") return;
    this.#state = "delivering";
    this.#emit();
  }

  abort(reason: NeloAbortReason): void {
    if (!this.signal.aborted) this.#controller.abort(reason);
    this.#emit();
  }

  finish(outcome: "completed" | "aborted" | "failed", error?: unknown): Promise<void> {
    if (this.#finalizing !== undefined) return this.#finalizing;
    if (error !== undefined && outcome === "failed") {
      this.abort({ type: "delivery_error", error });
    }
    this.#finalizing = this.#finish(outcome);
    return this.#finalizing;
  }

  subscribe(listener: RequestDiagnosticsListener): () => void {
    this.#listeners.add(listener);
    for (const diagnostics of this.#history) this.#notify(listener, diagnostics);
    return () => this.#listeners.delete(listener);
  }

  async #finish(outcome: "completed" | "aborted" | "failed"): Promise<void> {
    let failure: unknown;
    try {
      await this.delivery.close();
    } catch (error) {
      failure = error;
    }
    this.#state = failure === undefined && this.#cleanupFailures.length === 0 ? outcome : "failed";
    this.#externalSignal.removeEventListener("abort", this.#externalAbort);
    this.#emit();
    if (failure !== undefined) throw failure;
  }

  #emit(): void {
    const diagnostics = this.snapshot();
    this.#history.push(diagnostics);
    for (const listener of this.#listeners) this.#notify(listener, diagnostics);
  }

  #notify(listener: RequestDiagnosticsListener, diagnostics: RequestDiagnostics): void {
    try {
      listener(diagnostics);
    } catch {
      // Diagnostics are observational and cannot alter lifetime settlement.
    }
  }
}

const responseLifetimes = new WeakMap<Response, RequestLifetime>();
const responseDiscards = new WeakMap<Response, () => Promise<void>>();

export function responseLifetime(response: Response): RequestLifetime | undefined {
  return responseLifetimes.get(response);
}

/** Adapter hook for protocol-defined body suppression such as HEAD, 204, and 304. */
export async function discardOwnedResponseBody(response: Response): Promise<void> {
  const discard = responseDiscards.get(response);
  if (discard !== undefined) await discard();
  else await response.body?.cancel();
}

export async function ownResponseDelivery(
  response: Response,
  lifetime: RequestLifetime,
): Promise<Response> {
  lifetime.beginDelivery();
  if (response.body === null) {
    try {
      await lifetime.finish(lifetime.signal.aborted ? "aborted" : "completed");
    } catch {
      // A body-less response is already complete; failures remain in diagnostics.
    }
    responseLifetimes.set(response, lifetime);
    return response;
  }

  const reader = response.body.getReader();
  let settled = false;
  let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
  const onAbort = (): void => {
    if (settled) return;
    settled = true;
    const reason = lifetime.signal.reason as NeloAbortReason;
    bodyController?.error(reason);
    void reader.cancel(reason).then(
      () => lifetime.finish("aborted"),
      (error: unknown) => lifetime.finish("failed", error),
    ).catch(() => {
      // Cleanup failures remain available through diagnostics.
    });
  };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      bodyController = controller;
      if (lifetime.signal.aborted) onAbort();
      else lifetime.signal.addEventListener("abort", onAbort, { once: true });
    },
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (!chunk.done) {
          controller.enqueue(chunk.value);
          return;
        }
        settled = true;
        lifetime.signal.removeEventListener("abort", onAbort);
        await lifetime.finish(lifetime.signal.aborted ? "aborted" : "completed");
        controller.close();
      } catch (error) {
        settled = true;
        lifetime.signal.removeEventListener("abort", onAbort);
        try {
          await lifetime.finish("failed", error);
        } catch {
          // The body reports the primary delivery failure below.
        }
        controller.error(error);
      }
    },
    async cancel(reason) {
      if (settled) return;
      settled = true;
      lifetime.signal.removeEventListener("abort", onAbort);
      const abortReason: NeloAbortReason = isNeloAbortReason(reason)
        ? reason
        : { type: "delivery_error", error: reason };
      lifetime.abort(abortReason);
      let cancellationFailure: unknown;
      try {
        await reader.cancel(reason);
      } catch (error) {
        cancellationFailure = error;
      }
      await lifetime.finish(
        abortReason.type === "client_disconnect" ||
          abortReason.type === "server_shutdown"
          ? "aborted"
          : "failed",
        cancellationFailure,
      );
    },
  });
  const owned = new Response(body, response);
  responseLifetimes.set(owned, lifetime);
  responseDiscards.set(owned, async () => {
    if (settled) return;
    settled = true;
    lifetime.signal.removeEventListener("abort", onAbort);
    let failure: unknown;
    try {
      await reader.cancel();
    } catch (error) {
      failure = error;
    }
    await lifetime.finish(failure === undefined ? "completed" : "failed", failure);
  });
  return owned;
}

function isNeloAbortReason(value: unknown): value is NeloAbortReason {
  return typeof value === "object" && value !== null && "type" in value &&
    typeof value.type === "string";
}
