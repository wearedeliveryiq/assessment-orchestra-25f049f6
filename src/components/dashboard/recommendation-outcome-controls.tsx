import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Plus } from "lucide-react";
import { useId, useState } from "react";

import {
  configureRecommendationOutcome,
  fetchRecommendationOutcome,
  recordRecommendationOutcomeObservation,
  retireRecommendationOutcomeMeasure,
  type OutcomeMeasureView,
} from "@/lib/recommendation-outcomes/client";
import type { OutcomeDirection } from "@/lib/recommendation-outcomes/types";

const statusLabel = {
  not_measured: "Not measured",
  baseline_recorded: "Baseline recorded",
  tracking: "Tracking",
  target_met: "Target met",
  target_not_met: "Target not met",
  retired: "Retired",
} as const;

function localIso(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function MeasureForm({
  actionId,
  accountableOwnerId,
  current,
  onSaved,
}: {
  actionId: string;
  accountableOwnerId: string;
  current?: OutcomeMeasureView;
  onSaved: () => Promise<void>;
}) {
  const prefix = useId();
  const [direction, setDirection] = useState<OutcomeDirection>(current?.direction ?? "increase");
  const [unit, setUnit] = useState(current?.unit ?? "percentage points");
  const [scale, setScale] = useState(current?.decimalScale ?? 1);
  const [baseline, setBaseline] = useState(
    current?.baselineValue?.kind === "numeric" ? current.baselineValue.value : "",
  );
  const [target, setTarget] = useState(
    current?.targetValue?.kind === "numeric" ? current.targetValue.value : "",
  );
  const [binaryTarget, setBinaryTarget] = useState(
    current?.targetValue?.kind === "binary" ? current.targetValue.value : true,
  );
  const [tolerance, setTolerance] = useState(current?.tolerance ?? "");
  const [targetDate, setTargetDate] = useState(current?.targetDate ?? "");
  const [source, setSource] = useState(
    current?.sourceDescription ?? "Customer-provided operational evidence",
  );
  const [sourceReference, setSourceReference] = useState("");
  const [cadence, setCadence] = useState(current?.cadence ?? "Monthly");
  const mutation = useMutation({
    mutationFn: () =>
      configureRecommendationOutcome(actionId, {
        measureId: current?.measureId,
        expectedVersion: current?.version ?? 0,
        direction,
        unit: direction === "binary" ? "binary" : unit,
        decimalScale: direction === "binary" ? 0 : scale,
        baselineValue:
          direction === "binary" || !baseline ? null : { kind: "numeric", value: baseline },
        baselineEffectiveAt: direction === "binary" || !baseline ? null : new Date().toISOString(),
        targetValue:
          direction === "binary"
            ? { kind: "binary", value: binaryTarget }
            : target
              ? { kind: "numeric", value: target }
              : null,
        tolerance: direction === "maintain" ? tolerance : null,
        targetDate: targetDate || null,
        targetTimezone: targetDate
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"
          : null,
        sourceDescription: source,
        sourceReference: sourceReference || null,
        cadence,
        accountableOwnerId,
      }),
    onSuccess: onSaved,
  });
  return (
    <fieldset className="mt-3 space-y-3 rounded-lg border border-border/70 p-3">
      <legend className="px-1 text-sm font-semibold">
        {current ? "Create a new measure version" : "Configure an outcome measure"}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm" htmlFor={`${prefix}-direction`}>
          Direction
          <select
            id={`${prefix}-direction`}
            value={direction}
            onChange={(event) => setDirection(event.target.value as OutcomeDirection)}
            className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
          >
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
            <option value="maintain">Maintain</option>
            <option value="binary">Yes or no</option>
          </select>
        </label>
        {direction === "binary" ? (
          <label className="text-sm" htmlFor={`${prefix}-binary-target`}>
            Target
            <select
              id={`${prefix}-binary-target`}
              value={String(binaryTarget)}
              onChange={(event) => setBinaryTarget(event.target.value === "true")}
              className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        ) : (
          <>
            <label className="text-sm" htmlFor={`${prefix}-unit`}>
              Unit
              <input
                id={`${prefix}-unit`}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
            <label className="text-sm" htmlFor={`${prefix}-scale`}>
              Decimal places
              <input
                id={`${prefix}-scale`}
                type="number"
                min={0}
                max={18}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
            <label className="text-sm" htmlFor={`${prefix}-baseline`}>
              Baseline
              <input
                id={`${prefix}-baseline`}
                inputMode="decimal"
                value={baseline}
                onChange={(event) => setBaseline(event.target.value)}
                className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
            <label className="text-sm" htmlFor={`${prefix}-target`}>
              Target
              <input
                id={`${prefix}-target`}
                inputMode="decimal"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
            {direction === "maintain" && (
              <label className="text-sm" htmlFor={`${prefix}-tolerance`}>
                Absolute tolerance
                <input
                  id={`${prefix}-tolerance`}
                  inputMode="decimal"
                  value={tolerance}
                  onChange={(event) => setTolerance(event.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
                />
              </label>
            )}
          </>
        )}
        <label className="text-sm" htmlFor={`${prefix}-date`}>
          Target date (optional)
          <input
            id={`${prefix}-date`}
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
        <label className="text-sm" htmlFor={`${prefix}-cadence`}>
          Review cadence
          <input
            id={`${prefix}-cadence`}
            value={cadence}
            onChange={(event) => setCadence(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
      </div>
      <label className="block text-sm" htmlFor={`${prefix}-source`}>
        Evidence source
        <input
          id={`${prefix}-source`}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
        />
      </label>
      <label className="block text-sm" htmlFor={`${prefix}-reference`}>
        Source reference (optional)
        <input
          id={`${prefix}-reference`}
          value={sourceReference}
          onChange={(event) => setSourceReference(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
        />
      </label>
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <button
        type="button"
        disabled={
          mutation.isPending ||
          !source.trim() ||
          !cadence.trim() ||
          (direction !== "binary" && (!unit.trim() || !target.trim())) ||
          (direction === "maintain" && !tolerance.trim())
        }
        onClick={() => mutation.mutate()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Save measure
      </button>
    </fieldset>
  );
}

function ObservationForm({
  measure,
  onSaved,
  supersedesObservationId = null,
  onCancelCorrection,
}: {
  measure: OutcomeMeasureView;
  onSaved: () => Promise<void>;
  supersedesObservationId?: string | null;
  onCancelCorrection?: () => void;
}) {
  const prefix = useId();
  const [observed, setObserved] = useState("");
  const [binary, setBinary] = useState(true);
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [source, setSource] = useState("Customer-provided operational evidence");
  const [reference, setReference] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      recordRecommendationOutcomeObservation(measure.measureVersionId, {
        value:
          measure.direction === "binary"
            ? { kind: "binary", value: binary }
            : { kind: "numeric", value: observed },
        effectiveAt: localIso(effectiveAt),
        sourceDescription: source,
        sourceReference: reference || null,
        supersedesObservationId,
        correctionReason: supersedesObservationId ? correctionReason : null,
      }),
    onSuccess: async () => {
      setObserved("");
      await onSaved();
    },
  });
  return (
    <fieldset className="mt-3 space-y-3 border-t border-border/70 pt-3">
      <legend className="text-sm font-semibold">
        {supersedesObservationId ? "Correct an observation" : "Record an observation"}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm" htmlFor={`${prefix}-value`}>
          Observed value
          {measure.direction === "binary" ? (
            <select
              id={`${prefix}-value`}
              value={String(binary)}
              onChange={(event) => setBinary(event.target.value === "true")}
              className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              id={`${prefix}-value`}
              inputMode="decimal"
              value={observed}
              onChange={(event) => setObserved(event.target.value)}
              className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
            />
          )}
        </label>
        <label className="text-sm" htmlFor={`${prefix}-effective`}>
          Effective time
          <input
            id={`${prefix}-effective`}
            type="datetime-local"
            value={effectiveAt}
            onChange={(event) => setEffectiveAt(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
      </div>
      <label className="block text-sm" htmlFor={`${prefix}-source`}>
        Evidence source
        <input
          id={`${prefix}-source`}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
        />
      </label>
      <label className="block text-sm" htmlFor={`${prefix}-reference`}>
        Source reference (optional)
        <input
          id={`${prefix}-reference`}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3"
        />
      </label>
      {supersedesObservationId && (
        <label className="block text-sm" htmlFor={`${prefix}-correction-reason`}>
          Correction reason
          <textarea
            id={`${prefix}-correction-reason`}
            value={correctionReason}
            onChange={(event) => setCorrectionReason(event.target.value)}
            className="mt-1 block min-h-20 w-full rounded-md border border-input bg-background p-3"
          />
        </label>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <button
        type="button"
        disabled={
          mutation.isPending ||
          !source.trim() ||
          !effectiveAt ||
          (measure.direction !== "binary" && !observed.trim()) ||
          (Boolean(supersedesObservationId) && !correctionReason.trim())
        }
        onClick={() => mutation.mutate()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden /> Record observation
      </button>
      {supersedesObservationId && onCancelCorrection && (
        <button
          type="button"
          onClick={onCancelCorrection}
          className="ml-2 min-h-11 rounded-lg border border-border px-3 text-sm"
        >
          Cancel correction
        </button>
      )}
    </fieldset>
  );
}

export function RecommendationOutcomeControls({
  actionId,
  accountableOwnerId,
  canManage,
}: {
  actionId: string;
  accountableOwnerId: string | null;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["recommendation-outcome", actionId];
  const query = useQuery({ queryKey, queryFn: () => fetchRecommendationOutcome(actionId) });
  const [editing, setEditing] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const outcome = query.data?.outcome;
  const current = outcome?.measures[0];
  const retire = useMutation({
    mutationFn: () =>
      retireRecommendationOutcomeMeasure(actionId, current!.measureVersionId, current!.version),
    onSuccess: refresh,
  });
  if (query.isLoading)
    return <p className="mt-3 text-sm text-muted-foreground">Preparing outcome measurement…</p>;
  if (query.error)
    return (
      <p role="alert" className="mt-3 text-sm text-destructive">
        {query.error.message}
      </p>
    );
  return (
    <section
      aria-labelledby={`outcome-${actionId}`}
      className="mt-4 rounded-lg border border-border/70 bg-background p-4"
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" aria-hidden />
        <h5 id={`outcome-${actionId}`} className="font-semibold">
          Outcome measurement
        </h5>
      </div>
      {outcome ? (
        <>
          <p className="mt-2 text-sm">{outcome.intendedOutcome}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {outcome.successMeasureTemplates.map((template) => (
              <li key={template}>{template}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Configure a measure to track evidence associated with this action.
        </p>
      )}
      {current && (
        <div className="mt-3 rounded-md bg-muted/30 p-3" aria-live="polite">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <strong>{statusLabel[current.current.status]}</strong>
            <span>Version {current.version}</span>
          </div>
          <p className="mt-1 text-sm">{current.current.customerCopy}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Target:{" "}
            {current.targetValue?.kind === "binary"
              ? current.targetValue.value
                ? "Yes"
                : "No"
              : current.targetValue?.value}{" "}
            {current.direction === "binary" ? "" : current.unit}
          </p>
        </div>
      )}
      {current?.observations.length ? (
        <div className="mt-3">
          <h6 className="text-sm font-semibold">Observation history</h6>
          <ol className="mt-2 space-y-2">
            {current.observations.map((observation) => (
              <li key={observation.id} className="rounded-md border border-border/60 p-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {observation.value.kind === "binary"
                      ? observation.value.value
                        ? "Yes"
                        : "No"
                      : `${observation.value.value} ${current.unit}`}
                  </span>
                  <time dateTime={observation.effectiveAt}>
                    {new Date(observation.effectiveAt).toLocaleDateString()}
                  </time>
                </div>
                {observation.corrected && (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Corrected — the superseding observation is used for the current status.
                  </p>
                )}
                {observation.correctionReason && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Correction: {observation.correctionReason}
                  </p>
                )}
                {canManage && !observation.corrected && !correctingId && (
                  <button
                    type="button"
                    onClick={() => setCorrectingId(observation.id)}
                    className="mt-2 min-h-11 rounded-lg border border-border px-3 text-xs"
                  >
                    Correct this observation
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        {outcome?.associationNotice ??
          "Observed progress is associated with this action. It does not prove that DeliveryIQ or the recommendation caused the outcome."}
      </p>
      {canManage && accountableOwnerId ? (
        current ? (
          <>
            {correctingId ? (
              <ObservationForm
                measure={current}
                onSaved={async () => {
                  setCorrectingId(null);
                  await refresh();
                }}
                supersedesObservationId={correctingId}
                onCancelCorrection={() => setCorrectingId(null)}
              />
            ) : (
              <ObservationForm measure={current} onSaved={refresh} />
            )}
            {current.current.status !== "retired" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  className="min-h-11 rounded-lg border border-border px-3 text-sm"
                >
                  {editing ? "Cancel measure edit" : "Edit measure"}
                </button>
                <button
                  type="button"
                  disabled={retire.isPending}
                  onClick={() => retire.mutate()}
                  className="min-h-11 rounded-lg border border-border px-3 text-sm"
                >
                  Retire measure
                </button>
              </div>
            )}
            {editing && (
              <MeasureForm
                actionId={actionId}
                accountableOwnerId={accountableOwnerId}
                current={current}
                onSaved={async () => {
                  setEditing(false);
                  await refresh();
                }}
              />
            )}
            {retire.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {retire.error.message}
              </p>
            )}
          </>
        ) : (
          <MeasureForm
            actionId={actionId}
            accountableOwnerId={accountableOwnerId}
            onSaved={refresh}
          />
        )
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          An authorised improvement lead with an accountable owner can manage outcome evidence.
        </p>
      )}
    </section>
  );
}
