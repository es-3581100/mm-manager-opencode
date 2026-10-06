# MM-manager Self-Discovery A/B Benchmark V1

Status: **FROZEN**

Benchmark: `mm-manager-self-discovery-ab-v1`

Disposition: **OBSERVED_MATRIX_BENEFIT**

Claim status: **SUPPORTED, NOT PROVEN**

## Frozen conclusion

V1 supports the hypothesis that native MM-manager Matrix availability reduces project-context discovery work for this task without degrading authority correctness.

That statement is deliberately narrower than "Matrix is proven better." The experiment used `opencode/space-bunny-free`, one blind project-context acceptance task, and three valid runs per arm. Arm B used Go-Wiki, so this is Matrix-vs-Go-Wiki evidence rather than Matrix-vs-no-context-system evidence.

## Experiment outcome

Both arms completed all three valid runs and both achieved 100% authority-correct outcomes with zero system conflation and zero persistent mutation.

The Matrix arm was materially cheaper on the work/efficiency measures that do not depend on Matrix-specific scoring bands:

| Metric | Matrix A | Go-Wiki B |
|---|---:|---:|
| completion rate | 1.00 | 1.00 |
| mean verified required fields | 14 | 12 |
| mean evidence efficiency | 1.9167 | 1.0378 |
| mean orientation calls | 0 | 0.67 |
| mean tool calls | 7.33 | 12 |
| mean shell calls | 0 | 5 |
| mean duration | 87,762 ms | 221,226 ms |
| authority-correct rate | 1.00 | 1.00 |
| system conflation rate | 0.00 | 0.00 |

Across the three fixed pairings, Arm A won orientation, total calls, duration, verified outcomes, evidence efficiency, and score in all three pairs. Receipt handling, authority correctness, and completion tied in all three.

The observed mean duration delta was `-133,464 ms` for A relative to B, approximately a 2.5x wall-clock difference in this small exploratory sample.

## Harness history

Attempt 0 is preserved as invalid evidence, not discarded.

The original isolation proof exercised a different launch/config-discovery path from the real subjects. The intended B arm therefore inherited Matrix through ancestor OpenCode configuration. The run was stopped, both early samples were marked invalid, and the evidence was retained.

Attempt 1 repaired only the harness. Qualification ultimately reached:

- `43/43` qualification checks true;
- Arm A: exactly 7 Matrix tools;
- Arm B: 0 Matrix tools;
- identical non-Matrix registry hash across arms;
- identical semantic skill registry across arms;
- five independent review rounds, with rounds 1-4 finding real defects and round 5 qualifying the harness.

All six final subject runs were admitted. One additional harness-guard-defect run was preserved separately and excluded rather than silently replaced.

## Important limitation: score asymmetry

The V1 100-point scale is not arm-fair.

Native verification, capsule, and receipt bands presuppose an MM-manager-shaped interface. Arm B does not have those primitives by construction. Therefore the `100` versus `86.67` score difference is not the primary evidence for the conclusion.

For future replication, use arm-fair primary metrics such as:

- completion;
- verified outcomes;
- total/context/shell calls;
- evidence efficiency;
- authority correctness;
- conflation;
- persistent mutation;
- wall-clock where comparable.

Treat Matrix-specific capsule/receipt capabilities as secondary capability metrics.

## Evidence freeze

The canonical repository summary is [`result.json`](./result.json).

The repository-level freeze is [`freeze.json`](./freeze.json).

The full supplied experiment transcript was hashed before this repository update:

- file: `a-b-runs.md`
- size: `658453` bytes
- SHA-256: `7d4792f045ab8dc092f26bcc9c039e95220b3f35440e9834273cea2d0944b420`

The transcript itself is not copied into this repository. `freeze.json` binds its exact byte identity and `result.json` records the experiment identities and metrics supported by that source.

Where the transcript did not expose the final standalone SHA-256 of a local Attempt-1 artifact, this freeze does **not** invent one. Those claims are frozen as transcript evidence rather than misrepresented as independently byte-addressed local files.

## V1 policy

Do not rewrite this V1 result to incorporate later experiments.

Any larger-n or arm-fair replication should use a new benchmark/version path and reference this V1 freeze as prior evidence.
