# ADR 0001: Request-ownership execution core

- Status: Accepted
- Date: 2026-07-19

## Context

Nelo needs an HTTP-independent ownership boundary before routing or production runtime adapters. A
handler returning a value must not allow framework-owned asynchronous work or resources to become
untracked.

The first executable host is Deno, but the core uses only Web Standards and TypeScript disposal
protocols. It does not expose Deno, Node.js, or Cloudflare types.

## Decision

`LifetimeScope.execute` owns one operation. `RequestScope` specializes the root name without adding
HTTP dependencies. While open, a scope can:

- create eager owned work with `fork(name, operation)`;
- create explicit child scopes whose ancestry is retained;
- acquire a disposable resource with `use(name, acquire, cleanup?)`;
- register explicit cleanup callbacks;
- observe cooperative cancellation through one `AbortSignal`.

An `OwnedTask` is awaitable. Awaiting or joining it records observation. An unobserved task is a
`NELO_TASK_001` error and is cancelled at scope completion. Rejections are always observed
internally, so diagnostics do not create unhandled promise rejections. Requesting cancellation does
not mark a task settled.

The first cancellation reason wins. Parent cancellation propagates to active child scopes and owned
tasks. Cancellation remains cooperative: Nelo does not claim it can stop arbitrary promises.

Owned work settles before resources are released. Resources close once in reverse acquisition order.
A primary operation failure remains the `cause`; additional task and cleanup failures are retained
in an `AggregateError`.

## Consequences and limits

- The execution core can be tested without HTTP or production timers.
- Task snapshots expose names, ancestry, observation, cancellation request, and settlement state.
- A task that ignores cancellation can still delay scope completion.
- Ownership transfer is not public until a later `DeferredScope` defines a real receiver.
- Delivery, Deferred, and Shutdown scopes remain later-phase work.
