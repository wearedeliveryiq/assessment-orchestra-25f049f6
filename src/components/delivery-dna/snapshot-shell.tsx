import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

export function SnapshotAcquisitionShell({ children }: { children: ReactNode }) {
  return (
    <div className="snapshot-public-shell">
      <header className="border-b border-white/[0.08]" aria-label="DeliveryIQ">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo onNavy />
          <p className="hidden text-sm font-medium text-[#CBD5E1] sm:block">
            <span className="text-[#2563EB]">Smarter</span> project delivery.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 pb-8 text-center text-xs text-[#94A3B8] sm:px-8">
        DeliveryIQ · Smarter project delivery.
      </footer>
    </div>
  );
}
