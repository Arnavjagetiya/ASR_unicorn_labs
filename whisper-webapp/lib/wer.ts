// Word Error Rate calculation via a Levenshtein (edit-distance) alignment on
// word sequences — the same core algorithm jiwer uses under the hood.

export interface WERResult {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  hits: number;
  refWordCount: number;
  alignment: AlignedWord[];
}

export interface AlignedWord {
  type: "hit" | "sub" | "del" | "ins";
  ref: string | null;
  hyp: string | null;
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function calculateWER(reference: string, hypothesis: string): WERResult {
  const ref = normalize(reference);
  const hyp = normalize(hypothesis);
  const n = ref.length;
  const m = hyp.length;

  // Standard DP edit-distance table, tracking operation for backtracking.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // Backtrack to classify each operation.
  const alignment: AlignedWord[] = [];
  let i = n, j = m;
  let subs = 0, dels = 0, ins = 0, hits = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      alignment.unshift({ type: "hit", ref: ref[i - 1], hyp: hyp[j - 1] });
      hits++; i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      alignment.unshift({ type: "sub", ref: ref[i - 1], hyp: hyp[j - 1] });
      subs++; i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      alignment.unshift({ type: "del", ref: ref[i - 1], hyp: null });
      dels++; i--;
    } else {
      alignment.unshift({ type: "ins", ref: null, hyp: hyp[j - 1] });
      ins++; j--;
    }
  }

  const wer = n > 0 ? (subs + dels + ins) / n : 0;

  return {
    wer,
    substitutions: subs,
    deletions: dels,
    insertions: ins,
    hits,
    refWordCount: n,
    alignment,
  };
}
