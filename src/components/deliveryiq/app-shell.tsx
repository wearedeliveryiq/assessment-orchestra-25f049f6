import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

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

export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="ribbon-field" aria-hidden />
      <header className="relative border-b border-border/70 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Assessment Runtime
            </span>
            {action}
          </div>
        </div>
        <div className="ribbon-bar h-0.5 w-full opacity-80" aria-hidden />
      </header>
      <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-10">{children}</main>
    </div>
  );
}
