import { Link } from "@tanstack/react-router";
import {
  Ban,
  Clock,
  Lock,
  ServerCrash,
  SearchX,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/deliveryiq/app-shell";
import { Button } from "@/components/ui/button";

export type ErrorKind = "401" | "403" | "404" | "500" | "offline" | "session-expired";

interface ErrorCopy {
  icon: LucideIcon;
  code: string;
  title: string;
  description: string;
  primary: { label: string; href: string };
}

/** Single source of copy for every platform error surface. */
export const ERROR_COPY: Record<ErrorKind, ErrorCopy> = {
  "401": {
    icon: Lock,
    code: "401",
    title: "Sign in to continue",
    description: "This page needs an authenticated DeliveryIQ account.",
    primary: { label: "Sign in", href: "/auth/login" },
  },
  "403": {
    icon: Ban,
    code: "403",
    title: "You don't have access",
    description:
      "Your role doesn't include permission for this area. Ask an organisation administrator to grant access.",
    primary: { label: "Back to home", href: "/home" },
  },
  "404": {
    icon: SearchX,
    code: "404",
    title: "Page not found",
    description: "The page you're looking for doesn't exist, or it has moved.",
    primary: { label: "Back to home", href: "/home" },
  },
  "500": {
    icon: ServerCrash,
    code: "500",
    title: "Something went wrong",
    description: "The platform hit an unexpected error. The team has been notified — try again shortly.",
    primary: { label: "Back to home", href: "/home" },
  },
  offline: {
    icon: WifiOff,
    code: "Offline",
    title: "You're offline",
    description: "DeliveryIQ can't reach the network. Your work is saved locally and will sync on reconnect.",
    primary: { label: "Retry", href: "/home" },
  },
  "session-expired": {
    icon: Clock,
    code: "Session expired",
    title: "Your session has expired",
    description: "For security, sessions end after a period of inactivity. Sign in again to pick up where you left off.",
    primary: { label: "Sign in again", href: "/auth/login" },
  },
};

/** Full-page error state used by route error boundaries and `/error/$code`. */
export function ErrorPage({ kind, onRetry }: { kind: ErrorKind; onRetry?: () => void }) {
  const copy = ERROR_COPY[kind] ?? ERROR_COPY["500"];
  const Icon = copy.icon;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="ribbon-field" aria-hidden />
      <BrandMark className="mb-8" />
      <span className="ribbon-panel mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </span>
      <p className="text-label uppercase text-muted-foreground">{copy.code}</p>
      <h1 className="mt-2 text-h1 font-display font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-3 max-w-md text-body text-muted-foreground">{copy.description}</p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button onClick={onRetry}>Try again</Button>
        ) : (
          <Button asChild>
            <Link to={copy.primary.href}>{copy.primary.label}</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/home">Go to home</Link>
        </Button>
      </div>
    </div>
  );
}
