---
description: Audit a file (or all of apps/web/src) for theme-system violations
argument-hint: "[file path — optional, defaults to apps/web/src]"
---

Audit `$ARGUMENTS` (default: `apps/web/src`) for violations of the theme rules in `.cursorrules`:

1. **`dark:` prefixes** — must not exist anywhere. Grep for `dark:`.
2. **Hardcoded hex colors** — grep for `#[0-9a-fA-F]{3,8}` in className strings.
3. **`text-neutral-*` / `bg-neutral-*` for theming** — should use semantic tokens (`text-muted`, `bg-surface`, etc.). The exception `bg-neutral-900 text-white` for avatar circles is allowed.
4. **Status colors not using surface pairs** — e.g. `text-red-500` instead of `text-error` + `bg-error-surface`.

Report findings as a table: file:line | issue | suggested fix. Do not edit anything yet — just report. After report, ask if I want auto-fixes applied.
