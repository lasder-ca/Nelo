import { Nelo, type NeloContext, type OwnedTask } from "nelo";
import { type NeloNodeServer, serve } from "nelo/node";

export const app: Nelo = new Nelo();

app.get("/smoke/:id", (context: NeloContext) => {
  const task: OwnedTask<string> = context.fork("package-export", () => context.params.id ?? "");
  return task.then((id) => context.json({ id }));
});

export const server: NeloNodeServer = serve(app, { port: 0 });
