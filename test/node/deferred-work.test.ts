import assert from "node:assert/strict";
import { get } from "node:http";
import { describe, it } from "node:test";
import type { NeloAbortReason } from "../../src/lifetime/cancellation.ts";
import { DeferredTaskError } from "../../src/lifetime/errors.ts";
import { nodeCapabilities } from "../../src/node/capabilities.ts";
import { serve } from "../../src/node/serve.ts";
import { Nelo } from "../../src/web/app.ts";

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

function request(
  hostname: string,
  port: number,
  path: string,
): Promise<{ readonly status: number; readonly body: string }> {
  return new Promise((resolve, reject) => {
    const outgoing = get({ host: hostname, port, path }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    outgoing.on("error", reject);
  });
}

async function eventually(predicate: () => boolean, timeout = 1_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("condition timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("Node deferred work", () => {
  it("advertises process-tracked deferred work", () => {
    assert.equal(nodeCapabilities.deferredWork, "process_tracked");
  });

  it("returns the response before deferred work and waits for it during graceful shutdown", async () => {
    const started = deferred();
    const release = deferred();
    let finished = false;
    const app = new Nelo();
    app.get("/defer", (context) => {
      context.defer("flush", async () => {
        started.resolve();
        await release.promise;
        finished = true;
      });
      return context.text("accepted", 202);
    });

    const server = serve(app, { port: 0 });
    const address = await server.listen();
    try {
      const response = await request(address.hostname, address.port, "/defer");
      assert.equal(response.status, 202);
      assert.equal(response.body, "accepted");
      await started.promise;
      assert.equal(finished, false);

      let closed = false;
      const closing = server.close({ gracePeriod: 500, forceAfter: 1_000 }).then(() => {
        closed = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(closed, false);
      release.resolve();
      await closing;
      assert.equal(finished, true);
    } finally {
      await server.close().catch(() => undefined);
    }
  });

  it("does not miss work deferred by an exchange already draining during shutdown", async () => {
    const handlerEntered = deferred();
    const allowDefer = deferred();
    const deferredStarted = deferred();
    const deferredRelease = deferred();
    const app = new Nelo();
    app.get("/late", async (context) => {
      handlerEntered.resolve();
      await allowDefer.promise;
      context.defer("late-flush", async () => {
        deferredStarted.resolve();
        await deferredRelease.promise;
      });
      return context.text("ok");
    });

    const server = serve(app, { port: 0 });
    const address = await server.listen();
    const response = request(address.hostname, address.port, "/late");
    await handlerEntered.promise;
    let closed = false;
    const closing = server.close({ gracePeriod: 500, forceAfter: 1_000 }).then(() => {
      closed = true;
    });
    allowDefer.resolve();
    assert.equal((await response).status, 200);
    await deferredStarted.promise;
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(closed, false);
    deferredRelease.resolve();
    await closing;
  });

  it("cancels remaining deferred work with server_shutdown after grace expires", async () => {
    const observed = deferred<NeloAbortReason>();
    const app = new Nelo();
    app.get("/abort", (context) => {
      context.defer("worker", (signal) =>
        new Promise<void>((_resolve, reject) => {
          const onAbort = (): void => {
            observed.resolve(signal.reason as NeloAbortReason);
            reject(signal.reason);
          };
          if (signal.aborted) onAbort();
          else signal.addEventListener("abort", onAbort, { once: true });
        }));
      return context.text("ok");
    });

    const server = serve(app, { port: 0 });
    const address = await server.listen();
    assert.equal((await request(address.hostname, address.port, "/abort")).status, 200);
    await server.close({ gracePeriod: 0, forceAfter: 200 });
    assert.equal((await observed.promise).type, "server_shutdown");
  });

  it("reports deferred failures through adapter diagnostics", async () => {
    const errors: unknown[] = [];
    const app = new Nelo();
    app.get("/failure", (context) => {
      context.defer("broken", () => {
        throw new Error("deferred failed");
      });
      return context.text("ok");
    });
    const server = serve(app, {
      port: 0,
      diagnostics: { onError: (error) => errors.push(error) },
    });
    const address = await server.listen();
    try {
      assert.equal((await request(address.hostname, address.port, "/failure")).status, 200);
      await eventually(() => errors.length > 0);
      assert(errors[0] instanceof DeferredTaskError);
      assert.equal(errors[0].code, "NELO_DEFERRED_002");
    } finally {
      await server.close();
    }
  });
});
