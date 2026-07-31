import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { useEffect } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { groupResultsByKind } from "@/lib/shell/search";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Command palette over the pluggable global search framework (⌘K / Ctrl-K). */
export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { term, setTerm, results, isSearching, clear } = useGlobalSearch();

  useEffect(() => {
    if (!open) clear();
  }, [open, clear]);

  const groups = groupResultsByKind(results);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={term}
        onValueChange={setTerm}
        placeholder="Search workspaces, people, knowledge packs…"
      />

      <CommandList>
        {isSearching ? (
          <div className="flex items-center gap-2 px-4 py-6 text-caption text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Searching…
          </div>
        ) : null}

        {!isSearching && term.trim().length < 2 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-caption text-muted-foreground">
            <Search className="h-3.5 w-3.5" aria-hidden />
            Type at least two characters to search.
          </div>
        ) : null}

        {!isSearching && term.trim().length >= 2 && results.length === 0 ? (
          <CommandEmpty>No results for “{term}”.</CommandEmpty>
        ) : null}

        {groups.map((group) => (
          <CommandGroup key={group.kind} heading={group.label}>
            {group.items.map((result) => (
              <CommandItem
                key={`${result.kind}-${result.id}`}
                value={`${result.title} ${result.subtitle ?? ""} ${result.kind}`}
                onSelect={() => {
                  onOpenChange(false);
                  void navigate({ to: result.href });
                }}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{result.title}</span>
                  {result.subtitle ? (
                    <span className="truncate text-caption text-muted-foreground">{result.subtitle}</span>
                  ) : null}
                </span>
                <CornerDownLeft className="h-3 w-3 opacity-50" aria-hidden />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
