"use client";

import { useMemo, useState } from "react";
import { calculateWER } from "@/lib/wer";

const EXAMPLE_REF = "Please call Stella, ask her to bring these things with her from the store.";
const EXAMPLE_HYP = "Please consider, ask her to bring these things from the store, five thick slabs of blue cheese.";

export default function WERCalculator() {
  const [reference, setReference] = useState(EXAMPLE_REF);
  const [hypothesis, setHypothesis] = useState(EXAMPLE_HYP);

  const result = useMemo(() => calculateWER(reference, hypothesis), [reference, hypothesis]);

  const typeStyles: Record<string, string> = {
    hit: "text-white/90",
    sub: "bg-[#ff8fae]/20 text-[#ff8fae] px-1 rounded",
    del: "bg-[#f7b955]/20 text-[#f7b955] px-1 rounded line-through",
    ins: "bg-[#5be3c9]/20 text-[#5be3c9] px-1 rounded",
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Reference (ground truth)</label>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-sm text-white outline-none focus:border-[var(--teal)]/50 resize-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Hypothesis (model output)</label>
          <textarea
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-sm text-white outline-none focus:border-[var(--pink)]/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
            <div className="text-xl font-extrabold text-[var(--teal)]">{(result.wer * 100).toFixed(1)}%</div>
            <div className="text-[10px] uppercase text-[var(--muted)] mt-1">WER</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
            <div className="text-xl font-extrabold text-[#ff8fae]">{result.substitutions}</div>
            <div className="text-[10px] uppercase text-[var(--muted)] mt-1">Subs</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
            <div className="text-xl font-extrabold text-[#f7b955]">{result.deletions}</div>
            <div className="text-[10px] uppercase text-[var(--muted)] mt-1">Dels</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
            <div className="text-xl font-extrabold text-[#5be3c9]">{result.insertions}</div>
            <div className="text-[10px] uppercase text-[var(--muted)] mt-1">Ins</div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Word-level alignment</label>
        <div className="mt-2 rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 min-h-[220px] leading-loose text-sm">
          {result.alignment.map((a, i) => (
            <span key={i} className={typeStyles[a.type] + " mr-1.5 inline-block"}>
              {a.type === "del" ? a.ref : a.type === "ins" ? a.hyp : a.hyp}
            </span>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-[var(--muted)]">
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ff8fae]/60 mr-1.5" />substitution</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f7b955]/60 mr-1.5" />deletion</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#5be3c9]/60 mr-1.5" />insertion</span>
        </div>
      </div>
    </div>
  );
}
