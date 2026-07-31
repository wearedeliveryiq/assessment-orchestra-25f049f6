# Application Shell, Navigation & Design System

The shell is a **platform capability**. It owns navigation, layout, theming,
preferences, notifications, search and shared UI — and contains no assessment,
reporting or TeamMate logic.

## Layout

`PlatformShell` composes: top bar → left navigation → workspace header →
content → optional right context panel → minimal footer.

```tsx
import { PlatformShell } from "@/components/shell/platform-shell";

<PlatformShell title="Assessments" actions={<Button>New</Button>} contextPanel={<Evidence />}>
  {page}
</PlatformShell>
```

The legacy `AppShell` now delegates here, so existing pages inherit the shell.

## Services (`src/lib/shell/`)

| Service | File | Responsibility |
| --- | --- | --- |
| NavigationService | `navigation.ts` | Data-driven nav registry, permission/flag filtering, active matching |
| BreadcrumbService | `route-registry.ts` | Route metadata, guards, page titles, automatic trails |
| ThemeService | `theme.ts` | dark/light/system resolution, document classes, OS watching |
| UserPreferencesService | `preferences.ts` + `.server.ts` | Defaults, coercion, formatting, persistence |
| NotificationCentreService | `notifications.ts` + `.server.ts` | Classification, grouping, unread counts, read/dismiss |
| GlobalSearchService | `search.ts` | Pluggable provider registry, merge + ranking |
| LayoutService | `layout.ts` | Breakpoints and responsive region rules |
| ComponentRegistryService | `component-registry.ts` | Slot-based UI extension points |
| Shell audit | `audit.ts` | Buffered navigation/theme/preference/notification events |

## Adding a module

1. Add an entry to `NAVIGATION` in `src/lib/shell/navigation.ts` (with `permission`
   or `featureFlag` if gated; `status: "planned"` renders a disabled placeholder).
2. Add its routes to `ROUTE_REGISTRY` in `src/lib/shell/route-registry.ts` for
   titles, breadcrumbs and guards.
3. Optionally register a `SearchProvider` and slot components.

No shell component changes are required.

## Design tokens

All colour, typography, spacing, radius, elevation and motion values live in
`src/styles.css`. Components use semantic utilities (`bg-surface`,
`text-muted-foreground`, `text-h2`, `shadow-level-2`) — never hard-coded colours.
Light theme, high contrast and reduced motion are class overrides on `<html>`
applied by `ThemeService`.

## Accessibility

Skip link, one `<main>` per page, visible focus rings, 44px minimum tap targets,
`aria-current` on active nav, labelled icon-only buttons, Radix primitives for
focus trapping, and honoured `prefers-reduced-motion`.

## REST API

| Endpoint | Purpose |
| --- | --- |
| `GET/PUT /api/user/preferences` | Read and patch preferences |
| `GET /api/notifications` | Feed plus unread count |
| `PUT /api/notifications/read` | Mark ids (or all) read |
| `DELETE /api/notifications` | Dismiss ids (or all) |
| `GET /api/navigation` | Navigation metadata for the caller |
| `POST /api/shell/audit` | Batched shell interaction events |

## Tests

`tests/shell.test.ts` covers navigation filtering and active matching,
breadcrumb generation, route guards, theme resolution, preference
normalisation/formatting, notification classification and grouping, search
provider merge/ranking/failure isolation, responsive layout rules and the
component registry.
