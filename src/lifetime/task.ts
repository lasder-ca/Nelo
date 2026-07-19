import { type CancellationReason, isCancellationAcknowledgement } from "./cancellation.ts";

export type OwnedTaskState =
  | "running"
  | "completed"
  | "failed"
  | "cancellation_acknowledged"
  | "completed_after_cancellation";

export interface TaskOwner {
  readonly name: string;
  readonly ancestry: readonly string[];
}

export interface OwnedTaskSnapshot {
  readonly name: string;
  readonly ancestry: readonly string[];
  readonly state: OwnedTaskState;
  readonly observed: boolean;
  readonly transferred: boolean;
  readonly cancellationRequested: boolean;
  readonly failure?: unknown;
}

/** An eager promise owned by one lifetime scope from the moment its operation starts. */
export class OwnedTask<T> implements PromiseLike<T> {
  readonly #controller = new AbortController();
  readonly #promise: Promise<T>;
  readonly #settled: Promise<void>;
  #state: OwnedTaskState = "running";
  #observed = false;
  #transferred = false;
  #failure: unknown;

  constructor(
    readonly name: string,
    readonly parent: TaskOwner,
    operation: (signal: AbortSignal) => T | PromiseLike<T>,
  ) {
    this.#promise = Promise.resolve()
      .then(() => operation(this.#controller.signal))
      .then(
        (value) => {
          this.#state = this.#controller.signal.aborted
            ? "completed_after_cancellation"
            : "completed";
          return value;
        },
        (error: unknown) => {
          if (
            this.#controller.signal.aborted &&
            isCancellationAcknowledgement(error, this.#controller.signal)
          ) {
            this.#state = "cancellation_acknowledged";
          } else {
            this.#state = "failed";
            this.#failure = error;
          }
          throw error;
        },
      );

    // The scope observes every rejection even when application code forgets to join the task.
    this.#settled = this.#promise.then(
      () => undefined,
      () => undefined,
    );
  }

  get ancestry(): readonly string[] {
    return [...this.parent.ancestry, this.name];
  }

  get observed(): boolean {
    return this.#observed;
  }

  get transferred(): boolean {
    return this.#transferred;
  }

  get state(): OwnedTaskState {
    return this.#state;
  }

  get failure(): unknown {
    return this.#failure;
  }

  get settled(): Promise<void> {
    return this.#settled;
  }

  join(): Promise<T> {
    this.#observed = true;
    return this.#promise;
  }

  cancel(reason: CancellationReason): void {
    this.#observed = true;
    this.#controller.abort(reason);
  }

  cancelFromParent(reason: CancellationReason): void {
    this.#controller.abort(reason);
  }

  snapshot(): OwnedTaskSnapshot {
    return {
      name: this.name,
      ancestry: this.ancestry,
      state: this.#state,
      observed: this.#observed,
      transferred: this.#transferred,
      cancellationRequested: this.#controller.signal.aborted,
      ...(this.#state === "failed" ? { failure: this.#failure } : {}),
    };
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    this.#observed = true;
    return this.#promise.then(onfulfilled, onrejected);
  }
}
