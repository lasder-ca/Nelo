# AGENTS.md — Nelo website

## Scope

This branch is the source for `nelo.lattee.jp`. Do not add the Nelo runtime implementation, package build, Deno configuration, transport tests, or release tooling here.

The runtime belongs on `main` and is consumed by this website through the published `nelo` npm package.

## Commands

Run commands from `website/`:

```bash
npm install
npm run typecheck
npm run build
```

Keep the existing Next.js structure, multilingual behavior, accessibility, and Vercel deployment configuration intact.
