import Link from "next/link";
import { ArrowRight, Waves, BarChart3, Calculator } from "lucide-react";
import { GROUP_STATS, SIGNIFICANCE } from "@/lib/werData";

function Card({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.14] transition-all"
    >
      <Icon size={22} style={{ color: accent }} />
      <h3 className="text-lg font-bold mt-4 mb-1.5 flex items-center gap-1.5">
        {title}
        <ArrowRight size={15} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
      </h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{description}</p>
    </Link>
  );
}

export default function Home() {
  const [us, india] = GROUP_STATS;

  return (
    <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
      <div className="text-[11px] uppercase tracking-wider text-[var(--teal)] font-bold mb-3">
        Independent research project
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 max-w-2xl">
        Does Whisper hear everyone equally?
      </h1>
      <p className="text-[var(--muted)] text-lg max-w-2xl leading-relaxed mb-12">
        An investigation into accent bias in Automatic Speech Recognition — comparing Word Error Rate between
        US and Indian English on OpenAI&rsquo;s Whisper, with an interactive walkthrough of how the model
        actually works under the hood.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-14 max-w-xl">
        <div>
          <div className="text-2xl font-extrabold" style={{ color: us.color }}>{(us.mean * 100).toFixed(1)}%</div>
          <div className="text-xs text-[var(--muted)] mt-1">US English WER</div>
        </div>
        <div>
          <div className="text-2xl font-extrabold" style={{ color: india.color }}>{(india.mean * 100).toFixed(1)}%</div>
          <div className="text-xs text-[var(--muted)] mt-1">Indian English WER</div>
        </div>
        <div>
          <div className="text-2xl font-extrabold">p = {SIGNIFICANCE.pValue}</div>
          <div className="text-xs text-[var(--muted)] mt-1">Mann-Whitney U</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card
          href="/pipeline"
          icon={Waves}
          title="How Whisper Hears"
          description="A scroll-driven walkthrough of the full pipeline — waveform, spectrogram, encoder, decoder — built from scratch, not a flowchart."
          accent="#5be3c9"
        />
        <Card
          href="/results"
          icon={BarChart3}
          title="Results Dashboard"
          description="The real WER data: group comparisons, error-type breakdowns, and which specific phrases are most accent-sensitive."
          accent="#ff8fae"
        />
        <Card
          href="/wer-calculator"
          icon={Calculator}
          title="WER Calculator"
          description="Paste any reference and hypothesis text to see Word Error Rate computed live, with the alignment visualised."
          accent="#f7b955"
        />
      </div>
    </div>
  );
}
