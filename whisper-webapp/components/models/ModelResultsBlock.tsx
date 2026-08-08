"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { ModelStats } from "@/lib/otherModelsData";

function StatBox({ label, value, suffix = "" }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 text-center">
      <div className="text-xl font-extrabold text-white">
        {value}
        {suffix}
      </div>
      <div className="text-[10px] uppercase text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}

export default function ModelResultsBlock({ stats }: { stats: ModelStats }) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stats.isPlaceholder) return;

    const bars = barRefs.current.filter(Boolean) as HTMLDivElement[];
    bars.forEach((el, i) => {
      const targetWidth = el.dataset.targetWidth + "%";
      animate(el, {
        width: targetWidth,
        delay: i * 150,
        duration: 900,
        easing: "easeOutExpo",
      });
    });

    numberRefs.current.forEach((el) => {
      if (!el) return;
      const target = parseFloat(el.dataset.target || "0");
      const obj = { val: 0 };
      animate(obj, {
        val: target,
        duration: 1200,
        easing: "easeOutExpo",
        update: () => {
          el.textContent = obj.val.toFixed(2);
        },
      });
    });
  }, [stats]);

  if (stats.isPlaceholder) {
    return (
      <div ref={sectionRef} className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-8 text-center">
        <h3 className="font-bold text-white/70 mb-1">{stats.modelName}</h3>
        <p className="text-xs text-[var(--muted)]">
          Results pending — run <code className="text-white/60">Meta_final.py</code> and drop the output into{" "}
          <code className="text-white/60">lib/otherModelsData.ts</code>.
        </p>
      </div>
    );
  }

  const maxWer = Math.max(stats.us.mean, stats.india.mean) * 100;
  const usWidth = maxWer > 0 ? (stats.us.mean * 100 / maxWer) * 100 : 0;
  const indiaWidth = maxWer > 0 ? (stats.india.mean * 100 / maxWer) * 100 : 0;

  return (
    <div ref={sectionRef} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: stats.color }} />
        <h3 className="font-extrabold">{stats.modelName}</h3>
      </div>

      <div className="space-y-3 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/70">US English</span>
            <span className="text-white/50">
              <span ref={(el) => { numberRefs.current[0] = el; }} data-target={(stats.us.mean * 100).toFixed(2)}>0.00</span>%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              ref={(el) => { barRefs.current[0] = el; }}
              data-target-width={usWidth}
              className="h-full rounded-full"
              style={{ width: "0%", background: stats.color }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/70">Indian English</span>
            <span className="text-white/50">
              <span ref={(el) => { numberRefs.current[1] = el; }} data-target={(stats.india.mean * 100).toFixed(2)}>0.00</span>%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              ref={(el) => { barRefs.current[1] = el; }}
              data-target-width={indiaWidth}
              className="h-full rounded-full opacity-60"
              style={{ width: "0%", background: stats.color }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatBox label="US n" value={String(stats.us.n)} />
        <StatBox label="India n" value={String(stats.india.n)} />
        <StatBox label="p-value" value={stats.significance.pValue.toFixed(3)} />
        <StatBox label="Cohen's d" value={stats.significance.cohensD.toFixed(2)} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-[var(--muted)]">
        <div>Subs: {stats.errorTypes.us.substitutions.toFixed(2)} / {stats.errorTypes.india.substitutions.toFixed(2)}</div>
        <div>Dels: {stats.errorTypes.us.deletions.toFixed(2)} / {stats.errorTypes.india.deletions.toFixed(2)}</div>
        <div>Ins: {stats.errorTypes.us.insertions.toFixed(2)} / {stats.errorTypes.india.insertions.toFixed(2)}</div>
      </div>
    </div>
  );
}
