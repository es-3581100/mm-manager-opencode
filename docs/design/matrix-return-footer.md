# Matrix Return Footer Proposal

Status: **PROPOSED / DEFERRED UNTIL A/B TESTING IS COMPLETE**

This document specifies a future OpenCode adapter feature for MM-enabled projects. It is intentionally documentation-only. It does not activate a footer, launch a UI server, alter MM-manager core behavior, change OpenCode configuration, or modify the current A/B test surface.

## Goal

When OpenCode is operating inside a project with a valid MM-manager project definition, append a small, user-facing footer to the final assistant return that links back to that project's Matrix UI.

The footer is an observability affordance only. It must not imply approval, permission, execution authority, trust, or source-of-truth status.

Conceptual output:

```text
<normal assistant return>

──────── ◈ MM ────────
Open Matrix · project: <project-id> · authority: none
```

When the host renderer supports hyperlinks, `Open Matrix` should link to the project's local Matrix UI.

## Architectural boundary

The feature belongs in **mm-manager-opencode**, not in MM-manager's core truth engine.

MM-manager remains responsible for project identity, provenance-aware Matrix data, bounded retrieval, and authority-none semantics.

The OpenCode adapter is responsible for presentation integration:

```text
MM-manager core
  -> project identity / Matrix data / authority:none
  -> mm-manager-opencode
       -> resolve or expose local Matrix UI target
       -> decorate final user-facing assistant return
       -> never convert context into authority
```

The model must not be instructed to remember or manually emit the footer. Decoration should be mechanical and idempotent at the host-adapter boundary.

## Deferred integration requirement

**Do not implement or activate this feature until the current Space Bunny/MM-manager A/B experiment is complete and its baseline/results are frozen.**

Before that point, this proposal must not:

- change the set of Matrix tools visible to either benchmark arm;
- change adapter exports, hooks, prompts, model-visible context, or return text;
- start a local HTTP service;
- add environment variables or project config fields used at runtime;
- alter benchmark timing, tool counts, orientation cost, context size, or output formatting;
- modify the frozen A/B prompt, baseline, known-issues file, or experiment harness.

The design PR may remain open while testing proceeds.

## Footer semantics

A future footer should satisfy all of the following:

1. It appears only for a valid MM-enabled project.
2. It appears exactly once per final user-facing assistant turn.
3. It does not appear on internal worker/delegate returns unless those returns are themselves directly rendered as the user's final answer.
4. It must not be appended independently to every intermediate text part in a tool-using turn.
5. It is idempotent.
6. It carries no authority beyond the literal `authority: none` indicator.
7. Failure to resolve or launch the Matrix UI must never fail the assistant response.
8. Absence of MM project identity means no Matrix footer.

Recommended idempotency marker:

```html
<!-- mm-matrix-footer:v1 -->
```

The marker is presentation metadata only and must not be interpreted as evidence of retrieval, verification, approval, or execution.

## UI target

Prefer a loopback-only HTTP endpoint over a raw `file://` URL.

Target shape:

```text
http://127.0.0.1:<port>/matrix/<project-id>
```

A loopback endpoint gives OpenCode, desktop terminals, and browser-capable renderers a stable target while allowing the Matrix UI to evolve beyond a static HTML file.

Security requirements:

- bind only to loopback;
- never bind a Matrix UI service to a wildcard or external interface by default;
- do not embed credentials, secrets, tokens, or privileged capability in the URL;
- project identifiers must be encoded/validated before use in a route;
- opening the UI grants no MM, OpenCode, Git, shell, or project mutation authority;
- UI availability is independent of Matrix evidence authority.

If a loopback service is unavailable, the adapter should degrade without breaking the response. A future implementation may choose a non-link fallback such as:

```text
──────── ◈ MM ────────
Matrix UI unavailable · project: <project-id> · authority: none
```

## Host integration

The implementation should follow the adapter pattern already used by OpenCode plugins that keep domain behavior separate from host-specific hooks.

The important semantic requirement is **final visible return**, not merely **text part completed**.

OpenCode turns that use tools can produce multiple text parts. Appending a footer to every completed text part could place Matrix links in the middle of a turn or duplicate the footer. The adapter must therefore identify the final user-visible assistant result for the turn before decoration.

The exact hook/API should be re-verified against the OpenCode version in use at implementation time rather than frozen in this proposal.

## Proposed footer

Preferred compact form:

```markdown
<!-- mm-matrix-footer:v1 -->

──────── ◈ MM ────────
[Open Matrix](http://127.0.0.1:<port>/matrix/<project-id>) · project: `<project-id>` · authority: none
```

Rendering rules:

- keep it visually small;
- do not repeat Matrix evidence or retrieval results in the footer;
- do not add model identity, confidence, approval state, or execution state;
- do not claim the Matrix was used on the current turn unless separately represented by actual evidence;
- the footer is a navigation link, not a provenance receipt.

Optional terminal enhancement after basic Markdown behavior is proven: emit an OSC-8 hyperlink while retaining readable text/fallback behavior. This is optional and must not be required for correctness.

## Project detection

The adapter should use the same project-resolution contract as the existing MM adapter rather than creating a second project-discovery mechanism.

Current precedence should remain:

1. explicit project argument when the calling surface already provides one;
2. `MM_MANAGER_PROJECT`;
3. `<worktree>/.mm-manager/project.json`.

Unknown or invalid project pointers fail closed. No footer is better than guessing a project.

## Failure behavior

Footer generation is non-critical presentation work.

The assistant's normal response must survive all footer-side failures, including:

- missing project definition;
- malformed project definition;
- MM backend unavailable;
- UI service unavailable;
- port allocation failure;
- malformed or unsafe route target;
- unsupported renderer/hyperlink capability;
- duplicate footer marker already present.

No failure path may widen scope, invoke a shell fallback, fetch arbitrary files, or substitute a different project.

## Acceptance tests for the future implementation

The implementation should not be considered ready until tests cover at least:

1. no MM project -> no footer;
2. valid MM project -> exactly one footer;
3. multiple assistant text parts -> footer only on the final user-visible return;
4. existing `mm-matrix-footer:v1` marker -> no duplicate;
5. internal/subagent result -> no accidental user-facing footer injection;
6. UI unavailable -> response still succeeds with bounded fallback behavior;
7. Matrix URL is loopback-only;
8. unsafe/non-loopback UI target -> rejected;
9. project ID is safely encoded and cannot alter the route;
10. authority text remains exactly non-authorizing;
11. footer generation performs no Matrix write or project mutation;
12. projects without MM remain behaviorally unchanged;
13. tool visibility and tool schemas remain unchanged;
14. existing MM discovery/bootstrap/resolve/inspect/expand/scope/verify-receipt behavior remains unchanged;
15. benchmark fixture behavior remains unchanged when footer feature is disabled;
16. feature can be disabled entirely for benchmark/reproducibility mode.

## Suggested implementation sequence after A/B freeze

1. Freeze and archive the A/B experiment results.
2. Reground the current OpenCode plugin API/version.
3. Add a pure footer formatter with idempotency tests.
4. Add final-turn detection in the OpenCode adapter.
5. Add a loopback-only Matrix UI resolver/service boundary.
6. Add failure-path and non-MM-project tests.
7. Verify existing Matrix tool schemas and discovery behavior are byte/semantically unchanged where required.
8. Run an A/B-style regression check with the footer feature disabled.
9. Enable the feature explicitly and test interactive rendering.
10. Merge only after independent review confirms that the footer remains presentation-only and authority-none.

## Non-goals

This proposal does not authorize or specify:

- automatic browser launching;
- remote hosting of Matrix data;
- telemetry;
- Matrix-to-agent authority transfer;
- execution buttons that bypass existing OpenCode/MM authority boundaries;
- automatic mutation from the Matrix UI;
- inclusion of private retrieval contents in the footer;
- replacement of existing Matrix tools;
- any change to the current A/B experiment.

## Prior-art references

The interaction idea was inspired by small, automatic footer/signature patterns in projects such as:

- https://github.com/mubaidr/gem-team
- https://github.com/arttttt/opencode-pr-signature

These are references for interaction/adapter patterns only; they are not dependencies.

## Merge gate

This PR should remain draft/unmerged until the current MM-manager/Space Bunny A/B test is complete.

After the experiment is frozen, convert this proposal into an implementation task against the then-current OpenCode adapter API and MM project/UI contract.
