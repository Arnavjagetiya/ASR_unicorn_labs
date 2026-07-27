"""
Nvidia_final.py
Transcribes us_clips/ and india_clips/ with NVIDIA's Parakeet-TDT-0.6b-v3 and
computes normalised WER for each group. Structurally identical to
whisper_final.py and Meta_final.py so all three models are compared on
exactly the same footing.

Install:
    pip install --upgrade jiwer pandas
    pip install git+https://github.com/huggingface/transformers
    # Parakeet support landed very recently in transformers; if the line
    # above ever becomes unnecessary, a normal `pip install transformers`
    # will work instead — try that first if you hit install issues.

Note: this is a ~600M parameter model (much larger than whisper-tiny's 39M),
so expect noticeably slower transcription per clip on CPU.
"""

import os
import re
import glob
import pandas as pd
import jiwer
from transformers import pipeline

GROUND_TRUTH = (
    "Please call Stella. Ask her to bring these things with her from the store: "
    "Six spoons of fresh snow peas, five thick slabs of blue cheese, and maybe a "
    "snack for her brother Bob. We also need a small plastic snake and a big toy "
    "frog for the kids. She can scoop these things into three red bags, and we "
    "will go meet her Wednesday at the train station."
)

US_DIR = "us_clips"
INDIA_DIR = "india_clips"
MODEL_NAME = "NVIDIA Parakeet-TDT-0.6b-v3"
MODEL_ID = "nvidia/parakeet-tdt-0.6b-v3"


def normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    digit_words = {
        "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
        "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
    }
    text = re.sub(r"\b\d\b", lambda m: digit_words.get(m.group(), m.group()), text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


print(f"Loading {MODEL_NAME}... (first run downloads ~2.4GB, be patient)")
pipe = pipeline("automatic-speech-recognition", model=MODEL_ID)


def transcribe_folder(folder_path: str, group_name: str):
    results = []
    files = sorted(glob.glob(os.path.join(folder_path, "*.mp3")))
    if not files:
        print(f"  WARNING: no mp3 files found in {folder_path}")

    for i, filepath in enumerate(files):
        output = pipe(filepath)
        prediction = output["text"].strip()
        results.append({
            "group": group_name,
            "file": os.path.basename(filepath),
            "ground_truth": GROUND_TRUTH,
            "prediction_raw": prediction,
            "prediction_norm": normalize(prediction),
        })
        print(f"[{MODEL_NAME} | {group_name} {i + 1}/{len(files)}] {os.path.basename(filepath)}")
        print(f"  {prediction}\n")

    return results


print("\n--- Transcribing US clips ---\n")
us_results = transcribe_folder(US_DIR, "US")

print("\n--- Transcribing Indian clips ---\n")
india_results = transcribe_folder(INDIA_DIR, "India")

all_results = us_results + india_results
df = pd.DataFrame(all_results)
df.to_csv("nvidia_results.csv", index=False)
print("Saved nvidia_results.csv")

gt_norm = normalize(GROUND_TRUTH)
us_wer = jiwer.wer(gt_norm, [normalize(r["prediction_raw"]) for r in us_results]) if us_results else None
india_wer = jiwer.wer(gt_norm, [normalize(r["prediction_raw"]) for r in india_results]) if india_results else None

print(f"\n========== FINAL RESULTS: {MODEL_NAME} ==========")
print(f"US English WER:     {us_wer:.4f} ({us_wer*100:.2f}%)" if us_wer is not None else "US: no clips found")
print(f"Indian English WER: {india_wer:.4f} ({india_wer*100:.2f}%)" if india_wer is not None else "India: no clips found")
print("====================================================")
