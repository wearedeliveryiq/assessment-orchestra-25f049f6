import markAsset from "@/assets/deliveryiq-mark.png.asset.json";
import { cn } from "@/lib/utils";

/** The master DeliveryIQ ribbon mark. Never distorted or rotated — only scaled. */
export function Ribbon({
  className,
  animated = false,
  alt = "DeliveryIQ ribbon mark",
}: {
  className?: string;
  animated?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={markAsset.url}
      alt={alt}
      loading="lazy"
      className={cn(
        "select-none rounded-full object-contain",
        animated && "animate-ribbon",
        className,
      )}
    />
  );
}

/** Large hero / loading treatment: soft gradient halo and gentle float. */
export function RibbonStage({
  size = "lg",
  className,
  onNavy = false,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  onNavy?: boolean;
}) {
  const dimension = size === "sm" ? "size-28" : size === "md" ? "size-48" : "size-64 md:size-80";

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <div
        aria-hidden
        className={cn(
          "animate-glow absolute size-[75%] rounded-full bg-[image:var(--gradient-brand)] blur-[100px]",
          onNavy ? "opacity-40" : "opacity-25",
        )}
      />
      <Ribbon
        animated
        className={cn(dimension, "relative drop-shadow-[0_24px_48px_rgba(37,99,235,0.22)]")}
      />
    </div>
  );
}

export function Particles({ count = 14 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute size-[3px] rounded-full bg-current opacity-30"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animation: `particle-drift ${9 + (i % 7)}s linear ${i * 0.6}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
