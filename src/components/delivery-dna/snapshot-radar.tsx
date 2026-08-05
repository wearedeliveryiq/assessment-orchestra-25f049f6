import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { SnapshotV2DomainProfile } from "@/lib/delivery-dna/snapshot-v2";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function SnapshotRadar({ profile }: { profile: SnapshotV2DomainProfile[] }) {
  const reducedMotion = useReducedMotion();
  const data = profile.map((axis) => ({
    ...axis,
    axis: String(axis.axisNumber),
    plottedValue: axis.value,
  }));

  return (
    <div>
      <div
        className="snapshot-radar h-[340px] w-full sm:h-[430px]"
        aria-hidden="true"
        data-axis-count={profile.length}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <defs>
              <linearGradient id="snapshotRadarGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-chart-1)" />
                <stop offset="100%" stopColor="var(--color-chart-2)" />
              </linearGradient>
            </defs>
            <PolarGrid stroke="var(--border)" radialLines />
            <PolarAngleAxis
              dataKey="axis"
              tick={({ x, y, payload, textAnchor }) => {
                const axis = data[Number(payload.value) - 1];
                return (
                  <text x={x} y={y} textAnchor={textAnchor} fontSize={12} fontWeight={700}>
                    {payload.value}
                    {axis?.value === null ? " · N/A" : ""}
                  </text>
                );
              }}
            />
            <PolarRadiusAxis domain={[0, 4]} tick={false} axisLine={false} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const axis = payload?.[0]?.payload as SnapshotV2DomainProfile | undefined;
                if (!active || !axis) return null;
                return (
                  <div className="panel max-w-64 p-3 text-xs text-foreground">
                    <p className="font-semibold">{axis.domainLabel}</p>
                    <p className="mt-1 capitalize text-muted-foreground">{axis.level ?? "N/A"}</p>
                  </div>
                );
              }}
            />
            <Radar
              name="Practice signal"
              dataKey="plottedValue"
              stroke="url(#snapshotRadarGradient)"
              fill="url(#snapshotRadarGradient)"
              fillOpacity={0.22}
              strokeWidth={3}
              connectNulls={false}
              dot={{ r: 3.5, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={!reducedMotion}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <ol
        className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Accessible indicative delivery profile"
      >
        {profile.map((axis) => (
          <li
            key={axis.domainId}
            className="flex items-start gap-3 rounded-[14px] border border-border bg-muted p-3"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-foreground"
              aria-hidden="true"
            >
              {axis.axisNumber}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{axis.domainLabel}</span>
              <span className="mt-2 inline-flex rounded-full border border-primary/45 bg-accent px-2.5 py-1 text-xs font-semibold text-foreground">
                {axis.level ? axis.level[0].toUpperCase() + axis.level.slice(1) : "Not applicable"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
