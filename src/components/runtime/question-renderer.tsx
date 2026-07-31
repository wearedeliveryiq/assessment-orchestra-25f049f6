import { useId } from "react";
import type { ReactElement } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  QuestionDefinition,
  QuestionType,
  ResponseValue,
  ValidationIssue,
} from "@/lib/runtime/types";

/**
 * QuestionRenderingService (UI)
 *
 * A registry of pure, reusable renderers keyed by question type. Supporting a
 * new type is a single registry entry — no page, route or engine changes.
 */

export interface QuestionInputProps {
  question: QuestionDefinition;
  value: ResponseValue;
  onChange: (value: ResponseValue) => void;
  disabled?: boolean;
  describedBy?: string;
}

type Renderer = (props: QuestionInputProps) => ReactElement;

const optionListStyles =
  "flex w-full items-start gap-3 rounded-lg border border-border/70 bg-surface/40 px-4 py-3 text-left text-sm transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SingleSelect({ question, value, onChange, disabled, describedBy }: QuestionInputProps) {
  return (
    <div role="radiogroup" aria-describedby={describedBy} className="grid gap-2">
      {question.options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              optionListStyles,
              selected && "border-primary bg-primary/10 text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border",
                selected && "border-primary bg-primary",
              )}
            />
            <span>
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Likert(props: QuestionInputProps) {
  const { question, value, onChange, disabled, describedBy } = props;
  if (question.options.length > 6) return <SingleSelect {...props} />;
  return (
    <div
      role="radiogroup"
      aria-describedby={describedBy}
      className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]"
    >
      {question.options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              "rounded-lg border border-border/70 bg-surface/40 px-3 py-3 text-center text-sm transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary bg-primary/10",
            )}
          >
            <span className="block font-display text-lg font-semibold">{option.value}</span>
            <span className="block text-xs text-muted-foreground">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({ question, value, onChange, disabled, describedBy }: QuestionInputProps) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div aria-describedby={describedBy} className="grid gap-2">
      {question.options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label key={String(option.value)} className={cn(optionListStyles, "cursor-pointer")}>
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) =>
                onChange(
                  next
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value),
                )
              }
            />
            <span>
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function SliderInput({ question, value, onChange, disabled, describedBy }: QuestionInputProps) {
  const scale = question.scale ?? { min: 0, max: 10, step: 1 };
  const current = typeof value === "number" ? value : scale.min;
  return (
    <div aria-describedby={describedBy} className="space-y-3">
      <Slider
        value={[current]}
        min={scale.min}
        max={scale.max}
        step={scale.step}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
        aria-label={question.title}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{scale.minLabel ?? scale.min}</span>
        <span className="font-medium text-foreground">
          {current}
          {scale.unit ?? ""}
        </span>
        <span>{scale.maxLabel ?? scale.max}</span>
      </div>
    </div>
  );
}

function numberInput(suffix?: string, prefix?: string): Renderer {
  return function NumberInput({ question, value, onChange, disabled, describedBy }) {
    return (
      <div className="flex items-center gap-2">
        {prefix ? <span className="text-sm text-muted-foreground">{prefix}</span> : null}
        <Input
          type="number"
          inputMode="decimal"
          aria-describedby={describedBy}
          disabled={disabled}
          placeholder={question.placeholder}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(event) =>
            onChange(event.target.value === "" ? null : Number(event.target.value))
          }
        />
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
    );
  };
}

function TextInput({ question, value, onChange, disabled, describedBy }: QuestionInputProps) {
  return (
    <Input
      aria-describedby={describedBy}
      disabled={disabled}
      placeholder={question.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function LongText({ question, value, onChange, disabled, describedBy }: QuestionInputProps) {
  return (
    <Textarea
      rows={5}
      aria-describedby={describedBy}
      disabled={disabled}
      placeholder={question.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function DateInput({ value, onChange, disabled, describedBy }: QuestionInputProps) {
  return (
    <Input
      type="date"
      aria-describedby={describedBy}
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value || null)}
    />
  );
}

function YesNo({ value, onChange, disabled, describedBy }: QuestionInputProps) {
  const options: { label: string; option: boolean }[] = [
    { label: "Yes", option: true },
    { label: "No", option: false },
  ];
  return (
    <div role="radiogroup" aria-describedby={describedBy} className="flex gap-2">
      {options.map(({ label, option }) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={value === option}
          disabled={disabled}
          onClick={() => onChange(value === option ? null : option)}
          className={cn(
            "flex-1 rounded-lg border border-border/70 bg-surface/40 px-4 py-3 text-sm font-medium transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === option && "border-primary bg-primary/10",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Matrix({ question, value, onChange, disabled }: QuestionInputProps) {
  const matrix = question.matrix;
  const current = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as
    Record<string, string | number>;
  if (!matrix) return <p className="text-sm text-destructive">Matrix configuration missing.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-2 text-left font-medium">
              &nbsp;
            </th>
            {matrix.columns.map((column) => (
              <th key={String(column.value)} scope="col" className="px-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.id} className="bg-surface/40">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {row.label}
              </th>
              {matrix.columns.map((column) => (
                <td key={String(column.value)} className="px-2 py-2 text-center">
                  <input
                    type="radio"
                    name={`${question.id}-${row.id}`}
                    disabled={disabled}
                    checked={current[row.id] === column.value}
                    aria-label={`${row.label}: ${column.label}`}
                    onChange={() => onChange({ ...current, [row.id]: column.value })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ranking({ question, value, onChange, disabled }: QuestionInputProps) {
  const order = Array.isArray(value)
    ? value
    : question.options.map((option) => option.value);
  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <ol className="grid gap-2">
      {order.map((item, index) => {
        const option = question.options.find((candidate) => candidate.value === item);
        return (
          <li
            key={String(item)}
            className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface/40 px-4 py-2 text-sm"
          >
            <span className="font-display text-xs text-muted-foreground">{index + 1}</span>
            <span className="flex-1">{option?.label ?? String(item)}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || index === 0}
              aria-label={`Move ${option?.label ?? item} up`}
              onClick={() => move(index, -1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || index === order.length - 1}
              aria-label={`Move ${option?.label ?? item} down`}
              onClick={() => move(index, 1)}
            >
              ↓
            </Button>
          </li>
        );
      })}
    </ol>
  );
}

function FutureReady({ question }: QuestionInputProps) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-surface/30 px-4 py-6 text-sm text-muted-foreground">
      {question.type === "file_upload" ? "File upload" : "Evidence attachment"} is captured in a
      later release. Your other answers are saved as normal.
    </div>
  );
}

/** Extensible registry — add a type here and the runtime renders it everywhere. */
export const questionRenderers: Record<QuestionType, Renderer> = {
  single_select: SingleSelect,
  multi_select: MultiSelect,
  likert: Likert,
  slider: SliderInput,
  numeric: numberInput(),
  currency: numberInput(undefined, "£"),
  percentage: numberInput("%"),
  date: DateInput,
  text: TextInput,
  long_text: LongText,
  boolean: YesNo,
  matrix: Matrix,
  ranking: Ranking,
  file_upload: FutureReady,
  evidence: FutureReady,
};

export function QuestionCard({
  question,
  value,
  onChange,
  issues,
  disabled,
  index,
}: {
  question: QuestionDefinition;
  value: ResponseValue;
  onChange: (value: ResponseValue) => void;
  issues: ValidationIssue[];
  disabled?: boolean;
  index: number;
}) {
  const helpId = useId();
  const Renderer = questionRenderers[question.type] ?? TextInput;
  const invalid = issues.length > 0;

  return (
    <section
      aria-labelledby={`${helpId}-title`}
      className={cn(
        "rounded-xl border border-border/70 bg-surface/50 p-5 transition-colors",
        invalid && "border-destructive/70",
      )}
    >
      <div className="mb-4 space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Question {index}
          {question.required ? " · required" : " · optional"}
        </p>
        <h3 id={`${helpId}-title`} className="font-display text-base font-semibold">
          {question.title}
        </h3>
        {question.description ? (
          <p className="text-sm text-muted-foreground">{question.description}</p>
        ) : null}
      </div>

      <Renderer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
        describedBy={`${helpId}-help`}
      />

      <div id={`${helpId}-help`} className="mt-3 space-y-1">
        {question.helpText ? (
          <p className="text-xs text-muted-foreground">{question.helpText}</p>
        ) : null}
        {issues.map((issue) => (
          <p key={issue.rule} role="alert" className="text-xs font-medium text-destructive">
            {issue.message}
          </p>
        ))}
      </div>
    </section>
  );
}
