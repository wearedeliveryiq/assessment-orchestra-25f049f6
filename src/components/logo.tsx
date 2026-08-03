import { Ribbon } from "@/components/ribbon";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  onNavy = false,
  stacked = false,
}: {
  compact?: boolean;
  onNavy?: boolean;
  stacked?: boolean;
}) {
  const wordmark = (
    <span
      className={cn(
        "font-display text-xl font-extrabold tracking-tight",
        onNavy ? "text-white" : "text-foreground",
      )}
    >
      Delivery<span className="text-[color:var(--brand-blue)]">IQ</span>
    </span>
  );

  if (stacked) {
    return (
      <span className="flex flex-col items-center gap-3">
        <Ribbon className="size-12 shrink-0" alt="" />
        <span className="flex flex-col items-center gap-1">
          {wordmark}
          <span
            className={cn(
              "text-[0.7rem] font-medium tracking-wide",
              onNavy ? "text-white/70" : "text-muted-foreground",
            )}
          >
            <span className="text-[color:var(--brand-blue)]">Smarter</span> project delivery.
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <Ribbon className="size-9 shrink-0" alt="" />
      {compact ? null : wordmark}
    </span>
  );
}
