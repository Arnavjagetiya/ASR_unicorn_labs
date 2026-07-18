
import os
import glob
import whisper
import jiwer
import pandas as pd

# ── 1. Ground truth (same for every clip on Speech Accent Archive) ─────────
GROUND_TRUTH = (
    "Please call Stella. Ask her to bring these things with her from the store: "
    "Six spoons of fresh snow peas, five thick slabs of blue cheese, and maybe a "
    "snack for her brother Bob. We also need a small plastic snake and a big toy "
    "frog for the kids. She can scoop these things into three red bags, and we "
    "will go meet her Wednesday at the train station."
)

US_DIR = "us_clips"
INDIA_DIR = "india_clips"

# ── 2. Load Whisper ─────────────────────────────────────────────────────────
print("Loading whisper-tiny model...")
model = whisper.load_model("small")

# ── 3. Transcribe a folder of clips ─────────────────────────────────────────
def transcribe_folder(folder_path, group_name):
    results = []
    files = sorted(glob.glob(os.path.join(folder_path, "*.mp3")))

    if len(files) == 0:
        print(f"⚠️  No mp3 files found in {folder_path} — check your folder/filenames.")

    for i, filepath in enumerate(files):
        result = model.transcribe(filepath, fp16=False)
        prediction = result["text"].strip()

        results.append({
            "group": group_name,
            "file": os.path.basename(filepath),
            "ground_truth": GROUND_TRUTH,
            "prediction": prediction,
        })

        #print(f"[{group_name} {i+1}/{len(files)}] {os.path.basename(filepath)}")
        #print(f"  Pred: {prediction}\n")

    return results

print("\n--- Transcribing US clips ---\n")
us_results = transcribe_folder(US_DIR, "US")

print("\n--- Transcribing Indian clips ---\n")
india_results = transcribe_folder(INDIA_DIR, "India")

# ── 4. Save side-by-side comparison ─────────────────────────────────────────
all_results = us_results + india_results
df_results = pd.DataFrame(all_results)
df_results.to_csv("results_comparison.csv", index=False)
print("Saved full comparison to results_comparison.csv")

# ── 5. Calculate WER per group ───────────────────────────────────────────────
us_gt = [r["ground_truth"] for r in us_results]
us_pred = [r["prediction"] for r in us_results]

india_gt = [r["ground_truth"] for r in india_results]
india_pred = [r["prediction"] for r in india_results]

us_wer = jiwer.wer(us_gt, us_pred) if us_results else None
india_wer = jiwer.wer(india_gt, india_pred) if india_results else None

print("\n========== FINAL RESULTS ==========")
print(f"US English WER:     {us_wer:.4f} ({us_wer*100:.2f}%)" if us_wer is not None else "US: no clips found")
print(f"Indian English WER: {india_wer:.4f} ({india_wer*100:.2f}%)" if india_wer is not None else "India: no clips found")
print("====================================")
