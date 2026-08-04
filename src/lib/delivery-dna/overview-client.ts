import { assessmentAuthHeaders } from "@/lib/identity/assessment-auth";

import type { DeliveryDnaOverviewAccess } from "./overview-access.server";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/delivery-dna-overview${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(await assessmentAuthHeaders()),
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok)
    throw new Error(body?.error ?? "The Delivery DNA Overview is temporarily unavailable.");
  return body as T;
}

export const deliveryDnaOverviewApi = {
  access: (assessmentId: string) =>
    request<DeliveryDnaOverviewAccess>(`/access?assessmentId=${encodeURIComponent(assessmentId)}`),
  checkout: (assessmentId: string) =>
    request<{
      status: "checkout_ready" | "already_available";
      checkoutUrl?: string;
      destination?: string;
    }>("/checkout", { method: "POST", body: JSON.stringify({ assessmentId }) }),
};
