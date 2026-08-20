import { assertEquals, assertInstanceOf, assertMatch, assertThrows } from "@std/assert";
import { DeferredTaskError, ScopeClosedError } from "../lifetime/errors.ts";
import { DeferredWorkRegistry } from "../lifetime/deferred.ts";
import type { RequestDiagnostics } from "../lifetime/request-lifetime.ts";
import { Nelo } from "./app.ts";
import type { NeloContext } from "./types.ts";

function deferred<T = void>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

Deno.test("deferred work does not block the HTTP response and remains diagnostic", async () => {
  const release = deferred();
  const diagnostics: RequestDiagnostics[] = [];
  const registry = new DeferredWorkRegistry();
  const app = new Nelo({ diagnostics: (snapshot) => diagnostics.push(snapshot) });

  app.get("/defer", (context) => {
    context.defer("flush", async () => {
      await release.promise;
    });
    return context.text("accepted", 202);
  });

  const response = await app.fetch(new Request("https://example.test/defer"), {
    deferredWork: registry,
  });
  assertEquals(response.status, 202);
  assertEquals(await response.text(), "accepted");
  assertEquals(registry.pending, 1);
  assertEquals(diagnostics.at(-1)?.pendingDeferredTasks, 1);

  release.resolve();
  await registry.whenEmpty();
  await Promise.resolve();
  assertEquals(diagnostics.at(-1)?.pendingDeferredTasks, 0);
  assertEquals(diagnostics.at(-1)?.deferredTaskSnapshots[0]?.state, "completed");
});

Deno.test("deferred task failures are observable without changing the response", async () => {
  const failures: DeferredTaskError[] = [];
  const diagnostics: RequestDiagnostics[] = [];
  const registry = new DeferredWorkRegistry((error) => failures.push(error));
  const app = new Nelo({ diagnostics: (snapshot) => diagnostics.push(snapshot) });

  app.get("/failure", (context) => {
    context.defer("audit", () => {
      throw new Error("audit failed");
    });
    return context.text("ok");
  });

  const response = await app.fetch(new Request("https://example.test/failure"), {
    deferredWork: registry,
  });
  assertEquals(await response.text(), "ok");
  await registry.whenEmpty();
  await Promise.resolve();

  assertEquals(failures.length, 1);
  assertInstanceOf(failures[0], DeferredTaskError);
  assertEquals(failures[0]?.code, "NELO_DEFERRED_002");
  assertEquals(diagnostics.at(-1)?.deferredFailures.length, 1);
  assertEquals(diagnostics.at(-1)?.deferredTaskSnapshots[0]?.state, "failed");
});

Deno.test("defer fails explicitly when the runtime has no deferred registrar", async () => {
  const app = new Nelo({ mode: "test" });
  app.get("/unsupported", (context) => {
    context.defer("work", () => undefined);
    return context.text("unreachable");
  });

  const response = await app.fetch(new Request("https://example.test/unsupported"));
  assertEquals(response.status, 500);
  assertMatch(await response.text(), /NELO_DEFERRED_001/);
});

Deno.test("defer rejects new work after the handler scope closes", async () => {
  const registry = new DeferredWorkRegistry();
  const app = new Nelo();
  let retainedContext: NeloContext | undefined;

  app.get("/late", (context) => {
    retainedContext = context;
    return context.text("ok");
  });

  const response = await app.fetch(new Request("https://example.test/late"), {
    deferredWork: registry,
  });
  assertEquals(await response.text(), "ok");

  assertThrows(
    () => retainedContext!.defer("too-late", () => undefined),
    ScopeClosedError,
  );
  assertEquals(registry.pending, 0);
});
