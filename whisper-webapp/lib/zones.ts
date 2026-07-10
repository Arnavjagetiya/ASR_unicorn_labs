// Scroll-progress zone boundaries (0-1) for each stage of the pipeline experience.
// Same timing model as the original prototype: content is compressed into the
// first 93% of scroll (END_BUFFER) so the finished transcript gets a genuine
// resting buffer before the page ends.

export type ZoneKey =
  | "hero"
  | "wave"
  | "fft"
  | "mel"
  | "encIntro"
  | "encConv"
  | "encPos"
  | "encAttn1"
  | "encAttn2"
  | "encMlp"
  | "handoff"
  | "decTok"
  | "decW1"
  | "decW2"
  | "decW3"
  | "final";

const RAW_ZONES: Record<ZoneKey, [number, number]> = {
  hero: [0.0, 0.045],
  wave: [0.045, 0.14],
  fft: [0.14, 0.23],
  mel: [0.23, 0.34],
  encIntro: [0.34, 0.38],
  encConv: [0.38, 0.43],
  encPos: [0.43, 0.47],
  encAttn1: [0.47, 0.56],
  encAttn2: [0.56, 0.65],
  encMlp: [0.65, 0.69],
  handoff: [0.69, 0.72],
  decTok: [0.72, 0.76],
  decW1: [0.76, 0.82],
  decW2: [0.82, 0.88],
  decW3: [0.88, 0.945],
  final: [0.945, 1.0],
};

export const END_BUFFER = 0.93;

export const ZONES: Record<ZoneKey, [number, number]> = Object.fromEntries(
  Object.entries(RAW_ZONES).map(([k, [a, b]]) => [
    k,
    [a * END_BUFFER, b * END_BUFFER],
  ])
) as Record<ZoneKey, [number, number]>;

export const STEP_BOUNDARIES: number[] = [
  ZONES.wave[1],
  ZONES.mel[1],
  ZONES.encMlp[1],
  ZONES.decW3[1],
  1.01,
];

export const STEP_LABELS = [
  "01 Waveform",
  "02 Spectrogram",
  "03 Encoder",
  "04 Decoder",
  "05 Transcript",
];

export interface CaptionEntry {
  zone: ZoneKey;
  text: string;
}

export const CAPTIONS: CaptionEntry[] = [
  { zone: "wave", text: 'A microphone captures <b>thousands of amplitude values every second</b> — this jagged line is the literal shape of the sound wave.' },
  { zone: "fft", text: 'Short overlapping windows are each transformed to reveal <b>which frequencies are present</b> — not just how loud the sound is, but its pitch content.' },
  { zone: "mel", text: 'Stacking every window side by side, then compressing the frequency axis to match <b>human hearing</b>, produces the spectrogram Whisper actually reads.' },
  { zone: "encIntro", text: 'The detailed spectrogram is <b>compressed into a shorter sequence</b> — one summary vector per moment, ready for the network to reason about.' },
  { zone: "encConv", text: '<b>Convolution layers</b> slide across the audio spotting small local patterns — like where a consonant starts or a pitch shifts.' },
  { zone: "encPos", text: 'The network has no built-in sense of order, so <b>positional encoding</b> stamps each frame with its position in time.' },
  { zone: "encAttn1", text: '<b>Self-attention</b> lets every moment "look at" nearby moments — connecting the start of a word to what follows it.' },
  { zone: "encAttn2", text: 'Deeper layers extend this further, linking <b>distant moments</b> too — so the whole clip is understood as one connected whole.' },
  { zone: "encMlp", text: 'A small <b>feed-forward network</b> then processes each position on its own, refining what self-attention just gathered.' },
  { zone: "handoff", text: 'The result is a set of <b>audio hidden states</b> — a rich, ready-to-use understanding the decoder will consult next.' },
  { zone: "decTok", text: 'Text generation starts from a single <b>start-of-transcript</b> token — the decoder writes one word at a time from here.' },
  { zone: "decW1", text: 'Before choosing a word, the decoder uses <b>cross-attention</b> to check back with the audio, confirming what was actually said.' },
  { zone: "decW2", text: 'Each new word also uses <b>self-attention</b> on the words already written, keeping the sentence grammatically coherent.' },
  { zone: "decW3", text: 'At every step, the model scores several <b>candidate next words</b> by probability, and simply picks the most likely one.' },
  { zone: "final", text: 'Punctuated, capitalised, and complete — this is the <b>finished transcript</b>, generated one word at a time by the process you just scrolled through.' },
];
