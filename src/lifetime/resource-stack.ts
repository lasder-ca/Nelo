import { InvalidResourceError } from "./errors.ts";

export type RequestResource = Disposable | AsyncDisposable | (Disposable & AsyncDisposable);
export type Cleanup = () => void | PromiseLike<void>;

interface ResourceEntry {
  readonly name: string;
  readonly cleanup: Cleanup;
  disposed: boolean;
}

export class ResourceStack {
  readonly #entries: ResourceEntry[] = [];
  #disposed = false;

  get size(): number {
    return this.#entries.length;
  }

  add<T>(name: string, resource: T, cleanup?: (resource: T) => void | PromiseLike<void>): T {
    if (this.#disposed) {
      throw new InvalidResourceError(name);
    }

    const dispose = cleanup === undefined
      ? resourceDisposer(name, resource)
      : () => cleanup(resource);
    this.#entries.push({ name, cleanup: dispose, disposed: false });
    return resource;
  }

  addCleanup(name: string, cleanup: Cleanup): void {
    this.add(name, undefined, cleanup);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    const failures: unknown[] = [];

    for (let index = this.#entries.length - 1; index >= 0; index--) {
      const entry = this.#entries[index]!;
      if (entry.disposed) continue;
      entry.disposed = true;
      try {
        await entry.cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    this.#entries.length = 0;

    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) {
      throw new AggregateError(failures, "NELO_RESOURCE_001: multiple resource cleanups failed");
    }
  }
}

export function resourceDisposer(name: string, resource: unknown): Cleanup {
  if (typeof resource !== "object" || resource === null) {
    throw new InvalidResourceError(name);
  }
  if (Symbol.asyncDispose in resource) {
    const disposable = resource as AsyncDisposable;
    return () => disposable[Symbol.asyncDispose]();
  }
  if (Symbol.dispose in resource) {
    const disposable = resource as Disposable;
    return () => disposable[Symbol.dispose]();
  }
  throw new InvalidResourceError(name);
}
