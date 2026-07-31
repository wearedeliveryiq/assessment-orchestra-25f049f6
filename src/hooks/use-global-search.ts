import { useEffect, useMemo, useRef, useState } from "react";

import { NAVIGATION, buildNavigation, flattenNavigation } from "@/lib/shell/navigation";
import { recordShellEvent } from "@/lib/shell/audit";
import { globalSearch, registerSearchProvider } from "@/lib/shell/search";
import * as tenancy from "@/lib/tenancy/client";
import type { SearchProvider, SearchResult } from "@/lib/shell/types";

/**
 * Built-in providers. Reports, TeamMates and Marketplace register their own
 * later — the palette needs no change to display them.
 */

const navigationProvider: SearchProvider = {
  id: "navigation",
  label: "Navigation",
  kinds: ["navigation"],
  order: 0,
  search: async (query) => {
    const needle = query.toLowerCase();
    return flattenNavigation(buildNavigation({ includePlanned: false }, NAVIGATION))
      .filter((item) => item.to && item.label.toLowerCase().includes(needle))
      .map((item) => ({
        id: item.id,
        kind: "navigation" as const,
        title: item.label,
        subtitle: "Jump to module",
        href: item.to as string,
        score: 10,
      }));
  },
};

const tenancyProvider: SearchProvider = {
  id: "tenancy",
  label: "Workspaces & people",
  kinds: ["workspace", "organisation", "user"],
  order: 10,
  search: async (query) => {
    const results = await tenancy.searchTenancy(query);
    return [
      ...results.workspaces.map((workspace) => ({
        id: workspace.id,
        kind: "workspace" as const,
        title: workspace.name,
        subtitle: "Workspace",
        href: `/workspaces/${workspace.id}`,
      })),
      ...results.organisations.map((organisation) => ({
        id: organisation.id,
        kind: "organisation" as const,
        title: organisation.name,
        subtitle: "Organisation",
        href: `/organisations/${organisation.id}`,
      })),
      ...results.members.map((member) => ({
        id: member.id,
        kind: "user" as const,
        title: member.displayName || member.email,
        subtitle: member.email,
        href: `/organisations/${member.organisationId}`,
      })),
    ];
  },
};

let registered = false;
function ensureDefaultProviders(): void {
  if (registered) return;
  registered = true;
  registerSearchProvider(navigationProvider);
  registerSearchProvider(tenancyProvider);
}

/** GlobalSearch hook: debounced, cancellable, provider-agnostic. */
export function useGlobalSearch(delay = 200) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    ensureDefaultProviders();
  }, []);

  useEffect(() => {
    const query = term.trim();
    controller.current?.abort();

    if (query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const abort = new AbortController();
    controller.current = abort;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const found = await globalSearch(query, { signal: abort.signal, limit: 24 });
        if (!abort.signal.aborted) {
          setResults(found);
          recordShellEvent("search.performed", { query, results: found.length });
        }
      } finally {
        if (!abort.signal.aborted) setIsSearching(false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [term, delay]);

  return useMemo(
    () => ({ term, setTerm, results, isSearching, clear: () => setTerm("") }),
    [term, results, isSearching],
  );
}
