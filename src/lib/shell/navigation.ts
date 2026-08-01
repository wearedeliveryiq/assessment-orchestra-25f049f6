import type { NavItem, NavSection, NavigationContext } from "./types";

/**
 * NavigationService — the single source of truth for platform navigation.
 *
 * Navigation is *data*, not JSX: modules register a section here (or the
 * `/api/navigation` endpoint serves one) and the shell renders whatever it is
 * given. Adding a module never means editing the shell components.
 */

export const NAVIGATION: NavSection[] = [
  {
    id: "platform",
    label: "Platform",
    items: [
      { id: "home", label: "Home", to: "/home", icon: "home" },
      {
        id: "workspace",
        label: "Workspace",
        to: "/workspaces",
        icon: "layers",
        matchPrefix: true,
      },
      {
        id: "knowledge-packs",
        label: "Knowledge Packs",
        to: "/internal/knowledge-packs",
        icon: "package",
        matchPrefix: true,
      },
      {
        id: "github-sync",
        label: "GitHub Sync",
        to: "/internal/github-sync",
        icon: "github",
        description: "Check your Lovable workspace GitHub connection status.",
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Intelligence",
    items: [
      {
        id: "assessments",
        label: "Assessments",
        to: "/sessions",
        icon: "clipboard",
        matchPrefix: true,
      },
      { id: "dashboard", label: "Dashboard", to: "/internal/runtime", icon: "gauge" },
      {
        id: "reports",
        label: "Reports",
        to: "/internal/narratives",
        icon: "file-text",
        matchPrefix: true,
      },
      {
        id: "notifications",
        label: "Notifications",
        to: "/notifications",
        icon: "bell",
        badgeKey: "notifications.unread",
      },
    ],
  },
  {
    id: "future",
    label: "Coming soon",
    items: [
      {
        id: "improvement-plans",
        label: "Improvement Plans",
        icon: "target",
        status: "planned",
        description: "Turn assessment findings into tracked delivery actions.",
      },
      {
        id: "teammates",
        label: "TeamMates",
        icon: "bot",
        status: "planned",
        description: "AI delivery assistants grounded in your assessments.",
      },
      {
        id: "marketplace",
        label: "Marketplace",
        icon: "store",
        status: "planned",
        description: "Discover and install partner knowledge packs.",
      },
      {
        id: "knowledge-studio",
        label: "Knowledge Studio",
        icon: "wand",
        status: "planned",
        description: "Author and publish your own assessment frameworks.",
      },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      {
        id: "administration",
        label: "Administration",
        to: "/organisations",
        icon: "shield",
        permission: "organisation.manage",
        matchPrefix: true,
      },
    ],
  },
];

function itemVisible(item: NavItem, context: NavigationContext): boolean {
  if (item.status === "planned" && context.includePlanned === false) return false;
  if (item.featureFlag && context.featureFlags?.[item.featureFlag] !== true) return false;
  if (item.permission && !(context.permissions ?? []).includes(item.permission)) return false;
  return true;
}

/**
 * Filters the registry for a caller. Sections that end up empty are dropped so
 * the sidebar never renders an orphan heading.
 */
export function buildNavigation(
  context: NavigationContext = {},
  sections: NavSection[] = NAVIGATION,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => itemVisible(item, context))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => itemVisible(child, context)),
        })),
    }))
    .filter((section) => section.items.length > 0);
}

export function flattenNavigation(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
}

export function findNavItem(id: string, sections: NavSection[] = NAVIGATION): NavItem | undefined {
  return flattenNavigation(sections).find((item) => item.id === id);
}

/** Active-state matching. Exact by default; prefix when the item opts in. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (!item.to) return false;
  if (item.to === "/") return pathname === "/";
  if (pathname === item.to) return true;
  return item.matchPrefix === true && pathname.startsWith(`${item.to}/`);
}

/** The module id owning a pathname — used for the workspace header. */
export function moduleForPath(pathname: string, sections: NavSection[] = NAVIGATION): NavItem | undefined {
  const candidates = flattenNavigation(sections).filter(
    (item) => item.to && (pathname === item.to || pathname.startsWith(`${item.to}/`)),
  );
  return candidates.sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0];
}
