import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/deliveryiq/app-shell";
import { evaluatePassword } from "@/lib/identity/password-policy";

/** Shared chrome for every authentication screen. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="ribbon-field" aria-hidden />
      <header className="relative border-b border-border/70 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <BrandMark />
          </Link>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Secure access
          </span>
        </div>
        <div className="ribbon-bar h-0.5 w-full opacity-80" aria-hidden />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 py-12">
        <div className="ribbon-panel w-full max-w-md rounded-xl p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
    >
      {message}
    </p>
  );
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
      {message}
    </p>
  );
}

/** Live password strength + policy feedback. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const evaluation = evaluatePassword(password);
  const width = `${(evaluation.score / 4) * 100}%`;

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={evaluation.valid ? "ribbon-bar h-full" : "h-full bg-muted-foreground/60"}
          style={{ width }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {evaluation.label}
        {evaluation.failures.length > 0 ? ` — ${evaluation.failures[0]}` : " — meets policy"}
      </p>
    </div>
  );
}
