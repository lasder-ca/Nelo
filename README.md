<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/nelo-wordmark-on-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/nelo-wordmark-on-light.svg">
    <img src="./assets/nelo-wordmark-on-light.svg" alt="Nelo — Every request owns its work." width="560">
  </picture>
</p>

<p align="center">
  <strong>A request-ownership runtime and Web Standards framework for TypeScript.</strong><br>
  <sub>Structured ownership for child tasks, cancellation, and scoped resources.</sub>
</p>

<p align="center">
  <img alt="Status: experimental" src="https://img.shields.io/badge/status-experimental-6d7178">
  <img alt="Phase 2 complete" src="https://img.shields.io/badge/core-phase%202%20complete-2864dc">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <a href="./LICENSE"><img alt="Apache-2.0 license" src="https://img.shields.io/badge/license-Apache--2.0-5bc8ad"></a>
</p>

Nelo keeps child tasks, cancellation, and scoped resources inside the request that owns them.
Instead of letting asynchronous work escape as floating promises, Nelo gives every request an
explicit lifetime boundary.

> Work created for a request must be awaited, cancelled, released, or explicitly transferred.

## Why Nelo

Returning a `Response` does not necessarily mean that all request-related work has finished.
A handler can leave tasks running, lose cancellation when a client disconnects, or keep resources
alive longer than the request that created them.

Nelo structures that work as one ownership tree:

```text
RequestScope
├── OwnedTask: user
├── OwnedTask: feed
├── Resource: database
└── Child LifetimeScope
    └── OwnedTask: audit
```

When the scope closes, Nelo checks owned tasks, propagates cooperative cancellation, waits for
settlement, and releases resources in reverse acquisition order.

## Quick start

> [!IMPORTANT]
> Nelo is currently experimental and is not published to npm yet. The package API is being developed
> in this repository before the first public release.

```ts
import { Nelo } from "nelo";

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
});

const response = await app.fetch(
  new Request("https://example.test/users/42"),
);
```

The API uses standard `Request`, `Response`, `Headers`, `URL`, `ReadableStream`, and `AbortSignal`
types. Runtime-specific behavior belongs in adapters rather than application handlers.

## Core primitives

| Primitive | Purpose |
| --- | --- |
| `app.fetch(request)` | Runs routing, middleware, and the handler in one `RequestScope`. |
| `context.fork(name, operation)` | Starts an eager `OwnedTask` bound to the current request. |
| `context.signal` | Exposes cooperative cancellation to request-owned work. |
| `context.use(name, acquire, cleanup?)` | Acquires a resource and releases it once in LIFO order. |
| `LifetimeScope#createChild(name)` | Creates an explicit child ownership boundary. |

### Owned tasks

`context.fork()` returns an awaitable `OwnedTask`. A task is owned from creation and retains its
name, ancestry, settlement state, and failure for diagnostics.

```ts
const profile = context.fork("profile", (signal) =>
  loadProfile({ signal })
);

return context.json(await profile);
```

If a task is neither observed nor explicitly transferred before its scope completes, Nelo cancels
it and reports `NELO_TASK_001` instead of silently accepting a floating promise.

### Cooperative cancellation

Nelo preserves the first typed `CancellationReason` and propagates one `AbortSignal` through child
scopes and owned tasks.

Cancellation remains cooperative: JavaScript cannot forcibly stop an arbitrary promise. Operations
must observe the supplied signal and stop safely.

### Scoped resources

Resources implementing `Symbol.asyncDispose` or `Symbol.dispose` can be registered directly.
Other values require an explicit cleanup callback.

```ts
const connection = await context.use(
  "database",
  (signal) => database.connect({ signal }),
  (resource) => resource.close(),
);
```

Resources are released once, in reverse acquisition order, after owned work settles. Handler,
task, and cleanup failures remain observable and are aggregated when necessary.

## Web framework surface

Phase 2 currently includes:

- standard Fetch-style `app.fetch(Request)` execution;
- static routes and named path parameters;
- method matching with `404` and `405` handling;
- deterministic static-over-parameter route precedence;
- global and route middleware;
- single-use middleware `next()` enforcement;
- centralized and customizable error handling;
- `json`, `text`, `fork`, and `use` context helpers.

```ts
app.use(async (_context, next) => {
  const response = await next();
  response.headers.set("x-powered-by", "Nelo");
  return response;
});

app.get("/health", (context) => context.json({ ok: true }));
```

Each path segment is percent-decoded once. Encoded slashes stay inside one parameter value.
Semantically duplicate parameter routes are rejected, including `/users/:id` followed by
`/users/:name` for the same method.

## Runtime capabilities

| Capability | Portable core | Node.js | Cloudflare | Deno | Bun |
| --- | :---: | :---: | :---: | :---: | :---: |
| Request scopes | ✅ | — | — | ✅ | — |
| Owned tasks | ✅ | — | — | ✅ | — |
| Resource cleanup | ✅ | — | — | ✅ | — |
| Client disconnect integration | — | Phase 3 | Planned | Planned | Planned |
| Response delivery tracking | — | Phase 3 | Planned | Planned | Planned |
| Graceful shutdown | — | Phase 3 | Planned | Planned | Planned |
| Deferred work | — | Planned | Planned | Planned | Planned |

The portable core runs in hosts that provide Web Standards, with Deno used for the current test
suite. Phase 2 closes a request scope before returning a normal response; it does not claim portable
response-delivery tracking.

## What Nelo does not claim yet

- forced cancellation of arbitrary promises;
- confirmation that a client physically received every response byte;
- durable or exactly-once background execution;
- production-ready Node.js disconnect handling;
- complete Cloudflare, Deno, or Bun runtime adapters.

These boundaries are intentional. Runtime behavior will only be documented as supported after the
corresponding adapter and real transport tests exist.

## Project layout

```text
mod.ts
src/
├── lifetime/
│   ├── cancellation.ts
│   ├── scope.ts
│   ├── task.ts
│   └── resource-stack.ts
└── web/
    ├── app.ts
    ├── context.ts
    ├── middleware.ts
    └── router.ts
examples/
docs/adr/
```

## Development

Nelo uses Deno for formatting, linting, type checking, and tests. npm and TypeScript emit the ESM
package and declaration files.

```bash
git clone https://github.com/lasder-ca/Nelo.git
cd Nelo

npm install

deno task fmt
deno task lint
deno task check
deno task test
npm test
npm run build
npm run check:package
npm --cache /tmp/nelo-npm-cache pack --dry-run
```

The current package name is `nelo`. The repository import map also accepts
`@latteworkspace/nelo` as the preferred scoped fallback. Neither package is published yet.

## Roadmap

- **Phase 1 — complete:** lifetime scopes, owned tasks, typed cancellation, resource cleanup.
- **Phase 2 — complete:** Fetch-style application API, router, middleware, context, error boundary.
- **Phase 3 — next:** Node.js adapter, real socket disconnect tests, delivery tracking, graceful
  shutdown, and GitHub CI.
- **Later:** Cloudflare, Deno, and Bun adapters; explicit deferred work; diagnostics tooling.

## License

Nelo is available under the [Apache License 2.0](./LICENSE).
