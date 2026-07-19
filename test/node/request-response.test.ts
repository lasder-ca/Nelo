import { createServer } from "node:http";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Nelo } from "../../src/web/app.ts";
import { nodeCapabilities, serve } from "../../src/node/mod.ts";
import { closeServer, httpRequest, rawHttpRequest } from "./helpers.ts";

describe("Node request and response conversion", () => {
  it("declares honest Node runtime capabilities", () => {
    assert.deepEqual(nodeCapabilities, {
      clientDisconnect: "reliable",
      responseDelivery: "body_close_only",
      deferredWork: "unavailable",
      gracefulShutdown: "adapter_managed",
      asyncContext: "explicit_only",
    });
  });

  it("defines close-before-listen and idempotent lifecycle behavior", async () => {
    const server = serve(new Nelo(), { port: 0 });
    assert.equal(server.address, null);
    const firstClose = server.close();
    assert.equal(firstClose, server.close());
    await firstClose;
    await server.closed;
    await assert.rejects(server.listen(), /cannot listen while server is closed/);
  });

  it("serves GET routes, query strings, headers, cookies, and stable normal completion", async () => {
    const app = new Nelo();
    let requestSignal: AbortSignal | undefined;
    app.get("/users/:id", (context) => {
      requestSignal = context.signal;
      const headers = new Headers({ "content-type": "application/json", "x-reply": "yes" });
      headers.append("set-cookie", "first=1; Path=/");
      headers.append("set-cookie", "second=2; Path=/");
      return new Response(
        JSON.stringify({
          id: context.params.id,
          query: new URL(context.req.url).searchParams.get("page"),
          header: context.req.headers.get("x-test"),
          forwardedHost: context.req.headers.get("x-forwarded-host"),
          requestHost: new URL(context.req.url).host,
          bodyIsNull: context.req.body === null,
        }),
        { headers },
      );
    });
    const server = serve(app, { port: 0 });
    try {
      const firstAddress = await server.listen();
      assert.deepEqual(await server.listen(), firstAddress);
      const result = await httpRequest(firstAddress, {
        path: "/users/42?page=3",
        headers: { "x-test": "preserved", "x-forwarded-host": "ignored.example" },
      });
      assert.equal(result.status, 200);
      assert.equal(result.headers["x-reply"], "yes");
      assert.deepEqual(result.headers["set-cookie"], ["first=1; Path=/", "second=2; Path=/"]);
      assert.deepEqual(JSON.parse(result.body.toString()), {
        id: "42",
        query: "3",
        header: "preserved",
        forwardedHost: "ignored.example",
        requestHost: `${firstAddress.hostname}:${firstAddress.port}`,
        bodyIsNull: true,
      });
      assert.equal(requestSignal?.aborted, false);
    } finally {
      await closeServer(server);
    }
  });

  it("streams POST request bodies and combines duplicate request headers consistently", async () => {
    const app = new Nelo();
    app.post("/upload/:id", async (context) =>
      context.json({
        id: context.params.id,
        query: new URL(context.req.url).searchParams.get("mode"),
        body: await context.req.text(),
        duplicate: context.req.headers.get("x-duplicate"),
      }));
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const result = await httpRequest(
        address,
        {
          method: "POST",
          path: "/upload/report?mode=stream",
          headers: [
            "host",
            `${address.hostname}:${address.port}`,
            "x-duplicate",
            "one",
            "x-duplicate",
            "two",
          ],
        },
        ["first-", "second"],
      );
      assert.equal(result.status, 200);
      assert.deepEqual(JSON.parse(result.body.toString()), {
        id: "report",
        query: "stream",
        body: "first-second",
        duplicate: "one, two",
      });
    } finally {
      await closeServer(server);
    }
  });

  it("returns controlled 400 responses for malformed Host and request targets", async () => {
    const app = new Nelo();
    app.get("/", (context) => context.text("must not run"));
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const badHost = await rawHttpRequest(
        address,
        "GET / HTTP/1.1\r\nHost: user@example.test\r\nConnection: close\r\n\r\n",
      );
      const badTarget = await rawHttpRequest(
        address,
        `GET //other.test/path HTTP/1.1\r\nHost: ${address.hostname}:${address.port}\r\nConnection: close\r\n\r\n`,
      );
      assert.match(badHost, /^HTTP\/1\.1 400 /);
      assert.match(badTarget, /^HTTP\/1\.1 400 /);
    } finally {
      await closeServer(server);
    }
  });

  it("suppresses response bodies for HEAD, 204, and 304", async () => {
    const app = new Nelo();
    app.on("HEAD", "/head", () => new Response("hidden"));
    app.get("/empty", () => new Response(null, { status: 204 }));
    app.get("/cached", () => new Response(null, { status: 304 }));
    const server = serve(app, { port: 0 });
    try {
      const address = await server.listen();
      const head = await httpRequest(address, { method: "HEAD", path: "/head" });
      const empty = await httpRequest(address, { path: "/empty" });
      const cached = await httpRequest(address, { path: "/cached" });
      assert.equal(head.body.length, 0);
      assert.equal(empty.body.length, 0);
      assert.equal(cached.body.length, 0);
    } finally {
      await closeServer(server);
    }
  });

  it("rejects listen errors instead of swallowing them", async () => {
    const occupied = createServer();
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", resolve));
    const address = occupied.address();
    assert(address !== null && typeof address !== "string");
    const server = serve(new Nelo(), { hostname: "127.0.0.1", port: address.port });
    try {
      await assert.rejects(
        server.listen(),
        (error: unknown) =>
          error instanceof Error && "code" in error && error.code === "EADDRINUSE",
      );
      await assert.rejects(server.close());
    } finally {
      await new Promise<void>((resolve, reject) =>
        occupied.close((error) => error === undefined ? resolve() : reject(error))
      );
    }
  });
});
