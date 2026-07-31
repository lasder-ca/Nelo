# ADR 0005: Request deadlines are derived, scope-owned signals

- Status: Accepted
- Date: 2026-07-31

## Context

A request often needs a budget shorter than the full connection lifetime. Calling APIs with an
independent `AbortSignal.timeout()` loses Nelo's typed cancellation reason and can leave a timer
alive after the handler has finished. Cancelling the entire request scope whenever one operation
reaches a deadline is also too broad: a handler may recover, return a fallback, or continue
unrelated work.

The deadline API therefore needs to compose with request cancellation without pretending that
JavaScript can forcibly stop non-cooperative work.

## Decision

`context.deadline(duration)` and `LifetimeScope#deadline(duration)` create a `RequestDeadline` with:

- a derived `AbortSignal`;
- an absolute `deadline` timestamp in Unix milliseconds;
- a normalized millisecond `duration`;
- synchronous, idempotent disposal through `Symbol.dispose`;
- automatic registration in the current lifetime scope.

Durations accept a non-negative number of milliseconds or a string using `ms`, `s`, `m`, or `h`.
Fractional values are rounded up to avoid firing earlier than requested. Invalid values fail with
`NELO_SCOPE_007`.

The derived signal aborts for either of two reasons:

1. the parent request signal aborts, in which case its typed reason is preserved;
2. the deadline expires, in which case the reason is
   `{ type: "deadline", deadline: <absolute timestamp> }`.

The first reason wins. A deadline never aborts its parent scope. Disposing it clears its timer and
parent listener without inventing a cancellation reason. Scope closure disposes deadlines even when
a handler does not use an explicit `using` declaration.

Long durations are scheduled in bounded chunks so the implementation does not rely on runtime
behavior for timer delays above the signed 32-bit range.

## Consequences

Handlers can pass a deadline signal to one cooperative operation and decide how to handle expiry.
Request disconnect and shutdown still reach the operation through the same signal. Timers cannot
outlive their request scope, and code may release them earlier with `using`.

A deadline does not stop arbitrary promises, terminate processes, or make external operations
transactional. Operations must observe the supplied signal, and adapters continue to report their
actual cancellation capabilities.
