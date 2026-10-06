# MM Manager OpenCode

Native OpenCode adapter for the MM-manager provenance-aware project matrix.

This repository is being initialized as a thin adapter. MM-manager remains the source of truth; this package must not reimplement project truth, infer authority, or silently widen scope.

## Experimental evidence

The first controlled blind self-discovery A/B benchmark is frozen at:

- [`docs/benchmarks/mm-manager-self-discovery-ab-v1/`](docs/benchmarks/mm-manager-self-discovery-ab-v1/)
- disposition: **OBSERVED_MATRIX_BENEFIT**
- claim status: **SUPPORTED, NOT PROVEN**

V1 observed lower project-context discovery workload with Matrix while preserving completion and authority correctness. The experiment is exploratory (`n=3` valid runs per arm) and its 100-point score is explicitly arm-asymmetric; see the frozen benchmark record for the evidence and limitations.
