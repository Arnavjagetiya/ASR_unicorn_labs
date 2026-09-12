"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square, Sparkles } from "lucide-react";
import { calculateWER, WERResult } from "@/lib/wer";

// TypeScript's DOM lib ships the result types but not the recognizer itself,
// and Chrome/Safari still expose it under the webkit prefix — so declare the
// slice of the Web Speech API this component actually touches.
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  /** Chrome 138+: keep recognition on the device instead of a cloud service. */
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = {
  new (): SpeechRecognitionLike;
  /** Chrome 138+ only. Reports whether on-device recognition is installed. */
  available?: (options: {
    langs: string[];
    processLocally?: boolean;
  }) => Promise<"available" | "downloadable" | "downloading" | "unavailable">;
};

type Support = "checking" | "supported" | "unsupported";

const UNKNOWN_ENGINE: Engine = {
  name: "your browser's built-in speech recognition",
  vendor: "your browser vendor",
};

// The server has no navigator, so engine detection can only run once the
// client has taken over. This is the hydration-safe way to ask "am I on the
// client yet" — false through SSR and the hydration render, true after.
const subscribeToNothing = () => () => {};

/** Which engine actually transcribes is decided by the browser, not the OS. */
type Engine = { name: string; vendor: string };

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function describeEngine(): Engine {
  const ua = navigator.userAgent;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    ua;
  const isApple = /mac|iphone|ipad|ios/i.test(platform);
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !isEdge && !/OPR\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);

  if (isSafari) {
    return isApple
      ? { name: "Apple's dictation engine", vendor: "Apple" }
      : { name: "Safari's speech recognition", vendor: "Apple" };
  }
  if (isEdge) return { name: "Microsoft's speech recognition", vendor: "Microsoft" };
  if (isChrome) return { name: "Chrome's speech recognition", vendor: "Google" };
  return { name: "your browser's built-in speech recognition", vendor: "your browser vendor" };
}

function describeError(code: string, engine: Engine): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow it for this site in your browser settings, then try again.";
    case "no-speech":
      return "No speech was detected — try again and speak a little closer to the mic.";
    case "audio-capture":
      return "No microphone was found on this device.";
    case "network":
      return `${engine.name} couldn't be reached. It needs a network connection unless your browser supports on-device recognition.`;
    case "language-not-supported":
      return `${engine.name} doesn't support ${navigator.language}. Try switching your browser language to one it handles.`;
    case "aborted":
      return "";
    default:
      return `Dictation stopped unexpectedly (${code}).`;
  }
}

export default function TryItYourself() {
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const support: Support = !hydrated ? "checking" : getRecognitionCtor() ? "supported" : "unsupported";
  const engine = useMemo(() => (hydrated ? describeEngine() : UNKNOWN_ENGINE), [hydrated]);
  // null until an engine tells us; only Chrome 138+ reports this at all.
  const [onDevice, setOnDevice] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [expected, setExpected] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // start() awaits the on-device check, so the button can be clicked again
  // before isListening flips — without this a double-click leaves a second
  // recognizer running that Stop never reaches.
  const startingRef = useRef(false);
  // Finals arrive in fragments and useState batches, so accumulate in a ref.
  const finalRef = useRef("");
  const interimRef = useRef("");

  const result: WERResult | null =
    transcript.trim() && expected.trim() ? calculateWER(expected, transcript) : null;

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (startingRef.current || isListening) return;
    startingRef.current = true;
    recognitionRef.current?.abort();

    try {
      const Recognition = getRecognitionCtor();
      if (!Recognition) return;

      setErrorMsg("");
      setTranscript("");
      setInterim("");
      finalRef.current = "";
      interimRef.current = "";

      // getUserMedia and the Web Speech API both require a secure origin, so say
      // so plainly instead of surfacing a bare "not-allowed" from the engine.
      if (!window.isSecureContext) {
        setErrorMsg("Dictation needs a secure connection (https or localhost).");
        return;
      }

      const recognition = new Recognition();
      recognition.lang = navigator.language || "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Chrome 138+ can keep recognition on the machine. Only opt in when it is
      // already installed — asking for it otherwise makes start() fail, and
      // triggering the model download behind the user's back is worse than
      // falling back to the cloud path they already use for dictation.
      let local: boolean | null = null;
      if (typeof Recognition.available === "function") {
        try {
          local =
            (await Recognition.available({
              langs: [recognition.lang],
              processLocally: true,
            })) === "available";
        } catch {
          local = null;
        }
        if (local) recognition.processLocally = true;
      }
      setOnDevice(local);

      recognition.onresult = (event) => {
        let freshFinal = "";
        let pending = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const alternative = event.results[i][0];
          if (!alternative) continue;
          if (event.results[i].isFinal) freshFinal += alternative.transcript;
          else pending += alternative.transcript;
        }
        if (freshFinal) {
          finalRef.current = `${finalRef.current} ${freshFinal}`.trim();
          setTranscript(finalRef.current);
        }
        interimRef.current = pending.trim();
        setInterim(interimRef.current);
      };

      recognition.onerror = (event) => {
        const message = describeError(event.error, engine);
        if (message) setErrorMsg(message);
        setIsListening(false);
      };

      recognition.onend = () => {
        // Safari ends the session on a pause and may never promote the last
        // phrase to final, so keep it rather than dropping what was heard.
        if (!finalRef.current && interimRef.current) {
          finalRef.current = interimRef.current;
          setTranscript(interimRef.current);
        }
        setInterim("");
        setIsListening(false);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
      } catch (err) {
        console.error(err);
        setErrorMsg("Couldn't start dictation — try again.");
        setIsListening(false);
      }
    } finally {
      startingRef.current = false;
    }
  }, [engine, isListening]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-[var(--amber)]" />
        <h2 className="text-lg font-extrabold">Try It Yourself!</h2>
      </div>
      <p className="text-sm text-[var(--muted)] mb-5 leading-relaxed">
        {support === "unsupported" ? (
          <>
            This section transcribes a sentence you speak using your device&rsquo;s own dictation
            engine, then scores it against what you actually said.
          </>
        ) : (
          <>
            Speak a sentence and let your own device transcribe it with {engine.name} — the same
            recognizer behind dictation everywhere else on this machine — then type what you
            actually said to see its WER on your voice.
          </>
        )}
      </p>

      {support === "unsupported" && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <p className="text-sm text-[#ff8fae] mb-1">
            This browser doesn&rsquo;t expose a built-in speech recognizer.
          </p>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            The Web Speech API is available in Chrome, Edge and Safari. Firefox has not shipped it,
            so there is no on-device engine here to measure.
          </p>
        </div>
      )}

      {support === "supported" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {!isListening ? (
                <button
                  onClick={startListening}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pink)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  <Mic size={15} /> Start dictation
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#08090c] text-sm font-bold"
                >
                  <Square size={13} /> Stop
                </button>
              )}
              {isListening && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--pink)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--pink)] animate-pulse" />
                  Listening…
                </span>
              )}
            </div>

            {errorMsg && <p className="text-xs text-[#ff8fae]">{errorMsg}</p>}

            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">
                Your device heard:
              </label>
              <div className="mt-2 min-h-[64px] rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-sm text-white/90">
                {transcript || interim ? (
                  <>
                    {transcript}
                    {interim && <span className="text-white/40">{transcript ? " " : ""}{interim}</span>}
                  </>
                ) : (
                  <span className="text-white/30">— nothing dictated yet —</span>
                )}
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
                  This is {engine.name} on your voice, not Whisper — a different system trained on
                  different data, so read it alongside the Whisper numbers rather than as the same
                  measurement. Case and punctuation are normalised away before scoring, so only the
                  words themselves count.
                </p>
              </>
            ) : (
              <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/[0.1] p-6 text-center">
                <p className="text-xs text-[var(--muted)]">
                  Dictate something and fill in what you said to see your WER here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {support === "supported" && (
        <p className="text-[11px] text-[var(--muted)]/70 mt-5 leading-relaxed">
          {onDevice === null
            ? `Audio is handled by ${engine.name} — the same path your device already uses for dictation. Depending on your browser and OS that runs either on-device or on ${engine.vendor}'s servers.`
            : onDevice
              ? `Recognition ran on-device — your audio never left this machine.`
              : `Heads up: ${engine.name} sent your audio to ${engine.vendor} to transcribe, the same way it does when you dictate anywhere else on this device.`}
        </p>
      )}
    </div>
  );
}
