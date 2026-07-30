"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { calculateWER, WERResult } from "@/lib/wer";
import { blobToWhisperInput } from "@/lib/audioUtils";

// The transformers.js pipeline type isn't worth importing just for this —
// it's dynamically imported client-side only, never during SSR/build.
type Transcriber = (input: Float32Array) => Promise<{ text: string }>;

type ModelState = "idle" | "loading" | "ready" | "error";

export default function TryItYourself() {
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [expected, setExpected] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const transcriberRef = useRef<Transcriber | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const result: WERResult | null =
    transcript.trim() && expected.trim() ? calculateWER(expected, transcript) : null;

  async function loadModel() {
    setModelState("loading");
    setErrorMsg("");
    try {
      // Dynamic import: this library touches browser-only APIs (WASM, Web
      // Workers) and must never be pulled into the server/SSR bundle.
      const { pipeline } = await import("@huggingface/transformers");
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
        {
          progress_callback: (p: { status: string; progress?: number }) => {
            if (typeof p.progress === "number") setLoadProgress(Math.round(p.progress));
          },
        }
      );
      transcriberRef.current = transcriber as unknown as Transcriber;
      setModelState("ready");
    } catch (err) {
      console.error(err);
      setErrorMsg("Couldn't load the speech model. Check your connection and try again.");
      setModelState("error");
    }
  }

  async function startRecording() {
    setErrorMsg("");
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecordingStop;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Microphone access was denied or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  }

  async function handleRecordingStop() {
    if (!transcriberRef.current) return;
    setIsTranscribing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const audioData = await blobToWhisperInput(blob);
      const output = await transcriberRef.current(audioData);
      setTranscript(output.text.trim());
    } catch (err) {
      console.error(err);
      setErrorMsg("Transcription failed — try recording again.");
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-[var(--amber)]" />
        <h2 className="text-lg font-extrabold">Try It Yourself!</h2>
      </div>
      <p className="text-sm text-[var(--muted)] mb-5 leading-relaxed">
        Record yourself speaking a sentence, let Whisper-tiny transcribe it — running entirely in your
        browser, nothing is uploaded anywhere — then type what you actually said to see your own WER.
      </p>

      {modelState !== "ready" && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 mb-5">
          {modelState === "idle" && (
            <button
              onClick={loadModel}
              className="px-4 py-2 rounded-full bg-[var(--teal)] text-[#04342C] text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Load speech model (~75MB, one-time download)
            </button>
          )}
          {modelState === "loading" && (
            <div className="flex items-center gap-3 text-sm text-white/80">
              <Loader2 size={16} className="animate-spin" />
              Loading whisper-tiny.en{loadProgress > 0 ? ` — ${loadProgress}%` : "…"}
            </div>
          )}
          {modelState === "error" && (
            <div>
              <p className="text-sm text-[#ff8fae] mb-2">{errorMsg}</p>
              <button
                onClick={loadModel}
                className="px-4 py-2 rounded-full bg-white/10 text-sm font-bold hover:bg-white/15 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {modelState === "ready" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Mic size={15} /> Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#08090c] text-sm font-bold"
                >
                  <Square size={13} /> Stop
                </button>
              )}
              {isRecording && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--pink)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-pulse" />
                  Recording…
                </span>
              )}
              {isTranscribing && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <Loader2 size={13} className="animate-spin" /> Transcribing…
                </span>
              )}
            </div>

            {errorMsg && modelState === "ready" && (
              <p className="text-xs text-[#ff8fae]">{errorMsg}</p>
            )}

            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">
                Whisper heard:
              </label>
              <div className="mt-2 min-h-[64px] rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-sm text-white/90">
                {transcript || <span className="text-white/30">— nothing recorded yet —</span>}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">
                What did you actually say?
              </label>
              <textarea
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={3}
                placeholder="Type the sentence you spoke..."
                className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-sm text-white outline-none focus:border-[var(--teal)]/50 resize-none"
              />
            </div>
          </div>

          <div>
            {result ? (
              <>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                    <div className="text-xl font-extrabold text-[var(--teal)]">{(result.wer * 100).toFixed(1)}%</div>
                    <div className="text-[10px] uppercase text-[var(--muted)] mt-1">WER</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                    <div className="text-xl font-extrabold text-[#ff8fae]">{result.substitutions}</div>
                    <div className="text-[10px] uppercase text-[var(--muted)] mt-1">Subs</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                    <div className="text-xl font-extrabold text-[#f7b955]">{result.deletions}</div>
                    <div className="text-[10px] uppercase text-[var(--muted)] mt-1">Dels</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                    <div className="text-xl font-extrabold text-[#5be3c9]">{result.insertions}</div>
                    <div className="text-[10px] uppercase text-[var(--muted)] mt-1">Ins</div>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  This compares your own live microphone transcription against whisper-tiny&rsquo;s baseline —
                  a good way to see accent-related errors happen in real time on your own voice.
                </p>
              </>
            ) : (
              <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/[0.1] p-6 text-center">
                <p className="text-xs text-[var(--muted)]">
                  Record something and fill in what you said to see your WER here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
