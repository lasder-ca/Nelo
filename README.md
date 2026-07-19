# Nelo

> Every request owns its work.

Nelo is a request-ownership runtime and Web Standards framework for TypeScript.
It keeps child tasks, cancellation, and scoped resources inside an explicit request boundary.

## Why Nelo

JavaScript runtimes increasingly share `Request`, `Response`, `ReadableStream`, and `AbortSignal`, but they still disagree on what it means for a request to be finished.

A handler may return while child tasks are still running. A client may disconnect while database work continues. Resources may survive longer than the request that created them. Background promises may fail without an owner.

Nelo gives that work a structure:

```text
Request Scope
├── owned tasks
├── cancellation
├── scoped resources
├── response delivery
└── deferred work
```

The core rule is simple:

> Work created for a request must be awaited, cancelled, released, or explicitly transferred.

## Example

```ts
import { Nelo } from "nelo"

const app = new Nelo()

app.get("/dashboard", async (c) => {
  const user = c.fork("user", (signal) =>
    fetchUser({ signal }),
  )

  const feed = c.fork("feed", (signal) =>
    fetchFeed({ signal }),
  )

  return c.json({
    user: await user,
    feed: await feed,
  })
})

export default app
```

## Core model

### Owned tasks

`c.fork()` creates work owned by the current request. Unjoined work can be detected instead of silently becoming a floating promise.

### Cooperative cancellation

Client disconnects, deadlines, handler failures, and shutdown can propagate through one `AbortSignal`-based model. Nelo does not claim to forcibly stop arbitrary promises.

### Scoped resources

Resources registered with the request are released in reverse order on success, failure, or cancellation.

### Web Standards first

The portable core uses standard platform types:

- `Request`
- `Response`
- `Headers`
- `URL`
- `ReadableStream`
- `AbortSignal`

Runtime-specific behavior belongs in adapters rather than leaking into application handlers.

## Project status

Nelo is an early-stage project. The current focus is:

- request-owned task trees
- typed cancellation reasons
- deterministic resource cleanup
- a minimal Fetch-style application API
- runtime capability transparency

Production runtime adapters, complete response-delivery tracking, durable background jobs, and exactly-once execution are not yet claimed.

## Design principles

- ordinary `async` / `await`
- Web Standards at the HTTP boundary
- explicit ownership instead of ambient asynchronous work
- honest runtime capability reporting
- small portable core
- strict TypeScript

## License

Apache License 2.0.
