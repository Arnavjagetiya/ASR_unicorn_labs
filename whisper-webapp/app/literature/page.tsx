import { ExternalLink } from "lucide-react";
import { THEMES } from "@/lib/literature";

export default function LiteraturePage() {
  return (
    <div className="pt-28 pb-24 px-6 max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-wider text-[var(--teal)] font-bold mb-2">
          Literature review
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          Recreating Results
        </h1>
        <p className="text-[var(--muted)] max-w-2xl leading-relaxed">
          Brief notes restating the key findings of each source consulted during this project, in my own words —
          covering ASR foundations, evaluation methodology, datasets, and the accent-bias literature that motivates
          the research question.
        </p>
      </header>

      <div className="space-y-12">
        {THEMES.map((theme) => (
          <section key={theme.title}>
            <h2 className="text-lg font-extrabold mb-1">{theme.title}</h2>
            <p className="text-sm text-[var(--muted)] mb-5">{theme.description}</p>

            <div className="space-y-4">
              {theme.sources.map((source) => (
                <div
                  key={source.url}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1.5 mb-1"
                  >
                    <h3 className="font-bold text-white/95 group-hover:text-[var(--teal)] transition-colors">
                      {source.title}
                    </h3>
                    <ExternalLink size={13} className="mt-1.5 text-white/30 group-hover:text-[var(--teal)] transition-colors shrink-0" />
                  </a>
                  <p className="text-xs text-[var(--muted)] mb-3">{source.authors}</p>
                  <ul className="space-y-1.5">
                    {source.notes.map((note, i) => (
                      <li key={i} className="text-[13.5px] text-white/75 leading-relaxed flex gap-2">
                        <span className="text-[var(--teal)] shrink-0">–</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
