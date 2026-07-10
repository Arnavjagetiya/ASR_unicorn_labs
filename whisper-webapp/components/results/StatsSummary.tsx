import { SIGNIFICANCE, GROUP_STATS, METHOD_NOTE } from "@/lib/werData";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1.5">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      {sub && <div className="text-xs text-[var(--muted)] mt-1">{sub}</div>}
    </div>
  );
}

export default function StatsSummary() {
  const [us, india] = GROUP_STATS;
  const gapX = (india.mean / us.mean).toFixed(2);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="US English WER" value={`${(us.mean * 100).toFixed(2)}%`} sub={`n=${us.n} clips`} />
        <Stat label="Indian English WER" value={`${(india.mean * 100).toFixed(2)}%`} sub={`n=${india.n} clips`} />
        <Stat label="Gap" value={`${gapX}×`} sub="higher for Indian English" />
        <Stat label={SIGNIFICANCE.test} value={`p = ${SIGNIFICANCE.pValue}`} sub={`Cohen's d = ${SIGNIFICANCE.cohensD} (${SIGNIFICANCE.effectSize})`} />
      </div>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{SIGNIFICANCE.interpretation}</p>
      <p className="text-xs text-[var(--dim)] mt-3 leading-relaxed">{METHOD_NOTE}</p>
    </div>
  );
}
