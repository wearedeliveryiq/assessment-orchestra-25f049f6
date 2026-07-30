import { Filter, RotateCcw, Search } from "lucide-react";

import { useDashboard } from "@/lib/dashboard/dashboard-provider";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-xs normal-case tracking-normal text-foreground outline-none transition-colors focus-visible:border-primary"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Dashboard filter bar — presentation-only projection controls. */
export function DashboardFilters() {
  const { data, filters, setFilter, resetFilters, filtersActive } = useDashboard();
  if (!data) return null;
  const options = data.filterOptions;

  return (
    <section className="ribbon-panel rounded-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex min-w-0 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground lg:col-span-2">
          <span className="flex items-center gap-1.5">
            <Search className="h-3 w-3" aria-hidden /> Search
          </span>
          <input
            value={filters.query}
            onChange={(event) => setFilter("query", event.target.value)}
            placeholder="Filter by keyword…"
            className="h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-xs normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary"
          />
        </label>
        <Select
          label="Capability"
          value={filters.capability}
          options={options.capabilities}
          onChange={(value) => setFilter("capability", value)}
        />
        <Select
          label="Severity"
          value={filters.severity}
          options={options.severities.map((severity) => ({ value: severity, label: severity }))}
          onChange={(value) => setFilter("severity", value as typeof filters.severity)}
        />
        <Select
          label="Priority"
          value={filters.priority}
          options={options.priorities.map((priority) => ({ value: priority, label: priority }))}
          onChange={(value) => setFilter("priority", value as typeof filters.priority)}
        />
        <Select
          label="Horizon"
          value={filters.horizon}
          options={options.horizons.map((horizon) => ({ value: horizon, label: horizon }))}
          onChange={(value) => setFilter("horizon", value as typeof filters.horizon)}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          {filtersActive ? "Filtered view" : "Showing all runtime output"}
        </span>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!filtersActive}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
        </button>
      </div>
    </section>
  );
}
