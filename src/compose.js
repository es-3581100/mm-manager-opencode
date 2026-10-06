import path from "node:path"

// Core `agent discover` accepts no flags at all, so the adapter must not
// resolve or inject a project for it. Every other operation is project-scoped.
export const PROJECT_INDEPENDENT_OPERATIONS = new Set(["discover"])

// Project-scoped operations resolve their project artifact in strict
// precedence order: explicit tool argument -> MM_MANAGER_PROJECT -> the
// worktree's own .mm-manager/project.json.
export function projectPath(args, context, env = process.env) {
  const explicit = args.project?.trim()
  if (explicit) return explicit

  const configured = env.MM_MANAGER_PROJECT?.trim()
  if (configured) return configured

  const root = context.worktree || context.directory
  return path.join(root, ".mm-manager", "project.json")
}

// Pure argv/cwd composition for one tool call. `resolveProject` is injectable so
// tests can prove that project resolution is never consulted for
// project-independent operations.
export function composeMatrixInvocation(operation, args, context, extraFlags = [], deps = {}) {
  const resolveProject = deps.resolveProject ?? projectPath
  const argv = PROJECT_INDEPENDENT_OPERATIONS.has(operation)
    ? ["agent", operation, ...extraFlags]
    : ["agent", operation, "--project", resolveProject(args, context), ...extraFlags]

  return { argv, cwd: context.worktree || context.directory }
}