import { createServer, get, request as nodeRequest } from "node:http";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CancellationReason } from "../../src/lifetime/cancellation.ts";
import { Nelo } from "../../src/web/app.ts";
import { handleNodeExchange } from "../../src/node/handler.ts";
import { type NodeDeliveryResult, serve } from "../../src/node/mod.ts";
import { closeServer, deferred, withTimeout } from "./helpers.ts";

describe("Node disconnect and streaming lifecycle", () => {
  it("propagates a real client disconnect to owned tasks and resource cleanup", async () => {
    const started = deferred();
    const cleaned = deferred();
    const reasons: CancellationReason[] = [];
    let running = 0;
    const app = new Nelo({ mode: "test" });
    app.get("/disconnect", async (context) => {
      await context.use("resource", () => ({ open: true }), () => cleaned.resolve());
      const wait = (signal: AbortSignal): Promise<never> => {
        running++;
        if (running === 2) started.resolve();
        return new Promise((_resolve, reject) => {
          const abort = (): void => {
            reasons.push(signal.reason as CancellationReason);
            reject(signal.reason);
          };
          if (signal.aborted) abort();
          else signal.addEventListener("abort", abort, { once: true });
        });
      };
      const first = context.fork("first", wait);
      const second = context.fork("second", wait);
      await Promise.all([first, second]);
      return context.text("unreachable");
    });
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const request = get({ host: address.hostname, port: address.port, path: "/disconnect" });
      request.on("error", () => undefined);
      await withTimeout(started.promise, 2_000, "owned tasks start");
      request.destroy();
      await withTimeout(cleaned.promise, 2_000, "disconnect cleanup");
      assert.equal(reasons.length, 2);
      assert(reasons.every((reason) => reason.type === "client_disconnect"));
      assert.strictEqual(reasons[0], reasons[1]);
    } finally {
      await closeServer(server);
    }
  });

  it("aborts a streamed upload and releases request resources", async () => {
    const started = deferred();
    const cleaned = deferred();
    const aborted = deferred<CancellationReason>();
    const app = new Nelo({ mode: "test" });
    app.post("/upload", async (context) => {
      await context.use("upload-resource", () => ({ open: true }), () => cleaned.resolve());
      const body = context.fork("request-body", async (signal) => {
        started.resolve();
        signal.addEventListener(
          "abort",
          () => aborted.resolve(signal.reason as CancellationReason),
          { once: true },
        );
        return await context.req.text();
      });
      await body;
      return context.text("complete");
    });
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const request = nodeRequest({
        host: address.hostname,
        port: address.port,
        path: "/upload",
        method: "POST",
      });
      request.on("error", () => undefined);
      request.write("partial upload");
      await withTimeout(started.promise, 2_000, "upload handler start");
      request.destroy();
      assert.equal((await withTimeout(aborted.promise)).type, "client_disconnect");
      await withTimeout(cleaned.promise, 2_000, "upload cleanup");
    } finally {
      await closeServer(server);
    }
  });

  it("cancels a streaming producer when the response client disconnects", async () => {
    const canceled = deferred<unknown>();
    const delivered = deferred<NodeDeliveryResult>();
    let resourceOpen = true;
    let pulls = 0;
    const app = new Nelo();
    app.get("/stream", () =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            pulls++;
            controller.enqueue(new TextEncoder().encode(`chunk-${pulls}\n`));
          },
          cancel(reason) {
            resourceOpen = false;
            canceled.resolve(reason);
          },
        }),
      ));
    const server = serve(app, {
      port: 0,
      diagnostics: { onDelivery: (result) => delivered.resolve(result) },
    });
    try {
      const address = await server.listen();
      const request = get(
        { host: address.hostname, port: address.port, path: "/stream" },
        (response) => {
          response.once("data", () => request.destroy());
        },
      );
      request.on("error", () => undefined);
      const reason = await withTimeout(canceled.promise, 2_000, "stream cancellation");
      const delivery = await withTimeout(delivered.promise, 2_000, "disconnected delivery");
      assert.deepEqual(reason, { type: "client_disconnect" });
      assert.equal(delivery.state, "client_disconnected");
      assert.equal(resourceOpen, false);
      const stoppedAt = pulls;
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(pulls, stoppedAt);
    } finally {
      await closeServer(server);
    }
  });

  it("keeps normal response delivery distinct from handler completion", async () => {
    const pullStarted = deferred();
    const releaseBody = deferred();
    const delivered = deferred<NodeDeliveryResult>();
    let handlerReturned = false;
    const app = new Nelo();
    app.get("/delayed-stream", () => {
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          pullStarted.resolve();
          await releaseBody.promise;
          controller.enqueue(new TextEncoder().encode("delivered later"));
          controller.close();
        },
      });
      handlerReturned = true;
      return new Response(body);
    });
    const server = serve(app, {
      port: 0,
      diagnostics: { onDelivery: (result) => delivered.resolve(result) },
    });
    try {
      const address = await server.listen();
      const responseBody = new Promise<string>((resolve, reject) => {
        const request = get(
          { host: address.hostname, port: address.port, path: "/delayed-stream" },
          (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => chunks.push(chunk));
            response.on("end", () => resolve(Buffer.concat(chunks).toString()));
            response.on("error", reject);
          },
        );
        request.on("error", reject);
      });
      await withTimeout(pullStarted.promise, 2_000, "stream pull");
      assert.equal(handlerReturned, true);
      releaseBody.resolve();
      assert.equal(await withTimeout(responseBody), "delivered later");
      assert.equal((await withTimeout(delivered.promise)).state, "finished");
    } finally {
      await closeServer(server);
    }
  });

  it("observes producer failures through delivery diagnostics", async () => {
    const delivered = deferred<NodeDeliveryResult>();
    const observedError = deferred<unknown>();
    let pulls = 0;
    const app = new Nelo();
    app.get("/broken", () =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            pulls++;
            if (pulls === 1) controller.enqueue(new Uint8Array([1, 2, 3]));
            else throw new Error("producer failed");
          },
        }),
      ));
    const server = serve(app, {
      port: 0,
      diagnostics: {
        onDelivery: (result) => delivered.resolve(result),
        onError: (error) => observedError.resolve(error),
      },
    });
    try {
      const address = await server.listen();
      const request = get({ host: address.hostname, port: address.port, path: "/broken" });
      request.on("error", () => undefined);
      const result = await withTimeout(delivered.promise, 2_000, "failed delivery");
      const error = await withTimeout(observedError.promise, 2_000, "delivery error");
      assert.equal(result.state, "failed");
      assert.match(String(error), /producer failed/);
    } finally {
      await closeServer(server);
    }
  });

  it("waits for Node drain under real socket backpressure without losing chunks", async () => {
    const backpressure = deferred();
    const exchangeFinished = deferred();
    const chunkSize = 64 * 1024;
    const chunkCount = 128;
    let produced = 0;
    const app = new Nelo();
    app.get("/backpressure", () =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (produced === chunkCount) {
              controller.close();
              return;
            }
            controller.enqueue(new Uint8Array(chunkSize).fill(produced % 256));
            produced++;
          },
        }),
      ));
    const httpServer = createServer((request, response) => {
      const controller = new AbortController();
      handleNodeExchange(app, request, response, controller, {}, {
        onBackpressure: () => backpressure.resolve(),
      }).then(() => exchangeFinished.resolve(), exchangeFinished.reject);
    });
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const address = httpServer.address();
    assert(address !== null && typeof address !== "string");
    try {
      const body: Buffer[] = [];
      const responseDone = new Promise<void>((resolve, reject) => {
        const request = get(
          { host: "127.0.0.1", port: address.port, path: "/backpressure" },
          (response) => {
            response.pause();
            response.on("data", (chunk: Buffer) => body.push(chunk));
            response.on("end", resolve);
            response.on("error", reject);
            backpressure.promise.then(() => response.resume(), reject);
          },
        );
        request.on("error", reject);
      });
      await withTimeout(backpressure.promise, 2_000, "backpressure");
      assert(produced < chunkCount);
      await withTimeout(responseDone, 5_000, "backpressure response");
      await withTimeout(exchangeFinished.promise, 2_000, "backpressure exchange");
      const received = Buffer.concat(body);
      assert.equal(received.length, chunkSize * chunkCount);
      for (let index = 0; index < chunkCount; index++) {
        assert.equal(received[index * chunkSize], index % 256);
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => error === undefined ? resolve() : reject(error))
      );
    }
  });
});
