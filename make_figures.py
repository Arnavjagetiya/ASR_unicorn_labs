"""
make_figures.py
Generates every figure and table referenced in the Results section of the
Indian- vs American-accented English Whisper WER paper, plus a full stats
table so each number in the prose can be checked against the data.

Run from the repository root:

    python make_figures.py

Outputs (written to ./figures/):
    fig1_wer_by_model.pdf/.png      WER by accent group across Whisper sizes
    fig2_disparity_ratio.pdf/.png   Disparity ratio as a function of model size
    fig3_wer_distribution.pdf/.png  Per-clip WER distribution by group and size
    fig4_cross_architecture.pdf/.png  Whisper vs Meta vs NVIDIA
    table1_substitutions.csv        Most frequent substitution pairs by group
    stats_summary.csv               Every statistic quoted in the Results text

Scoring notes:
  * WER is computed PER CLIP and then averaged, which is what the paper
    reports. This is not the same quantity as the corpus-level WER that
    whisper_final.py prints (total errors / total reference words).
  * Normalisation is lowercase, punctuation replaced by a space, apostrophes
    retained. This exactly reproduces the figures in the current draft.
  * Meta and NVIDIA CSVs store ground_truth as a stringified Python list, so
    it is parsed with ast.literal_eval before scoring, and prediction_norm
    is used as the hypothesis.
"""

import ast
import os
import re
from collections import Counter

import jiwer
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.lines import Line2D
from scipy import stats

# ---------------------------------------------------------------- configuration

WHISPER_SIZES = ["tiny", "base", "small", "medium"]
WHISPER_CSV = "results_comparison_{}.csv"
META_CSV = "meta_results.csv"
NVIDIA_CSV = "nvidia_results.csv"

OUTDIR = "figures"

# Table 1 is reported for one model size only; the full sweep across all four
# sizes is written alongside it for the appendix.
TABLE1_MODEL = "whisper-medium"
TABLE1_MIN_COUNT = 3
TABLE1_MAX_ROWS = 8
GROUPS = ["US", "India"]
LABELS = {"US": "American English", "India": "Indian English"}
COLORS = {"US": "#3b6ea5", "India": "#d1495b"}

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 9,
    "axes.titlesize": 10,
    "axes.labelsize": 9,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "axes.grid.axis": "y",
    "axes.axisbelow": True,
    "grid.alpha": 0.25,
    "grid.linewidth": 0.5,
    "legend.frameon": False,
    "figure.dpi": 150,
    "savefig.bbox": "tight",
})

# ---------------------------------------------------------------- normalisation

_PUNCT = re.compile(r"[^a-z0-9'\s]")
_SPACES = re.compile(r"\s+")

NUM_WORDS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
    "10": "ten", "11": "eleven", "12": "twelve", "13": "thirteen",
    "14": "fourteen", "15": "fifteen", "16": "sixteen", "17": "seventeen",
    "18": "eighteen", "19": "nineteen", "20": "twenty",
}


def normalise(text):
    """Lowercase, punctuation to space, apostrophes kept, spaces collapsed."""
    return _SPACES.sub(" ", _PUNCT.sub(" ", str(text).lower())).strip()


def spell_numbers(text):
    """Map standalone numerals back to words so orthography is not penalised."""
    return " ".join(NUM_WORDS.get(tok, tok) for tok in text.split())


def has_digit(text):
    return any(tok.isdigit() for tok in text.split())


# ---------------------------------------------------------------- data loading

def load_whisper(size):
    df = pd.read_csv(WHISPER_CSV.format(size))
    df["ref"] = df["ground_truth"].map(normalise)
    df["hyp"] = df["prediction"].map(normalise)
    return df


def _first_element(value):
    """meta/nvidia ground_truth is a stringified Python list of repeats."""
    try:
        parsed = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return value
    if isinstance(parsed, (list, tuple)) and parsed:
        return parsed[0]
    return value


def load_other(path):
    df = pd.read_csv(path)
    df["ref"] = df["ground_truth"].map(_first_element).map(normalise)
    df["hyp"] = df["prediction_norm"].map(normalise)
    return df


# ---------------------------------------------------------------- scoring

def score(df, spelled=False):
    """Add per-clip WER and error counts. Returns the same frame."""
    rows = []
    for ref, hyp in zip(df["ref"], df["hyp"]):
        if spelled:
            ref, hyp = spell_numbers(ref), spell_numbers(hyp)
        out = jiwer.process_words(ref, hyp)
        rows.append((out.wer, out.substitutions, out.deletions, out.insertions))
    df[["wer", "subs", "dels", "ins"]] = pd.DataFrame(rows, index=df.index)
    return df


def cohens_d(a, b):
    na, nb = len(a), len(b)
    pooled = np.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
    return (a.mean() - b.mean()) / pooled if pooled else np.nan


def summarise(df, condition):
    """One row per group plus the between-group comparison."""
    india = df.loc[df.group == "India", "wer"].to_numpy()
    us = df.loc[df.group == "US", "wer"].to_numpy()
    # One-sided: Indian English WER is greater than American English WER.
    p = stats.mannwhitneyu(india, us, alternative="greater").pvalue
    out = {"condition": condition, "p_one_sided": p, "cohens_d": cohens_d(india, us),
           "abs_gap_pp": (india.mean() - us.mean()) * 100,
           "ratio": india.mean() / us.mean() if us.mean() else np.nan}
    for name, arr in (("us", us), ("india", india)):
        out[f"{name}_n"] = len(arr)
        out[f"{name}_mean_pct"] = arr.mean() * 100
        out[f"{name}_se_pct"] = arr.std(ddof=1) / np.sqrt(len(arr)) * 100
        out[f"{name}_median_pct"] = np.median(arr) * 100
        out[f"{name}_p90_pct"] = np.percentile(arr, 90) * 100
        out[f"{name}_max_pct"] = arr.max() * 100
        out[f"{name}_zero_error"] = int((arr == 0).sum())
    for name, grp in (("us", "US"), ("india", "India")):
        sub = df[df.group == grp]
        out[f"{name}_subs_total"] = int(sub["subs"].sum())
        out[f"{name}_dels_total"] = int(sub["dels"].sum())
        out[f"{name}_ins_total"] = int(sub["ins"].sum())
        out[f"{name}_clips_with_digits"] = int(sub["hyp"].map(has_digit).sum())
    return out


def substitution_pairs(df):
    """Count (reference word -> hypothesis word) substitutions per group."""
    counts = {g: Counter() for g in GROUPS}
    for row in df.itertuples():
        out = jiwer.process_words(row.ref, row.hyp)
        ref_words = out.references[0]
        hyp_words = out.hypotheses[0]
        for chunk in out.alignments[0]:
            if chunk.type != "substitute":
                continue
            for i, j in zip(range(chunk.ref_start_idx, chunk.ref_end_idx),
                            range(chunk.hyp_start_idx, chunk.hyp_end_idx)):
                counts[row.group][(ref_words[i], hyp_words[j])] += 1
    return counts


def build_compact_table(full, model, min_count, max_rows):
    """Reduce the substitution sweep to a paper-sized table for one model.

    Rows are ranked by frequency on Indian audio and tagged as orthographic
    (the model heard the word and wrote a numeral) or phonetic.
    """
    sub = full[(full.model == model) & (full.india_count >= min_count)].copy()
    sub["kind"] = np.where(sub.transcribed_as.str.isdigit(),
                           "Orthographic", "Phonetic")
    sub = (sub.sort_values(["kind", "india_count", "us_count"],
                           ascending=[True, False, False])
              .head(max_rows))
    return sub[["kind", "reference_word", "transcribed_as",
                "india_count", "us_count"]].reset_index(drop=True)


def render_table(df, headers):
    """Plain-text table with aligned columns, ready to paste and convert."""
    cols = list(df.columns)
    widths = [max(len(headers[i]), *(len(str(v)) for v in df[c]))
              for i, c in enumerate(cols)]
    line = "  ".join(h.ljust(w) for h, w in zip(headers, widths))
    out = [line, "  ".join("-" * w for w in widths)]
    for row in df.itertuples(index=False):
        out.append("  ".join(str(v).ljust(w) for v, w in zip(row, widths)))
    return "\n".join(out)


# ---------------------------------------------------------------- figures

def fig1(summary):
    """Grouped bars: mean per-clip WER by accent group and model size."""
    fig, ax = plt.subplots(figsize=(6.0, 3.4))
    x = np.arange(len(WHISPER_SIZES))
    width = 0.36
    for offset, grp in zip((-width / 2, width / 2), GROUPS):
        means = [summary[s][f"{grp.lower()}_mean_pct"] for s in WHISPER_SIZES]
        ses = [summary[s][f"{grp.lower()}_se_pct"] for s in WHISPER_SIZES]
        bars = ax.bar(x + offset, means, width, yerr=ses, capsize=3,
                      color=COLORS[grp], label=LABELS[grp],
                      error_kw={"linewidth": 0.9, "ecolor": "#444444"})
        ax.bar_label(bars, fmt="%.2f", padding=7, fontsize=7.5, color="#333333")
    ax.set_xticks(x, [f"whisper-{s}" for s in WHISPER_SIZES])
    ax.set_ylabel("Mean word error rate (%)")
    ax.set_xlabel("Model size")
    ax.set_ylim(0, max(summary[s]["india_mean_pct"] + summary[s]["india_se_pct"]
                       for s in WHISPER_SIZES) * 1.35)
    ax.legend(loc="upper right")
    ax.set_title("Whisper word error rate by accent group and model size",
                 loc="left", pad=10)
    save(fig, "fig1_wer_by_model")


def fig2(summary):
    """Disparity ratio line over faint absolute-gap bars."""
    fig, ax = plt.subplots(figsize=(6.0, 3.4))
    x = np.arange(len(WHISPER_SIZES))
    gaps = [summary[s]["abs_gap_pp"] for s in WHISPER_SIZES]
    ratios = [summary[s]["ratio"] for s in WHISPER_SIZES]

    ax2 = ax.twinx()
    ax2.bar(x, gaps, 0.5, color="#b9c6d4", zorder=1, label="Absolute gap")
    ax2.set_ylabel("Absolute gap (percentage points)", color="#6b7c8f")
    ax2.set_ylim(0, max(gaps) * 2.2)
    ax2.tick_params(axis="y", colors="#6b7c8f")
    ax2.grid(False)
    ax2.spines["top"].set_visible(False)

    ax.set_zorder(ax2.get_zorder() + 1)
    ax.patch.set_visible(False)
    ax.plot(x, ratios, marker="o", markersize=5, linewidth=1.8,
            color=COLORS["India"], zorder=3, label="Disparity ratio")
    for xi, r in zip(x, ratios):
        ax.annotate(f"{r:.2f}x", (xi, r), textcoords="offset points",
                    xytext=(0, 9), ha="center", fontsize=8, color="#8d2f3d")
    ax.set_xticks(x, [f"whisper-{s}" for s in WHISPER_SIZES])
    ax.set_ylabel("Indian / American WER ratio")
    ax.set_xlabel("Model size")
    ax.set_ylim(0, max(ratios) * 1.30)
    ax.set_title("Scale reduces absolute error but widens the relative gap",
                 loc="left", pad=10)

    handles = [Line2D([], [], color=COLORS["India"], marker="o", markersize=5,
                      linewidth=1.8, label="Disparity ratio (left axis)"),
               Line2D([], [], color="#b9c6d4", linewidth=8,
                      label="Absolute gap (right axis)")]
    ax.legend(handles=handles, loc="upper left")
    save(fig, "fig2_disparity_ratio")


def fig3(scored):
    """Box plots with jittered points, broken axis to keep outliers visible."""
    fig, (top, bottom) = plt.subplots(
        2, 1, figsize=(6.4, 4.4), sharex=True,
        gridspec_kw={"height_ratios": [1, 3.2], "hspace": 0.07})

    rng = np.random.default_rng(0)
    positions, ticks = [], []
    for i, size in enumerate(WHISPER_SIZES):
        for offset, grp in zip((-0.19, 0.19), GROUPS):
            pos = i + offset
            vals = scored[size].loc[scored[size].group == grp, "wer"].to_numpy() * 100
            positions.append((pos, vals, grp))
        ticks.append(i)

    for ax in (top, bottom):
        for pos, vals, grp in positions:
            ax.boxplot([vals], positions=[pos], widths=0.3, showfliers=False,
                       patch_artist=True, medianprops={"color": "#1a1a1a", "linewidth": 1.2},
                       boxprops={"facecolor": COLORS[grp], "alpha": 0.45,
                                 "edgecolor": COLORS[grp], "linewidth": 1.0},
                       whiskerprops={"color": COLORS[grp], "linewidth": 1.0},
                       capprops={"color": COLORS[grp], "linewidth": 1.0})
            jitter = rng.uniform(-0.075, 0.075, size=len(vals))
            ax.scatter(pos + jitter, vals, s=7, color=COLORS[grp],
                       alpha=0.65, linewidths=0, zorder=3)

    all_vals = np.concatenate([v for _, v, _ in positions])
    bottom.set_ylim(-1.5, 32)
    top.set_ylim(60, max(all_vals) * 1.12)
    top.set_yticks([60, 80, 100])

    top.spines["bottom"].set_visible(False)
    bottom.spines["top"].set_visible(False)
    top.tick_params(axis="x", which="both", bottom=False, labelbottom=False)

    kw = dict(marker=[(-1, -0.5), (1, 0.5)], markersize=6, linestyle="none",
              color="#444444", mec="#444444", mew=1, clip_on=False)
    top.plot([0, 1], [0, 0], transform=top.transAxes, **kw)
    bottom.plot([0, 1], [1, 1], transform=bottom.transAxes, **kw)

    bottom.set_xticks(ticks, [f"whisper-{s}" for s in WHISPER_SIZES])
    bottom.set_xlabel("Model size")
    bottom.set_ylabel("Per-clip word error rate (%)")
    bottom.yaxis.set_label_coords(-0.075, 0.68)
    handles = [Line2D([], [], color=COLORS[g], linewidth=8, alpha=0.5,
                      label=LABELS[g]) for g in GROUPS]
    bottom.legend(handles=handles, loc="upper right")
    top.set_title("Per-clip error distribution, n = 60 per group per model",
                  loc="left", pad=8)
    save(fig, "fig3_wer_distribution")


def fig4(cross):
    """Grouped bars across architectures on the identical corpus."""
    fig, ax = plt.subplots(figsize=(6.0, 3.4))
    names = list(cross.keys())
    x = np.arange(len(names))
    width = 0.36
    for offset, grp in zip((-width / 2, width / 2), GROUPS):
        means = [cross[n][f"{grp.lower()}_mean_pct"] for n in names]
        ses = [cross[n][f"{grp.lower()}_se_pct"] for n in names]
        bars = ax.bar(x + offset, means, width, yerr=ses, capsize=3,
                      color=COLORS[grp], label=LABELS[grp],
                      error_kw={"linewidth": 0.9, "ecolor": "#444444"})
        ax.bar_label(bars, fmt="%.2f", padding=7, fontsize=7.5, color="#333333")
    ax.set_xticks(x, [f"{n}\n{cross[n]['ratio']:.2f}x gap" for n in names])
    ax.set_ylabel("Mean word error rate (%)")
    ax.set_ylim(0, max(cross[n]["india_mean_pct"] + cross[n]["india_se_pct"]
                       for n in names) * 1.35)
    fig.text(0.12, -0.06, "* Whisper figures re-scored with numerals mapped back to "
             "words, since neither Meta nor NVIDIA emits digits.",
             fontsize=7, color="#666666")
    ax.legend(loc="upper right")
    ax.set_title("The gap persists across architectures (same 120 recordings)",
                 loc="left", pad=10)
    save(fig, "fig4_cross_architecture")


def save(fig, stem):
    for ext in ("pdf", "png"):
        fig.savefig(os.path.join(OUTDIR, f"{stem}.{ext}"))
    plt.close(fig)
    print(f"  wrote {OUTDIR}/{stem}.pdf and .png")


# ---------------------------------------------------------------- main

def main():
    os.makedirs(OUTDIR, exist_ok=True)

    print("Scoring Whisper runs...")
    scored, scored_spelled, summary, summary_spelled = {}, {}, {}, {}
    for size in WHISPER_SIZES:
        raw = load_whisper(size)
        scored[size] = score(raw.copy())
        summary[size] = summarise(scored[size], f"whisper-{size}")
        scored_spelled[size] = score(raw.copy(), spelled=True)
        summary_spelled[size] = summarise(scored_spelled[size],
                                          f"whisper-{size} (numerals spelled out)")

    print("Scoring Meta and NVIDIA runs...")
    meta = score(load_other(META_CSV))
    nvidia = score(load_other(NVIDIA_CSV))

    cross = {
        "Whisper-medium*": summary_spelled["medium"],
        "Meta MMS-1B-all": summarise(meta, "meta"),
        "NVIDIA Parakeet": summarise(nvidia, "nvidia"),
    }

    print("Building figures...")
    fig1(summary)
    fig2(summary)
    fig3(scored)
    fig4(cross)

    # Table 1: substitution pairs.
    # Two outputs: a compact, paste-ready table for the paper (whisper-medium,
    # split into orthographic and phonetic blocks), and the full sweep across
    # all four sizes for the appendix or the repository.
    print("Building Table 1...")
    rows = []
    for size in WHISPER_SIZES:
        counts = substitution_pairs(scored[size])
        pairs = set(counts["India"]) | set(counts["US"])
        for ref_w, hyp_w in pairs:
            rows.append({"model": f"whisper-{size}", "reference_word": ref_w,
                         "transcribed_as": hyp_w,
                         "india_count": counts["India"][(ref_w, hyp_w)],
                         "us_count": counts["US"][(ref_w, hyp_w)]})
    full = (pd.DataFrame(rows)
            .sort_values(["model", "india_count", "us_count"],
                         ascending=[True, False, False]))
    full.to_csv(os.path.join(OUTDIR, "table1_substitutions_full.csv"), index=False)
    print(f"  wrote {OUTDIR}/table1_substitutions_full.csv ({len(full)} rows)")

    compact = build_compact_table(full, model=TABLE1_MODEL,
                                  min_count=TABLE1_MIN_COUNT,
                                  max_rows=TABLE1_MAX_ROWS)
    compact.to_csv(os.path.join(OUTDIR, "table1_compact.csv"), index=False)
    print(f"  wrote {OUTDIR}/table1_compact.csv ({len(compact)} rows)")

    # Full stats table for verifying the prose.
    stats_rows = ([summary[s] for s in WHISPER_SIZES]
                  + [summary_spelled[s] for s in WHISPER_SIZES]
                  + [summarise(meta, "meta-mms-1b-all"),
                     summarise(nvidia, "nvidia-parakeet")])
    stats_df = pd.DataFrame(stats_rows)
    stats_df.to_csv(os.path.join(OUTDIR, "stats_summary.csv"), index=False)
    print(f"  wrote {OUTDIR}/stats_summary.csv")

    headline = stats_df[stats_df.condition.isin(
        [f"whisper-{s}" for s in WHISPER_SIZES])].copy()
    paste = pd.DataFrame({
        "Model": [c.replace("whisper-", "") for c in headline.condition],
        "American": [f"{m:.2f} ({s:.2f})" for m, s in
                     zip(headline.us_mean_pct, headline.us_se_pct)],
        "Indian": [f"{m:.2f} ({s:.2f})" for m, s in
                   zip(headline.india_mean_pct, headline.india_se_pct)],
        "Gap (pp)": [f"{g:.2f}" for g in headline.abs_gap_pp],
        "Ratio": [f"{r:.2f}x" for r in headline.ratio],
        "p": [f"{p:.1e}" for p in headline.p_one_sided],
    })
    paste.to_csv(os.path.join(OUTDIR, "table_headline_wer.csv"), index=False)
    print(f"  wrote {OUTDIR}/table_headline_wer.csv")

    print("\nHeadline WER, mean % (SE), n = 60 per group:")
    print(render_table(paste, list(paste.columns)))

    print(f"\nTable 1, {TABLE1_MODEL}, clips affected out of 60:")
    print(render_table(compact, ["Type", "Reference", "Transcribed as",
                                 "Indian", "American"]))

    print("\nFull stats for verification are in stats_summary.csv.")


if __name__ == "__main__":
    main()