import { Nelo } from "nelo";

export const app = new Nelo();

app.get("/", (context) => {
  return context.json({ message: "Hello from Nelo" });
});
