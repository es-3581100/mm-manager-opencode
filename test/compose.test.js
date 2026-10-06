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
  const old = process.env.MM_MANAGER_PROJECT
  try {
    process.env.MM_MANAGER_PROJECT = "/env/project.json"
    assert.equal(projectPath({ project: "/explicit/project.json" }, { worktree: "/work" }), "/explicit/project.json")
    assert.equal(projectPath({}, { worktree: "/work" }), "/env/project.json")
    delete process.env.MM_MANAGER_PROJECT
    assert.equal(projectPath({}, { worktree: "/work" }), path.join("/work", ".mm-manager", "project.json"))
  } finally {
    if (old === undefined) delete process.env.MM_MANAGER_PROJECT
    else process.env.MM_MANAGER_PROJECT = old
  }
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
