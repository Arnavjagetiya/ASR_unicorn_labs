import StatsSummary from "@/components/results/StatsSummary";
import WERComparisonChart from "@/components/results/WERComparisonChart";
import ErrorTypeChart from "@/components/results/ErrorTypeChart";
import PhraseSensitivityChart from "@/components/results/PhraseSensitivityChart";
import { KEY_FINDINGS } from "@/lib/werData";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <h2 className="text-sm font-bold text-white/90 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <div className="pt-28 pb-24 px-6 max-w-5xl mx-auto">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-wider text-[var(--teal)] font-bold mb-2">Results dashboard</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          Whisper-tiny: US vs Indian English
        </h1>
        <p className="text-[var(--muted)] max-w-2xl leading-relaxed">
          Real results from 60 Speech Accent Archive clips, transcribed with OpenAI&rsquo;s whisper-tiny and scored with jiwer.
        </p>
      </header>

      <div className="mb-8">
        <StatsSummary />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card title="Mean WER by group">
          <WERComparisonChart />
        </Card>
        <Card title="Error type breakdown (avg. per clip)">
          <ErrorTypeChart />
        </Card>
      </div>

      <div className="mb-6">
        <Card title="Phrase-level sensitivity">
          <PhraseSensitivityChart />
        </Card>
      </div>

      <Card title="Key findings">
        <ul className="space-y-3">
          {KEY_FINDINGS.map((finding, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/80 leading-relaxed">
              <span className="text-[var(--teal)] font-bold shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span dangerouslySetInnerHTML={{ __html: finding }} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
