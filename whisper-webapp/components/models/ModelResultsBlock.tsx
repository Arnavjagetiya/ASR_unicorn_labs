// Nvidia numbers are real, computed directly from nvidia_results.csv (n=60 per group).
// Meta numbers are a placeholder — replace with real values once meta_results.csv exists.
// Structure for both must stay identical so <ModelResultsBlock> can render either.

export interface ModelStats {
  modelName: string;
  modelId: string;
  color: string;
  isPlaceholder?: boolean;
  us: { n: number; mean: number; median: number; std: number; min: number; max: number };
  india: { n: number; mean: number; median: number; std: number; min: number; max: number };
  significance: { pValue: number; cohensD: number };
  errorTypes: {
    us: { substitutions: number; deletions: number; insertions: number };
    india: { substitutions: number; deletions: number; insertions: number };
  };
}

export const NVIDIA_STATS: ModelStats = {
  modelName: "NVIDIA Parakeet-TDT-0.6b-v3",
  modelId: "nvidia/parakeet-tdt-0.6b-v3",
  color: "#76B900",
  us: { n: 60, mean: 0.0092, median: 0.0, std: 0.0136, min: 0.0, max: 0.058 },
  india: { n: 60, mean: 0.0174, median: 0.0, std: 0.0244, min: 0.0, max: 0.1159 },
  significance: { pValue: 0.09237, cohensD: 0.415 },
  errorTypes: {
    us: { substitutions: 0.22, deletions: 0.15, insertions: 0.27 },
    india: { substitutions: 0.45, deletions: 0.22, insertions: 0.53 },
  },
};

export const META_STATS: ModelStats = {
  modelName: "Meta MMS-1B-all",
  modelId: "facebook/mms-1b-all",
  color: "#0668E1",
  us: { n: 60, mean: 0.0597, median: 0.0435, std: 0.0407, min: 0.0, max: 0.2029 },
  india: { n: 60, mean: 0.0913, median: 0.087, std: 0.0481, min: 0.0145, max: 0.1884 },
  significance: { pValue: 0.00005, cohensD: 0.71 },
  errorTypes: {
    us: { substitutions: 2.73, deletions: 1.08, insertions: 0.3 },
    india: { substitutions: 5.22, deletions: 0.88, insertions: 0.2 },
  },
};