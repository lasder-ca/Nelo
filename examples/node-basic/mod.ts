import { Nelo } from "nelo";
import { serve } from "nelo/node";

const app = new Nelo();

app.get("/", (context) => context.json({ message: "Hello from Nelo" }));

export const server = serve(app, { hostname: "127.0.0.1", port: 3000 });
