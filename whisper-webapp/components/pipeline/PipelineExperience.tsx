"use client";

import { useEffect, useMemo, useRef } from "react";
import { useScroll, useMotionValueEvent, animate as fmAnimate } from "framer-motion";
import {
  waveformPath,
  magma,
  formantEnergy,
  smooth,
  zoneT,
  crossfade,
  lerp,
  scaleAbout,
} from "@/lib/generative";
import { ZONES, STEP_BOUNDARIES, STEP_LABELS, CAPTIONS, ZoneKey } from "@/lib/zones";

const N_NODES = 10;
const BAR_HEIGHTS = [
  10, 18, 30, 46, 64, 82, 98, 112, 104, 88, 70, 52, 38, 28, 44, 64, 86, 104,
  116, 106, 90, 72, 54, 40, 30, 22, 16, 12, 9, 7, 6, 5, 4, 3,
];
const WORDS = ["Please", "call", "Stella"];
const WORD_X = [420, 800, 1180];
const WORD_Y = 470;
const TARGET_IDX: [number, number][] = [
  [2, 7],
  [1, 5],
  [3, 8],
];
const CANDIDATES: [string, number][] = [
  ["Stella", 0.86],
  ["Stellan", 0.07],
  ["Steel", 0.04],
  ["Stellar", 0.03],
];

function setDrawLen(path: SVGPathElement | null): number {
  if (!path) return 0;
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  return len;
}
function setDraw(path: SVGPathElement | null, len: number, t: number) {
  if (!path) return;
  path.style.strokeDashoffset = String(len * (1 - Math.max(0, Math.min(1, t))));
}
function recapPoint(x: number, y: number) {
  const s = 0.24, cx = 800, cy = 450, dy = -322;
  return { x: (x - cx) * s + cx, y: (y - cy) * s + cy + dy };
}

export default function PipelineExperience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const progressRef = useRef(0);

  // ---- refs to every element that needs a per-frame imperative update ----
  const heroRef = useRef<HTMLDivElement>(null);
  const gWaveRef = useRef<SVGGElement>(null);
  const waveLineRef = useRef<SVGPathElement>(null);
  const waveLenRef = useRef(0);

  const gFFTRef = useRef<SVGGElement>(null);
  const sweepRef = useRef<SVGRectElement>(null);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);

  const gMelRef = useRef<SVGGElement>(null);
  const melMaskRef = useRef<SVGRectElement>(null);

  const gEncBaseRef = useRef<SVGGElement>(null);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const encTitleRef = useRef<SVGTextElement>(null);
  const gEncConvRef = useRef<SVGGElement>(null);
  const convWindowRef = useRef<SVGRectElement>(null);
  const gEncPosRef = useRef<SVGGElement>(null);
  const posRibbonRef = useRef<SVGPathElement>(null);
  const attn1GroupRef = useRef<SVGGElement>(null);
  const attn2GroupRef = useRef<SVGGElement>(null);
  const attn1LineRefs = useRef<(SVGPathElement | null)[]>([]);
  const attn2LineRefs = useRef<(SVGPathElement | null)[]>([]);
  const attn1LensRef = useRef<number[]>([]);
  const attn2LensRef = useRef<number[]>([]);
  const attn2LabelRef = useRef<SVGTextElement>(null);
  const mlpLabelRef = useRef<SVGTextElement>(null);

  const gDecRef = useRef<SVGGElement>(null);
  const decTitleRef = useRef<SVGTextElement>(null);
  const decSubRef = useRef<SVGTextElement>(null);
  const startTokRef = useRef<SVGGElement>(null);
  const wordRefs = useRef<(SVGTextElement | null)[]>([]);
  const selfArcRefs = useRef<(SVGPathElement | null)[]>([]);
  const selfArcLensRef = useRef<number[]>([]);
  const crossArcRefs = useRef<(SVGPathElement | null)[]>([]);
  const crossArcLensRef = useRef<number[]>([]);
  const probGroupRef = useRef<SVGGElement>(null);

  const gFinalRef = useRef<SVGGElement>(null);
  const finalUnderlineRef = useRef<SVGPathElement>(null);
  const finalLenRef = useRef(0);

  const captionRef = useRef<HTMLParagraphElement>(null);
  const captionStateRef = useRef<{ last: string; busy: boolean }>({ last: "", busy: false });
  const stepRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const railFillRef = useRef<HTMLDivElement>(null);

  // ---- derived static geometry (computed once) ----
  const nodePos = useMemo(() => {
    const nx: number[] = [];
    const ny: number[] = [];
    for (let i = 0; i < N_NODES; i++) {
      const t = i / (N_NODES - 1);
      nx.push(220 + t * 1160);
      ny.push(450 - Math.sin(t * Math.PI) * 60);
    }
    return { nx, ny };
  }, []);

  const attn1Pairs: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]];
  const attn2Pairs: [number, number][] = [[0,4],[1,6],[2,8],[0,9],[3,9],[1,4],[5,9],[0,6]];

  function pathD(pairs: [number, number][], idx: number) {
    const [a, b] = pairs[idx];
    const ax = nodePos.nx[a], ay = nodePos.ny[a];
    const bx = nodePos.nx[b], by = nodePos.ny[b];
    const mx = (ax + bx) / 2, my = Math.min(ay, by) - 70;
    return `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }

  const spectrogramCells = useMemo(() => {
    const cols = 44, rows = 26, gx = 150, gy = 150, gw = 1300, gh = 560;
    const cw = gw / cols, ch = gh / rows;
    const cells: { x: number; y: number; w: number; h: number; fill: string }[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const t = c / cols, fp = 1 - r / rows;
        cells.push({
          x: gx + c * cw,
          y: gy + r * ch,
          w: Math.ceil(cw) + 0.6,
          h: Math.ceil(ch) + 0.6,
          fill: magma(formantEnergy(t, fp)),
        });
      }
    }
    return { cells, gx, gy, gw, gh };
  }, []);

  const wavePathD = useMemo(() => waveformPath(150, 1300, 380, 450), []);
  const fftMiniD = useMemo(() => waveformPath(150, 1300, 110, 130), []);

  // ---- one-time setup: measure drawable path lengths ----
  useEffect(() => {
    waveLenRef.current = setDrawLen(waveLineRef.current);
    attn1LensRef.current = attn1LineRefs.current.map((el) => setDrawLen(el));
    attn2LensRef.current = attn2LineRefs.current.map((el) => setDrawLen(el));
    selfArcLensRef.current = selfArcRefs.current.map((el) => setDrawLen(el));
    crossArcLensRef.current = crossArcRefs.current.map((el) => setDrawLen(el));
    finalLenRef.current = setDrawLen(finalUnderlineRef.current);
  }, []);

  function changeCaption(text: string) {
    const el = captionRef.current;
    const state = captionStateRef.current;
    if (!el || state.last === text || state.busy) return;
    state.last = text;
    state.busy = true;
    fmAnimate(el, { opacity: [1, 0], y: [0, 10] }, { duration: 0.22, ease: "easeIn" }).then(() => {
      el.innerHTML = text;
      fmAnimate(el, { opacity: [0, 1], y: [10, 0] }, { duration: 0.34, ease: "easeOut" }).then(() => {
        state.busy = false;
      });
    });
  }

  function render(p: number, time: number) {
    if (heroRef.current) heroRef.current.style.opacity = String(crossfade(p, ZONES.hero[0], ZONES.hero[1], 0, 0.02));

    if (gWaveRef.current) {
      gWaveRef.current.style.opacity = String(crossfade(p, ZONES.wave[0], ZONES.wave[1], 0.02, 0.035));
      gWaveRef.current.setAttribute("transform", `translate(0,${(Math.sin(time * 0.5) * 3).toFixed(2)})`);
    }
    setDraw(waveLineRef.current, waveLenRef.current, smooth(zoneT(p, ZONES.wave[0], ZONES.wave[0] + (ZONES.wave[1] - ZONES.wave[0]) * 0.62)));

    if (gFFTRef.current) gFFTRef.current.style.opacity = String(crossfade(p, ZONES.fft[0], ZONES.fft[1], 0.03, 0.035));
    const sweepT = smooth(zoneT(p, ZONES.fft[0], ZONES.fft[1]));
    sweepRef.current?.setAttribute("x", String(-180 + sweepT * 1660));
    const barsTop = 320, barsMaxH = 380;
    barRefs.current.forEach((bar, bi) => {
      if (!bar) return;
      const targetH = (BAR_HEIGHTS[bi] / 120) * barsMaxH;
      const bt = smooth(zoneT(p, ZONES.fft[0] + 0.02, ZONES.fft[0] + 0.02 + 0.1 + bi * 0.006));
      bar.setAttribute("height", String(targetH * bt));
      bar.setAttribute("y", String(barsTop + barsMaxH - targetH * bt));
    });

    if (gMelRef.current) gMelRef.current.style.opacity = String(crossfade(p, ZONES.mel[0], ZONES.mel[1], 0.03, 0.03));
    const wipeT = smooth(zoneT(p, ZONES.mel[0] + 0.02, ZONES.mel[1] - 0.02));
    melMaskRef.current?.setAttribute("x", String(spectrogramCells.gx + spectrogramCells.gw * wipeT));
    melMaskRef.current?.setAttribute("width", String(Math.max(0, spectrogramCells.gw * (1 - wipeT))));

    const encActive = crossfade(p, ZONES.encIntro[0], ZONES.encMlp[1], 0.02, 0.0);
    const encRecap = p > ZONES.handoff[1] ? 0.5 : 0;
    if (gEncBaseRef.current) {
      gEncBaseRef.current.style.opacity = String(Math.max(encActive, encRecap));
      const handoffT = smooth(zoneT(p, ZONES.handoff[0], ZONES.handoff[1]));
      const encScale = lerp(1, 0.24, handoffT);
      const encDy = lerp(0, -322, handoffT);
      gEncBaseRef.current.setAttribute("transform", scaleAbout(800, 450, encScale, 0, encDy));
    }
    nodeRefs.current.forEach((nd, ni) => {
      if (!nd) return;
      const pulse = 1 + Math.sin(time * 1.3 + ni * 0.6) * 0.04;
      nd.setAttribute("r", String(11 * pulse));
    });
    if (encTitleRef.current) encTitleRef.current.style.opacity = String(crossfade(p, ZONES.encIntro[0], ZONES.encMlp[1], 0.02, 0.03));

    if (gEncConvRef.current) gEncConvRef.current.style.opacity = String(crossfade(p, ZONES.encConv[0], ZONES.encConv[1], 0.02, 0.03));
    const convT = smooth(zoneT(p, ZONES.encConv[0], ZONES.encConv[1]));
    convWindowRef.current?.setAttribute("x", String(120 + convT * 1170));

    if (gEncPosRef.current) gEncPosRef.current.style.opacity = String(crossfade(p, ZONES.encPos[0], ZONES.encMlp[1], 0.02, 0.03));
    if (posRibbonRef.current) {
      let d = "";
      for (let pi = 0; pi <= 200; pi++) {
        const pt = pi / 200, px = 150 + pt * 1300, py = 700 + Math.sin(pt * 26 + time * 0.4) * 22;
        d += `${pi === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)} `;
      }
      posRibbonRef.current.setAttribute("d", d.trim());
    }

    if (attn1GroupRef.current) attn1GroupRef.current.style.opacity = String(crossfade(p, ZONES.encAttn1[0], ZONES.encMlp[1], 0.02, 0.03));
    attn1LineRefs.current.forEach((ln, li) => {
      const lt = smooth(zoneT(p, ZONES.encAttn1[0] + li * 0.008, ZONES.encAttn1[0] + 0.05 + li * 0.008));
      setDraw(ln, attn1LensRef.current[li] || 0, lt);
    });
    if (attn2GroupRef.current) attn2GroupRef.current.style.opacity = String(crossfade(p, ZONES.encAttn2[0], ZONES.encMlp[1], 0.02, 0.03));
    attn2LineRefs.current.forEach((ln, li) => {
      const lt = smooth(zoneT(p, ZONES.encAttn2[0] + li * 0.008, ZONES.encAttn2[0] + 0.05 + li * 0.008));
      setDraw(ln, attn2LensRef.current[li] || 0, lt);
    });
    if (attn2LabelRef.current) attn2LabelRef.current.style.opacity = String(crossfade(p, ZONES.encAttn2[0], ZONES.encMlp[1], 0.02, 0.03));

    if (mlpLabelRef.current) mlpLabelRef.current.style.opacity = String(crossfade(p, ZONES.encMlp[0], ZONES.encMlp[1] + 0.15, 0.02, 0.05));
    nodeRefs.current.forEach((nd, ni) => {
      if (!nd) return;
      const wavePos = zoneT(p, ZONES.encMlp[0] + ni * 0.003, ZONES.encMlp[0] + 0.02 + ni * 0.003);
      const flash = Math.sin(smooth(wavePos) * Math.PI);
      nd.setAttribute("fill", flash > 0.05 ? "var(--amber)" : "var(--teal)");
    });

    if (gDecRef.current) gDecRef.current.style.opacity = String(crossfade(p, ZONES.decTok[0], ZONES.final[0] + 0.02, 0.02, 0.03));
    if (decTitleRef.current) decTitleRef.current.style.opacity = String(crossfade(p, ZONES.decTok[0], ZONES.decW3[1], 0.02, 0.03));
    if (decSubRef.current) decSubRef.current.style.opacity = String(crossfade(p, ZONES.decW1[0], ZONES.decW3[1], 0.02, 0.03));
    if (startTokRef.current) startTokRef.current.style.opacity = String(crossfade(p, ZONES.decTok[0], ZONES.decW1[0] + 0.02, 0.02, 0.06));

    const decZones: [number, number][] = [ZONES.decW1, ZONES.decW2, ZONES.decW3];
    wordRefs.current.forEach((wEl, wi) => {
      if (!wEl) return;
      const zz = decZones[wi];
      const op = crossfade(p, zz[0], ZONES.decW3[1], 0.02, 0.03);
      wEl.style.opacity = String(op);
      const riseT = smooth(zoneT(p, zz[0], zz[0] + 0.02));
      wEl.setAttribute("transform", `translate(0,${((1 - riseT) * 14).toFixed(1)})`);
    });
    selfArcRefs.current.forEach((sa, si) => {
      if (!sa) return;
      const zz = decZones[si + 1];
      const t2 = smooth(zoneT(p, zz[0] + 0.01, zz[0] + 0.06));
      setDraw(sa, selfArcLensRef.current[si] || 0, t2);
      sa.style.opacity = String(crossfade(p, zz[0], ZONES.decW3[1], 0.02, 0.03) * 0.55);
    });
    crossArcRefs.current.forEach((ca, ci) => {
      if (!ca) return;
      const wordIdx = Math.floor(ci / 2);
      const zz = decZones[wordIdx];
      const t3 = smooth(zoneT(p, zz[0] + 0.02, zz[0] + 0.09));
      setDraw(ca, crossArcLensRef.current[ci] || 0, t3);
      ca.style.opacity = String(crossfade(p, zz[0], ZONES.decW3[1], 0.02, 0.03) * 0.55);
    });
    if (probGroupRef.current) probGroupRef.current.style.opacity = String(crossfade(p, ZONES.decW3[0] + 0.02, ZONES.decW3[1], 0.03, 0.04));

    if (gFinalRef.current) {
      gFinalRef.current.style.opacity = String(crossfade(p, ZONES.final[0], ZONES.final[1], 0.02, 0.0));
      const finalScale = lerp(0.96, 1, smooth(zoneT(p, ZONES.final[0], ZONES.final[0] + 0.03)));
      gFinalRef.current.setAttribute("transform", scaleAbout(800, 450, finalScale, 0, 0));
    }
    setDraw(finalUnderlineRef.current, finalLenRef.current, smooth(zoneT(p, ZONES.final[0] + 0.02, ZONES.final[1] - 0.01)));

    stepRefs.current.forEach((s, si) => {
      if (!s) return;
      const lo = si === 0 ? 0 : STEP_BOUNDARIES[si - 1];
      const hi = STEP_BOUNDARIES[si];
      s.className = "step-label " + (p >= lo && p < hi ? "step-active" : p >= hi ? "step-done" : "step-upcoming");
    });

    let activeCap: string | null = null;
    for (let ci = CAPTIONS.length - 1; ci >= 0; ci--) {
      const zz2 = ZONES[CAPTIONS[ci].zone as ZoneKey];
      if (p >= zz2[0]) { activeCap = CAPTIONS[ci].text; break; }
    }
    if (activeCap) changeCaption(activeCap);

    if (railFillRef.current) railFillRef.current.style.height = `${(p * 100).toFixed(1)}%`;
  }

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    progressRef.current = latest;
  });

  useEffect(() => {
    let raf: number;
    const loop = () => {
      render(progressRef.current, performance.now() / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>

      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-40 hidden sm:flex gap-3 md:gap-6 pointer-events-none px-2 max-w-[95vw]">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            ref={(el) => { stepRefs.current[i] = el; }}
            className="step-label step-upcoming text-[10px] md:text-[11px] whitespace-nowrap"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="fixed top-0 right-3 sm:right-5 h-screen hidden sm:flex items-center z-40 pointer-events-none">
        <div className="w-[2px] h-[36vh] sm:h-[44vh] bg-white/[0.07] rounded-full relative">
          <div ref={railFillRef} className="absolute left-0 top-0 w-full h-0 rounded-full bg-gradient-to-b from-[var(--teal)] to-[var(--pink)]" />
        </div>
      </div>

      <p
        ref={captionRef}
        className="fixed left-1/2 bottom-6 sm:bottom-[52px] -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-[680px] w-[92%] sm:w-[88%] text-center text-[14px] sm:text-[20px] font-semibold leading-snug sm:leading-relaxed text-[var(--muted)] pointer-events-none [&_b]:text-white [&_b]:font-extrabold"
      />

      <div ref={trackRef} className="relative h-[3467vh]">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          <div ref={heroRef} className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
            <h1 className="text-[clamp(26px,7vw,54px)] font-extrabold tracking-tight mb-3">How Whisper hears</h1>
            <p className="text-[var(--muted)] text-sm sm:text-base max-w-[340px] sm:max-w-[520px] leading-relaxed">
              From the raw shape of a sound wave to a finished sentence. Scroll to follow the audio continuously through every stage of the model.
            </p>
          </div>

          <svg viewBox="0 0 1600 900" className="w-[min(94vw,1500px)] h-auto max-h-[70vh] sm:max-h-[88vh] overflow-visible block">
            {/* ================= waveform ================= */}
            <g ref={gWaveRef}>
              <line x1={150} y1={450} x2={1450} y2={450} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <path ref={waveLineRef} d={wavePathD} fill="none" stroke="var(--teal)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              <text x={150} y={700} fill="var(--muted)" fontSize={15}>≈16,000 amplitude samples every second</text>
            </g>

            {/* ================= FFT ================= */}
            <g ref={gFFTRef}>
              <path d={fftMiniD} fill="none" stroke="rgba(91,227,201,0.5)" strokeWidth={1.5} />
              <rect ref={sweepRef} x={-180} y={60} width={180} height={140} fill="rgba(91,227,201,0.20)" />
              {BAR_HEIGHTS.map((_, bi) => {
                const barW = 1300 / BAR_HEIGHTS.length;
                return (
                  <rect
                    key={bi}
                    ref={(el) => { barRefs.current[bi] = el; }}
                    x={150 + bi * barW + barW * 0.16}
                    y={700}
                    width={barW * 0.68}
                    height={0}
                    rx={2}
                    fill={magma(0.28 + 0.55 * (BAR_HEIGHTS[bi] / 120))}
                  />
                );
              })}
              <text x={150} y={760} fill="var(--muted)" fontSize={15}>frequency energy inside each window</text>
            </g>

            {/* ================= mel spectrogram ================= */}
            <g ref={gMelRef}>
              {spectrogramCells.cells.map((cell, i) => (
                <rect key={i} x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={cell.fill} />
              ))}
              <rect ref={melMaskRef} x={spectrogramCells.gx} y={spectrogramCells.gy} width={spectrogramCells.gw} height={spectrogramCells.gh} fill="#0f1117" />
              <text x={150} y={744} fill="var(--muted)" fontSize={15}>time →</text>
              <text x={150} y={136} fill="var(--muted)" fontSize={15}>higher mel frequency ↑</text>
            </g>

            {/* ================= encoder ================= */}
            <g ref={gEncBaseRef}>
              {nodePos.nx.map((x, i) => (
                <circle key={i} ref={(el) => { nodeRefs.current[i] = el; }} cx={x} cy={nodePos.ny[i]} r={11} fill="var(--teal)" filter="url(#softGlow)" />
              ))}

              <g ref={gEncConvRef}>
                <rect ref={convWindowRef} x={120} y={370} width={190} height={160} rx={14} fill="rgba(91,227,201,0.16)" stroke="rgba(91,227,201,0.4)" strokeWidth={1} />
                <text x={800} y={640} textAnchor="middle" fill="var(--muted)" fontSize={15}>convolution layers detect local patterns across neighbouring frames</text>
              </g>

              <g ref={gEncPosRef}>
                <path ref={posRibbonRef} fill="none" stroke="var(--amber)" strokeWidth={1.6} opacity={0.7} />
                <text x={800} y={760} textAnchor="middle" fill="var(--muted)" fontSize={15}>positional encoding marks each frame&rsquo;s place in time</text>
              </g>

              <g ref={attn1GroupRef}>
                {attn1Pairs.map((_, i) => (
                  <path key={i} ref={(el) => { attn1LineRefs.current[i] = el; }} d={pathD(attn1Pairs, i)} fill="none" stroke="var(--teal)" strokeWidth={1.4} opacity={0.85} />
                ))}
              </g>
              <g ref={attn2GroupRef}>
                {attn2Pairs.map((_, i) => (
                  <path key={i} ref={(el) => { attn2LineRefs.current[i] = el; }} d={pathD(attn2Pairs, i)} fill="none" stroke="var(--teal)" strokeWidth={1.4} opacity={0.85} />
                ))}
              </g>
              <text x={800} y={200} textAnchor="middle" fill="var(--muted)" fontSize={15}>self-attention — local attention patterns between nearby frames</text>
              <text ref={attn2LabelRef} x={800} y={170} textAnchor="middle" fill="var(--muted)" fontSize={15} opacity={0}>and long-range patterns connecting distant frames</text>
              <text ref={mlpLabelRef} x={800} y={650} textAnchor="middle" fill="var(--muted)" fontSize={15} opacity={0}>a feed-forward network then refines every position independently</text>
              <text ref={encTitleRef} x={800} y={100} textAnchor="middle" fill="var(--foreground)" fontSize={20} fontWeight={700} opacity={0}>The encoder</text>
            </g>

            {/* ================= decoder ================= */}
            <g ref={gDecRef}>
              {WORDS.map((w, i) => (
                <text key={w} ref={(el) => { wordRefs.current[i] = el; }} x={WORD_X[i]} y={WORD_Y} textAnchor="middle" fill="var(--pink)" fontSize={46} fontWeight={700} opacity={0}>{w}</text>
              ))}
              {WORDS.slice(1).map((_, i) => (
                <path
                  key={`self-${i}`}
                  ref={(el) => { selfArcRefs.current[i] = el; }}
                  d={`M ${WORD_X[i + 1]} ${WORD_Y + 30} Q ${(WORD_X[i + 1] + WORD_X[i]) / 2} ${WORD_Y + 90} ${WORD_X[i]} ${WORD_Y + 30}`}
                  fill="none" stroke="var(--pink)" strokeWidth={1.3} opacity={0.55}
                />
              ))}
              {WORDS.map((_, wi) =>
                TARGET_IDX[wi].map((ti, k) => {
                  const rp = recapPoint(nodePos.nx[ti], nodePos.ny[ti]);
                  const mx = (WORD_X[wi] + rp.x) / 2, my = (WORD_Y - 40 + rp.y) / 2 - 20;
                  return (
                    <path
                      key={`cross-${wi}-${k}`}
                      ref={(el) => { crossArcRefs.current[wi * 2 + k] = el; }}
                      d={`M ${WORD_X[wi]} ${WORD_Y - 40} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${rp.x.toFixed(1)} ${rp.y.toFixed(1)}`}
                      fill="none" stroke="var(--teal)" strokeWidth={1.2} opacity={0.55}
                    />
                  );
                })
              )}
              <g ref={startTokRef} opacity={0}>
                <rect x={190} y={440} width={90} height={46} rx={8} fill="none" stroke="var(--pink)" strokeWidth={1.4} />
                <text x={235} y={469} textAnchor="middle" fill="var(--pink)" fontSize={15}>SOT</text>
              </g>
              <text ref={decTitleRef} x={800} y={640} textAnchor="middle" fill="var(--foreground)" fontSize={20} fontWeight={700} opacity={0}>The decoder</text>
              <text ref={decSubRef} x={800} y={672} textAnchor="middle" fill="var(--muted)" fontSize={15} opacity={0}>cross-attention (teal) reaches back into the encoder&rsquo;s audio hidden states</text>
              <g ref={probGroupRef} opacity={0}>
                {CANDIDATES.map(([name, prob], ci) => {
                  const pbX = 1230, pbY = 560, pbW = 150, pbGap = 46;
                  const y0 = pbY + ci * pbGap;
                  return (
                    <g key={name}>
                      <rect x={pbX} y={y0} width={pbW} height={14} rx={3} fill="rgba(255,255,255,0.08)" />
                      <rect x={pbX} y={y0} width={pbW * prob} height={14} rx={3} fill={ci === 0 ? "var(--teal)" : "var(--dim)"} />
                      <text x={pbX} y={y0 - 6} fill={ci === 0 ? "var(--foreground)" : "var(--muted)"} fontSize={13}>{name}  {Math.round(prob * 100)}%</text>
                    </g>
                  );
                })}
              </g>
            </g>

            {/* ================= final transcript ================= */}
            <g ref={gFinalRef}>
              <text x={800} y={400} textAnchor="middle" fill="var(--foreground)" fontSize={30} fontWeight={700}>
                <tspan x={800} dy={0}>Please call Stella, ask her to bring these things</tspan>
                <tspan x={800} dy={46}>with her from the store.</tspan>
              </text>
              <path ref={finalUnderlineRef} d="M 260 470 L 1340 470" stroke="var(--teal)" strokeWidth={2} fill="none" />
              <text x={800} y={540} textAnchor="middle" fill="var(--muted)" fontSize={15}>punctuated, cased, and complete</text>
            </g>
          </svg>
        </div>
      </div>

      <footer className="min-h-[60vh] flex items-center justify-center text-center px-6">
        <p className="text-[var(--muted)] text-[13.5px] max-w-[420px] leading-relaxed">
          One continuous pipeline: waveform → spectrogram → encoder → decoder → transcript. Scroll back up to replay any stage.
        </p>
      </footer>

      <style jsx global>{`
        .step-label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          white-space: nowrap;
          transition: color 0.5s;
          padding-bottom: 4px;
        }
        .step-upcoming { color: var(--dim); }
        .step-done { color: var(--muted); }
        .step-active { color: var(--teal); border-bottom: 1.5px solid var(--teal); }
      `}</style>
    </>
  );
}
