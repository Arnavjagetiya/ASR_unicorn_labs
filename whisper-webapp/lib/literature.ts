// Brief notes summarising key findings from each source consulted during this
// project. "Recreating results" here means restating each source's core
// findings in our own words, not re-running their experiments.

export interface Source {
  title: string;
  authors: string;
  url: string;
  notes: string[];
}

export interface Theme {
  title: string;
  description: string;
  sources: Source[];
}

export const THEMES: Theme[] = [
  {
    title: "ASR Foundations & Architecture",
    description: "How speech recognition works, from the classical statistical era to modern end-to-end models.",
    sources: [
      {
        title: "An Overview of Modern Speech Recognition",
        authors: "Huang & Deng, Microsoft Research (2010)",
        url: "https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/Book-Chap-HuangDeng2010.pdf",
        notes: [
          "Classical (pre-deep-learning) ASR rests on one equation: Ŵ = argmax P(W)·P(X|W) — a separate acoustic model (HMM) and language model (n-gram) combined via search (Viterbi decoding).",
          "Even in 2010, the authors named accent and speaker variability as a major unsolved challenge — pronunciation modelling for accented speech gave only \"small gains.\"",
          "Useful historical baseline: shows accent bias in ASR predates deep learning by well over a decade — this is not a new problem Whisper introduced.",
        ],
      },
      {
        title: "What is Automatic Speech Recognition?",
        authors: "AssemblyAI Blog",
        url: "https://www.assemblyai.com/blog/what-is-asr",
        notes: [
          "History: 1952 Bell Labs \"Audrey\" (digit recognizer) → HMM/GMM era → 2014 Baidu \"Deep Speech\" paper kicked off the modern end-to-end era.",
          "Two paradigms: Traditional Hybrid (separate lexicon + acoustic + language models, needs forced-aligned data) vs. End-to-End (single unified model). Whisper is firmly in the end-to-end camp.",
          "Confirms the standard WER formula: (Substitutions + Insertions + Deletions) / Reference word count.",
        ],
      },
      {
        title: "Essential Guide to Automatic Speech Recognition Technology",
        authors: "NVIDIA Developer Blog",
        url: "https://developer.nvidia.com/blog/essential-guide-to-automatic-speech-recognition-technology/",
        notes: [
          "Detailed pipeline: raw audio → FFT/windowing → Mel spectrogram → acoustic model → decoder (greedy or beam search) → punctuation restoration.",
          "This became the direct basis for the \"How Whisper Hears\" diagrams and scroll animation built earlier in this project.",
        ],
      },
      {
        title: "Robust Speech Recognition via Large-Scale Weak Supervision",
        authors: "Radford et al., OpenAI (2022)",
        url: "https://cdn.openai.com/papers/whisper.pdf",
        notes: [
          "680,000 hours of weakly-supervised training data across 96 languages, encoder-decoder Transformer architecture.",
          "A unified multitask token format (transcribe / translate / language-ID / no-speech) lets one model replace an entire traditional pipeline.",
          "Section 4.4 specifically studies how text normalisation affects measured WER — directly informs the normalisation approach used across this project's own scripts.",
        ],
      },
      {
        title: "Automatic Speech Recognition — Research Area",
        authors: "AI4Bharat, IIT Madras",
        url: "https://ai4bharat.iitm.ac.in/areas/asr",
        notes: [
          "300,000 hours of raw speech and 6,000 hours of transcribed data across all 22 constitutionally recognised Indian languages.",
          "Source of the Svarah benchmark used for this project's LoRA fine-tuning; also maintains IndicWav2Vec, IndicWhisper, and IndicConformer models.",
        ],
      },
    ],
  },
  {
    title: "Evaluation Methodology",
    description: "How WER is actually calculated, and why normalisation choices change the numbers significantly.",
    sources: [
      {
        title: "Evaluation Metrics for ASR (Chapter 5, Evaluation & Normalisation)",
        authors: "HuggingFace Audio Course",
        url: "https://huggingface.co/learn/audio-course/en/chapter5/evaluation",
        notes: [
          "WER has no upper bound — if a prediction is much longer than the reference, WER can exceed 100%.",
          "Worked example: normalising casing/punctuation nearly halved measured WER (168% → 126%) on the same predictions — the same normalisation principle applied across this project's whisper/Nvidia/Meta comparison scripts.",
          "Recommended practice: train on orthographic (punctuated, cased) text, but evaluate on normalised text — exactly the approach used in this project's own scripts.",
        ],
      },
    ],
  },
  {
    title: "Datasets",
    description: "Where the audio data for this project came from, and alternatives considered.",
    sources: [
      {
        title: "Common Voice — Scripted Speech (English)",
        authors: "Mozilla Data Collective",
        url: "https://mozilladatacollective.com/datasets/cmndapwry02jnmh07dyo46mot",
        notes: [
          "Large, public, crowd-sourced multilingual voice dataset with accent-tagged clips — 87GB for the full English set.",
          "Explored early in this project as a source of Indian-accented clips; ultimately the Speech Accent Archive was used instead for the accent-bias evaluation, since every speaker there reads an identical script, making it a cleaner controlled comparison at a far more practical download size.",
        ],
      },
    ],
  },
  {
    title: "Accent & Demographic Bias in ASR",
    description: "The core literature motivating this project's research question.",
    sources: [
      {
        title: "How Do Accents and Dialects Affect Speech Recognition Accuracy?",
        authors: "Milvus AI Quick Reference",
        url: "https://milvus.io/ai-quick-reference/how-do-accents-and-dialects-affect-speech-recognition-accuracy",
        notes: [
          "Accents shift phoneme boundaries away from what the acoustic model was trained on, causing systematic misclassification.",
          "Proposes accent-specific fine-tuning and real-time adaptation as practical mitigations — directly motivates this project's LoRA fine-tuning approach.",
        ],
      },
      {
        title: "Racial Disparities in Automated Speech Recognition",
        authors: "Koenecke et al., PNAS (2020)",
        url: "https://www.pnas.org/doi/10.1073/pnas.1915768117",
        notes: [
          "Five major commercial ASR systems (Amazon, Apple, Google, IBM, Microsoft) averaged 35% WER for Black speakers vs. 19% for white speakers.",
          "Critically, the gap persisted even on identical phrases spoken by both groups — proving the bias lives in the acoustic model itself, not in vocabulary or content differences.",
        ],
      },
      {
        title: "Accent Classification for Speech Recognition",
        authors: "Faria, Springer MLMI (2006)",
        url: "https://link.springer.com/chapter/10.1007/11677482_25",
        notes: [
          "Accent classifiers combining acoustic and lexical features reached 84.5% classification accuracy.",
          "Routing speakers to accent-specific acoustic/language models improved non-native WER by 16.5% — early evidence that targeted adaptation (the same principle behind this project's LoRA approach) works.",
        ],
      },
      {
        title: "Inequity in Popular Speech Recognition Systems for Accented English",
        authors: "Ike et al., ACM IUI (2022)",
        url: "https://dl.acm.org/doi/10.1145/3490100.3516457",
        notes: [
          "Tested Sphinx, WIT AI, Google Cloud, and IBM Watson across roughly 1,500 recordings.",
          "Indian-accented English underperformed across every system tested — despite representing one of the largest English-speaking populations globally.",
        ],
      },
      {
        title: "Evaluating OpenAI's Whisper ASR Performance",
        authors: "Journal of the Acoustical Society of America — Express Letters (2024)",
        url: "https://pubs.aip.org/asa/jel/article/4/2/025206/3267247/Evaluating-OpenAI-s-Whisper-ASR-Performance",
        notes: [
          "Tested Whisper v3 across 18 accent groups; tone-language native speakers and smaller-vowel-inventory L1 speakers scored worst.",
          "Conversational speech consistently showed higher error than read speech across all accent groups — worth noting since this project's own evaluation used read (scripted) speech.",
        ],
      },
      {
        title: "Speech Recognition for Children and Underrepresented Speaker Groups",
        authors: "ACM Digital Library",
        url: "https://dl.acm.org/doi/abs/10.1145/1899503.1899524",
        notes: [
          "Children's higher fundamental frequency and developmental pronunciation variability make them a systematically underserved ASR group.",
          "Compounded by data scarcity: almost no large labelled child-speech corpora exist at the scale of adult speech datasets — the same data-availability problem underlying accent bias generally.",
        ],
      },
    ],
  },
];
