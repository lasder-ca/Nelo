import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertMatch,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { Nelo } from "../../mod.ts";
import { DuplicateRouteError } from "./errors.ts";

Deno.test("Nelo fetch returns a Web Standards response", async () => {
  const app = new Nelo();
  app.get("/", (context) => context.json({ message: "Hello from Nelo" }));
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { message: "Hello from Nelo" });
});

Deno.test("router matches static and named routes with static precedence", async () => {
  const app = new Nelo();
  app.get("/users/:id", (context) => context.json({ route: "parameter", id: context.params.id }));
  app.get("/users/me", (context) => context.json({ route: "static" }));
  const fixed = await app.fetch(new Request("https://example.test/users/me"));
  const parameter = await app.fetch(new Request("https://example.test/users/42"));
  assertEquals(await fixed.json(), { route: "static" });
  assertEquals(await parameter.json(), { route: "parameter", id: "42" });
});

Deno.test("router decodes each path segment exactly once", async () => {
  const app = new Nelo();
  app.get("/files/:name", (context) => context.json(context.params));
  const response = await app.fetch(new Request("https://example.test/files/a%2520b%2Fc"));
  assertEquals(await response.json(), { name: "a%20b/c" });
});

Deno.test("malformed percent encoding returns a coded 400 response", async () => {
  const app = new Nelo({ mode: "test" });
  app.get("/:value", (context) => context.text(context.params.value!));
  const response = await app.fetch(new Request("https://example.test/%ZZ"));
  assertEquals(response.status, 400);
  assertMatch(await response.text(), /NELO_SCOPE_005/);
});

Deno.test("semantically duplicate parameter routes are rejected", () => {
  const app = new Nelo();
  app.get("/users/:id", (context) => context.text(context.params.id!));
  assertThrows(
    () => app.get("/users/:name", (context) => context.text(context.params.name!)),
    DuplicateRouteError,
  );
});

Deno.test("unmatched routes return 404 and wrong methods return 405 with Allow", async () => {
  const app = new Nelo();
  app.get("/items", (context) => context.text("items"));
  app.post("/items", (context) => context.text("created", 201));
  const missing = await app.fetch(new Request("https://example.test/missing"));
  const wrongMethod = await app.fetch(
    new Request("https://example.test/items", { method: "PATCH" }),
  );
  assertEquals(missing.status, 404);
  assertEquals(wrongMethod.status, 405);
  assertEquals(wrongMethod.headers.get("allow"), "GET, POST");
});

Deno.test("global and route middleware run in deterministic nesting order", async () => {
  const app = new Nelo();
  const events: string[] = [];
  app.use(async (_context, next) => {
    events.push("global:before");
    const response = await next();
    events.push("global:after");
    return response;
  });
  app.get(
    "/",
    async (_context, next) => {
      events.push("route:before");
      const response = await next();
      events.push("route:after");
      return response;
    },
    (context) => {
      events.push("handler");
      return context.text("ok");
    },
  );
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 200);
  assertEquals(events, [
    "global:before",
    "route:before",
    "handler",
    "route:after",
    "global:after",
  ]);
});

Deno.test("global middleware wraps framework 404 responses", async () => {
  const app = new Nelo();
  app.use(async (_context, next) => {
    const response = await next();
    response.headers.set("x-nelo", "global");
    return response;
  });
  const response = await app.fetch(new Request("https://example.test/missing"));
  assertEquals(response.status, 404);
  assertEquals(response.headers.get("x-nelo"), "global");
});

Deno.test("middleware next called twice is rejected by the error boundary", async () => {
  const app = new Nelo({ mode: "test" });
  app.use(async (_context, next) => {
    await next();
    return await next();
  });
  app.get("/", (context) => context.text("ok"));
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 500);
  assertMatch(await response.text(), /NELO_SCOPE_006/);
});

Deno.test("middleware errors pass through a custom centralized boundary", async () => {
  const seen: unknown[] = [];
  const app = new Nelo({
    onError(error, context) {
      seen.push(error);
      return context.json({ handled: true }, 503);
    },
  });
  app.use(async (_context, next) => {
    await next();
    throw new Error("middleware failed");
  });
  app.get("/", (context) => context.text("unreachable"));
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 503);
  assertEquals(await response.json(), { handled: true });
  assertEquals((seen[0] as Error).message, "middleware failed");
});

Deno.test("a non-Response handler result produces NELO_DELIVERY_001", async () => {
  const app = new Nelo({ mode: "test" });
  app.get("/", (() => ({ invalid: true })) as never);
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 500);
  assertMatch(await response.text(), /NELO_DELIVERY_001/);
});

Deno.test("request cancellation reaches every owned task", async () => {
  const controller = new AbortController();
  const app = new Nelo({ mode: "test" });
  const received: string[] = [];
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  app.get("/", async (context) => {
    const first = context.fork("first", (signal) => {
      markStarted();
      return waitForAbort(signal, received, "first");
    });
    const second = context.fork("second", (signal) => waitForAbort(signal, received, "second"));
    await Promise.all([first, second]);
    return context.text("unreachable");
  });
  const responsePromise = app.fetch(
    new Request("https://example.test/", { signal: controller.signal }),
  );
  await started;
  controller.abort();
  const response = await responsePromise;
  assertEquals(response.status, 500);
  assertEquals(received.sort(), ["first", "second"]);
});

Deno.test("an unjoined task produces a stable Nelo diagnostic", async () => {
  const app = new Nelo({ mode: "test" });
  app.get("/", (context) => {
    context.fork("floating", (signal) => waitForAbort(signal, [], "floating"));
    return context.text("would have succeeded");
  });
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 500);
  const body = await response.text();
  assertMatch(body, /NELO_TASK_001/);
  assertMatch(body, /floating/);
});

Deno.test("request resources clean up before fetch resolves", async () => {
  const app = new Nelo();
  const events: string[] = [];
  app.get("/", async (context) => {
    await context.use("resource", () => disposable("resource", events));
    return context.text("ok");
  });
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 200);
  assertEquals(events, ["resource"]);
});

Deno.test("a non-disposable resource without cleanup produces NELO_RESOURCE_001", async () => {
  const app = new Nelo({ mode: "test" });
  app.get("/", async (context) => {
    await context.use("invalid", () => ({ open: true }));
    return context.text("unreachable");
  });
  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 500);
  assertMatch(await response.text(), /NELO_RESOURCE_001/);
});

Deno.test("handler and cleanup failures are both visible in test mode", async () => {
  const app = new Nelo({ mode: "test" });
  app.get("/", async (context) => {
    await context.use("resource", () => ({ open: true }), () => {
      throw new Error("cleanup failed");
    });
    throw new Error("handler failed");
  });
  const response = await app.fetch(new Request("https://example.test/"));
  const body = await response.text();
  assertEquals(response.status, 500);
  assertMatch(body, /handler failed/);
  assertMatch(body, /cleanup failed/);
});

Deno.test("production errors contain a diagnostic code without stack details", async () => {
  const app = new Nelo();
  app.get("/", () => {
    throw new Error("private detail");
  });
  const response = await app.fetch(new Request("https://example.test/"));
  const body = await response.text();
  assertEquals(response.status, 500);
  assertEquals(body, "NELO_SCOPE_999: request failed");
  assert(!body.includes("private detail"));
});

Deno.test("handler and delivery resources have separate cleanup lifetimes", async () => {
  const events: string[] = [];
  const app = new Nelo();
  app.get("/stream", async (context) => {
    await context.use("handler", () => ({ open: true }), () => {
      events.push("handler");
    });
    context.delivery.use(() => {
      events.push("delivery");
    });
    return new Response("body");
  });

  const response = await app.fetch(new Request("https://example.test/stream"));
  assertEquals(events, ["handler"]);
  assertEquals(await response.text(), "body");
  assertEquals(events, ["handler", "delivery"]);
});

Deno.test("delivery resources clean up in LIFO order after the body closes", async () => {
  const events: string[] = [];
  const app = new Nelo();
  app.get("/", (context) => {
    context.delivery.use(() => {
      events.push("first");
    });
    context.delivery.use(() => {
      events.push("second");
    });
    return new Response(new ReadableStream({ start: (controller) => controller.close() }));
  });

  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(events, []);
  await response.arrayBuffer();
  assertEquals(events, ["second", "first"]);
});

Deno.test("body-less responses close delivery resources without leaking", async () => {
  let cleanups = 0;
  const states: string[] = [];
  const app = new Nelo({ diagnostics: (snapshot) => states.push(snapshot.state) });
  app.get("/", (context) => {
    context.delivery.use(() => {
      cleanups++;
    });
    return new Response(null, { status: 204 });
  });

  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(response.status, 204);
  assertEquals(cleanups, 1);
  assertEquals(states.at(-1), "completed");
});

Deno.test("delivery cleanup failures are aggregated after every cleanup runs", async () => {
  const first = new Error("first cleanup");
  const second = new Error("second cleanup");
  const events: string[] = [];
  const snapshots: import("../lifetime/request-lifetime.ts").RequestDiagnostics[] = [];
  const app = new Nelo({ diagnostics: (snapshot) => snapshots.push(snapshot) });
  app.get("/", (context) => {
    context.delivery.use(() => {
      events.push("first");
      throw first;
    });
    context.delivery.use(() => {
      events.push("second");
      throw second;
    });
    return new Response("body");
  });

  const response = await app.fetch(new Request("https://example.test/"));
  const error = await assertRejects(() => response.text());
  assertInstanceOf(error, AggregateError);
  assertEquals(error.errors, [second, first]);
  assertEquals(events, ["second", "first"]);
  assertEquals(snapshots.at(-1)?.cleanupFailures, [
    { phase: "delivery", error: second },
    { phase: "delivery", error: first },
  ]);
});

Deno.test("request abort propagates to delivery tasks and closes delivery resources", async () => {
  const controller = new AbortController();
  let receivedReason: unknown;
  let started!: () => void;
  const taskStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let cleaned!: () => void;
  const cleanup = new Promise<void>((resolve) => {
    cleaned = resolve;
  });
  const app = new Nelo();
  app.get("/", (context) => {
    const task = context.delivery.fork("producer", (signal) => {
      started();
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          receivedReason = signal.reason;
          reject(signal.reason);
        }, { once: true });
      });
    });
    context.delivery.use(() => {
      cleaned();
    });
    return new Response(
      new ReadableStream({
        async pull(stream) {
          await task;
          stream.close();
        },
      }),
    );
  });

  const response = await app.fetch(
    new Request("https://example.test/", {
      signal: controller.signal,
    }),
  );
  const body = response.text();
  await taskStarted;
  const reason = { type: "server_shutdown" } as const;
  controller.abort(reason);
  await assertRejects(() => body);
  await cleanup;
  assertEquals(receivedReason, reason);
});

Deno.test("diagnostics retain pending tasks after bounded forced termination", async () => {
  const snapshots: import("../lifetime/request-lifetime.ts").RequestDiagnostics[] = [];
  const app = new Nelo({
    taskSettleTimeout: 0,
    diagnostics: (snapshot) => snapshots.push(snapshot),
  });
  app.get("/", (context) => {
    context.delivery.fork("ignores-abort", () => new Promise(() => undefined));
    return new Response("body");
  });

  const response = await app.fetch(new Request("https://example.test/"));
  await assertRejects(() => response.text());
  const final = snapshots.at(-1)!;
  assertEquals(final.state, "failed");
  assertEquals(final.pendingDeliveryTasks, 1);
  assertEquals(final.forcedTermination, true);
});

function waitForAbort(signal: AbortSignal, received: string[], name: string): Promise<never> {
  return new Promise((_resolve, reject) => {
    const abort = () => {
      received.push(name);
      reject(signal.reason);
    };
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function disposable(name: string, events: string[]): Disposable {
  return {
    [Symbol.dispose]() {
      events.push(name);
    },
  };
}
