import { assertEquals, assertInstanceOf, assertRejects, assertThrows } from "@std/assert";
import {
  LifetimeCancelledError,
  LifetimeScope,
  ResourceStack,
  ScopeClosedError,
  TestScopeHarness,
  UnjoinedTaskError,
} from "./mod.ts";

Deno.test("joined owned tasks settle before a scope closes", async () => {
  const scope = new LifetimeScope();
  const result = await scope.execute(async (current) => {
    const user = current.fork("user", () => ({ id: 1 }));
    return await user;
  });

  assertEquals(result, { id: 1 });
  assertEquals(scope.state, "closed");
  assertEquals(scope.taskSnapshots[0]?.state, "completed");
  assertEquals(scope.taskSnapshots[0]?.observed, true);
});

Deno.test("a joined task failure remains observable without an unhandled rejection", async () => {
  const failure = new Error("task failed");
  const scope = new LifetimeScope();
  const error = await assertRejects(() =>
    scope.execute(async (current) => {
      await current.fork("failure", () => Promise.reject(failure));
    })
  );

  assertEquals(error, failure);
  assertEquals(scope.taskSnapshots[0]?.failure, failure);
});

Deno.test("simultaneous joined task failures preserve every failure", async () => {
  const first = new Error("first task failed");
  const second = new Error("second task failed");
  const error = await assertRejects(() =>
    new LifetimeScope().execute(async (scope) => {
      const one = scope.fork("one", () => Promise.reject(first));
      const two = scope.fork("two", () => Promise.reject(second));
      await Promise.all([one, two]);
    })
  );
  assertInstanceOf(error, AggregateError);
  assertEquals(error.errors, [first, second]);
});

Deno.test("unjoined tasks produce NELO_TASK_001 and are cancelled", async () => {
  const scope = new LifetimeScope();
  let received: unknown;
  const error = await assertRejects(() =>
    scope.execute((current) => {
      current.fork("floating", (signal) =>
        waitForAbort(signal).catch((reason) => {
          received = reason;
          throw reason;
        }));
    })
  );

  assertInstanceOf(error, UnjoinedTaskError);
  assertEquals(error.code, "NELO_TASK_001");
  assertEquals(error.taskNames, ["floating"]);
  assertEquals(error.ancestry, [["root", "floating"]]);
  assertEquals((received as { type: string }).type, "manual");
});

Deno.test("the first cancellation reason is preserved across repeated requests", async () => {
  const scope = new LifetimeScope();
  let taskReason: unknown;
  const task = scope.fork("worker", (signal) =>
    waitForAbort(signal).catch((error) => {
      taskReason = error;
      throw error;
    }));
  task.cancel({ type: "deadline", deadline: 42 });
  const first = { type: "deadline", deadline: 42 } as const;
  scope.cancel(first);
  scope.cancel({ type: "server_shutdown" });

  assertEquals(scope.signal.reason, first);
  assertEquals(scope.cancellationReason, first);
  const error = await assertRejects(() => scope.execute(() => undefined));
  assertInstanceOf(error, LifetimeCancelledError);
  assertEquals(error.reason, first);
  assertEquals(taskReason, first);
});

Deno.test("closing state remains observable while joined work settles", async () => {
  const scope = new LifetimeScope();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const execution = scope.execute((current) => {
    current.fork("joined", () => blocked).join();
    return "done";
  });
  await Promise.resolve();
  await Promise.resolve();
  assertEquals(scope.state, "closing");
  release();
  assertEquals(await execution, "done");
  assertEquals(scope.state, "closed");
});

Deno.test("parent cancellation propagates to child scopes and active tasks", async () => {
  const parent = new LifetimeScope({ name: "request" });
  const child = parent.createChild("loader");
  let reason: unknown;
  const execution = child.execute(async (current) => {
    const task = current.fork("query", (signal) => waitForAbort(signal));
    try {
      await task;
    } catch (error) {
      reason = error;
      throw error;
    }
  });
  await Promise.resolve();

  parent.cancel({ type: "server_shutdown" });
  await assertRejects(() => execution);
  await assertRejects(() => parent.close());

  assertEquals((reason as { type: string }).type, "server_shutdown");
  assertEquals(child.state, "closed");
  assertEquals(child.taskSnapshots[0]?.state, "cancellation_acknowledged");
});

Deno.test("nested task diagnostics retain scope ancestry", async () => {
  const parent = new LifetimeScope({ name: "request" });
  const error = await assertRejects(() =>
    parent.execute(async (scope) => {
      const child = scope.createChild("dashboard");
      await assertRejects(() =>
        child.execute((nested) => {
          nested.fork("feed", (signal) => waitForAbort(signal));
        })
      );
    })
  );

  assertInstanceOf(error, UnjoinedTaskError);
  assertEquals(error.ancestry, [["request", "dashboard", "feed"]]);
});

Deno.test("scope state rejects tasks, child scopes, and resources after closure", async () => {
  const scope = new LifetimeScope();
  await scope.execute(() => undefined);

  assertEquals(scope.state, "closed");
  assertThrows(() => scope.fork("late", () => undefined), ScopeClosedError);
  assertThrows(() => scope.createChild("late"), ScopeClosedError);
  await assertRejects(
    () => scope.use("late", () => disposable("late", [])),
    ScopeClosedError,
  );
  await scope.close();
  assertEquals(scope.state, "closed");
  await assertRejects(() => scope.execute(() => undefined), ScopeClosedError);
});

Deno.test("resources clean up in LIFO order after success", async () => {
  const order: string[] = [];
  await new LifetimeScope().execute(async (scope) => {
    await scope.use("database", () => disposable("database", order));
    await scope.use("cache", () => disposable("cache", order));
  });
  assertEquals(order, ["cache", "database"]);
});

Deno.test("resources clean up after failure and preserve the primary error", async () => {
  const order: string[] = [];
  const primary = new Error("handler failed");
  const cleanup = new Error("cleanup failed");
  const error = await assertRejects(() =>
    new LifetimeScope().execute(async (scope) => {
      await scope.use("first", () => disposable("first", order));
      await scope.use("broken", () => ({ value: true }), () => {
        order.push("broken");
        throw cleanup;
      });
      throw primary;
    })
  );

  assertInstanceOf(error, AggregateError);
  assertEquals(error.errors, [primary, cleanup]);
  assertEquals(error.cause, primary);
  assertEquals(order, ["broken", "first"]);
});

Deno.test("multiple cleanup failures are preserved and cleanup runs once", async () => {
  const stack = new ResourceStack();
  const first = new Error("first");
  const second = new Error("second");
  const order: string[] = [];
  stack.addCleanup("first", () => {
    order.push("first");
    throw first;
  });
  stack.addCleanup("second", () => {
    order.push("second");
    throw second;
  });

  const error = await assertRejects(() => stack.dispose());
  assertInstanceOf(error, AggregateError);
  assertEquals(error.errors, [second, first]);
  assertEquals(order, ["second", "first"]);
  await stack.dispose();
  assertEquals(order, ["second", "first"]);
});

Deno.test("cancellation disposes resources after owned tasks acknowledge it", async () => {
  const controller = new AbortController();
  const events: string[] = [];
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const scope = new LifetimeScope({ signal: controller.signal });
  const execution = scope.execute(async (current) => {
    await current.use("resource", () => disposable("cleanup", events));
    const task = current.fork("worker", (signal) => {
      markStarted();
      return waitForAbort(signal).catch((error) => {
        events.push("task");
        throw error;
      });
    });
    await task;
  });
  await started;
  controller.abort();
  await assertRejects(() => execution);

  assertEquals(events, ["task", "cleanup"]);
});

Deno.test("partial acquisition failure cleans earlier resources", async () => {
  const events: string[] = [];
  const acquisition = new Error("acquisition failed");
  const error = await assertRejects(() =>
    new LifetimeScope().execute(async (scope) => {
      await scope.use("first", () => disposable("first", events));
      await scope.use("second", () => Promise.reject(acquisition));
    })
  );
  assertEquals(error, acquisition);
  assertEquals(events, ["first"]);
});

Deno.test("the test harness inspects task trees, cleanup, and full settlement", async () => {
  const harness = new TestScopeHarness();
  const child = harness.createChild("child");
  await child.execute(async (scope) => {
    await scope.fork("work", () => "done");
  });
  harness.trackCleanup("a");
  harness.trackCleanup("b");

  assertEquals(harness.leakedTasks(), []);
  assertEquals(harness.inspect().children[0]?.tasks[0]?.ancestry, ["test", "child", "work"]);
  await harness.assertNoOwnedWork();
  assertEquals(harness.cleanupOrder, ["b", "a"]);
});

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function disposable(name: string, order: string[]): Disposable {
  return {
    [Symbol.dispose]() {
      order.push(name);
    },
  };
}
