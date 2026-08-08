import ModelResultsBlock from "@/components/models/ModelResultsBlock";
import { NVIDIA_STATS, META_STATS } from "@/lib/otherModelsData";

export default function ModelComparisonPage() {
  return (
    <div className="pt-28 pb-24 px-6 max-w-5xl mx-auto">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-wider text-[var(--teal)] font-bold mb-2">
          Cross-model comparison
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          NVIDIA &amp; Meta Results
        </h1>
        <p className="text-[var(--muted)] max-w-2xl leading-relaxed">
          The same 60 US / 60 Indian English clips run through NVIDIA Parakeet-TDT and Meta MMS, for direct
          comparison against the Whisper-tiny baseline on the Results tab.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <ModelResultsBlock stats={NVIDIA_STATS} />
        <ModelResultsBlock stats={META_STATS} />
      </div>
    </div>
  );
}
