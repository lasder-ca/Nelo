export const githubUrl = "https://github.com/lasder-ca/Nelo";

export const heroCode = `import { Nelo } from "nelo";

const app = new Nelo();

app.get("/users/:id", async (context) => {
  const user = context.fork("user", (signal) =>
    fetchUser(context.params.id!, { signal })
  );

  const feed = context.fork("feed", (signal) =>
    fetchFeed(context.params.id!, { signal })
  );

  return context.json({
    user: await user,
    feed: await feed,
  });
});`;

export const codeExamples = [
  {
    id: "owned",
    label: "Owned tasks",
    title: "Start work that cannot silently escape.",
    description: "context.fork() creates an eager, awaitable OwnedTask bound to the current request. Unobserved tasks are cancelled and diagnosed instead of becoming floating promises.",
    filename: "owned-tasks.ts",
    code: `app.get("/profile", async (context) => {
  const profile = context.fork("profile", (signal) =>
    loadProfile({ signal })
  );

  return context.json(await profile);
});`,
  },
  {
    id: "cancel",
    label: "Cancellation",
    title: "Carry one typed cancellation signal.",
    description: "Operations observe context.signal at safe interruption points. Nelo preserves the first typed reason as cancellation moves through child scopes.",
    filename: "cancellation.ts",
    code: `app.get("/mirror", async (context) => {
  const upstream = await fetch(API_URL, {
    signal: context.signal,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
});`,
  },
  {
    id: "resource",
    label: "Resources",
    title: "Acquire and release in the same scope.",
    description: "context.use() releases resources exactly once and in reverse acquisition order. Handler, task, and cleanup failures remain observable.",
    filename: "resource.ts",
    code: `const database = await context.use(
  "database",
  (signal) => pool.connect({ signal }),
  (connection) => connection.close()
);

return context.json(
  await database.users.find(context.params.id!)
);`,
  },
  {
    id: "delivery",
    label: "Delivery",
    title: "Keep streaming work alive after return.",
    description: "Delivery-owned tasks and resources remain active until response-body delivery completes, fails, is cancelled, or the server shuts down.",
    filename: "delivery.ts",
    code: `app.get("/stream", async (context) => {
  const source = await openSource();

  context.delivery.use(() => source.close());
  context.delivery.fork("producer", (signal) =>
    source.produce({ signal })
  );

  return new Response(source.stream());
});`,
  },
] as const;

export const runtimeRows = [
  ["Request scopes", "Supported", "Core", "Core", "Supported", "Core"],
  ["Owned tasks", "Supported", "Core", "Core", "Supported", "Core"],
  ["Resource cleanup", "Supported", "Core", "Core", "Supported", "Core"],
  ["Client disconnect", "—", "Supported", "Planned", "Planned", "Planned"],
  ["Delivery tracking", "Supported", "Supported", "Planned", "Planned", "Planned"],
  ["Graceful shutdown", "—", "Supported", "Planned", "Planned", "Planned"],
] as const;

export const roadmap = [
  { phase: "01", title: "Ownership core", detail: "Lifetime scopes, owned tasks, typed cancellation, and deterministic resource cleanup.", status: "Complete" },
  { phase: "02", title: "Portable web surface", detail: "Fetch-style application API, router, middleware, context helpers, and error boundaries.", status: "Complete" },
  { phase: "03", title: "Node transport", detail: "Real socket disconnect tests, delivery tracking, graceful shutdown, and CI.", status: "Complete" },
  { phase: "04", title: "Handler + Delivery", detail: "Separate lifetimes, delivery-owned work, typed abort reasons, and request diagnostics.", status: "Complete" },
  { phase: "→", title: "More runtimes", detail: "Cloudflare, Deno, and Bun adapters, deferred work, and diagnostics tooling.", status: "Planned" },
] as const;
