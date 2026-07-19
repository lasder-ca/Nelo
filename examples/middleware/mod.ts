import { Nelo } from "nelo";

export const app = new Nelo();

app.use(async (_context, next) => {
  const startedAt = performance.now();
  const response = await next();
  response.headers.set("server-timing", `app;dur=${performance.now() - startedAt}`);
  return response;
});

app.get("/", (context) => context.text("timed"));
