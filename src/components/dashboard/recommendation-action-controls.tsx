import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, CheckCircle2, Play, Plus } from "lucide-react";
import { useId, useState } from "react";

import { RecommendationHandoffControls } from "@/components/dashboard/recommendation-handoff-controls";
import {
  createRecommendationAction,
  updateRecommendationAction,
  type RecommendationActionView,
} from "@/lib/recommendation-actions/client";
import type { ProductHandoffOpportunity } from "@/lib/recommendation-handoffs/model";

export function RecommendationActionControls({
  portfolioId,
  portfolioItemId,
  accepted,
  action,
  canManage,
  handoffOpportunities,
}: {
  portfolioId: string;
  portfolioItemId: string;
  accepted: boolean;
  action: RecommendationActionView | undefined;
  canManage: boolean;
  handoffOpportunities: ProductHandoffOpportunity[];
}) {
  const queryClient = useQueryClient();
  const targetId = useId();
  const completionId = useId();
  const evidenceId = useId();
  const unavailableId = useId();
  const overrideId = useId();
  const overrideReasonId = useId();
  const [mode, setMode] = useState<"idle" | "start" | "complete" | "cancel">("idle");
  const [targetDate, setTargetDate] = useState(action?.targetDate ?? "");
  const [completionNote, setCompletionNote] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [evidenceUnavailableReason, setEvidenceUnavailableReason] = useState("");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const mutation = useMutation({
    mutationFn: async (
      request:
        | { type: "create" }
        | {
            type: "update";
            payload: Record<string, unknown> & { expectedVersion: number; command: string };
          },
    ) =>
      request.type === "create"
        ? createRecommendationAction(portfolioItemId)
        : updateRecommendationAction(action!.actionId, request.payload),
    onSuccess: async () => {
      setMode("idle");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendation-actions", portfolioId] }),
        queryClient.invalidateQueries({ queryKey: ["recommendation-experience", portfolioId] }),
      ]);
    },
  });

  if (!action) {
    if (!accepted) return null;
    return (
      <div className="mt-4 border-t border-border/70 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Improvement action
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Accepted advice can become one focused action in this improvement plan.
        </p>
        {mutation.error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        {canManage ? (
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ type: "create" })}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
          >
            <Plus className="h-4 w-4" aria-hidden /> Create my action
          </button>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            An authorised improvement lead can create and manage this action.
          </p>
        )}
      </div>
    );
  }

  const update = (payload: Record<string, unknown> & { command: string }) =>
    mutation.mutate({
      type: "update",
      payload: { ...payload, expectedVersion: action.actionVersion },
    });

  return (
    <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Customer action
          </p>
          <p aria-live="polite" className="mt-1 text-sm">
            {action.statusMessage}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">
          {action.status.replace("_", " ")}
        </span>
      </div>
      {action.targetDate && (
        <p className="mt-2 text-xs text-muted-foreground">Target date: {action.targetDate}</p>
      )}
      {mutation.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {!canManage || ["completed", "cancelled"].includes(action.status) ? null : mode ===
        "start" ? (
        <div role="group" aria-labelledby={`${targetId}-title`} className="mt-3 space-y-3">
          <h5 id={`${targetId}-title`} className="font-medium">
            Start action
          </h5>
          <div>
            <label htmlFor={targetId} className="text-sm font-medium">
              Target date
            </label>
            <input
              id={targetId}
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="mt-1 block min-h-11 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <label className="flex items-start gap-2 text-sm" htmlFor={overrideId}>
            <input
              id={overrideId}
              type="checkbox"
              checked={override}
              onChange={(event) => setOverride(event.target.checked)}
              className="mt-1"
            />
            Start even if a required dependency is incomplete; I accept the delivery risk.
          </label>
          {override && (
            <div>
              <label htmlFor={overrideReasonId} className="text-sm font-medium">
                Override reason
              </label>
              <textarea
                id={overrideReasonId}
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                maxLength={1000}
                className="mt-1 block min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!targetDate || (override && !overrideReason.trim()) || mutation.isPending}
              onClick={() =>
                update({
                  command: "started",
                  targetDate,
                  dependencyOverride: override,
                  dependencyOverrideAcknowledged: override,
                  dependencyOverrideReason: override ? overrideReason : null,
                })
              }
              className="min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Confirm start
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : mode === "complete" ? (
        <div role="group" aria-labelledby={`${completionId}-title`} className="mt-3 space-y-3">
          <h5 id={`${completionId}-title`} className="font-medium">
            Complete action
          </h5>
          <div>
            <label htmlFor={completionId} className="text-sm font-medium">
              Completion note
            </label>
            <textarea
              id={completionId}
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
              maxLength={2000}
              className="mt-1 block min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor={evidenceId} className="text-sm font-medium">
              Evidence reference
            </label>
            <input
              id={evidenceId}
              value={evidenceReference}
              onChange={(event) => setEvidenceReference(event.target.value)}
              maxLength={500}
              className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor={unavailableId} className="text-sm font-medium">
              If evidence is not available, explain why
            </label>
            <textarea
              id={unavailableId}
              value={evidenceUnavailableReason}
              onChange={(event) => setEvidenceUnavailableReason(event.target.value)}
              maxLength={1000}
              className="mt-1 block min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Completion records activity. It does not claim that the recommendation caused an
            outcome.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                !completionNote.trim() ||
                (!evidenceReference.trim() && !evidenceUnavailableReason.trim()) ||
                (Boolean(evidenceReference.trim()) && Boolean(evidenceUnavailableReason.trim())) ||
                mutation.isPending
              }
              onClick={() =>
                update({
                  command: "completed",
                  completionNote,
                  evidenceReferences: evidenceReference.trim() ? [evidenceReference] : [],
                  evidenceNotAvailableReason: evidenceReference.trim()
                    ? null
                    : evidenceUnavailableReason,
                })
              }
              className="min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Confirm complete
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : mode === "cancel" ? (
        <div
          role="group"
          aria-labelledby={`${completionId}-cancel-title`}
          className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
        >
          <h5 id={`${completionId}-cancel-title`} className="font-medium">
            Confirm cancellation
          </h5>
          <p className="mt-1 text-sm text-muted-foreground">
            The action and its complete history will be retained.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => update({ command: "cancelled", cancelAcknowledged: true })}
              className="min-h-11 rounded-lg bg-destructive px-3 text-sm font-medium text-destructive-foreground"
            >
              Confirm cancel
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="min-h-11 rounded-lg border border-border px-3 text-sm"
            >
              Keep action
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {["not_started", "blocked"].includes(action.status) && (
            <button
              type="button"
              onClick={() => setMode("start")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              <Play className="h-4 w-4" aria-hidden />{" "}
              {action.status === "blocked" ? "Resume" : "Start"}
            </button>
          )}
          {["not_started", "in_progress"].includes(action.status) && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => update({ command: "blocked" })}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden /> Mark blocked
            </button>
          )}
          {action.status === "in_progress" && (
            <button
              type="button"
              onClick={() => setMode("complete")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Complete
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode("cancel")}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
          >
            <Ban className="h-4 w-4" aria-hidden /> Cancel action
          </button>
        </div>
      )}
      {action.status !== "cancelled" && (
        <RecommendationHandoffControls
          actionId={action.actionId}
          opportunities={handoffOpportunities}
        />
      )}
    </div>
  );
}
