"use client";
import { useEffect, useState } from "react";

// Temporary diagnostic page: runs ONE dtype config per page load so a failed
// ORT session can't poison the next attempt.
export default function DtypeTest() {
  const [out, setOut] = useState("PENDING");
  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const spec = q.get("dtype") || "";
      const model = q.get("model") || "Xenova/whisper-tiny.en";
      let dtype: unknown = undefined;
      if (spec.includes(":")) {
        const [e, d] = spec.split(":");
        dtype = { encoder_model: e, decoder_model_merged: d };
      } else if (spec) dtype = spec;
      const t0 = performance.now();
      try {
        const { pipeline } = await import("@huggingface/transformers");
        const opts: Record<string, unknown> = {};
        if (dtype) opts.dtype = dtype;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: any = await pipeline("automatic-speech-recognition", model, opts as any);
        const audio = new Float32Array(16000);
        for (let i = 0; i < audio.length; i++) audio[i] = Math.sin(i / 12) * 0.05;
        const r = await p(audio);
        setOut(`RESULT OK | ${model} | ${spec || "(default)"} | ${((performance.now() - t0) / 1000).toFixed(1)}s | ${JSON.stringify(r.text).slice(0, 70)}`);
      } catch (e) {
        setOut(`RESULT FAIL | ${model} | ${spec || "(default)"} | ${((performance.now() - t0) / 1000).toFixed(1)}s | ${String(e).slice(0, 200)}`);
      }
    })();
  }, []);
  return <pre id="out">{out}</pre>;
}
