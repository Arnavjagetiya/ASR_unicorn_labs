"""
Meta_final.py
Transcribes us_clips/ and india_clips/ with Meta's MMS-1B-all (Massively
Multilingual Speech) and computes normalised WER for each group.
Structurally identical to whisper_final.py and Nvidia_final.py so all three
models are compared on exactly the same footing.

Install:
    pip install --upgrade transformers jiwer pandas

IMPORTANT METHODOLOGICAL NOTE:
MMS is a CTC-based model (built on Wav2Vec2), not a sequence-to-sequence
model like Whisper. CTC models output raw lowercase text with NO punctuation
and NO capitalisation by design — this is an architectural property, not a
transcription error. Comparing MMS's raw output WER directly against
Whisper's raw output WER would be unfair, since Whisper would be "penalised"
for punctuation/casing differences that MMS never attempts in the first
place. For this reason ALL THREE scripts in this project compute WER on
NORMALISED text (lowercase, punctuation stripped) so the comparison isolates
actual word-recognition accuracy, not formatting.
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
MODEL_NAME = "Meta MMS-1B-all"
MODEL_ID = "facebook/mms-1b-all"


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


print(f"Loading {MODEL_NAME}... (first run downloads ~3.5GB, be patient)")
pipe = pipeline("automatic-speech-recognition", model=MODEL_ID)
# MMS defaults to its English adapter automatically for English audio.
# To be explicit (and if you extend this project to other languages later):
# pipe.model.load_adapter("eng")


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
df.to_csv("meta_results.csv", index=False)
print("Saved meta_results.csv")

gt_norm = normalize(GROUND_TRUTH)
us_wer = jiwer.wer(gt_norm, [normalize(r["prediction_raw"]) for r in us_results]) if us_results else None
india_wer = jiwer.wer(gt_norm, [normalize(r["prediction_raw"]) for r in india_results]) if india_results else None

print(f"\n========== FINAL RESULTS: {MODEL_NAME} ==========")
print(f"US English WER:     {us_wer:.4f} ({us_wer*100:.2f}%)" if us_wer is not None else "US: no clips found")
print(f"Indian English WER: {india_wer:.4f} ({india_wer*100:.2f}%)" if india_wer is not None else "India: no clips found")
print("===================================================")
