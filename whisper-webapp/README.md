# How Whisper Hears — Accent Bias in ASR

A Next.js + TypeScript + Tailwind web app extending the original scrollytelling
prototype into a full multi-page site, per Markus's suggestion.

## What's in here

- **`/`** — Landing page with headline stats and links to the three sections below.
- **`/pipeline`** — The scroll-driven "How Whisper Hears" experience, ported from
  the standalone HTML version to React + TypeScript, using Framer Motion to track
  scroll position and refs for performant per-frame SVG updates.
- **`/results`** — A real data dashboard (Recharts) showing the actual WER study
  results: group comparison, error-type breakdown, phrase-level sensitivity, and
  the statistical significance test (Mann-Whitney p = 0.0008, Cohen's d = 0.68).
- **`/wer-calculator`** — A genuinely interactive tool: paste any reference and
  hypothesis text and see Word Error Rate computed live via a Levenshtein
  alignment (the same approach jiwer uses), with substitutions/deletions/
  insertions highlighted word-by-word.

Fully responsive — tested down to phone widths (the pipeline's stepper and side
progress rail hide below the `sm` breakpoint to avoid crowding small screens;
everything else reflows via standard Tailwind breakpoints).

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Building for production

```bash
npm run build
npm start
```

## Deploying

This is a standard Next.js app — the easiest path is:

```bash
npx vercel
```

(or connect the GitHub repo directly at vercel.com — free tier is enough for
this). Netlify and any other Next.js-compatible host will also work.

## Project structure

```
app/                    Next.js App Router pages
  page.tsx              Landing page
  pipeline/page.tsx      -> renders PipelineExperience
  results/page.tsx       -> renders the dashboard
  wer-calculator/page.tsx -> renders the calculator
  layout.tsx             Root layout, nav, fonts
components/
  Nav.tsx
  pipeline/PipelineExperience.tsx   The big scrollytelling component
  results/*.tsx                     Recharts chart components
  wer/WERCalculator.tsx
lib/
  generative.ts    Waveform/spectrogram math (ported from the HTML prototype)
  zones.ts         Scroll-progress zone timing + captions
  werData.ts        Real research results
  wer.ts           WER calculation (Levenshtein alignment)
```

## Updating the research data

All the real numbers live in one place: `lib/werData.ts`. When you scale up to
60-70 samples per group or add fine-tuning results, update the arrays there and
every chart on `/results` updates automatically.
