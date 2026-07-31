import assert from "node:assert/strict";
import test from "node:test";
import { handleNeloLabRequest } from "../../api/nelo.ts";

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

test("delivery cleanup runs when the adapter consumes the Nelo body", async () => {
  const response = await runLab("delivery");
  const payload = await readPayload(response);

  assert.equal(response.status, 200);
  assert.deepEqual(labels(payload), [
    "request:accepted",
    "handler:return",
    "delivery:cleanup",
  ]);
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
