import { cn } from "@/lib/utils";

/**
 * The Delivery Signal: scattered delivery evidence on the left converging into
 * one clear, prioritised signal on the right. The product's visual argument.
 */
export function SignalConverge({ className }: { className?: string }) {
  const inputs = [18, 42, 66, 90, 114, 138, 162, 186];
  return (
    <svg
      viewBox="0 0 480 204"
      role="img"
      aria-label="Scattered delivery evidence converging into a single prioritised signal"
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <linearGradient id="diq-signal-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0B6BFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0B6BFF" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="diq-signal-strong" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0B6BFF" />
          <stop offset="100%" stopColor="#4DA3FF" />
        </linearGradient>
      </defs>
      {inputs.map((y, i) => (
        <path
          key={y}
          d={`M8 ${y} C 150 ${y}, 190 102, 300 102`}
          fill="none"
          stroke="url(#diq-signal-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="animate-converge"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      {inputs.map((y) => (
        <circle key={`d-${y}`} cx="8" cy={y} r="2.5" fill="var(--brand-slate)" opacity="0.6" />
      ))}
      <rect
        x="300"
        y="99"
        width="150"
        height="6"
        rx="3"
        fill="url(#diq-signal-strong)"
        className="animate-bar"
        style={{ animationDelay: "1.1s" }}
      />
      <circle
        cx="456"
        cy="102"
        r="10"
        fill="none"
        stroke="#4DA3FF"
        strokeWidth="2"
        className="animate-signal-pulse"
      />
      <circle cx="456" cy="102" r="4" fill="#0B6BFF" />
    </svg>
  );
}

/** Ambient backdrop for intro and analysis screens. */
export function SignalField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="signal-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_50%_0%,#000_0%,transparent_72%)]" />
      <div className="animate-signal-pulse absolute -top-40 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(11,107,255,0.22),transparent_70%)] blur-2xl" />
    </div>
  );
}
