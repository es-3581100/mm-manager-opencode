import assert from "node:assert/strict"
import test from "node:test"

import * as pluginModule from "../src/index.js"

const MATRIX_TOOLS = [
  "matrix_bootstrap",
  "matrix_discover",
  "matrix_expand",
  "matrix_inspect",
  "matrix_resolve",
  "matrix_scope",
  "matrix_verify_receipt",
]

test("plugin entrypoint exports only loadable plugin factories", () => {
  assert.deepEqual(Object.keys(pluginModule), ["MMManagerOpenCode"])
  assert.equal(typeof pluginModule.MMManagerOpenCode, "function")
})

test("plugin factory exposes the frozen seven-tool Matrix surface", async () => {
  const hooks = await pluginModule.MMManagerOpenCode()
  assert.deepEqual(Object.keys(hooks.tool).sort(), MATRIX_TOOLS)
})
