import { Nelo } from "nelo";
import { serve } from "nelo/node";

const app = new Nelo();

app.get("/", (context) => context.json({ message: "Hello from Nelo" }));

app.get("/stream", (context) => {
  const encoder = new TextEncoder();
  let open = true;
  context.delivery.use(() => {
    open = false;
  });

  return new Response(
    new ReadableStream({
      pull(controller) {
        if (!open) throw new Error("delivery resource closed early");
        controller.enqueue(encoder.encode("streamed by Nelo\n"));
        controller.close();
      },
    }),
  );
});

export const server = serve(app, { hostname: "127.0.0.1", port: 3000 });
