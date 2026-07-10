// Real results from the Whisper-tiny US-vs-Indian-English WER study.
// Sourced directly from the verified deep_analysis.py run (Mann-Whitney U,
// Cohen's d, error-type breakdown, and phrase sensitivity figures).

export interface GroupStats {
  label: string;
  n: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  color: string;
}

export const GROUP_STATS: GroupStats[] = [
  {
    label: "US English",
    n: 30,
    mean: 0.0348,
    median: 0.029,
    std: 0.0427,
    min: 0.0,
    max: 0.1739,
    color: "#5be3c9",
  },
  {
    label: "Indian English",
    n: 30,
    mean: 0.07,
    median: 0.0435,
    std: 0.0611,
    min: 0.0,
    max: 0.2609,
    color: "#ff8fae",
  },
];

export const SIGNIFICANCE = {
  test: "Mann-Whitney U",
  pValue: 0.0008,
  cohensD: 0.68,
  effectSize: "medium",
  interpretation:
    "The WER gap is statistically significant (p < 0.001) and a real, practically meaningful effect — not sample-size noise.",
};

export interface ErrorTypeRow {
  group: string;
  substitutions: number;
  deletions: number;
  insertions: number;
}

export const ERROR_TYPES: ErrorTypeRow[] = [
  { group: "US English", substitutions: 1.43, deletions: 0.53, insertions: 0.43 },
  { group: "Indian English", substitutions: 3.37, deletions: 0.8, insertions: 0.67 },
];

export interface PhraseSensitivity {
  phrase: string;
  usErrors: number;
  indiaErrors: number;
  n: number;
}

export const PHRASE_SENSITIVITY: PhraseSensitivity[] = [
  { phrase: '"thick slabs"', usErrors: 1, indiaErrors: 11, n: 30 },
  { phrase: '"brother Bob"', usErrors: 2, indiaErrors: 8, n: 30 },
  { phrase: '"Wednesday"', usErrors: 3, indiaErrors: 7, n: 30 },
  { phrase: '"snow peas"', usErrors: 4, indiaErrors: 6, n: 30 },
  { phrase: '"Stella"', usErrors: 1, indiaErrors: 4, n: 30 },
  { phrase: '"blue cheese"', usErrors: 0, indiaErrors: 3, n: 30 },
  { phrase: '"train station"', usErrors: 3, indiaErrors: 3, n: 30 },
];

export const KEY_FINDINGS: string[] = [
  "Indian English WER (7.00%) is roughly double US English WER (3.48%) on whisper-tiny.",
  '"thick slabs" is the single most accent-sensitive phrase — an 11x higher error rate for Indian English, driven by the dental fricative "th" and the "sl" consonant cluster.',
  "Substitutions — not deletions or insertions — drive almost all of the gap, pointing to phoneme misclassification in the acoustic model rather than the decoder losing words.",
  "Indian English shows roughly 2x higher variance (std 0.061 vs 0.043), meaning the gap concentrates in specific speakers rather than applying uniformly.",
  "Three Indian English clips (in_27, in_28, in_29) show outright decoder hallucination — fabricated words with no relationship to the audio.",
];

export const METHOD_NOTE =
  "60 clips (30 US, 30 Indian English) from the Speech Accent Archive, each reading an identical scripted paragraph, transcribed with OpenAI's whisper-tiny and scored with jiwer after text normalisation.";
