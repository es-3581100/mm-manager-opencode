import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  closeMatrixUiServer,
  resolveMatrixArtifact,
  startMatrixUiServer,
} from "../src/ui.js"

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mm-matrix-ui-"))
  const projectPath = path.join(dir, "project.json")
  const artifactPath = path.join(dir, "matrix.html")
  const html = Buffer.from("<!doctype html><title>matrix</title>\n")
  const hash = createHash("sha256").update(html).digest("hex")

  await writeFile(
    projectPath,
    JSON.stringify({
      schema_version: "app-dir-matrix.project/v1",
      project_id: "demo",
    }) + "\n",
  )
  await writeFile(artifactPath, html)
  await writeFile(artifactPath + ".sha256", `${hash}  matrix.html\n`)

  return { dir, projectPath, artifactPath, html, hash }
}

test("resolves only a core-style hash-verified Matrix artifact", async () => {
  const f = await fixture()
  const resolved = await resolveMatrixArtifact(f.projectPath, { env: {} })
  assert.equal(resolved.projectID, "demo")
  assert.equal(resolved.sha256, f.hash)

  await writeFile(f.artifactPath, "drifted\n")
  assert.equal(await resolveMatrixArtifact(f.projectPath, { env: {} }), null)
})

test("invalid project IDs fail closed", async () => {
  const f = await fixture()
  await writeFile(
    f.projectPath,
    JSON.stringify({
      schema_version: "app-dir-matrix.project/v1",
      project_id: "../../bad",
    }),
  )
  assert.equal(await resolveMatrixArtifact(f.projectPath, { env: {} }), null)
})

test("UI server binds loopback and serves the verified artifact", async () => {
  const f = await fixture()
  const artifact = await resolveMatrixArtifact(f.projectPath, { env: {} })
  const ui = await startMatrixUiServer(artifact, { env: {} })

  try {
    assert.ok(ui.url.startsWith("http://127.0.0.1:"))
    assert.ok(ui.url.endsWith("/matrix/demo"))

    const response = await fetch(ui.url)
    assert.equal(response.status, 200)
    assert.equal(await response.text(), f.html.toString())

    const other = await fetch(new URL("/matrix/nope", ui.url))
    assert.equal(other.status, 404)
  } finally {
    await closeMatrixUiServer(ui)
  }
})
