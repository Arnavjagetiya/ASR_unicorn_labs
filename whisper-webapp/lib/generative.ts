// Shared generative/math helpers used across the pipeline visualisation.
// These are pure functions ported from the original prototype, typed properly.

export interface Burst {
  c: number; // centre (0-1 fraction of total duration)
  w: number; // width
  a: number; // amplitude
}

export const WORD_BURSTS: Burst[] = [
  { c: 0.10, w: 0.07, a: 0.55 },
  { c: 0.28, w: 0.06, a: 0.42 },
  { c: 0.48, w: 0.05, a: 0.30 },
  { c: 0.66, w: 0.09, a: 0.62 },
  { c: 0.88, w: 0.07, a: 0.38 },
];

/** Amplitude envelope (0-1) simulating word-shaped bursts of energy separated by quieter gaps. */
export function envelope(t: number, bursts: Burst[] = WORD_BURSTS): number {
  let e = 0.04;
  for (const b of bursts) {
    const d = (t - b.c) / b.w;
    e += b.a * Math.exp(-d * d * 4);
  }
  return Math.min(e, 1);
}

/** Generates an SVG path `d` string for a speech-like waveform. */
export function waveformPath(
  x0: number,
  width: number,
  height: number,
  baseY: number,
  segments = 460
): string {
  let d = "";
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x0 + t * width;
    const env = envelope(t);
    const wobble = Math.sin(t * 250) * 0.6 + Math.sin(t * 610 + 1.3) * 0.4;
    const y = baseY + wobble * env * (height / 2) * 0.92;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
}

const MAGMA: [number, number, number][] = [
  [12, 10, 22],
  [58, 22, 88],
  [142, 32, 108],
  [214, 84, 72],
  [247, 168, 62],
  [252, 230, 132],
];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Maps a 0-1 value to an rgb() colour string on a magma-like colormap. */
export function magma(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (MAGMA.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const c0 = MAGMA[Math.min(i, MAGMA.length - 1)];
  const c1 = MAGMA[Math.min(i + 1, MAGMA.length - 1)];
  const r = Math.round(lerp(c0[0], c1[0], f));
  const g = Math.round(lerp(c0[1], c1[1], f));
  const b = Math.round(lerp(c0[2], c1[2], f));
  return `rgb(${r},${g},${b})`;
}

/** Plausible formant-band energy for a given (time, frequency) position, used for the mel spectrogram. */
export function formantEnergy(t: number, freqPos: number): number {
  const wordEnv =
    0.2 +
    0.9 * Math.exp(-Math.pow((t - 0.1) / 0.07, 2) * 4) +
    0.7 * Math.exp(-Math.pow((t - 0.28) / 0.06, 2) * 4) +
    0.5 * Math.exp(-Math.pow((t - 0.48) / 0.05, 2) * 4) +
    1.0 * Math.exp(-Math.pow((t - 0.66) / 0.09, 2) * 4) +
    0.6 * Math.exp(-Math.pow((t - 0.88) / 0.07, 2) * 4);
  const formant =
    Math.exp(-Math.pow((freqPos - 0.25) / 0.12, 2)) * 0.8 +
    Math.exp(-Math.pow((freqPos - 0.55) / 0.1, 2)) * 0.5 +
    Math.exp(-Math.pow((freqPos - 0.78) / 0.08, 2)) * 0.3;
  return Math.max(0, Math.min(1, wordEnv * formant));
}

/** Smoothstep easing. */
export function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Local progress (0-1) of `p` between `a` and `b`. */
export function zoneT(p: number, a: number, b: number): number {
  if (p <= a) return 0;
  if (p >= b) return 1;
  return (p - a) / (b - a);
}

/** Crossfade opacity: fades in over `fin` before `s`, holds at 1 through [s,e], fades out over `fout` after `e`. */
export function crossfade(
  p: number,
  s: number,
  e: number,
  fin: number,
  fout: number
): number {
  const finF = Math.max(fin, 0.028) * 1.3;
  const foutF = Math.max(fout, 0.028) * 1.3;
  const a = p < s ? smooth(zoneT(p, s - finF, s)) : 1;
  const b = p > e ? 1 - smooth(zoneT(p, e, e + foutF)) : 1;
  return Math.max(0, Math.min(a, b));
}

/** Scale-about-a-point transform string, with an additional fixed-space translate applied after scaling. */
export function scaleAbout(
  cx: number,
  cy: number,
  s: number,
  tx: number,
  ty: number
): string {
  return `translate(${tx},${ty}) translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy})`;
}
