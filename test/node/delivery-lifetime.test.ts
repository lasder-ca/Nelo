import { createServer, get } from "node:http";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NeloAbortReason, RequestDiagnostics } from "../../src/lifetime/mod.ts";
import { handleNodeExchange } from "../../src/node/handler.ts";
import { serve } from "../../src/node/mod.ts";
import { Nelo } from "../../src/web/app.ts";
import { closeServer, deferred, httpRequest, withTimeout } from "./helpers.ts";

describe("Node delivery scope", () => {
  it("keeps delivery resources alive through streaming and cleans them after finish", async () => {
    const bodyStarted = deferred();
    const handlerCleaned = deferred();
    const releaseBody = deferred();
    const cleaned = deferred();
    const events: string[] = [];
    let resourceOpen = true;
    const app = new Nelo();
    app.get("/stream", async (context) => {
      await context.use("handler", () => ({ open: true }), () => {
        events.push("handler-cleanup");
        handlerCleaned.resolve();
      });
      context.delivery.use(() => {
        resourceOpen = false;
        events.push("delivery-cleanup");
        cleaned.resolve();
      });
      return new Response(
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            assert.equal(resourceOpen, true);
            bodyStarted.resolve();
            await releaseBody.promise;
            assert.equal(resourceOpen, true);
            controller.enqueue(new TextEncoder().encode("complete"));
            controller.close();
          },
        }),
      );
    });
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const result = httpRequest(address, { path: "/stream" });
      await withTimeout(bodyStarted.promise);
      await withTimeout(handlerCleaned.promise);
      assert.deepEqual(events, ["handler-cleanup"]);
      releaseBody.resolve();
      assert.equal((await result).body.toString(), "complete");
      await withTimeout(cleaned.promise);
      assert.deepEqual(events, ["handler-cleanup", "delivery-cleanup"]);
      assert.equal(resourceOpen, false);
    } finally {
      await closeServer(server);
    }
  });

  it("cleans delivery resources exactly once after a client disconnect", async () => {
    const firstChunk = deferred();
    const cleaned = deferred();
    let cleanups = 0;
    const app = new Nelo();
    app.get("/disconnect", (context) => {
      context.delivery.use(() => {
        cleanups++;
        cleaned.resolve();
      });
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.enqueue(new Uint8Array(64 * 1024));
            firstChunk.resolve();
          },
        }),
      );
    });
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const request = get(
        { host: address.hostname, port: address.port, path: "/disconnect" },
        (response) => response.once("data", () => request.destroy()),
      );
      request.on("error", () => undefined);
      await withTimeout(firstChunk.promise);
      await withTimeout(cleaned.promise);
      assert.equal(cleanups, 1);
    } finally {
      await closeServer(server);
    }
  });

  it("cleans after a stream error and cleanup failure does not hang the server", async () => {
    const cleaned = deferred();
    const cleanupFailure = new Error("delivery cleanup failed");
    const observed = deferred<unknown>();
    const app = new Nelo();
    app.get("/broken", (context) => {
      context.delivery.use(() => {
        cleaned.resolve();
        throw cleanupFailure;
      });
      return new Response(
        new ReadableStream({
          pull() {
            throw new Error("stream failed");
          },
        }),
      );
    });
    app.get("/healthy", (context) => context.text("ok"));
    const server = serve(app, {
      port: 0,
      diagnostics: { onError: (error) => observed.resolve(error) },
    });
    try {
      const address = await server.listen();
      const request = get({ host: address.hostname, port: address.port, path: "/broken" });
      request.on("error", () => undefined);
      await withTimeout(cleaned.promise);
      await withTimeout(observed.promise);
      assert.equal((await httpRequest(address, { path: "/healthy" })).body.toString(), "ok");
    } finally {
      await closeServer(server);
    }
  });

  it("aborts delivery tasks on shutdown while allowing grace-period completion", async () => {
    const graceStarted = deferred();
    const graceRelease = deferred();
    const app = new Nelo();
    app.get("/grace", () => {
      return new Response(
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            graceStarted.resolve();
            await graceRelease.promise;
            controller.enqueue(new TextEncoder().encode("graceful"));
            controller.close();
          },
        }),
      );
    });
    const graceServer = serve(app, { port: 0 });
    const graceAddress = await graceServer.listen();
    const graceResponse = httpRequest(graceAddress, { path: "/grace" });
    await graceStarted.promise;
    const gracefulClose = graceServer.close({ gracePeriod: 500, forceAfter: 1_000 });
    graceRelease.resolve();
    assert.equal((await graceResponse).body.toString(), "graceful");
    await gracefulClose;

    const taskStarted = deferred();
    const taskAborted = deferred<NeloAbortReason>();
    const shutdownApp = new Nelo();
    shutdownApp.get("/abort", (context) => {
      context.delivery.fork("producer", (signal) => {
        taskStarted.resolve();
        return new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            taskAborted.resolve(signal.reason as NeloAbortReason);
            reject(signal.reason);
          }, { once: true });
        });
      });
      return new Response(new ReadableStream({ pull() {} }));
    });
    const shutdownServer = serve(shutdownApp, { port: 0 });
    const shutdownAddress = await shutdownServer.listen();
    const request = get({
      host: shutdownAddress.hostname,
      port: shutdownAddress.port,
      path: "/abort",
    });
    request.on("error", () => undefined);
    await taskStarted.promise;
    const shutdown = shutdownServer.close({ gracePeriod: 0, forceAfter: 1_000 });
    assert.equal((await withTimeout(taskAborted.promise)).type, "server_shutdown");
    await shutdown;
  });

  it("hard deadline destroys the socket and runs delivery cleanup once", async () => {
    const started = deferred();
    const cleaned = deferred();
    let cleanups = 0;
    const app = new Nelo({ taskSettleTimeout: 0 });
    app.get("/hard", (context) => {
      context.delivery.use(() => {
        cleanups++;
        cleaned.resolve();
      });
      context.delivery.fork("ignores-abort", () => {
        started.resolve();
        return new Promise(() => undefined);
      });
      return new Response(new ReadableStream({ pull() {} }));
    });
    const server = serve(app, { port: 0 });
    const address = await server.listen();
    const request = get({ host: address.hostname, port: address.port, path: "/hard" });
    request.on("error", () => undefined);
    await started.promise;
    await server.close({ gracePeriod: 0, forceAfter: 50 });
    await withTimeout(cleaned.promise);
    assert.equal(cleanups, 1);
  });

  it("reports handling, delivering, and terminal diagnostics for body-less responses", async () => {
    const snapshots: RequestDiagnostics[] = [];
    const app = new Nelo();
    app.get("/empty", (context) => {
      context.delivery.use(() => undefined);
      return new Response(null, { status: 204 });
    });
    const server = serve(app, {
      port: 0,
      diagnostics: { onRequestDiagnostics: (snapshot) => snapshots.push(snapshot) },
    });
    try {
      const address = await server.listen();
      assert.equal((await httpRequest(address, { path: "/empty" })).status, 204);
      assert.deepEqual([...new Set(snapshots.map((snapshot) => snapshot.state))], [
        "handling",
        "delivering",
        "completed",
      ]);
      assert.equal(snapshots.at(-1)?.deliveryResources, 0);
    } finally {
      await closeServer(server);
    }
  });

  it("cleans delivery resources when disconnect occurs during backpressure", async () => {
    const backpressure = deferred();
    const cleaned = deferred();
    const app = new Nelo();
    app.get("/pressure", (context) => {
      context.delivery.use(() => cleaned.resolve());
      return new Response(
        new ReadableStream({
          pull(controller) {
            controller.enqueue(new Uint8Array(1024 * 1024));
          },
        }),
      );
    });
    const server = createServer((request, response) => {
      void handleNodeExchange(app, request, response, new AbortController(), {}, {
        onBackpressure: () => backpressure.resolve(),
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address !== null && typeof address !== "string");
    try {
      const request = get(
        { host: "127.0.0.1", port: address.port, path: "/pressure" },
        (response) => {
          response.pause();
        },
      );
      request.on("error", () => undefined);
      await withTimeout(backpressure.promise);
      request.destroy();
      await withTimeout(cleaned.promise);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
