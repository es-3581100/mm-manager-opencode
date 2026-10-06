import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  MatrixBridgeError,
  assertNoAuthorityInflation,
  runJSONProcess,
  runMatrixAgent,
} from "../src/bridge.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(here, "fixtures", "fake-core.mjs")

test("accepts valid authority-none JSON", async () => {
  const result = await runJSONProcess(process.execPath, [fixture, "ok"])
  assert.equal(result.result.value, 42)
})

test("accepts nested authority-none JSON", async () => {
  const result = await runJSONProcess(process.execPath, [fixture, "nested-ok"])
  assert.equal(result.result[0].evidence.authority, "none")
})

test("rejects authority inflation", async () => {
  await assert.rejects(
    () => runJSONProcess(process.execPath, [fixture, "authority"]),
    (error) =>
      error instanceof MatrixBridgeError &&
      error.code === "MM_MANAGER_AUTHORITY_INFLATION",
  )
})

test("rejects invalid JSON", async () => {
  await assert.rejects(
    () => runJSONProcess(process.execPath, [fixture, "bad-json"]),
    (error) =>
      error instanceof MatrixBridgeError &&
      error.code === "MM_MANAGER_INVALID_JSON",
  )
})

test("rejects non-zero core exit", async () => {
  await assert.rejects(
    () => runJSONProcess(process.execPath, [fixture, "fail"]),
    (error) =>
      error instanceof MatrixBridgeError &&
      error.code === "MM_MANAGER_PROCESS_FAILED" &&
      error.details.code === 7,
  )
})

test("rejects operations outside the read-only allowlist", () => {
  assert.throws(
    () => runMatrixAgent("write-memory", []),
    (error) =>
      error instanceof MatrixBridgeError &&
      error.code === "MM_MANAGER_OPERATION_DENIED",
  )
})

test("authority checker rejects direct non-none value", () => {
  assert.throws(
    () => assertNoAuthorityInflation({ authority: "admin" }),
    /authority other than none/,
  )
})
