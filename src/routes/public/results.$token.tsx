import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type PublicResult = {
  generatedAt: string;
  overall: { displayScore: number | null; band: string | null };
  confidence: { band: string; caveat: string | null };
  summary: string;
  strengths: Array<{ title: string; summary: string }>;
  opportunities: Array<{ title: string; summary: string }>;
  recommendationPreviews: Array<{ title: string; impact: string; summary: string }>;
  registrationPrompt: { label: string; destination: string };
};

export const Route = createFileRoute("/public/results/$token")({
  head: () => ({ meta: [{ title: "Delivery DNA result — DeliveryIQ" }] }),
  component: PublicDeliveryDnaResult,
});

function PublicDeliveryDnaResult() {
  const { token } = Route.useParams();
  const [result, setResult] = useState<PublicResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public-results/${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<PublicResult>;
      })
      .then((value) => {
        setResult(value);
        setState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState("unavailable");
      });
    return () => controller.abort();
  }, [token]);

  if (state === "loading")
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your Delivery DNA result…
        </p>
      </main>
    );
  if (state === "unavailable" || !result)
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <section className="max-w-lg rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold">This result is no longer available</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The secure link may have expired or been withdrawn.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Visit DeliveryIQ
          </Link>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-4xl space-y-6" aria-labelledby="result-title">
        <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Delivery DNA™
          </p>
          <h1 id="result-title" className="mt-3 text-3xl font-semibold">
            Your delivery intelligence result
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{result.summary}</p>
          <div className="mt-6 flex flex-wrap gap-6">
            <div>
              <span className="block text-4xl font-semibold text-primary">
                {result.overall.displayScore ?? "—"}
              </span>
              <span className="text-xs capitalize text-muted-foreground">
                {result.overall.band ?? "Unavailable"}
              </span>
            </div>
            <div>
              <span className="block text-lg font-semibold capitalize">
                {result.confidence.band}
              </span>
              <span className="text-xs text-muted-foreground">Evidence confidence</span>
            </div>
          </div>
          {result.confidence.caveat && (
            <p className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              {result.confidence.caveat}
            </p>
          )}
        </header>
        <ResultList title="Strengths" items={result.strengths} />
        <ResultList title="Priority opportunities" items={result.opportunities} />
        <ResultList
          title="Recommended next steps"
          items={result.recommendationPreviews.map((item) => ({
            title: item.title,
            summary: item.summary,
          }))}
        />
        <section className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center">
          <p className="text-sm">{result.registrationPrompt.label}</p>
          <a
            href={result.registrationPrompt.destination}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Create your DeliveryIQ account
          </a>
        </section>
      </article>
    </main>
  );
}

function ResultList({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; summary: string }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {items.length ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.title} className="rounded-xl border border-border/70 p-4">
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No item meets the approved evidence threshold.
        </p>
      )}
    </section>
  );
}
