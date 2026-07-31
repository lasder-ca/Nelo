import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, request as createHttpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import {
  createDeliveryLabApplication,
  handleNeloLabRequest,
  type LabEvent,
} from "../../api/nelo.ts";
import { handleNodeExchange } from "../../src/node/handler.ts";

interface LabPayload {
  readonly scenario?: string;
  readonly error?: string;
  readonly expired?: boolean;
  readonly reason?: { readonly type?: string; readonly deadline?: number };
  readonly lifecycle: readonly { readonly label: string; readonly atMs: number }[];
  readonly diagnostics: {
    readonly state: string;
    readonly handlerTasks: number;
    readonly deliveryTasks: number;
    readonly cleanupFailures: number;
  } | null;
}

test("the live lab health endpoint runs through Nelo", async () => {
  const response = await runLab("health");
  const payload = await readPayload(response);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-nelo-lab"), "1");
  assert.equal(payload.scenario, "health");
  assert.equal(payload.diagnostics?.state, "completed");
  assert.deepEqual(labels(payload), ["request:accepted"]);
});

test("the task scenario joins both request-owned tasks", async () => {
  const response = await runLab("tasks&delay=10");
  const payload = await readPayload(response);

  assert.equal(response.status, 200);
  assert.equal(payload.scenario, "tasks");
  assert.equal(payload.diagnostics?.handlerTasks, 2);
  assert.deepEqual(labels(payload), [
    "request:accepted",
    "task:start",
    "task:start",
    "task:complete",
    "task:complete",
  ]);
});

test("the deadline scenario returns the typed Nelo deadline reason", async () => {
  const response = await runLab("deadline&work=200&timeout=20");
  const payload = await readPayload(response);

  assert.equal(response.status, 504);
  assert.equal(payload.expired, true);
  assert.equal(payload.reason?.type, "deadline");
  assert.equal(typeof payload.reason?.deadline, "number");
  assert.deepEqual(labels(payload), [
    "request:accepted",
    "deadline:created",
    "deadline:abort",
  ]);
});

test("handler resources are cleaned before the API response is returned", async () => {
  const response = await runLab("resource");
  const payload = await readPayload(response);

  assert.equal(response.status, 200);
  assert.deepEqual(labels(payload), [
    "request:accepted",
    "resource:acquire",
    "resource:use",
    "resource:cleanup",
  ]);
});

test("delivery cleanup follows actual Node response completion", async () => {
  const events: LabEvent[] = [];
  await withDeliveryServer(events, async (origin) => {
    const response = await fetch(
      `${origin}/api/nelo?scenario=delivery&delay=10&chunks=2`,
    );
    const lines = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-nelo-delivery"), "transport-owned");
    assert.deepEqual(lines.map((line) => line.event), [
      "handler:return",
      "delivery:chunk",
      "delivery:chunk",
      "delivery:body-complete",
    ]);
    await waitForEvent(events, "delivery:cleanup");

    assert.ok(
      eventIndex(events, "delivery:cleanup") > eventIndex(events, "delivery:body-complete"),
    );
  });
});

test("client disconnect cancels the owned delivery stream before cleanup", async () => {
  const events: LabEvent[] = [];
  await withDeliveryServer(events, async (origin) => {
    await disconnectAfterFirstChunk(
      `${origin}/api/nelo?scenario=delivery&delay=100&chunks=8`,
    );
    const cleanup = await waitForEvent(events, "delivery:cleanup");

    assert.ok(eventIndex(events, "delivery:stream-cancel") >= 0);
    assert.ok(
      eventIndex(events, "delivery:cleanup") > eventIndex(events, "delivery:stream-cancel"),
    );
    assert.deepEqual(cleanup.detail, { reason: { type: "client_disconnect" } });
  });
});

test("invalid lab input receives a bounded JSON error", async () => {
  const response = await runLab("tasks&delay=999999");
  const payload = await readPayload(response);

  assert.equal(response.status, 400);
  assert.match(payload.error ?? "", /delay must be between/);
  assert.equal(payload.diagnostics?.cleanupFailures, 0);
});

function runLab(query: string): Promise<Response> {
  return handleNeloLabRequest(new Request(`https://nelo.test/api/nelo?scenario=${query}`));
}

async function readPayload(response: Response): Promise<LabPayload> {
  return await response.json() as LabPayload;
}

function labels(payload: LabPayload): string[] {
  return payload.lifecycle.map((event) => event.label);
}

async function withDeliveryServer(
  events: LabEvent[],
  operation: (origin: string) => Promise<void>,
): Promise<void> {
  const app = createDeliveryLabApplication((event) => events.push(event));
  const server = createServer((request, response) => {
    void handleNodeExchange(
      app,
      request,
      response,
      new AbortController(),
      { protocol: "http" },
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;

  try {
    await operation(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function disconnectAfterFirstChunk(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = createHttpRequest(url, (response) => {
      response.once("data", () => {
        response.destroy();
        request.destroy();
        resolve();
      });
    });
    request.once("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ECONNRESET") resolve();
      else reject(error);
    });
    request.end();
  });
}

async function waitForEvent(events: LabEvent[], label: string): Promise<LabEvent> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const event = events.find((candidate) => candidate.label === label);
    if (event !== undefined) return event;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(events)}`);
}

function eventIndex(events: LabEvent[], label: string): number {
  return events.findIndex((event) => event.label === label);
}
