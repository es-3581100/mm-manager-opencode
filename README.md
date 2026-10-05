# MM Manager OpenCode

Native OpenCode adapter for the [MM-manager](https://github.com/es-3581100/MM-manager) provenance-aware project matrix.

**Status:** v0.1 alpha integration slice  
**Authority:** read-only context adapter; MM-manager remains the source of truth  
**License:** Evaluation-only source-available license for this alpha. See [`LICENSE`](LICENSE). This is not an open-source license.

## What this package does

This package exposes MM-manager's Phase-2 agent context surface as native OpenCode tools. It is intentionally thin: it does not reimplement MM-manager project truth, retrieval semantics, provenance, or authority rules in JavaScript.

The adapter expects a local `appdir-matrix` binary with the read-only `agent` commands documented in [docs/CORE-CONTRACT.md](docs/CORE-CONTRACT.md).

Tools:

- `matrix_bootstrap`
- `matrix_resolve`
- `matrix_inspect`
- `matrix_expand`
- `matrix_scope`
- `matrix_verify_receipt`

## OpenCode configuration

Published-package target:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["mm-manager-opencode"]
}
```

For development, install or link the package using your normal Bun/npm workflow and load it as an OpenCode plugin.

Configure the MM-manager core with environment variables:

```bash
export MM_MANAGER_BIN=/absolute/path/to/appdir-matrix
export MM_MANAGER_PROJECT=/absolute/path/to/project.json
```

`MM_MANAGER_BIN` defaults to `appdir-matrix` on `PATH`. A tool-level `project` argument overrides `MM_MANAGER_PROJECT`. If neither is supplied, the adapter uses `<worktree>/.mm-manager/project.json`.

## Boundary

The adapter:

- invokes the MM-manager binary without a shell;
- accepts only a fixed allowlist of read-only agent operations;
- requires JSON output;
- rejects non-zero core exits;
- rejects oversized output;
- rejects returned `authority` values other than `none`;
- never converts retrieval into execution permission;
- does not inject Matrix context into prompts automatically;
- does not write learned memory or project state.

This repository is the OpenCode transport surface. Query semantics and project truth belong in MM-manager core.

## Development

```bash
npm install --ignore-scripts
npm run check
npm test
```

The tests exercise the process bridge without requiring OpenCode or MM-manager.

## Compatibility target

The current MM-manager core exposes `normalize|pin|build|verify|compare`; the `agent` query family is the Phase-2 compatibility target. Until that lands in MM-manager, these tools fail closed rather than synthesizing answers locally.


## Licensing posture

This alpha is intentionally distributed under a narrow evaluation license while the product and commercial boundary are still being discovered.

The current license permits downloading, installing, running, and evaluating unmodified copies for personal, educational, research, interoperability-testing, and other non-commercial evaluation purposes. It does not grant commercial use, redistribution, derivative-work distribution, hosted-service use, or use of the source/documentation as AI-training, fine-tuning, benchmark, embedding-corpus, retrieval-corpus, or dataset material.

Future releases may use a different license. Rights granted for a particular released version are governed by the license shipped with that version.
