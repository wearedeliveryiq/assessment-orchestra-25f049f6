import { cn } from "@/lib/utils";
import { SignalMark } from "@/components/brand/signal-mark";

/** The DeliveryIQ lockup — mark plus wordmark, used once per screen. */
export function Logo({
  withStrapline = false,
  className,
}: {
  withStrapline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <SignalMark className="size-8" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.3125rem] font-extrabold tracking-tight text-foreground">
          Delivery<span className="text-[color:var(--brand-signal)]">IQ</span>
        </span>
        {withStrapline ? (
          <span className="mt-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
            Smarter project delivery.
          </span>
        ) : null}
      </span>
    </span>
  );
}
