import path from "node:path"
import { tool } from "@opencode-ai/plugin"
import { runMatrixAgent } from "./bridge.js"

function projectPath(args, context) {
  const explicit = args.project?.trim()
  if (explicit) return explicit

  const configured = process.env.MM_MANAGER_PROJECT?.trim()
  if (configured) return configured

  const root = context.worktree || context.directory
  return path.join(root, ".mm-manager", "project.json")
}

function render(value) {
  return JSON.stringify(value, null, 2)
}

async function invoke(operation, args, context, extraFlags = []) {
  const project = projectPath(args, context)
  return render(
    await runMatrixAgent(
      operation,
      ["--project", project, ...extraFlags],
      { cwd: context.worktree || context.directory },
    ),
  )
}

const projectArg = () =>
  tool.schema
    .string()
    .min(1)
    .optional()
    .describe("MM-manager project/v1 JSON path. Overrides MM_MANAGER_PROJECT.")

export const MMManagerOpenCode = async () => ({
  tool: {
    matrix_bootstrap: tool({
      description:
        "Load the small read-only MM-manager agent bootstrap for a project. Retrieval is evidence only and grants no execution authority.",
      args: {
        project: projectArg(),
      },
      async execute(args, context) {
        return invoke("bootstrap", args, context)
      },
    }),

    matrix_resolve: tool({
      description:
        "Resolve a task/query to a bounded ranked set of MM-manager project evidence. Returns provenance-aware JSON and never grants authority.",
      args: {
        query: tool.schema.string().min(1).describe("Task or information need to resolve."),
        project: projectArg(),
        limit: tool.schema.number().int().min(1).max(32).optional(),
      },
      async execute(args, context) {
        const limit = args.limit ?? 8
        return invoke("resolve", args, context, ["--query", args.query, "--limit", String(limit)])
      },
    }),

    matrix_inspect: tool({
      description:
        "Inspect one exact MM-manager node/pointer with provenance and evidence metadata.",
      args: {
        pointer: tool.schema.string().min(1).describe("Exact Matrix node ID or pointer."),
        project: projectArg(),
      },
      async execute(args, context) {
        return invoke("inspect", args, context, ["--pointer", args.pointer])
      },
    }),

    matrix_expand: tool({
      description:
        "Expand a bounded neighborhood around one exact MM-manager pointer. Expansion remains read-only evidence.",
      args: {
        pointer: tool.schema.string().min(1).describe("Exact Matrix node ID or pointer."),
        project: projectArg(),
        depth: tool.schema.number().int().min(1).max(2).optional(),
        limit: tool.schema.number().int().min(1).max(32).optional(),
      },
      async execute(args, context) {
        const depth = args.depth ?? 1
        const limit = args.limit ?? 8
        return invoke("expand", args, context, [
          "--pointer",
          args.pointer,
          "--depth",
          String(depth),
          "--limit",
          String(limit),
        ])
      },
    }),

    matrix_scope: tool({
      description:
        "Build a bounded provenance-aware context capsule for one task without widening execution authority.",
      args: {
        query: tool.schema.string().min(1).describe("Task objective used to construct the scope."),
        project: projectArg(),
        limit: tool.schema.number().int().min(1).max(32).optional(),
      },
      async execute(args, context) {
        const limit = args.limit ?? 12
        return invoke("scope", args, context, ["--query", args.query, "--limit", String(limit)])
      },
    }),

    matrix_verify_receipt: tool({
      description:
        "Verify a previously emitted MM-manager retrieval receipt against the selected project artifact.",
      args: {
        receipt: tool.schema.string().min(1).describe("Path to a retrieval receipt JSON file."),
        project: projectArg(),
      },
      async execute(args, context) {
        return invoke("verify-receipt", args, context, ["--receipt", args.receipt])
      },
    }),
  },
})
