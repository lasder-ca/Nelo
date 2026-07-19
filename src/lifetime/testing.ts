import type { CancellationReason } from "./cancellation.ts";
import { LifetimeScope, type LifetimeScopeSnapshot } from "./scope.ts";

export class TestScopeHarness {
  readonly root: LifetimeScope = new LifetimeScope({ name: "test" });
  readonly cleanupOrder: string[] = [];

  createChild(name: string): LifetimeScope {
    return this.root.createChild(name);
  }

  cancel(reason: CancellationReason = { type: "manual" }): void {
    this.root.cancel(reason);
  }

  trackCleanup(name: string): void {
    this.root.registerCleanup(name, () => {
      this.cleanupOrder.push(name);
    });
  }

  inspect(): LifetimeScopeSnapshot {
    return this.root.snapshot();
  }

  leakedTasks(): readonly string[] {
    return collectTasks(this.inspect())
      .filter((task) => !task.observed && !task.transferred)
      .map((task) => task.ancestry.join(" > "));
  }

  async settle(): Promise<void> {
    await this.root.close();
  }

  async assertNoOwnedWork(): Promise<void> {
    await this.settle();
    const snapshot = this.inspect();
    const active = collectTasks(snapshot).filter((task) => task.state === "running");
    if (active.length > 0 || snapshot.resourceCount > 0) {
      throw new Error("Test scope still owns unsettled work");
    }
  }
}

function collectTasks(snapshot: LifetimeScopeSnapshot): LifetimeScopeSnapshot["tasks"] {
  return [
    ...snapshot.tasks,
    ...snapshot.children.flatMap((child) => collectTasks(child)),
  ];
}
