import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import type { AssessmentAnswerInput, AssessmentDetail } from "@/lib/assessment/types";
import { deliveryDnaV2Capabilities, deliveryDnaV2Catalogue } from "@/lib/delivery-dna/catalogue-v2";
import { snapshotV2AnswerOptions } from "@/lib/delivery-dna/snapshot-v2";

const roleLabels = {
  snapshot: "Snapshot",
  supporting_1: "Supporting question",
  supporting_2: "Supporting question",
} as const;

const roleInstructions = {
  snapshot: "Review the answer carried forward from your Snapshot.",
  supporting_1: "Consider how delivery usually works across the organisation in scope.",
  supporting_2: "Consider how delivery usually works across the organisation in scope.",
} as const;

type DraftAnswer =
  | { status: "answered"; value: number; evidenceReasonText?: never }
  | { status: "not_applicable"; value: null; evidenceReasonText: string };

function initialAnswers(detail: AssessmentDetail): Record<string, DraftAnswer> {
  const answers: Record<string, DraftAnswer> = {};
  for (const response of detail.responses) {
    if (response.evidenceStatus === "not_applicable") {
      answers[response.questionId] = {
        status: "not_applicable",
        value: null,
        evidenceReasonText: response.evidenceReasonText ?? "",
      };
    } else if (
      (response.evidenceStatus ?? "answered") === "answered" &&
      typeof response.value === "number"
    ) {
      answers[response.questionId] = { status: "answered", value: response.value };
    }
  }
  return answers;
}

function apiAnswers(answers: Record<string, DraftAnswer>): AssessmentAnswerInput[] {
  return Object.entries(answers).map(([questionId, answer]) => ({
    questionId,
    value: answer.value,
    evidenceStatus: answer.status,
    evidenceReasonText: answer.status === "not_applicable" ? answer.evidenceReasonText : null,
  }));
}

export function DeliveryDnaAssessmentJourney({
  assessmentId,
  detail,
}: {
  assessmentId: string;
  detail: AssessmentDetail;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>(() => initialAnswers(detail));
  const [capabilityIndex, setCapabilityIndex] = useState(() =>
    Math.max(
      0,
      deliveryDnaV2Capabilities.findIndex(
        (capability) => capability.id === detail.session.currentSection,
      ),
    ),
  );
  const [reviewing, setReviewing] = useState(false);
  const [missingAcknowledged, setMissingAcknowledged] = useState(false);
  const storedEvidenceMetadata = (
    detail.session.metadata as {
      deliveryDnaEvidence?: {
        evidenceRecencyDeclaration?: string;
        perspectiveBreadthDeclaration?: string;
      };
    }
  ).deliveryDnaEvidence;
  const [evidenceRecencyDeclaration, setEvidenceRecencyDeclaration] = useState(
    storedEvidenceMetadata?.evidenceRecencyDeclaration ?? "",
  );
  const [perspectiveBreadthDeclaration, setPerspectiveBreadthDeclaration] = useState(
    storedEvidenceMetadata?.perspectiveBreadthDeclaration ?? "",
  );
  const capability = deliveryDnaV2Capabilities[capabilityIndex];
  const recordedCount = Object.keys(answers).length;
  const missingCount = deliveryDnaV2Catalogue.identity.fullQuestionCount - recordedCount;
  const progress = Math.round(
    (recordedCount / deliveryDnaV2Catalogue.identity.fullQuestionCount) * 100,
  );
  const locked = !["draft", "in_progress"].includes(detail.session.status);
  const invalidNotApplicable = useMemo(
    () =>
      Object.values(answers).some(
        (answer) => answer.status === "not_applicable" && !answer.evidenceReasonText.trim(),
      ),
    [answers],
  );
  const carriedResponseCount = detail.responses.filter(
    (response) =>
      response.provenanceSource === "delivery-dna-snapshot" &&
      response.provenanceVersion === "2.1.0",
  ).length;

  const save = useMutation({
    mutationFn: (options?: { sectionId?: string; silent?: boolean }) =>
      assessmentApi
        .save(assessmentId, {
          currentSection: options?.sectionId ?? capability.id,
          answers: apiAnswers(answers),
        })
        .then((result) => ({ result, silent: options?.silent })),
    onSuccess: ({ silent }) => {
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(assessmentId) });
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
      if (!silent) toast.success("Delivery DNA draft saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const complete = useMutation({
    mutationFn: async () => {
      await assessmentApi.save(assessmentId, {
        currentSection: "review",
        answers: apiAnswers(answers),
      });
      return assessmentApi.submit(assessmentId, {
        reviewAcknowledged: true,
        missingAcknowledged: missingCount === 0 || missingAcknowledged,
        evidenceRecencyDeclaration,
        perspectiveBreadthDeclaration,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
      navigate({ to: "/dashboard/$id", params: { id: assessmentId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (reviewing) {
    return (
      <AppShell action={<StatusPill status={detail.session.status} />}>
        <section className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Delivery DNA™
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Review before completion</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Check the recorded position for {detail.session.organisationName}. Unanswered questions
            will remain explicit missing evidence; they are never converted into a score.
          </p>

          <div className="mt-6 space-y-4">
            {deliveryDnaV2Capabilities.map((item, index) => {
              const answered = item.questions.filter((question) => answers[question.id]).length;
              return (
                <article key={item.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display font-semibold">{item.label}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {answered} of {item.questions.length} responses recorded
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCapabilityIndex(index);
                        setReviewing(false);
                      }}
                      className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-primary/50"
                    >
                      Review answers
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {missingCount > 0 && (
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <input
                type="checkbox"
                checked={missingAcknowledged}
                onChange={(event) => setMissingAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                I understand that unanswered questions remain missing evidence and may limit this
                result.
              </span>
            </label>
          )}

          <section className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Evidence context</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              These two declarations inform confidence only. They do not change your Delivery DNA
              scores.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                {
                  deliveryDnaV2Catalogue.confidencePolicy.requiredMetadata
                    .evidenceRecencyDeclaration.customerPrompt
                }
                <select
                  required
                  value={evidenceRecencyDeclaration}
                  onChange={(event) => setEvidenceRecencyDeclaration(event.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Select one</option>
                  <option value="within_90_days">Within the last 90 days</option>
                  <option value="within_180_days">Within the last 180 days</option>
                  <option value="within_365_days">Within the last 365 days</option>
                  <option value="older_than_365_days">More than 365 days old</option>
                  <option value="unknown_or_not_available">Unknown or not available</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                {
                  deliveryDnaV2Catalogue.confidencePolicy.requiredMetadata
                    .perspectiveBreadthDeclaration.customerPrompt
                }
                <select
                  required
                  value={perspectiveBreadthDeclaration}
                  onChange={(event) => setPerspectiveBreadthDeclaration(event.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Select one</option>
                  <option value="own_view_only">My own view only</option>
                  <option value="one_group">One stakeholder group</option>
                  <option value="two_groups">Two stakeholder groups</option>
                  <option value="three_or_more_groups">Three or more stakeholder groups</option>
                </select>
              </label>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold"
            >
              Back to questions
            </button>
            <button
              type="button"
              disabled={
                locked ||
                complete.isPending ||
                invalidNotApplicable ||
                !evidenceRecencyDeclaration ||
                !perspectiveBreadthDeclaration ||
                (missingCount > 0 && !missingAcknowledged)
              }
              onClick={() => complete.mutate()}
              className="ribbon-bar inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {complete.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Complete Delivery DNA
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell action={<StatusPill status={detail.session.status} />}>
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Delivery DNA™
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Complete your Delivery DNA</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Complete the remaining supporting questions to build your full five-domain Delivery DNA
          Overview.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Choose the anchored response that best reflects the organisation in scope. Use Not
          applicable only when the capability genuinely does not apply, and explain why.
        </p>
        {carriedResponseCount > 0 ? (
          <div className="mt-5 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
            <p className="font-semibold">Your Snapshot responses are ready to review</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {carriedResponseCount} responses were carried forward unchanged from your Delivery DNA
              Snapshot. Review them alongside the remaining 30 questions before completing the
              assessment.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-4" aria-label={`${progress}% complete`}>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="ribbon-bar h-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {recordedCount} / {deliveryDnaV2Catalogue.identity.fullQuestionCount}
          </span>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label="Delivery DNA capabilities" className="space-y-1.5">
            {deliveryDnaV2Capabilities.map((item, index) => {
              const complete = item.questions.every((question) => answers[question.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCapabilityIndex(index)}
                  aria-current={index === capabilityIndex ? "step" : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm ${
                    index === capabilityIndex
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/70 bg-surface/50 text-muted-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  {complete && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />}
                </button>
              );
            })}
          </nav>

          <section className="ribbon-panel rounded-xl p-5 sm:p-7">
            <h2 className="font-display text-xl font-semibold">{capability.label}</h2>
            <div className="mt-6 space-y-8">
              {capability.questions.map((question) => {
                const answer = answers[question.id];
                const roleLabel = roleLabels[question.role];
                return (
                  <fieldset key={question.id} disabled={locked} className="min-w-0">
                    <legend className="text-sm font-semibold leading-relaxed">
                      {question.prompt}
                    </legend>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {roleLabel}: {roleInstructions[question.role]}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-5">
                      {snapshotV2AnswerOptions(question.id).map((option) => (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-md border p-3 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                            answer?.status === "answered" && answer.value === option.value
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border bg-surface/60 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name={question.id}
                            value={option.value}
                            checked={answer?.status === "answered" && answer.value === option.value}
                            onChange={() =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: { status: "answered", value: option.value },
                              }))
                            }
                          />
                          <span className="block font-semibold">{option.label}</span>
                          <span className="mt-1 block leading-snug">{option.description}</span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-3 rounded-md border border-border/70 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name={question.id}
                          checked={answer?.status === "not_applicable"}
                          onChange={() =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: {
                                status: "not_applicable",
                                value: null,
                                evidenceReasonText: "",
                              },
                            }))
                          }
                        />
                        Not applicable
                      </label>
                      {answer?.status === "not_applicable" && (
                        <div className="mt-3">
                          <label className="text-xs font-medium" htmlFor={`${question.id}-reason`}>
                            Why is this not applicable to the organisation in scope?
                          </label>
                          <textarea
                            id={`${question.id}-reason`}
                            required
                            maxLength={500}
                            value={answer.evidenceReasonText}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: {
                                  status: "not_applicable",
                                  value: null,
                                  evidenceReasonText: event.target.value,
                                },
                              }))
                            }
                            className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            This response is excluded from scoring. A reason is required so the
                            limitation remains explicit.
                          </p>
                        </div>
                      )}
                    </div>
                  </fieldset>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={capabilityIndex === 0}
                  onClick={() => setCapabilityIndex((index) => Math.max(0, index - 1))}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                </button>
                <button
                  type="button"
                  disabled={capabilityIndex === deliveryDnaV2Capabilities.length - 1}
                  onClick={() =>
                    setCapabilityIndex((index) =>
                      Math.min(deliveryDnaV2Capabilities.length - 1, index + 1),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={locked || save.isPending || invalidNotApplicable}
                  onClick={() => save.mutate({ silent: false })}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {save.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={locked || invalidNotApplicable}
                  onClick={() => setReviewing(true)}
                  className="ribbon-bar rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Review and complete
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
