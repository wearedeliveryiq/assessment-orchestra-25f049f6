/** DeliveryIQ brand lockup — the ribbon mark plus wordmark. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="ribbon-bar flex h-8 w-8 items-center justify-center rounded-md">
        <span className="font-display text-sm font-bold text-primary-foreground">D</span>
      </span>
      <span className="font-display text-base font-semibold tracking-tight">
        Delivery<span className="text-gradient-ribbon">IQ</span>
      </span>
    </span>
  );
}
