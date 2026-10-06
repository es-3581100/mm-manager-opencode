# Matrix UI return footer

The OpenCode adapter can append a mechanical, navigation-only footer to the final
user-visible assistant text when the current project has a verified Matrix HTML
artifact.

## Artifact convention

The default project contract is:

```text
<worktree>/.mm-manager/project.json
<worktree>/.mm-manager/matrix.html
<worktree>/.mm-manager/matrix.html.sha256
```

`matrix.html` must be produced by MM-manager core. The adapter does not render or
reinterpret project truth.

Example:

```sh
appdir-matrix build \
  --project .mm-manager/project.json \
  --template /path/to/MM-manager/web/app-dir-matrix-core-v0.2.0.html \
  --out .mm-manager/matrix.html
```

The core build writes the required SHA-256 sidecar. The adapter verifies that
sidecar before starting the UI server and again for every browser request.

Set `MM_MATRIX_HTML` to override the artifact path. A relative override is
resolved relative to the directory containing the selected project JSON.

## Footer lifecycle

On OpenCode `session.idle` the adapter:

1. ignores child/subagent sessions;
2. reads the session's stored messages;
3. selects the last visible text part of the latest assistant message;
4. resolves the project using the existing explicit → `MM_MANAGER_PROJECT` →
   worktree `.mm-manager/project.json` precedence;
5. verifies the Matrix HTML and its core SHA-256 sidecar;
6. lazily starts a server bound only to `127.0.0.1`;
7. patches the completed text part through OpenCode's own authenticated client
   transport; and
8. uses `<!-- mm-matrix-footer:v1 -->` to make the operation idempotent.

Invalid MM project identity leaves the response unchanged. A valid project with an unavailable verified UI uses the non-link `Matrix UI unavailable` footer; response-patch failures remain non-critical.

## Security / authority

- Browser serving is loopback-only.
- Only GET/HEAD are accepted.
- No credential, token, or permission is placed in the URL.
- Project IDs must satisfy the core `^[a-z0-9][a-z0-9._-]*$` rule.
- The served artifact must have a matching core SHA-256 sidecar.
- The footer always says `authority: none`.
- The footer does not authorize tools, mutation, execution, approval, or scope
  widening.

## Controls

- `MM_MATRIX_FOOTER=0` disables final-response decoration byte-for-byte.
- `MM_MATRIX_UI=0` disables UI serving.
- `MM_MATRIX_HTML=/path/to/matrix.html` selects an explicit artifact.
- `MM_MATRIX_PORT=<0-65535>` requests a loopback port; default `0` asks the OS
  for an available ephemeral port.
- `MM_MATRIX_DEBUG=1` logs decoration failures; default is silent fail-open for
  the assistant response.

Benchmark/reproduction harnesses should set `MM_MATRIX_FOOTER=0`.
