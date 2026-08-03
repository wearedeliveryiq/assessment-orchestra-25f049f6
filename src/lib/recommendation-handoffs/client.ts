import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { ProductHandoffCta, ProductHandoffOpportunity } from "./model";

const rememberedKeys = new Map<string, string>();

function key(scope: string, payload: Record<string, unknown>) {
  const request = `${scope}:${JSON.stringify(payload)}`;
  const existing = rememberedKeys.get(request);
  if (existing) return existing;
  const value = `handoff-${crypto.randomUUID()}`;
  rememberedKeys.set(request, value);
  return value;
}

async function body<T>(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? fallback);
  return payload as T;
}

export async function fetchProductHandoffOpportunities(actionId: string) {
  return body<{ actionId: string; opportunities: ProductHandoffOpportunity[] }>(
    await fetch(`/api/improvement-actions/${actionId}/handoffs`, {
      headers: await assessmentAuthHeaders(),
    }),
    "Next-step services are unavailable.",
  );
}

export async function createAndConsumeProductHandoff(
  actionId: string,
  opportunity: ProductHandoffOpportunity,
) {
  if (!opportunity.cta) throw new Error("This next step is not currently permitted.");
  const payload = {
    targetType: opportunity.targetType,
    targetId: opportunity.targetId,
    targetVersion: opportunity.targetVersion,
    cta: opportunity.cta satisfies ProductHandoffCta,
    consentAcknowledged: true,
  };
  const created = await body<{ handoff: Record<string, unknown>; token: string }>(
    await fetch(`/api/improvement-actions/${actionId}/handoffs`, {
      method: "POST",
      headers: {
        ...(await assessmentAuthHeaders()),
        "content-type": "application/json",
        "idempotency-key": key(actionId, payload),
      },
      body: JSON.stringify(payload),
    }),
    "The secure hand-off could not be created.",
  );
  return body<{
    contract: Record<string, string>;
    activated: false;
    message: string;
  }>(
    await fetch("/api/product-handoffs/consume", {
      method: "POST",
      headers: { ...(await assessmentAuthHeaders()), "content-type": "application/json" },
      body: JSON.stringify({ token: created.token }),
    }),
    "The secure hand-off could not be authorised.",
  );
}
