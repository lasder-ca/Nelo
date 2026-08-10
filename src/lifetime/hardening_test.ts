import { assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  cancellationReasonFromSignal,
  InvalidTaskSettleTimeoutError,
  isCancellationReason,
  LifetimeScope,
} from "./mod.ts";

Deno.test("task settlement timeout rejects values Node timers cannot represent safely", () => {
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648]) {
    assertThrows(
      () => new LifetimeScope({ taskSettleTimeout: value }),
      InvalidTaskSettleTimeoutError,
      "NELO_SCOPE_008",
    );
  }
});

Deno.test("typed cancellation reasons reject malformed discriminator payloads", () => {
  assertFalse(isCancellationReason({ type: "deadline" }));
  assertFalse(isCancellationReason({ type: "deadline", deadline: Number.NaN }));
  assertFalse(isCancellationReason({ type: "request_error" }));
  assertFalse(isCancellationReason({ type: "unknown" }));

  const controller = new AbortController();
  controller.abort({ type: "deadline" });
  assertEquals(
    cancellationReasonFromSignal(controller.signal, { type: "client_disconnect" }),
    { type: "client_disconnect" },
  );
});
