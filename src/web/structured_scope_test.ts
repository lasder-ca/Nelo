import { assertEquals } from "@std/assert";
import { Nelo } from "../../mod.ts";
import type { RequestDiagnostics } from "../lifetime/request-lifetime.ts";

Deno.test("context.forkScope owns nested tasks and cleanup", async () => {
  const events: string[] = [];
  const snapshots: RequestDiagnostics[] = [];
  const app = new Nelo({ diagnostics: (snapshot) => snapshots.push(snapshot) });

  app.get("/", async (context) => {
    const result = await context.forkScope("load-dashboard", async (scope) => {
      await scope.use(
        "database",
        () => ({ open: true }),
        () => events.push("database:closed"),
      );
      return await scope.fork("query", () => ({ count: 3 }));
    });
    return context.json(result);
  });

  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(await response.json(), { count: 3 });
  assertEquals(events, ["database:closed"]);

  const nested = snapshots.at(-1)!.handlerTree.children[0]!;
  assertEquals(nested.name, "load-dashboard");
  assertEquals(nested.state, "closed");
  assertEquals(nested.tasks[0]?.ancestry, ["request", "load-dashboard", "query"]);
});

Deno.test("delivery.forkScope owns structured delivery work", async () => {
  const events: string[] = [];
  const app = new Nelo();
  app.get("/", (context) => {
    const payload = context.delivery.forkScope("stream-segment", async (scope) => {
      await scope.use(
        "segment-buffer",
        () => new Uint8Array([111, 107]),
        () => events.push("segment:released"),
      );
      return await scope.fork("encode", () => new Uint8Array([111, 107]));
    });
    return new Response(
      new ReadableStream<Uint8Array>({
        async pull(controller) {
          controller.enqueue(await payload);
          controller.close();
        },
      }),
    );
  });

  const response = await app.fetch(new Request("https://example.test/"));
  assertEquals(await response.text(), "ok");
  assertEquals(events, ["segment:released"]);
});
