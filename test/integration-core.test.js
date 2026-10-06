import assert from "node:assert/strict"
import test from "node:test"

import { runMatrixAgent } from "../src/bridge.js"

const binary = process.env.MM_MANAGER_INTEGRATION_BIN
const project = process.env.MM_MANAGER_INTEGRATION_PROJECT
const enabled = Boolean(binary && project)

function context() {
  return {
    env: {
      ...process.env,
      MM_MANAGER_BIN: binary,
    },
  }
}

test("real MM-manager bootstrap contract", { skip: !enabled }, async () => {
  const result = await runMatrixAgent("bootstrap", ["--project", project], context())
  assert.equal(result.schema, "app-dir-matrix.agent-bootstrap/v1")
  assert.equal(result.authority, "none")
  assert.ok(result.project_sha256)
  assert.ok(result.operations.includes("scope"))
})

test("real MM-manager resolve contract", { skip: !enabled }, async () => {
  const result = await runMatrixAgent(
    "resolve",
    ["--project", project, "--query", "main model", "--limit", "8"],
    context(),
  )
  assert.equal(result.schema, "app-dir-matrix.agent-resolve/v1")
  assert.equal(result.authority, "none")
  assert.ok(result.results.length > 0)
  for (const match of result.results) {
    assert.equal(match.node.authority, "none")
  }
})

test("real MM-manager scope emits verifiable receipt shape", { skip: !enabled }, async () => {
  const result = await runMatrixAgent(
    "scope",
    ["--project", project, "--query", "main model", "--limit", "8"],
    context(),
  )
  assert.equal(result.schema, "app-dir-matrix.context-capsule/v1")
  assert.equal(result.authority, "none")
  assert.equal(result.receipt.schema, "app-dir-matrix.retrieval-receipt/v1")
  assert.equal(result.receipt.authority, "none")
  assert.ok(result.receipt.receipt_id)
  assert.ok(result.receipt.selected.length > 0)
})
