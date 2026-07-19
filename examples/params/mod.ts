import { Nelo } from "nelo";

export const app = new Nelo();

app.get("/users/:id", (context) => {
  return context.json({ id: context.params.id });
});
