import { cn } from "@/lib/utils";

/** The approved DeliveryIQ mark. Geometry is fixed — never substitute or alter it. */
export function SignalMark({
  className,
  contained = false,
}: {
  className?: string;
  contained?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="diq-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4DA3FF" />
          <stop offset="100%" stopColor="#0B6BFF" />
        </linearGradient>
      </defs>
      {contained ? <circle cx="24" cy="24" r="24" fill="#0B1324" /> : null}
      <g
        stroke="url(#diq-mark)"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M17.5 11.5 L32.5 23" />
        <path d="M17.5 36.5 L32.5 25" />
        <path d="M10.5 26 L13.5 22.5" />
      </g>
    </svg>
  );
}
