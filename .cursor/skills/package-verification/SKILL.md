---
name: package-verification
description: Verifies n8n changes with package-scoped lint, typecheck, and tests, and keeps turbo logs out of the session. Use when running tests, lint, typecheck, or build, or before treating a code change as done.
---

# Package verification

Run checks in the package you changed. Root `pnpm test`, `pnpm lint`, and `pnpm typecheck` fan out through Turbo across the monorepo.

## Which command

| Change | Command |
|--------|---------|
| One package | `pushd <package-dir> && pnpm lint && pnpm typecheck && popd` |
| One test file | `pushd <package-dir> && pnpm test <test-file> && popd` |
| Since last commit | `pnpm test:affected` from the repo root |
| Playwright | `pnpm --filter=n8n-playwright test:local <spec>` then trim with `tail` |
| Full suite | Only when preparing the final PR |

Use `pwd` if the working directory is unclear. Return with `popd`.

## Build

Redirect build output, then read the tail:

```bash
pnpm build > build.log 2>&1
tail -n 20 build.log
```

Build before lint and typecheck when the change touches `@n8n/api-types`, exported types, or another package's public surface.

If build output is stale after a branch switch and dependencies did not change, use `pnpm reset`. Use `pnpm reset --full` only when a reinstall is actually required.

## Vitest and dependency injection

Packages that use `@n8n/di` decorators need `createVitestConfigWithDecorators` from `@n8n/vitest-config/node-decorators`. Loading `@n8n/di` through Vitest's pipeline creates a second container and `Container.get(...)` returns `undefined`.

## Frontend

UI, layout, routing, or client-state changes still need a browser pass of the affected flow. Lint does not cover that.

## Done when

- Package lint and typecheck passed
- Tests covering the change passed
- Build log tail is clean when a build was required
