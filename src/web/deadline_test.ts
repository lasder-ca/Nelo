import { assertEquals, assertFalse, assertInstanceOf } from "@std/assert";
import { Nelo, RequestDeadline } from "../../mod.ts";

Deno.test("context.deadline exposes a typed derived cancellation signal", async () => {
  const app = new Nelo();
  app.get("/", (context) => {
    using deadline = context.deadline(0);
    return context.json({
      aborted: deadline.signal.aborted,
      reason: deadline.signal.reason,
    });
  });

  const response = await app.fetch(new Request("https://example.test/"));
  const body = await response.json() as {
    aborted: boolean;
    reason: { type: string; deadline: number };
  };

  assertEquals(response.status, 200);
  assertEquals(body.aborted, true);
  assertEquals(body.reason.type, "deadline");
  assertEquals(typeof body.reason.deadline, "number");
});

Deno.test("context deadlines are disposed with the handler scope", async () => {
  let deadline: RequestDeadline | undefined;
  const app = new Nelo();
  app.get("/", (context) => {
    deadline = context.deadline("1h");
    return context.text("ok");
  });

  const response = await app.fetch(new Request("https://example.test/"));

  assertEquals(await response.text(), "ok");
  assertInstanceOf(deadline, RequestDeadline);
  assertEquals(deadline.disposed, true);
  assertFalse(deadline.signal.aborted);
});
