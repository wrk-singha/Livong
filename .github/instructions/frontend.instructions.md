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

Use TanStack Query for all data fetching — not raw `useEffect` + `useState`:

```tsx
"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth"
import { api } from "@/lib/api"
import type { SomeType } from "@/lib/types"
import { PageSpinner, EmptyState } from "@/components/ui"

export default function PageName() {
  const { token, userId } = useAuth()

  const { data: items = [], isLoading } = useQuery<SomeType[]>({
    queryKey: ["items"],
    queryFn: () => api.getItems(),
  })

  const mutation = useMutation({
    mutationFn: (data: CreateInput) => api.createItem(data),
    onSuccess: () => { /* invalidate, redirect, etc. */ },
    onError: (err) => { /* handle error */ },
  })

  if (isLoading) return <PageSpinner />
  if (!items.length) return <EmptyState icon={...} title="..." subtitle="..." />
  return <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">...</div>
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
| `useProfile()` for profile state | Fetch profile manually |
| `useTheme()` for theme state | Read DOM classes directly |
| `useQuery` / `useMutation` for API calls | Raw `useEffect` + `useState` for data fetching |
| `as const` on constant objects | Plain objects for enums |

## Reusable UI Components

Import from `@/components/ui`:

| Component | Use for |
|-----------|---------|
| `Button` | All buttons (supports `loading`, `fullWidth`, `size`, `variant`) |
| `Input` | Text/number inputs with label |
| `TextArea` | Multi-line text input with label |
| `Select` | Dropdown select with label |
| `Alert` | Error/warning messages |
| `Modal` | Dialog overlays |
| `Spinner` / `PageSpinner` | Loading states (inline / full-page) |
| `EmptyState` | Zero-data states with icon, title, subtitle, action |
| `Avatar` | User avatars |
| `Badge` | Status badges |
| `Skeleton` / `SkeletonCard` | Loading placeholders |
| `BackButton` | Navigation back button |
| `VerifiedBadge` | Verified user indicator |
| `StarRatingDisplay` / `StarRatingPicker` | Review star ratings |

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
- Main pages: `max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto` with `px-4 py-6 md:px-8 lg:px-10`
- Form pages: `max-w-sm md:max-w-lg lg:max-w-xl mx-auto`
- Chat: intentionally narrow (`lg:max-w-3xl`, messenger layout)

## State

- Auth: `useAuth()` → `{ token, userId, isAuthenticated, hydrated, login, logout }`
- Profile: `useProfile()` → `{ profile, loading, hasProfile, setProfile, clearProfile }`
- Theme: `useTheme()` → `{ theme, toggle }`
- Wait for `hydrated` before rendering auth-dependent UI
- No external state libraries — use React `useState` + Context
- Data fetching: TanStack Query v5 (`@tanstack/react-query`)
