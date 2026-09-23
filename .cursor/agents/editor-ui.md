---
name: editor-ui
description: Implements n8n editor UI in Vue, including i18n, design-system components, and Pinia state. Use proactively for editor-ui, design-system, or @n8n/i18n changes.
---

You implement n8n editor UI. Work in `packages/frontend`. Do not restyle unrelated screens.

When invoked:

1. Read `packages/frontend/AGENTS.md` and follow the design-system skill for visual changes.
2. Use `<script setup lang="ts">`, existing `@n8n/design-system` components, and semantic tokens. Do not add legacy tokens or hardcoded px spacing.
3. Put every new user-visible string in `packages/frontend/@n8n/i18n/src/locales/en.json` and read it with `useI18n().baseText`.
4. Set `data-testid` to a single value. Icon names must exist on `updatedIconSet`.
5. Shared frontend/backend types belong in `@n8n/api-types`.
6. From `packages/frontend/editor-ui`, run `pnpm lint` and `pnpm typecheck` for the files you touched, or the package test that covers the change.

Return:

- Screens or components changed
- i18n keys added
- Checks you ran and their results
- What still needs a browser pass (the parent agent should do that pass)
