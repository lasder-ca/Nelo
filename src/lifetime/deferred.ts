import type { CancellationReason } from "./cancellation.ts";
import { DeferredTaskError, ScopeClosedError } from "./errors.ts";
import { OwnedTask, type OwnedTaskSnapshot, type TaskOwner } from "./task.ts";

export type DeferredWorkFailureListener = (error: DeferredTaskError) => void;

export interface DeferredWorkRegistrar {
  defer<T>(
    owner: TaskOwner,
    name: string,
    operation: (signal: AbortSignal) => T | PromiseLike<T>,
  ): OwnedTask<T>;
}

export interface NeloRuntimeContext {
  readonly deferredWork?: DeferredWorkRegistrar;
}

/**
 * Tracks best-effort in-process work that has been explicitly transferred out
 * of an HTTP request. The registry does not make deferred work durable.
 */
export class DeferredWorkRegistry implements DeferredWorkRegistrar {
  readonly #tasks = new Set<OwnedTask<unknown>>();
  readonly #emptyWaiters = new Set<() => void>();
  #sealed = false;

  constructor(readonly onFailure?: DeferredWorkFailureListener) {}

  get pending(): number {
    return this.#tasks.size;
  }

  get sealed(): boolean {
    return this.#sealed;
  }

  defer<T>(
    owner: TaskOwner,
    name: string,
    operation: (signal: AbortSignal) => T | PromiseLike<T>,
  ): OwnedTask<T> {
    if (this.#sealed) throw new ScopeClosedError("defer work");

    const task = new OwnedTask(name, owner, operation, { transferred: true });
    this.#tasks.add(task as OwnedTask<unknown>);
    void task.settled.then(() => this.#settle(task as OwnedTask<unknown>));
    return task;
  }

  snapshots(): readonly OwnedTaskSnapshot[] {
    return [...this.#tasks].map((task) => task.snapshot());
  }

  whenEmpty(): Promise<void> {
    if (this.#tasks.size === 0) return Promise.resolve();
    return new Promise((resolve) => this.#emptyWaiters.add(resolve));
  }

  seal(): void {
    this.#sealed = true;
  }

  abort(reason: CancellationReason): void {
    this.#sealed = true;
    for (const task of this.#tasks) task.cancelFromParent(reason);
  }

  #settle(task: OwnedTask<unknown>): void {
    if (!this.#tasks.delete(task)) return;

    if (task.state === "failed") {
      try {
        this.onFailure?.(new DeferredTaskError(task.name, task.ancestry, task.failure));
      } catch {
        // Failure observers are diagnostics only and cannot corrupt registry settlement.
      }
    }

    if (this.#tasks.size === 0) {
      for (const resolve of this.#emptyWaiters) resolve();
      this.#emptyWaiters.clear();
    }
  }
}
