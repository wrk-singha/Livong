---
description: "Use when editing React/TypeScript frontend files under apps/web/. Covers component patterns, styling with centralized theme tokens, state management, and API usage."
applyTo: "apps/web/**"
---

# Frontend Rules

## File Locations

| What | Where |
|------|-------|
| Pages | `src/app/{route}/page.tsx` |
| Components | `src/components/` |
| Contexts | `src/contexts/` |
| API client | `src/lib/api.ts` |
| Types | `src/lib/types.ts` |
| Constants | `src/lib/constants.ts` |
| Theme & utilities | `src/app/globals.css` |

## Component Pattern

Every page follows this exact structure:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth"
import { api } from "@/lib/api"
import type { SomeType } from "@/lib/types"

export default function PageName() {
  const { token, userId } = useAuth()
  const [items, setItems] = useState<SomeType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSomething()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>...</div>
  return <div className="page-container py-6">...</div>
}
```

## Do / Don't

| Do | Don't |
|----|-------|
| `"use client"` on every page | Server components |
| `import { api } from "@/lib/api"` | `fetch()` directly in components |
| `import type { X } from "@/lib/types"` | Define types inline in page files |
| `export default function Page()` | `export const Page = () =>` for pages |
| Named exports for utilities/hooks | Default exports for non-page modules |
| `useAuth()` for auth state | Read localStorage directly |
| `useTheme()` for theme state | Read DOM classes directly |
| `as const` on constant objects | Plain objects for enums |

## Styling — Centralized Theme Tokens

All colors come from CSS variables in `globals.css`. Components use semantic Tailwind classes.

### Color classes to use

```
bg-background    bg-surface    bg-surface-alt    bg-primary
text-foreground  text-secondary  text-muted  text-dim  text-faint
border-border    border-border-light
bg-error-surface    text-error    border-error-border
bg-success-surface  text-success-text  border-success-border
bg-warning-surface  text-warning  border-warning-border
bg-info-surface     text-info     border-info-border
```

### FORBIDDEN

- `dark:` prefix on any class — colors auto-switch via CSS variables
- Hardcoded hex colors (`#171717`, `rgb(23,23,23)`)
- Raw Tailwind color scales for theming (`text-neutral-500`, `bg-gray-100`)
- Exception: `bg-neutral-900 text-white` is allowed for avatar circles and fixed dark elements

### Utility classes from globals.css

- `.btn-primary` — primary button (bg-primary, white text, hover/active/disabled states)
- `.card` — card container (bg-surface, border, hover shadow)
- `.input` — form input (bg-surface, border, focus ring)
- `.page-container` — responsive page width with padding
- `.animate-fade-in-up`, `.animate-slide-in`, `.animate-fade-in` — animations
- `.stagger` — stagger children animations

### Adding a new color

Must update all three in `globals.css`:
1. `:root { --new-color: #value; }`
2. `.dark { --new-color: #dark-value; }`
3. `@theme inline { --color-new-color: var(--new-color); }`

## Icons

- Inline SVGs only — no icon library
- Always `stroke="currentColor"` — inherits from parent text class
- Control icon color by setting text class on parent: `<div className="text-dim"><svg ...></div>`
- Common sizes: `width="14"`, `width="16"`, `width="20"`, `width="22"`, `width="24"`

## Responsive

- Mobile-first approach
- Breakpoints: `md:` (768px), `lg:` (1024px)
- Navigation: sidebar on `lg:`, bottom nav on mobile (both in AppShell.tsx)
- Page content: `.page-container` handles responsive widths

## State

- Auth: `useAuth()` → `{ token, userId, isAuthenticated, hydrated, login, logout }`
- Theme: `useTheme()` → `{ theme, toggle }`
- Wait for `hydrated` before rendering auth-dependent UI
- No external state libraries — use React `useState` + Context
