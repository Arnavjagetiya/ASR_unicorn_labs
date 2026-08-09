"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import type { ModelStats } from "@/lib/otherModelsData";

interface ModelResultsBlockProps {
  stats: ModelStats;
}

function StatBox({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1">
        {label}
      </div>
      <div className="text-xl font-bold">
        {value}
        {suffix && (
          <span className="text-sm font-medium text-[var(--muted)] ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ModelResultsBlock({
  stats,
}: ModelResultsBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blockRef.current) return;

    animate(blockRef.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 500,
      ease: "outQuad",
    });
  }, []);

  const usWer = (stats.us.mean * 100).toFixed(2);
  const indiaWer = (stats.india.mean * 100).toFixed(2);
  const gap = ((stats.india.mean - stats.us.mean) * 100).toFixed(2);

  return (
    <div
      ref={blockRef}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div className="mb-6">
        <div
          className="h-1 w-12 rounded-full mb-4"
          style={{ backgroundColor: stats.color }}
        />

        <h2 className="text-xl font-bold mb-1">{stats.modelName}</h2>

        <p className="text-xs text-[var(--muted)] break-all">
          {stats.modelId}
        </p>

        {stats.isPlaceholder && (
          <div className="mt-3 inline-flex rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 text-xs text-yellow-300">
            Placeholder data
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatBox label="US English WER" value={usWer} suffix="%" />
        <StatBox label="Indian English WER" value={indiaWer} suffix="%" />
        <StatBox label="US Median" value={(stats.us.median * 100).toFixed(2)} suffix="%" />
        <StatBox
          label="India Median"
          value={(stats.india.median * 100).toFixed(2)}
          suffix="%"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-black/10 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-3">
          Accent gap
        </div>

        <div className="text-2xl font-extrabold">
          +{gap}%
        </div>

        <div className="text-xs text-[var(--muted)] mt-1">
          Indian English WER minus US English WER
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatBox label="US Samples" value={String(stats.us.n)} />
        <StatBox label="India Samples" value={String(stats.india.n)} />
        <StatBox
          label="US Std. Dev."
          value={(stats.us.std * 100).toFixed(2)}
          suffix="%"
        />
        <StatBox
          label="India Std. Dev."
          value={(stats.india.std * 100).toFixed(2)}
          suffix="%"
        />
      </div>

      <div className="border-t border-white/10 pt-5">
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-3">
          Statistical significance
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="p-value"
            value={stats.significance.pValue.toFixed(5)}
          />
          <StatBox
            label="Cohen's d"
            value={stats.significance.cohensD.toFixed(2)}
          />
        </div>
      </div>

      <div className="border-t border-white/10 pt-5 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-3">
          Error types
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold mb-2">US English</div>
            <div className="space-y-1 text-xs text-[var(--muted)]">
              <div>Substitutions: {stats.errorTypes.us.substitutions}</div>
              <div>Deletions: {stats.errorTypes.us.deletions}</div>
              <div>Insertions: {stats.errorTypes.us.insertions}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Indian English</div>
            <div className="space-y-1 text-xs text-[var(--muted)]">
              <div>Substitutions: {stats.errorTypes.india.substitutions}</div>
              <div>Deletions: {stats.errorTypes.india.deletions}</div>
              <div>Insertions: {stats.errorTypes.india.insertions}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}