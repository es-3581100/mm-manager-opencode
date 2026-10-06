import { createHash } from "node:crypto"
import { readFile, stat } from "node:fs/promises"
import http from "node:http"
import path from "node:path"

export const DEFAULT_MATRIX_ARTIFACT = "matrix.html"
export const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

function enabledValue(value) {
  if (value === undefined) return true
  return !["0", "false", "off", "no"].includes(String(value).trim().toLowerCase())
}

export function matrixFooterEnabled(env = process.env) {
  return enabledValue(env.MM_MATRIX_FOOTER)
}

export function matrixUiEnabled(env = process.env) {
  return enabledValue(env.MM_MATRIX_UI)
}

function resolveArtifactPath(projectPath, env) {
  const configured = env.MM_MATRIX_HTML?.trim()
  if (!configured) return path.join(path.dirname(projectPath), DEFAULT_MATRIX_ARTIFACT)
  if (path.isAbsolute(configured)) return path.normalize(configured)
  return path.resolve(path.dirname(projectPath), configured)
}

function parseSidecar(text, artifactPath) {
  const match = /^([0-9a-f]{64})  ([^\r\n]+)\r?\n?$/.exec(text)
  if (!match) return null
  if (match[2] !== path.basename(artifactPath)) return null
  return match[1]
}

export async function resolveMatrixArtifact(projectPath, options = {}) {
  const env = options.env ?? process.env
  const read = options.readFile ?? readFile
  const statFile = options.stat ?? stat

  if (!matrixFooterEnabled(env) || !matrixUiEnabled(env)) return null

  let project
  try {
    project = JSON.parse(await read(projectPath, "utf8"))
  } catch {
    return null
  }

  if (project?.schema_version !== "app-dir-matrix.project/v1") return null
  if (typeof project.project_id !== "string" || !PROJECT_ID_PATTERN.test(project.project_id)) return null

  const artifactPath = resolveArtifactPath(projectPath, env)
  const sidecarPath = artifactPath + ".sha256"

  try {
    const info = await statFile(artifactPath)
    if (!info.isFile()) return null
    const [html, sidecar] = await Promise.all([
      read(artifactPath),
      read(sidecarPath, "utf8"),
    ])
    const expected = parseSidecar(sidecar, artifactPath)
    if (!expected) return null
    const actual = createHash("sha256").update(html).digest("hex")
    if (actual !== expected) return null
    return {
      projectID: project.project_id,
      projectPath,
      artifactPath,
      sidecarPath,
      sha256: actual,
    }
  } catch {
    return null
  }
}

function requestedPort(env) {
  const raw = env.MM_MATRIX_PORT?.trim()
  if (!raw) return 0
  if (!/^\d+$/.test(raw)) return null
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0 || value > 65535) return null
  return value
}

function loopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1"
}

export async function startMatrixUiServer(artifact, options = {}) {
  const env = options.env ?? process.env
  const read = options.readFile ?? readFile
  const statFile = options.stat ?? stat
  const port = requestedPort(env)
  if (port === null) return null

  const route = `/matrix/${encodeURIComponent(artifact.projectID)}`
  const server = http.createServer(async (req, res) => {
    if (!loopbackAddress(req.socket.remoteAddress)) {
      res.writeHead(403).end("loopback only\n")
      return
    }

    let pathname
    try {
      pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname
    } catch {
      res.writeHead(400).end("bad request\n")
      return
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end()
      return
    }
    if (pathname !== route) {
      res.writeHead(404).end("not found\n")
      return
    }

    const refreshed = await resolveMatrixArtifact(artifact.projectPath, { env, readFile: read, stat: statFile })
    if (
      !refreshed ||
      refreshed.projectID !== artifact.projectID ||
      path.resolve(refreshed.artifactPath) !== path.resolve(artifact.artifactPath)
    ) {
      res.writeHead(409).end("matrix artifact failed integrity verification\n")
      return
    }

    const body = await read(refreshed.artifactPath)
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    })
    if (req.method === "HEAD") res.end()
    else res.end(body)
  })

  return await new Promise((resolve) => {
    const fail = () => resolve(null)
    server.once("error", fail)
    server.listen(port, "127.0.0.1", () => {
      server.off("error", fail)
      const address = server.address()
      if (!address || typeof address === "string" || !loopbackAddress(address.address)) {
        server.close(() => resolve(null))
        return
      }
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}${route}`,
        projectID: artifact.projectID,
        artifactPath: artifact.artifactPath,
        sha256: artifact.sha256,
      })
    })
  })
}

export async function closeMatrixUiServer(ui) {
  if (!ui?.server) return
  await new Promise((resolve) => ui.server.close(() => resolve()))
}
