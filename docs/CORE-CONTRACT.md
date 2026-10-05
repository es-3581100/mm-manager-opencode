# MM-manager core compatibility contract

This adapter deliberately does not implement MM-manager query semantics itself.

## Required binary

The adapter resolves the core executable in this order:

1. `MM_MANAGER_BIN`
2. `appdir-matrix` on `PATH`

The process is invoked directly with `shell: false`.

## Required read-only command family

The compatibility target is:

```text
appdir-matrix agent bootstrap       --project <project.json>
appdir-matrix agent resolve         --project <project.json> --query <text> --limit <n>
appdir-matrix agent inspect         --project <project.json> --pointer <id>
appdir-matrix agent expand          --project <project.json> --pointer <id> --depth <1|2> --limit <n>
appdir-matrix agent scope           --project <project.json> --query <text> --limit <n>
appdir-matrix agent verify-receipt  --project <project.json> --receipt <receipt.json>
```

Each successful command MUST:

- write exactly one JSON document to stdout;
- write diagnostics only to stderr;
- exit 0 only when the result is valid and complete for that operation;
- preserve MM-manager provenance;
- return no execution authority;
- fail closed on unknown pointers, stale/invalid project artifacts, malformed receipts, or scope violations.

A failure MUST exit non-zero.

## Adapter enforcement

The OpenCode adapter independently enforces:

- an operation allowlist;
- no shell command construction;
- a 15-second default process timeout;
- a 4 MiB default output ceiling;
- valid JSON output;
- rejection of every returned `authority` field whose value is not exactly `none`.

The adapter does not reinterpret a failed core result and does not fall back to local search.

## Project selection

Project path precedence:

1. tool argument `project`;
2. `MM_MANAGER_PROJECT`;
3. `<OpenCode worktree>/.mm-manager/project.json`.

## Non-goals for v0.1

- no automatic prompt injection;
- no project mutation;
- no persistent memory writes;
- no learned-memory promotion;
- no vector/Q-table authority;
- no task execution through MM-manager;
- no fallback TypeScript query engine.
