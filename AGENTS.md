# AGENTS.md — Nelo

## 1. Project identity

**Project name:** Nelo **Category:** A request-ownership runtime and Web Standards framework for
TypeScript. **Tagline:** Every request owns its work.

Nelo makes request-owned work explicit across Web Standards runtimes.

The framework treats a request as an ownership boundary for:

- child asynchronous tasks,
- cancellation and deadlines,
- resources and cleanup,
- response-body delivery,
- post-response deferred work,
- graceful server shutdown.

The core idea is:

> A handler returning a `Response` is not the same as the request lifetime being complete.

The package name is `nelo`, with `@latteworkspace/nelo` as the preferred scoped fallback. Package,
organization, domain, and trademark availability must not be claimed until formally cleared.

---

## 2. Product thesis

JavaScript runtimes increasingly share Web Standards such as `Request`, `Response`, `Headers`,
`URL`, `ReadableStream`, and `AbortSignal`.

They still differ in the meaning of a request lifetime:

- when client disconnection becomes observable,
- whether handler completion means response delivery completion,
- how streaming cancellation propagates,
- how post-response work is registered,
- what happens to in-flight work during shutdown,
- how resources are released on failure or cancellation.

Nelo standardizes this missing layer.

### Safe external description

Use this wording:

> Nelo is a request-ownership runtime and Web Standards framework for TypeScript. It keeps child
> tasks, cancellation, and scoped resources inside an explicit request boundary.

Do not claim:

- “the world’s first structured-concurrency web framework,”
- “perfect cancellation,”
- “automatic cancellation of arbitrary promises,”
- “exactly-once background execution,”
- “complete runtime equivalence.”

Structured concurrency and scoped resources already exist in other ecosystems and libraries.
Nelo’s differentiation is their integration into a lightweight, Web Standards-based TypeScript web
framework using ordinary `async`/`await`.

---

## 3. Non-negotiable design principles

### 3.1 Web Standards first

The public HTTP boundary must use standard types wherever possible:

- `Request`
- `Response`
- `Headers`
- `URL`
- `URLPattern` when supported or safely polyfilled outside the core
- `ReadableStream`
- `AbortSignal`
- `AbortController`

Do not expose Node.js `IncomingMessage` or Cloudflare-specific objects from the portable core API.

Runtime-specific capabilities belong in adapters.

### 3.2 Ordinary `async`/`await`

A basic route must look familiar:

```ts
import { Nelo } from "nelo";

const app = new Nelo();

app.get("/", async (c) => {
  return c.json({ message: "Hello from Nelo" });
});

export default app;
```

Do not require:

- generator functions,
- a custom effect language,
- decorators,
- a graph builder,
- a compiler-only DSL,
- a custom promise implementation.

### 3.3 Every owned task has a parent

Tasks started with the framework must form a tree.

```text
Request Scope
├── loadUser
├── loadFeed
└── Database Connection
```

A task may leave its current scope only through an explicit ownership transfer such as `defer`.

No silent task detachment.

### 3.4 Cooperative cancellation, not false guarantees

JavaScript cannot forcibly stop arbitrary promises.

Nelo guarantees cancellation propagation only for work that cooperates with the framework:

- tasks started through `c.fork`,
- APIs receiving the scope’s `AbortSignal`,
- resources registered through `c.use`,
- streams created through Nelo’s streaming helpers,
- deferred work registered through `c.defer`.

Documentation and diagnostics must distinguish:

- cancellation requested,
- task acknowledged cancellation,
- task ignored cancellation,
- task completed after cancellation.

### 3.5 Small core

The portable core must not become an application platform.

The initial core includes:

- router,
- middleware,
- context,
- request scope,
- task ownership,
- resource ownership,
- response-delivery tracking,
- deferred-work abstraction,
- adapter interface,
- testing utilities.

It does not include an ORM, authentication provider, queue service, workflow engine, deployment
platform, frontend framework, or dependency-injection container.

---

## 4. Lifetime model

Nelo defines four related scopes.

### 4.1 Request Scope

Starts when the adapter accepts a request.

Owns:

- route handler,
- middleware,
- child tasks,
- request-scoped resources,
- deadline and cancellation state.

It normally stops accepting new work when the handler returns or throws.

### 4.2 Delivery Scope

Owns the response body after a `Response` has been produced.

It ends when:

- the full body is delivered,
- the stream closes,
- the client disconnects,
- the adapter reports a delivery failure,
- shutdown cancels delivery.

Returning a `Response` does not automatically mean the Delivery Scope has completed.

### 4.3 Deferred Scope

Owns work intentionally transferred beyond the response.

Examples:

- analytics flush,
- cache update,
- audit-log transmission,
- non-critical notification.

Adapters map this abstraction to their native mechanism:

- Cloudflare Workers: `waitUntil`,
- Node.js: tracked background registry participating in graceful shutdown,
- tests: deterministic task tracking and failure reporting.

Deferred work is best-effort unless a future durable adapter explicitly provides stronger semantics.

### 4.4 Shutdown Scope

Created when the server begins graceful shutdown.

It:

1. rejects or drains new requests according to adapter policy,
2. cancels active Request and Delivery Scopes when their grace period expires,
3. waits for registered Deferred Scopes within a configured limit,
4. reports tasks and resources that failed to settle.

---

## 5. Target API

The exact names may evolve through ADRs, but the semantics must remain stable.

### 5.1 Forking owned tasks

```ts
app.get("/dashboard", async (c) => {
  const user = c.fork("load-user", (signal) => users.get(c.params.id, { signal }));

  const feed = c.fork("load-feed", (signal) => feeds.get(c.params.id, { signal }));

  return c.json({
    user: await user,
    feed: await feed,
  });
});
```

Requirements:

- `c.fork` returns an awaitable owned-task object.
- A task must be joined, cancelled, or transferred before Request Scope completion.
- Parent cancellation propagates to all active children.
- Child failures must follow an explicit policy.
- Default route policy should fail the request when a joined child fails.
- Diagnostics must retain task names and parent relationships.

Do not silently wrap arbitrary promises after they have already started. The framework must own work
from creation.

### 5.2 Scoped resources

Preferred resource protocol:

```ts
class Connection implements AsyncDisposable {
  async [Symbol.asyncDispose]() {
    await this.close();
  }
}

app.get("/report", async (c) => {
  const connection = await c.use("database", (signal) => database.connect({ signal }));
  return c.json(await createReport(connection));
});
```

`c.use(name, acquire, cleanup?)` must support resources that implement:

- `Symbol.asyncDispose`,
- `Symbol.dispose`,
- an explicit callback for resources without a disposal protocol.

Resources are released:

- in reverse acquisition order,
- on success,
- on handler failure,
- on cancellation,
- during shutdown.

Cleanup errors must not be silently discarded. Preserve the primary failure and attach cleanup
failures using an aggregate or cause chain.

### 5.3 Explicit deferred work

```ts
app.post("/orders", async (c) => {
  const order = await createOrder(await c.req.json());

  c.defer("confirmation-email", (signal) => sendConfirmation(order, { signal }));

  return c.json(order, 201);
});
```

Requirements:

- `defer` is an explicit ownership transfer.
- Deferred tasks do not block the HTTP response.
- Deferred task failures are observable.
- A deferred task receives its own signal.
- Deferred work must not depend on a live request body stream.
- Runtime adapters document maximum duration and reliability.
- The API must never imply durable or exactly-once delivery.

### 5.4 Deadline

```ts
app.get("/search", async (c) => {
  using deadline = c.deadline("750ms");

  return c.json(
    await search(c.req.url, {
      signal: deadline.signal,
    }),
  );
});
```

A deadline composes with:

- client disconnect,
- parent cancellation,
- server shutdown,
- manual cancellation.

Cancellation reasons must be typed and inspectable.

Suggested reasons:

```ts
type CancellationReason =
  | { type: "client_disconnect" }
  | { type: "deadline"; deadline: number }
  | { type: "handler_failure"; error: unknown }
  | { type: "server_shutdown" }
  | { type: "manual"; reason?: unknown };
```

### 5.5 Response delivery

```ts
app.get("/events", async (c) => {
  return c.stream(async (stream) => {
    const subscription = await c.use("events", (signal) => events.subscribe({ signal }));

    for await (const event of subscription) {
      await stream.write(event);
    }
  });
});
```

The framework must be able to observe:

- response produced,
- first byte sent when the adapter can report it,
- body closed,
- body cancelled,
- delivery completed,
- delivery failed.

Do not fake precision on runtimes that cannot expose a phase. Adapter capability metadata must show
what is actually observable.

---

## 6. Runtime capability model

Adapters must declare capabilities instead of pretending that every runtime behaves identically.

```ts
interface RuntimeCapabilities {
  clientDisconnect: "reliable" | "best_effort" | "unavailable";
  responseDelivery: "full" | "body_close_only" | "unavailable";
  deferredWork: "native" | "process_tracked" | "unavailable";
  gracefulShutdown: "native" | "adapter_managed" | "unavailable";
  asyncContext: "native" | "polyfilled" | "explicit_only";
}
```

The core defines common semantics.

Adapters provide the strongest implementation available and expose capability limitations to tests
and diagnostics.

Initial adapters:

1. Node.js
2. Cloudflare Workers

Deno and Bun are later targets after the semantics are proven.

---

## 7. Proposed repository layout

```text
.
├── AGENTS.md
├── README.md
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── nelo/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── context/
│   │   │   ├── router/
│   │   │   ├── scope/
│   │   │   ├── task/
│   │   │   ├── resource/
│   │   │   ├── delivery/
│   │   │   ├── deferred/
│   │   │   └── adapter/
│   │   └── test/
│   ├── adapter-node/
│   ├── adapter-cloudflare/
│   ├── testing/
│   └── eslint-plugin/
├── examples/
│   ├── node-basic/
│   ├── cloudflare-basic/
│   ├── cancellation/
│   ├── resources/
│   ├── streaming/
│   └── deferred-work/
├── docs/
│   ├── concepts/
│   ├── adapters/
│   ├── reference/
│   └── adr/
└── benchmarks/
```

Keep public packages narrow.

Do not split packages merely to make the monorepo look larger.

---

## 8. Initial implementation phases

### Phase 0 — Semantic spike

Before building the router, create executable experiments for:

- Node client disconnect,
- Node streamed-response completion,
- Cloudflare request cancellation,
- Cloudflare `waitUntil`,
- cleanup during thrown errors,
- cancellation during resource acquisition,
- cancellation during response streaming.

Record findings in `docs/adr/0001-runtime-observability.md`.

No public API is considered stable before these experiments.

### Phase 1 — Scope core

Implement and test:

- cancellation reason,
- parent/child scope,
- owned task,
- join and cancellation,
- resource stack,
- aggregate cleanup errors,
- deterministic test scheduler only where necessary.

This layer must not depend on HTTP or a particular runtime.

### Phase 2 — Minimal Web framework

Implement:

- `Nelo`,
- method router,
- middleware chain,
- portable context,
- `c.json`,
- `c.text`,
- error boundary,
- Request Scope creation.

Do not optimize router performance before semantic correctness.

### Phase 3 — Node adapter

Implement:

- Web Standard request conversion,
- disconnect signal,
- response-body delivery tracking,
- graceful shutdown registry,
- Deferred Scope registry,
- streaming backpressure,
- integration tests with real sockets.

### Phase 4 — Cloudflare adapter

Implement:

- direct Fetch handler,
- `ExecutionContext.waitUntil` mapping,
- cancellation capability handling,
- stream delivery behavior,
- official local-runtime integration tests.

### Phase 5 — Diagnostics

Implement development and test diagnostics for:

- unjoined task,
- ignored cancellation,
- leaked resource,
- deferred task rejection,
- stream producer left running,
- unsupported runtime capability.

Diagnostics must include route, task name, parent chain, and cancellation reason.

### Phase 6 — ESLint plugin

Initial rules:

- `nelo/no-floating-owned-task`
- `nelo/no-unscoped-background-work`
- `nelo/require-signal-forwarding`
- `nelo/no-request-object-in-deferred-work`

Avoid AST rules that cannot be made reliable.

---

## 9. Required tests

Every semantic feature needs unit and integration coverage.

### Task ownership

- child completes before parent,
- parent cancellation reaches all children,
- child started after scope closure is rejected,
- unjoined child is detected,
- nested task tree retains ancestry,
- simultaneous child failures preserve all failures.

### Resources

- LIFO cleanup order,
- cleanup on success,
- cleanup on handler failure,
- cleanup on cancellation,
- acquisition failure cleans previously acquired resources,
- cleanup failure does not erase the primary error.

### Delivery

- fixed body completes,
- streamed body completes,
- reader cancellation propagates,
- client disconnect cancels producer,
- producer failure fails delivery,
- handler completion and delivery completion remain distinct.

### Deferred work

- response is not blocked,
- task is registered with adapter,
- task failure is reported,
- shutdown waits within its budget,
- timeout cancels remaining deferred work,
- test adapter fails the test on unobserved rejection.

### Cross-runtime contract

Create a shared adapter test suite.

Each adapter must run the same semantic tests and document skips caused by unavailable runtime
capabilities.

---

## 10. Performance requirements

Correct semantics come first, but the framework must remain lightweight.

Targets for the core:

- zero or minimal runtime dependencies,
- no per-request global timers unless a deadline is used,
- no stack-trace capture in production by default,
- no task graph allocation for routes that do not fork tasks,
- no AsyncLocalStorage requirement for basic operation,
- tree-shakeable helper modules,
- predictable memory release after scope completion.

Benchmarks must separate:

- router overhead,
- empty Request Scope overhead,
- one child task,
- ten child tasks,
- resource acquisition and cleanup,
- streaming,
- adapter conversion cost.

Never publish benchmark claims without scripts, raw output, runtime versions, warmup policy, and
hardware information.

---

## 11. Prior-art boundary

The project must learn from, but not imitate or misrepresent:

- Hono — portable Web Standards routing,
- H3 — portable event abstraction and `waitUntil`,
- Fastify — request signals, lifecycle hooks, and server performance,
- Effect — fibers, interruption, scopes, and resource safety,
- WorkIt and Shajara — JavaScript structured concurrency,
- Ktor — request-coroutine lifecycle,
- Go `net/http` — request context cancellation,
- Cloudflare Workers — `waitUntil` and edge execution lifecycle,
- Deno server APIs — response completion and request signals.

Nelo must remain distinct by combining:

1. lightweight Web Standards routing,
2. ordinary `async`/`await`,
3. request-owned task trees,
4. scoped resource cleanup,
5. response-delivery ownership,
6. explicit deferred ownership,
7. runtime capability transparency,
8. server-and-edge portability.

Do not copy source code from another project.

When behavior is inspired by prior art, document the conceptual source in an ADR or design note.

---

## 12. Non-goals for v0.x

Do not add these without an approved ADR:

- durable workflows,
- queue infrastructure,
- cron scheduling,
- ORM or database abstraction,
- authentication platform,
- dependency-injection container,
- React or SSR integration,
- file-based routing,
- code generation,
- automatic cloud provisioning,
- custom JavaScript runtime,
- forced cancellation of arbitrary promises,
- exactly-once deferred work,
- transparent monkey-patching of global `fetch`,
- full OpenTelemetry platform,
- distributed task trees across service boundaries.

Trace propagation may be added later, but v0.x owns only in-process request lifetimes.

---

## 13. Codex working rules

When working in this repository:

1. Read this file and relevant ADRs before editing.
2. Inspect the current implementation and tests before proposing architecture changes.
3. Do not broaden the project into a workflow engine or application platform.
4. Prefer the smallest API that proves the lifetime model.
5. Add or update tests before declaring semantics complete.
6. Run formatting, type checking, unit tests, integration tests, and package checks.
7. Do not weaken strict TypeScript settings to make code compile.
8. Do not use `any` at public boundaries.
9. Do not swallow promise rejections or cleanup failures.
10. Do not create floating promises except inside adapter code that explicitly registers ownership.
11. Do not expose runtime-specific types from `packages/nelo`.
12. Add an ADR for any change to lifetime semantics.
13. Keep documentation honest about best-effort runtime behavior.
14. Preserve backward compatibility unless the current version explicitly permits a breaking change.
15. Report incomplete runtime behavior rather than emulating unsupported guarantees.

### Definition of done

A change is complete only when:

- public semantics are documented,
- unit tests pass,
- applicable adapter integration tests pass,
- TypeScript declaration output is correct,
- package exports are validated,
- examples compile,
- diagnostics remain actionable,
- no new unowned asynchronous work is introduced.

---

## 14. Recommended initial commands

Assume WSL Ubuntu 26.04 for local development.

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Use workspace scripts rather than entering individual package directories unless diagnosing a
package-specific issue.

---

## 15. First vertical slice

The first demonstration must prove a semantic difference, not merely routing.

Implement this example:

```ts
app.get("/dashboard", async (c) => {
  const user = c.fork("user", (signal) => fetchUser({ signal }));

  const feed = c.fork("feed", (signal) => fetchFeed({ signal }));

  return c.json({
    user: await user,
    feed: await feed,
  });
});
```

The integration test must:

1. open a real HTTP connection,
2. begin both child tasks,
3. disconnect the client before completion,
4. verify both tasks receive cancellation,
5. verify request resources are released,
6. verify no owned task remains after shutdown.

Then implement:

```ts
app.post("/event", async (c) => {
  c.defer("audit", (signal) => sendAudit({ signal }));
  return c.text("accepted", 202);
});
```

Verify that:

- the response completes first,
- deferred work remains tracked,
- graceful shutdown waits for it,
- timeout cancels it,
- rejection is reported.

If these examples do not work reliably, do not add more framework features.

---

## 16. Long-term success criteria

Nelo succeeds when a developer can move the same handler between Node.js and an edge runtime and
retain a documented, testable understanding of:

- who owns each task,
- when cancellation occurs,
- when resources are released,
- when delivery finishes,
- which work is allowed after the response,
- what happens during shutdown.

The project is not successful merely because it has a fast router.

Its value is that asynchronous work stops being ambient and becomes owned.
