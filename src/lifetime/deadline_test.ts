import { assertEquals, assertFalse, assertInstanceOf, assertThrows } from "@std/assert";
import {
  InvalidDeadlineError,
  LifetimeScope,
  parseDeadlineDuration,
  RequestDeadline,
} from "./mod.ts";

Deno.test("deadline durations parse supported units and round up fractional milliseconds", () => {
  assertEquals(parseDeadlineDuration(250), 250);
  assertEquals(parseDeadlineDuration("0.1ms"), 1);
  assertEquals(parseDeadlineDuration("1.5s"), 1_500);
  assertEquals(parseDeadlineDuration("2m"), 120_000);
  assertEquals(parseDeadlineDuration("1h"), 3_600_000);
});

Deno.test("invalid deadline durations produce a stable diagnostic", () => {
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, "10", "1d", "1e3ms"]) {
    const error = assertThrows(
      () => parseDeadlineDuration(value as never),
      InvalidDeadlineError,
    );
    assertEquals(error.code, "NELO_SCOPE_007");
  }
});

Deno.test("a request deadline aborts with its absolute deadline", async () => {
  const deadline = new RequestDeadline(new AbortController().signal, "5ms");
  const reason = await waitForAbort(deadline.signal);

  assertEquals(reason, { type: "deadline", deadline: deadline.deadline });
  assertEquals(deadline.remaining, 0);
  deadline[Symbol.dispose]();
});

Deno.test("parent cancellation reaches a deadline and preserves the first typed reason", () => {
  const parent = new AbortController();
  const deadline = new RequestDeadline(parent.signal, "1h");
  const reason = { type: "server_shutdown" } as const;

  parent.abort(reason);
  assertEquals(deadline.signal.reason, reason);

  parent.abort({ type: "manual" });
  assertEquals(deadline.signal.reason, reason);
  deadline[Symbol.dispose]();
});

Deno.test("disposing a deadline clears ownership without inventing cancellation", () => {
  const parent = new AbortController();
  const deadline = new RequestDeadline(parent.signal, "1h");

  deadline[Symbol.dispose]();
  deadline[Symbol.dispose]();
  parent.abort({ type: "server_shutdown" });

  assertEquals(deadline.disposed, true);
  assertFalse(deadline.signal.aborted);
});

Deno.test("lifetime scopes dispose deadlines when the scope closes", async () => {
  let deadline: RequestDeadline | undefined;
  await new LifetimeScope().execute((scope) => {
    deadline = scope.deadline("1h");
  });

  assertInstanceOf(deadline, RequestDeadline);
  assertEquals(deadline.disposed, true);
  assertFalse(deadline.signal.aborted);
});

function waitForAbort(signal: AbortSignal): Promise<unknown> {
  return new Promise((resolve) => {
    const abort = () => resolve(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
