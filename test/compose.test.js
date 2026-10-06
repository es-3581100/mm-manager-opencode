import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"

import {
  PROJECT_INDEPENDENT_OPERATIONS,
  composeMatrixInvocation,
  projectPath,
} from "../src/compose.js"

test("discover is project independent", () => {
  assert.deepEqual([...PROJECT_INDEPENDENT_OPERATIONS], ["discover"])
  const call = composeMatrixInvocation(
    "discover",
    {},
    { worktree: "/tmp/worktree", directory: "/tmp/directory" },
    [],
    { resolveProject() { throw new Error("must not resolve project") } },
  )
  assert.deepEqual(call, { argv: ["agent", "discover"], cwd: "/tmp/worktree" })
})

test("project resolution precedence is explicit then env then worktree", () => {
  const context = { worktree: "/work" }
  const env = { MM_MANAGER_PROJECT: "/env/project.json" }
  assert.equal(projectPath({ project: "/explicit/project.json" }, context, env), "/explicit/project.json")
  assert.equal(projectPath({}, context, env), "/env/project.json")
  assert.equal(projectPath({}, context, {}), path.join("/work", ".mm-manager", "project.json"))
})

test("project-scoped operations carry --project", () => {
  const call = composeMatrixInvocation(
    "bootstrap",
    {},
    { worktree: "/work" },
    [],
    { resolveProject: () => "/fixture/project.json" },
  )
  assert.deepEqual(call, {
    argv: ["agent", "bootstrap", "--project", "/fixture/project.json"],
    cwd: "/work",
  })
})
