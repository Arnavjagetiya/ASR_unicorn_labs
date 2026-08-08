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

// TODO: replace with real numbers once meta_results.csv is available and processed
// the same way (see nvidia_results.csv -> NVIDIA_STATS above for the method).
export const META_STATS: ModelStats = {
  modelName: "Meta MMS-1B-all",
  modelId: "facebook/mms-1b-all",
  color: "#0668E1",
  isPlaceholder: true,
  us: { n: 0, mean: 0, median: 0, std: 0, min: 0, max: 0 },
  india: { n: 0, mean: 0, median: 0, std: 0, min: 0, max: 0 },
  significance: { pValue: 0, cohensD: 0 },
  errorTypes: {
    us: { substitutions: 0, deletions: 0, insertions: 0 },
    india: { substitutions: 0, deletions: 0, insertions: 0 },
  },
};
