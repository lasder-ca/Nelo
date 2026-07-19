import { get } from "node:http";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CancellationReason } from "../../src/lifetime/cancellation.ts";
import { Nelo } from "../../src/web/app.ts";
import { serve } from "../../src/node/mod.ts";
import { deferred, httpRequest, withTimeout } from "./helpers.ts";

describe("Node graceful shutdown", () => {
  it("waits for an active request during the grace period", async () => {
    const started = deferred();
    const release = deferred();
    const app = new Nelo();
    app.get("/slow", async (context) => {
      started.resolve();
      await release.promise;
      return context.text("finished in grace");
    });
    const server = serve(app, { port: 0 });
    const address = await server.listen();
    const response = new Promise<string>((resolve, reject) => {
      const request = get(
        { host: address.hostname, port: address.port, path: "/slow" },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
          incoming.on("end", () => resolve(Buffer.concat(chunks).toString()));
          incoming.on("error", reject);
        },
      );
      request.on("error", reject);
    });
    await started.promise;
    let shutdownSettled = false;
    const shutdown = server.close({ gracePeriod: 1_000, forceAfter: 2_000 }).then(() => {
      shutdownSettled = true;
    });
    await Promise.resolve();
    assert.equal(shutdownSettled, false);
    const rejectedDuringShutdown = await withTimeout(
      httpRequest(address, { path: "/slow" }).then(
        (result) => result.status === 503,
        () => true,
      ),
      2_000,
      "shutdown rejection",
    );
    assert.equal(rejectedDuringShutdown, true);
    release.resolve();
    assert.equal(await withTimeout(response), "finished in grace");
    await withTimeout(shutdown);
    await server.closed;
  });

  it("cancels active work with server_shutdown after grace expires", async () => {
    const started = deferred();
    const cleaned = deferred();
    const canceled = deferred<CancellationReason>();
    const app = new Nelo({ mode: "test" });
    app.get("/cancel", async (context) => {
      await context.use("resource", () => ({ open: true }), () => cleaned.resolve());
      const task = context.fork("shutdown-task", (signal) => {
        started.resolve();
        return new Promise<never>((_resolve, reject) => {
          const abort = (): void => {
            canceled.resolve(signal.reason as CancellationReason);
            reject(signal.reason);
          };
          if (signal.aborted) abort();
          else signal.addEventListener("abort", abort, { once: true });
        });
      });
      await task;
      return context.text("unreachable");
    });
    const server = serve(app, { port: 0 });
    const address = await server.listen();
    const request = get({ host: address.hostname, port: address.port, path: "/cancel" });
    request.on("error", () => undefined);
    await started.promise;
    const shutdown = server.close({ gracePeriod: 20, forceAfter: 1_000 });
    assert.equal((await withTimeout(canceled.promise)).type, "server_shutdown");
    await withTimeout(cleaned.promise, 2_000, "shutdown cleanup");
    await withTimeout(shutdown, 2_000, "graceful shutdown");
    await server.closed;
  });

  it("force-closes sockets at the hard deadline while cooperative cleanup can settle", async () => {
    const started = deferred();
    const canceled = deferred<CancellationReason>();
    const releaseAfterForce = deferred();
    const cleaned = deferred();
    const socketClosed = deferred();
    const app = new Nelo({ mode: "test" });
    app.get("/hard", async (context) => {
      await context.use("resource", () => ({ open: true }), () => cleaned.resolve());
      const task = context.fork("blocked-after-cancel", async (signal) => {
        started.resolve();
        await new Promise<void>((resolve) => {
          const abort = (): void => {
            canceled.resolve(signal.reason as CancellationReason);
            resolve();
          };
          if (signal.aborted) abort();
          else signal.addEventListener("abort", abort, { once: true });
        });
        await releaseAfterForce.promise;
        throw signal.reason;
      });
      await task;
      return context.text("unreachable");
    });
    const server = serve(app, { port: 0 });
    const address = await server.listen();
    const request = get({ host: address.hostname, port: address.port, path: "/hard" });
    request.on("close", () => socketClosed.resolve());
    request.on("error", () => undefined);
    await started.promise;
    const shutdown = server.close({ gracePeriod: 20, forceAfter: 80 });
    assert.equal((await withTimeout(canceled.promise)).type, "server_shutdown");
    await withTimeout(shutdown, 2_000, "hard shutdown");
    await withTimeout(socketClosed.promise, 2_000, "forced socket close");
    releaseAfterForce.resolve();
    await withTimeout(cleaned.promise, 2_000, "post-force cooperative cleanup");
    await server.closed;
  });
});
