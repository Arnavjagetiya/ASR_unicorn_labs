import WERCalculator from "@/components/wer/WERCalculator";

export default function WERCalculatorPage() {
  return (
    <div className="pt-28 pb-24 px-6 max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-wider text-[var(--teal)] font-bold mb-2">Interactive tool</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">WER Calculator</h1>
        <p className="text-[var(--muted)] max-w-2xl leading-relaxed">
          Type or paste a reference transcript and a model&rsquo;s output to see Word Error Rate calculated live, with the exact
          substitutions, deletions, and insertions highlighted — the same Levenshtein-alignment approach jiwer uses under the hood.
        </p>
      </header>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <WERCalculator />
      </div>
    </div>
  );
}

import TryItYourself from "@/components/wer/TryItYourself";

// ...inside your page, after the existing calculator card:
<div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 mt-6">
  <TryItYourself />
</div>
