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

import type { SnapshotProfileAxis } from "@/lib/delivery-dna/snapshot";

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

export function SnapshotRadar({ profile }: { profile: SnapshotProfileAxis[] }) {
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
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            <PolarGrid stroke="rgba(255,255,255,0.16)" radialLines />
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
            <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const axis = payload?.[0]?.payload as SnapshotProfileAxis | undefined;
                if (!active || !axis) return null;
                return (
                  <div className="max-w-64 rounded-xl border border-white/10 bg-[#111827] p-3 text-xs text-[#F8FAFC] shadow-2xl">
                    <p className="font-semibold">{axis.capabilityLabel}</p>
                    <p className="mt-1 text-[#CBD5E1]">{axis.responseLabel}</p>
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
              dot={{ r: 3.5, fill: "#F8FAFC", stroke: "#090E1A", strokeWidth: 2 }}
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
            key={axis.questionId}
            className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-xs font-bold text-[#F8FAFC]"
              aria-hidden="true"
            >
              {axis.axisNumber}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#F8FAFC]">
                {axis.capabilityLabel}
              </span>
              <span className="mt-0.5 block text-xs text-[#CBD5E1]">{axis.responseLabel}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
