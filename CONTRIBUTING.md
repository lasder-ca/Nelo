# Contributing to Nelo

Keep changes focused, reviewable, and compatible with Nelo's request-ownership model. Public Web APIs
must stay portable; Node-only behavior belongs under `src/node` and the `nelo/node` export.

## Setup

```sh
git clone https://github.com/lasder-ca/Nelo.git
cd Nelo
npm ci
```

## Required checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run check:package
npm run check:tarball
```

Node adapter changes that depend on sockets, disconnects, streaming, backpressure, headers, or
shutdown should include real Node socket tests. Lifetime changes should cover cancellation, cleanup,
unjoined work, and diagnostics.

Do not loosen request parsing or trust proxy headers implicitly. Do not expose secrets to dependency
installation or build steps in release workflows. Security vulnerabilities belong in a private
security advisory, not a public issue.
