# MM Manager OpenCode

Native OpenCode adapter for the [MM-manager](https://github.com/es-3581100/MM-manager) provenance-aware project matrix.

**Status:** v0.1 alpha integration slice  
**Authority:** read-only context adapter; MM-manager remains the source of truth  
**License:** Evaluation-only source-available license for this alpha. See [`LICENSE`](LICENSE). This is not an open-source license.

The adapter is intentionally thin: it does not reimplement MM-manager project truth,
retrieval semantics, provenance, artifact rendering, or authority rules in JavaScript.

## Native Matrix tools

The current adapter exposes the seven read-only operations exercised by the frozen
V1 self-discovery benchmark:

- `matrix_discover`
- `matrix_bootstrap`
- `matrix_resolve`
- `matrix_inspect`
- `matrix_expand`
- `matrix_scope`
- `matrix_verify_receipt`

`matrix_discover` is project-independent. Project-scoped operations resolve their
project artifact in strict precedence order:

```text
explicit tool project argument
  → MM_MANAGER_PROJECT
  → <worktree>/.mm-manager/project.json
```

Retrieval remains evidence only and never grants execution authority.

## Matrix UI return footer

For MM-enabled projects, the adapter can append a mechanical footer to the **final**
user-visible OpenCode assistant return:

```text
──────── ◈ MM ────────
Open Matrix · project: <project-id> · authority: none
```

The hyperlink points to a loopback-only HTTP server for a **core-generated,
SHA-256-verified** Matrix HTML artifact. The adapter does not render a second Matrix
or reinterpret project evidence.

Default project files:

```text
<worktree>/.mm-manager/project.json
<worktree>/.mm-manager/matrix.html
<worktree>/.mm-manager/matrix.html.sha256
```

Build the HTML with MM-manager core:

```sh
appdir-matrix build \
  --project .mm-manager/project.json \
  --template /path/to/MM-manager/web/app-dir-matrix-core-v0.2.0.html \
  --out .mm-manager/matrix.html
```

The footer is added only after OpenCode reports `session.idle`, only to the last
visible text part of the latest assistant message, never to child/subagent sessions,
and only once via the marker `<!-- mm-matrix-footer:v1 -->`.

If there is no valid MM project, the original response is left unchanged. If the
project is valid but the verified HTML artifact or loopback server is unavailable,
the footer still appears as `Matrix UI unavailable · project: <project-id> · authority: none`.
Message-update failures remain non-critical and leave the original response intact.

Controls:

- `MM_MATRIX_FOOTER=0` — disable response decoration byte-for-byte.
- `MM_MATRIX_UI=0` — disable UI serving.
- `MM_MATRIX_HTML=/path/to/matrix.html` — explicit artifact override.
- `MM_MATRIX_PORT=<0-65535>` — request a loopback port; default `0` is ephemeral.
- `MM_MATRIX_DEBUG=1` — log decoration failures.

See [`docs/MATRIX-UI.md`](docs/MATRIX-UI.md) and
[`docs/design/matrix-return-footer.md`](docs/design/matrix-return-footer.md).

## OpenCode configuration

Published-package target:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["mm-manager-opencode"]
}
```

Configure MM-manager core as needed:

```bash
export MM_MANAGER_BIN=/absolute/path/to/appdir-matrix
export MM_MANAGER_PROJECT=/absolute/path/to/project.json
```

`MM_MANAGER_BIN` defaults to `appdir-matrix` on `PATH`.

## Boundary

The adapter:

- invokes the MM-manager binary without a shell;
- accepts only a fixed allowlist of read-only agent operations;
- requires JSON output;
- rejects non-zero core exits and oversized output;
- rejects returned `authority` values other than `none`;
- never converts retrieval into execution permission;
- never makes the footer or browser UI an authority surface;
- binds the Matrix browser server only to `127.0.0.1`;
- requires the core-generated artifact SHA-256 sidecar before serving HTML;
- does not inject Matrix context into prompts automatically; and
- does not write learned memory or project truth.

This repository is the OpenCode transport/presentation surface. Query semantics,
project truth, and HTML generation belong in MM-manager core.

## Experimental evidence

The first controlled blind self-discovery A/B benchmark is frozen at:

- [`docs/benchmarks/mm-manager-self-discovery-ab-v1/`](docs/benchmarks/mm-manager-self-discovery-ab-v1/)
- disposition: **OBSERVED_MATRIX_BENEFIT**
- claim status: **SUPPORTED, NOT PROVEN**

V1 observed lower project-context discovery workload with Matrix while preserving
completion and authority correctness. The experiment is exploratory (`n=3` valid
runs per arm), Arm B used Go-Wiki rather than a blank environment, and the
100-point score is explicitly arm-asymmetric. See the frozen benchmark record for
the evidence and limitations.

Benchmark/reproduction harnesses should set `MM_MATRIX_FOOTER=0` so presentation
decoration cannot contaminate output-byte comparisons.

## Development

```bash
npm install --ignore-scripts
npm run check
npm test
```

The repository test suite covers the process bridge, project-independent discovery,
entrypoint loader invariants, final-turn footer idempotency, child-session exclusion,
artifact integrity, and loopback-only UI serving.

The return-footer host integration is specifically verified against OpenCode
`1.18.34`: that version exposes `session.idle`, session message retrieval, and
the message-part PATCH route used by the adapter.

## Licensing posture

This alpha is intentionally distributed under a narrow evaluation license while the
product and commercial boundary are still being discovered.

The current license permits downloading, installing, running, and evaluating
unmodified copies for personal, educational, research, interoperability-testing,
and other non-commercial evaluation purposes. It does not grant commercial use,
redistribution, derivative-work distribution, hosted-service use, or use of the
source/documentation as AI-training, fine-tuning, benchmark, embedding-corpus,
retrieval-corpus, or dataset material.

Future releases may use a different license. Rights granted for a particular
released version are governed by the license shipped with that version.
