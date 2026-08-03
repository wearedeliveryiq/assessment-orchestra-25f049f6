import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";

import {
  createAndConsumeProductHandoff,
  fetchProductHandoffOpportunities,
} from "@/lib/recommendation-handoffs/client";
import type { ProductHandoffOpportunity } from "@/lib/recommendation-handoffs/model";

const ctaLabels = {
  start_assessment: "Start assessment",
  view_pack: "View Knowledge Pack",
  review_activation: "Review activation",
  view_teammate: "View TeamMate",
} as const;

export function RecommendationHandoffControls({ actionId }: { actionId: string }) {
  const titleId = useId();
  const [selected, setSelected] = useState<ProductHandoffOpportunity | null>(null);
  const [completed, setCompleted] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["recommendation-handoffs", actionId],
    queryFn: () => fetchProductHandoffOpportunities(actionId),
  });
  const mutation = useMutation({
    mutationFn: (opportunity: ProductHandoffOpportunity) =>
      createAndConsumeProductHandoff(actionId, opportunity),
    onSuccess: (result) => {
      setCompleted(result.message);
      setSelected(null);
    },
  });
  if (query.isLoading) {
    return (
      <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">
        Checking available next steps…
      </p>
    );
  }
  if (query.error) {
    return (
      <p role="alert" className="mt-3 text-sm text-destructive">
        {query.error.message}
      </p>
    );
  }
  if (!query.data?.opportunities.length) return null;
  return (
    <section aria-labelledby={titleId} className="mt-4 border-t border-border/70 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Supported next steps
      </p>
      <h5 id={titleId} className="mt-1 font-medium">
        Continue with DeliveryIQ
      </h5>
      <p className="mt-1 text-sm text-muted-foreground">
        Eligibility, availability, entitlement, permission and activation are checked separately.
      </p>
      {completed && (
        <p role="status" className="mt-3 flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {completed}
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <ul className="mt-3 space-y-3">
        {query.data.opportunities.map((opportunity) => (
          <li
            key={`${opportunity.targetType}:${opportunity.targetId}:${opportunity.targetVersion}`}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-sm font-medium capitalize">
                  {opportunity.targetId.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{opportunity.copy}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Version {opportunity.targetVersion} ·{" "}
                  {opportunity.entitled ? "Entitled" : "Not entitled"} ·{" "}
                  {opportunity.permitted ? "Permitted" : "Permission required"}
                  {opportunity.activated ? " · Activated" : ""}
                </p>
              </div>
              {opportunity.cta && (
                <button
                  type="button"
                  onClick={() => setSelected(opportunity)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
                >
                  {ctaLabels[opportunity.cta]}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {selected && (
        <div
          role="group"
          aria-labelledby={`${titleId}-confirm`}
          className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
        >
          <h6 id={`${titleId}-confirm`} className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Confirm secure hand-off
          </h6>
          <p className="mt-1 text-sm text-muted-foreground">
            I consent to send this action reference to {selected.targetId.replaceAll("_", " ")} for
            the single purpose shown. Availability and permission will be rechecked. This does not
            activate a Knowledge Pack or TeamMate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(selected)}
              className="min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Confirm and continue
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
