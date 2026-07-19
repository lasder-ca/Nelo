# Nelo

> Every request owns its work.

Nelo is a request-ownership runtime and Web Standards framework for TypeScript. It keeps child
tasks, cancellation, and scoped resources inside an explicit request boundary.

```ts
import { Nelo } from "nelo";

const app = new Nelo();

app.get("/", async (context) => {
  const greeting = context.fork("greeting", async (signal) => {
    signal.throwIfAborted();
    return await Promise.resolve("Hello from Nelo");
  });

  return context.json({ message: await greeting });
});

const response = await app.fetch(new Request("https://example.test/"));
```

## Ownership model

Every `app.fetch(request)` creates one `RequestScope`. Middleware and the selected handler share
that scope. Work started with `context.fork(name, operation)` is eager and owned from creation. It
must be awaited or explicitly joined before the handler completes; otherwise Nelo cancels it and
reports `NELO_TASK_001`.

Cancellation is cooperative. Nelo sends the scope's `AbortSignal` to owned work and preserves the
first typed `CancellationReason`, but JavaScript cannot forcibly stop an arbitrary promise. Task
snapshots distinguish a cancellation request from acknowledgement or later settlement.

`context.use(name, acquire, cleanup?)` registers a disposable resource. Values implementing
`Symbol.asyncDispose` or `Symbol.dispose` need no callback. Other values require an explicit cleanup
callback. Resources close once, in reverse acquisition order, after owned tasks settle. Handler,
task, and cleanup errors remain observable and are aggregated when necessary.

## Current support

Phase 1 provides the HTTP-independent execution core:

- typed cancellation with first-reason preservation;
- parent and child `LifetimeScope` objects;
- awaitable `OwnedTask` objects with ancestry and settlement diagnostics;
- LIFO `ResourceStack` cleanup;
- deterministic test utilities for task trees, leaks, and cleanup.

Phase 2 provides a portable Fetch-style framework:

- the `Nelo` application and `app.fetch(Request)`;
- static and named-parameter routes with method matching;
- global and route middleware with single-use `next()`;
- `NeloContext`, `json`, `text`, `fork`, and `use`;
- per-request scope integration and a customizable error boundary.

Static routes take precedence over parameter routes. Each URL path segment is percent-decoded once;
encoded slashes remain inside one parameter value. Routes with the same method and semantic shape
are rejected, including `/users/:id` followed by `/users/:name`. Global middleware wraps matched,
404, and 405 responses; route middleware runs only for its route.

## Runtime status

The core currently runs directly in hosts that provide Web Standards, with Deno used for tests.
There is no production Node.js adapter or Cloudflare adapter yet. Phase 2 closes a Request Scope
before returning a normal response; it does not claim portable response-delivery tracking.

The following remain intentionally unsupported until later phases:

- Node.js socket disconnect and graceful-shutdown integration;
- Cloudflare `ExecutionContext.waitUntil` mapping;
- streamed response-delivery ownership;
- deferred or durable background work;
- exactly-once execution or forced cancellation.

## Development

The repository uses Deno for formatting, linting, type checking, and tests. npm and TypeScript are
used only to emit the ESM package and declarations.

```bash
deno task fmt
deno task lint
deno task check
deno task test
npm run build
npm pack --dry-run
```

The package is named `nelo`. The repository import map also accepts `@latteworkspace/nelo` as the
preferred scoped fallback; neither package is published by this repository task.
