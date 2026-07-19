# ADR 0002: Rename project to Nelo and define request ownership as the public model

- Status: Accepted
- Date: 2026-07-19

## Context

The project needs one stable public identity and a description that states what the implemented
Phase 1 and Phase 2 semantics actually guarantee. The earlier identity was provisional, while some
language overemphasized a request's duration instead of ownership of its work.

## Decision

The product name is **Nelo**, the default package name is `nelo`, and the preferred scoped fallback
is `@latteworkspace/nelo`. The tagline is:

> Every request owns its work.

The category description is:

> A request-ownership runtime and Web Standards framework for TypeScript.

The main application API is:

```ts
import { Nelo } from "nelo";

const app = new Nelo();
```

Branding does not replace semantic terminology. Public and internal types retain descriptive names
such as `LifetimeScope`, `RequestScope`, `OwnedTask`, `ResourceStack`, and `CancellationReason`.
Diagnostics use stable `NELO_*` prefixes.

Phase 2's `app.fetch(Request)` boundary owns handler, middleware, task, cancellation, and resource
cleanup. It does not own portable response delivery after `fetch` returns. Delivery, deferred work,
graceful shutdown, and production runtime disconnect behavior require later adapter phases.

## Consequences

- Repository metadata, imports, documentation, examples, tests, and diagnostics use Nelo.
- The package remains unpublished; availability of either npm name is not asserted.
- Marketing must describe cooperative cancellation and must not imply forced cancellation, durable
  background execution, exactly-once work, or complete runtime equivalence.
