import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

/**
 * Public Snapshot shell. Light editorial base — the navy product environment is
 * applied per screen with the `on-navy` utility.
 */
export function SnapshotAcquisitionShell({ children }: { children: ReactNode }) {
  const [returnToWebsite, setReturnToWebsite] = useState(false);

  useEffect(() => {
    setReturnToWebsite(new URLSearchParams(window.location.search).get("return") === "deliveryiq");
  }, []);

  return (
    <div className="snapshot-public-shell flex min-h-screen flex-col">
      <header className="border-b border-border" aria-label="DeliveryIQ">
        <div className="container-page flex items-center justify-between gap-4 py-5">
          <Logo />
          {returnToWebsite ? (
            <a
              href="https://deliveryiq.co.uk"
              className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Back to deliveryiq.co.uk
            </a>
          ) : (
            <p className="hidden text-sm font-medium text-muted-foreground sm:block">
              Smarter project delivery.
            </p>
          )}
        </div>
      </header>
      <main className="container-page w-full flex-1 py-8 sm:py-12">{children}</main>
      <footer className="container-page py-8 text-center text-sm text-muted-foreground">
        Evidence-informed. Explainable. Human-controlled.
      </footer>
    </div>
  );
}
