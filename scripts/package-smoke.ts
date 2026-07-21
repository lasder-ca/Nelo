import { Nelo, type NeloContext, type OwnedTask } from "@latteworkspace/nelo";
import { type NeloNodeServer, serve } from "@latteworkspace/nelo/node";

export const app: Nelo = new Nelo();

app.get("/smoke/:id", (context: NeloContext) => {
  const task: OwnedTask<string> = context.fork("package-export", () => context.params.id ?? "");
  return task.then((id) => context.json({ id }));
});

app.get("/stream", async (context: NeloContext) => {
  const resource = await context.delivery.use(
    "typed-delivery-resource",
    () => ({ open: true }),
    (value) => {
      value.open = false;
    },
  );
  context.delivery.use(() => {
    resource.open = false;
  });
  return new Response(new Uint8Array([1, 2, 3]));
});

export const server: NeloNodeServer = serve(app, { port: 0 });
