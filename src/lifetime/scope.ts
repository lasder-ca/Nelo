import {
  type CancellationReason,
  cancellationReasonFromSignal,
  isCancellationAcknowledgement,
  LifetimeCancelledError,
} from "./cancellation.ts";
import { ScopeClosedError, UnjoinedTaskError } from "./errors.ts";
import { type Cleanup, ResourceStack } from "./resource-stack.ts";
import { OwnedTask, type OwnedTaskSnapshot, type TaskOwner } from "./task.ts";

export type ScopeState = "open" | "closing" | "closed";

export interface LifetimeScopeOptions {
  readonly name?: string;
  readonly parent?: LifetimeScope;
  readonly signal?: AbortSignal;
  readonly signalReason?: CancellationReason;
}

export interface LifetimeScopeSnapshot {
  readonly name: string;
  readonly ancestry: readonly string[];
  readonly state: ScopeState;
  readonly cancellationReason?: CancellationReason;
  readonly tasks: readonly OwnedTaskSnapshot[];
  readonly children: readonly LifetimeScopeSnapshot[];
  readonly resourceCount: number;
}

export class LifetimeScope implements TaskOwner {
  readonly #controller = new AbortController();
  readonly #tasks: OwnedTask<unknown>[] = [];
  readonly #children = new Set<LifetimeScope>();
  readonly #resources = new ResourceStack();
  readonly #externalSignals: Array<readonly [AbortSignal, () => void]> = [];
  #state: ScopeState = "open";
  #executed = false;
  #closing?: Promise<void>;

  readonly name: string;
  readonly parent?: LifetimeScope;

  constructor(options: LifetimeScopeOptions = {}) {
    this.name = options.name ?? "root";
    this.parent = options.parent;
    if (this.parent !== undefined) this.parent.#registerChild(this);

    if (this.parent !== undefined) {
      this.#followSignal(
        this.parent.signal,
        () => this.cancel(this.parent!.cancellationReason ?? { type: "manual" }),
      );
    }
    if (options.signal !== undefined) {
      this.#followSignal(
        options.signal,
        () =>
          this.cancel(
            options.signalReason ??
              cancellationReasonFromSignal(options.signal!, { type: "client_disconnect" }),
          ),
      );
    }
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  get cancellationReason(): CancellationReason | undefined {
    return this.signal.aborted ? this.signal.reason as CancellationReason : undefined;
  }

  get state(): ScopeState {
    return this.#state;
  }

  get ancestry(): readonly string[] {
    return this.parent === undefined ? [this.name] : [...this.parent.ancestry, this.name];
  }

  get taskSnapshots(): readonly OwnedTaskSnapshot[] {
    return this.#tasks.map((task) => task.snapshot());
  }

  fork<T>(name: string, operation: (signal: AbortSignal) => T | PromiseLike<T>): OwnedTask<T> {
    this.#assertOpen("fork a task");
    const task = new OwnedTask(name, this, operation);
    this.#tasks.push(task as OwnedTask<unknown>);
    if (this.signal.aborted) task.cancelFromParent(this.cancellationReason!);
    return task;
  }

  createChild(name: string): LifetimeScope {
    this.#assertOpen("create a child scope");
    return new LifetimeScope({ name, parent: this });
  }

  forkChild<T>(
    name: string,
    operation: (scope: LifetimeScope) => T | PromiseLike<T>,
  ): OwnedTask<T> {
    const child = this.createChild(name);
    return this.fork(name, (signal) => {
      const cancelChild = () => child.cancel(signal.reason as CancellationReason);
      if (signal.aborted) cancelChild();
      else signal.addEventListener("abort", cancelChild, { once: true });
      return child.execute(operation).finally(() => {
        signal.removeEventListener("abort", cancelChild);
      });
    });
  }

  async use<T>(
    name: string,
    acquire: (signal: AbortSignal) => T | PromiseLike<T>,
    cleanup?: (resource: T) => void | PromiseLike<void>,
  ): Promise<T> {
    this.#assertOpen("acquire a resource");
    const resource = await acquire(this.signal);
    if (this.#state !== "open" || this.signal.aborted) {
      const temporary = new ResourceStack();
      temporary.add(name, resource, cleanup);
      await temporary.dispose();
      throw new ScopeClosedError("register a resource");
    }
    return this.#resources.add(name, resource, cleanup);
  }

  registerCleanup(name: string, cleanup: Cleanup): void {
    this.#assertOpen("register a cleanup callback");
    this.#resources.addCleanup(name, cleanup);
  }

  cancel(reason: CancellationReason): void {
    if (!this.signal.aborted) this.#controller.abort(reason);
    const preserved = this.cancellationReason!;
    for (const task of this.#tasks) task.cancelFromParent(preserved);
    for (const child of this.#children) child.cancel(preserved);
  }

  async execute<T>(handler: (scope: LifetimeScope) => T | PromiseLike<T>): Promise<T> {
    if (this.#executed) throw new ScopeClosedError("execute a scope twice");
    if (this.#state !== "open") throw new ScopeClosedError("execute a closed scope");
    this.#executed = true;

    let value: T | undefined;
    let primaryFailure: unknown;
    try {
      if (this.signal.aborted) throw new LifetimeCancelledError(this.cancellationReason!);
      value = await handler(this);
      if (this.signal.aborted) throw new LifetimeCancelledError(this.cancellationReason!);
    } catch (error) {
      primaryFailure = this.signal.aborted && isCancellationAcknowledgement(error, this.signal)
        ? new LifetimeCancelledError(this.cancellationReason!)
        : error;
      this.cancel({ type: "handler_failure", error: primaryFailure });
    }

    try {
      await this.close(primaryFailure);
    } catch (error) {
      throw error;
    }
    return value as T;
  }

  close(primaryFailure?: unknown): Promise<void> {
    if (this.#closing !== undefined) return this.#closing;
    this.#state = "closing";
    this.#closing = this.#finishClose(primaryFailure);
    return this.#closing;
  }

  snapshot(): LifetimeScopeSnapshot {
    return {
      name: this.name,
      ancestry: this.ancestry,
      state: this.state,
      ...(this.cancellationReason === undefined
        ? {}
        : { cancellationReason: this.cancellationReason }),
      tasks: this.taskSnapshots,
      children: [...this.#children].map((child) => child.snapshot()),
      resourceCount: this.#resources.size,
    };
  }

  async #finishClose(primaryFailure?: unknown): Promise<void> {
    const failures: unknown[] = [];
    if (primaryFailure !== undefined) failures.push(primaryFailure);

    const unjoined = this.#tasks.filter((task) => !task.observed && !task.transferred);
    if (unjoined.length > 0) {
      const error = new UnjoinedTaskError(
        unjoined.map((task) => task.name),
        unjoined.map((task) => task.ancestry),
      );
      failures.push(error);
      this.cancel({ type: "manual", reason: error });
    }

    await Promise.all(this.#tasks.map((task) => task.settled));
    for (const task of this.#tasks) {
      if (task.state === "failed" && !failures.includes(task.failure)) failures.push(task.failure);
    }

    for (const child of this.#children) {
      try {
        await child.close();
      } catch (error) {
        appendFailure(failures, error);
      }
    }

    try {
      await this.#resources.dispose();
    } catch (error) {
      appendFailure(failures, error);
    } finally {
      this.#state = "closed";
      for (const [signal, listener] of this.#externalSignals) {
        signal.removeEventListener("abort", listener);
      }
      this.#externalSignals.length = 0;
    }

    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) {
      throw new AggregateError(failures, "Nelo lifetime scope failed", {
        cause: primaryFailure ?? failures[0],
      });
    }
  }

  #registerChild(child: LifetimeScope): void {
    this.#assertOpen("create a child scope");
    this.#children.add(child);
  }

  #followSignal(signal: AbortSignal, listener: () => void): void {
    if (signal.aborted) {
      listener();
      return;
    }
    signal.addEventListener("abort", listener, { once: true });
    this.#externalSignals.push([signal, listener]);
  }

  #assertOpen(operation: string): void {
    if (this.#state !== "open" || this.signal.aborted) throw new ScopeClosedError(operation);
  }
}

export class RequestScope extends LifetimeScope {
  constructor(options: Omit<LifetimeScopeOptions, "name"> = {}) {
    super({ ...options, name: "request" });
  }
}

export function runRequestScope<T>(
  handler: (scope: RequestScope) => T | PromiseLike<T>,
  options?: Omit<LifetimeScopeOptions, "name">,
): Promise<T> {
  const scope = new RequestScope(options);
  return scope.execute(handler) as Promise<T>;
}

function appendFailure(failures: unknown[], error: unknown): void {
  if (error instanceof AggregateError) {
    for (const nested of error.errors) {
      if (!failures.includes(nested)) failures.push(nested);
    }
  } else if (!failures.includes(error)) {
    failures.push(error);
  }
}
