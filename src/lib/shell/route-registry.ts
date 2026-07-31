import type { Crumb, RouteMeta } from "./types";

/**
 * Route registry + BreadcrumbService.
 *
 * Routes declare their metadata here rather than inside components, so titles,
 * breadcrumbs, guards and feature flags can be reasoned about (and tested)
 * without rendering anything.
 */

export const ROUTE_REGISTRY: RouteMeta[] = [
  { path: "/", title: "DeliveryIQ", breadcrumb: "Home", requiresAuth: false },
  { path: "/home", title: "Home", module: "home", requiresAuth: true },
  { path: "/workspaces", title: "Workspaces", module: "workspace", requiresAuth: true },
  { path: "/workspaces/$id", title: "Workspace", module: "workspace", requiresAuth: true },
  { path: "/organisations", title: "Administration", module: "administration", requiresAuth: true, permission: "organisation.manage" },
  { path: "/organisations/$id", title: "Organisation", module: "administration", requiresAuth: true, permission: "organisation.manage" },
  { path: "/sessions", title: "Assessments", module: "assessments", requiresAuth: true },
  { path: "/sessions/new", title: "New assessment", module: "assessments", requiresAuth: true },
  { path: "/sessions/$id", title: "Assessment", module: "assessments", requiresAuth: true },
  { path: "/assess", title: "Assessment runtime", module: "assessments", requiresAuth: true },
  { path: "/assess/$id", title: "In progress", module: "assessments", requiresAuth: true },
  { path: "/internal", title: "Internal", hidden: true, requiresAuth: true },
  { path: "/internal/knowledge-packs", title: "Knowledge Packs", module: "knowledge-packs", requiresAuth: true },
  { path: "/internal/knowledge-packs/$id", title: "Knowledge Pack", module: "knowledge-packs", requiresAuth: true },
  { path: "/internal/runtime", title: "Dashboard", module: "dashboard", requiresAuth: true },
  { path: "/internal/narratives", title: "Reports", module: "reports", requiresAuth: true },
  { path: "/internal/narratives/$id", title: "Report", module: "reports", requiresAuth: true },
  { path: "/internal/audit", title: "Audit", module: "administration", requiresAuth: true },
  { path: "/notifications", title: "Notifications", module: "notifications", requiresAuth: true },
  { path: "/settings", title: "Settings", module: "settings", requiresAuth: true },
  { path: "/account", title: "Account", module: "settings", requiresAuth: true },
  { path: "/design-system", title: "Design system", module: "settings", requiresAuth: false },
  { path: "/auth/login", title: "Sign in", requiresAuth: false },
  { path: "/auth/register", title: "Create account", requiresAuth: false },
];

const SEGMENT_LABELS: Record<string, string> = {
  internal: "Internal",
  api: "API",
  auth: "Account",
};

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Pattern match allowing `$param` to absorb one segment. */
export function matchRoute(pathname: string, registry: RouteMeta[] = ROUTE_REGISTRY): RouteMeta | undefined {
  const actual = segmentsOf(pathname);
  const candidates = registry.filter((route) => {
    const expected = segmentsOf(route.path);
    if (expected.length !== actual.length) return false;
    return expected.every((segment, index) => segment.startsWith("$") || segment === actual[index]);
  });
  // Prefer the most literal match when a static and dynamic route both fit.
  return candidates.sort(
    (a, b) => segmentsOf(a.path).filter((s) => s.startsWith("$")).length -
      segmentsOf(b.path).filter((s) => s.startsWith("$")).length,
  )[0];
}

export function titleForPath(pathname: string, registry: RouteMeta[] = ROUTE_REGISTRY): string {
  return matchRoute(pathname, registry)?.title ?? "DeliveryIQ";
}

export function humanise(segment: string): string {
  const decoded = decodeURIComponent(segment);
  if (SEGMENT_LABELS[decoded]) return SEGMENT_LABELS[decoded];
  // UUIDs and long opaque ids read badly in a trail.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(decoded)) return `${decoded.slice(0, 8)}…`;
  return decoded
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export interface BreadcrumbOptions {
  registry?: RouteMeta[];
  /** Overrides for dynamic segments, keyed by the resolved path. */
  labels?: Record<string, string>;
  /** Root crumb; pass null to omit. */
  root?: { label: string; href: string } | null;
}

/**
 * Derives a breadcrumb trail from the pathname and route metadata — never from
 * hand-written arrays in page components.
 */
export function buildBreadcrumbs(pathname: string, options: BreadcrumbOptions = {}): Crumb[] {
  const registry = options.registry ?? ROUTE_REGISTRY;
  const root = options.root === undefined ? { label: "Home", href: "/home" } : options.root;
  const segments = segmentsOf(pathname);

  const crumbs: Crumb[] = [];
  if (root && pathname !== root.href) {
    crumbs.push({ label: root.label, href: root.href, current: false });
  }

  let accumulated = "";
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;
    const meta = matchRoute(accumulated, registry);
    if (meta?.hidden) return;

    const isLast = index === segments.length - 1;
    const label = options.labels?.[accumulated] ?? meta?.breadcrumb ?? meta?.title ?? humanise(segment);
    if (root && accumulated === root.href) {
      if (isLast && crumbs.length > 0) crumbs[crumbs.length - 1].current = true;
      return;
    }

    crumbs.push({ label, href: isLast ? undefined : accumulated, current: isLast });
  });

  if (crumbs.length > 0) crumbs[crumbs.length - 1].current = true;
  return crumbs;
}

/** Guard evaluation for the route registry — used by shell route wrappers. */
export function routeAccess(
  meta: RouteMeta | undefined,
  context: { isAuthenticated: boolean; permissions?: string[]; featureFlags?: Record<string, boolean> },
): { allowed: boolean; reason?: "unauthenticated" | "forbidden" | "disabled" } {
  if (!meta) return { allowed: true };
  if (meta.requiresAuth && !context.isAuthenticated) return { allowed: false, reason: "unauthenticated" };
  if (meta.featureFlag && context.featureFlags?.[meta.featureFlag] !== true) {
    return { allowed: false, reason: "disabled" };
  }
  if (meta.permission && !(context.permissions ?? []).includes(meta.permission)) {
    return { allowed: false, reason: "forbidden" };
  }
  return { allowed: true };
}
