import { spawn } from "node:child_process"

export const DEFAULT_TIMEOUT_MS = 15_000
export const DEFAULT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024

export const AGENT_OPERATIONS = new Set([
  "discover",
  "bootstrap",
  "resolve",
  "inspect",
  "expand",
  "scope",
  "verify-receipt",
])

export class MatrixBridgeError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = "MatrixBridgeError"
    this.code = code
    this.details = details
  }
}

export function assertNoAuthorityInflation(value, trail = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAuthorityInflation(item, trail + "[" + index + "]"))
    return
  }

  if (value === null || typeof value !== "object") return

  for (const [key, child] of Object.entries(value)) {
    const childTrail = trail + "." + key
    if (key === "authority" && child !== "none") {
      throw new MatrixBridgeError(
        "MM_MANAGER_AUTHORITY_INFLATION",
        "MM-manager context returned authority other than none at " + childTrail,
        { trail: childTrail, value: child },
      )
    }
    assertNoAuthorityInflation(child, childTrail)
  }
}

export function runJSONProcess(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  } = options

  return new Promise((resolve, reject) => {
    let settled = false
    let stdout = Buffer.alloc(0)
    let stderr = Buffer.alloc(0)
    let overflow = false
    let timedOut = false

    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    })

    const finishReject = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const append = (current, chunk) => {
      const next = Buffer.concat([current, chunk])
      if (next.length > maxOutputBytes) {
        overflow = true
        child.kill("SIGKILL")
      }
      return next
    }

    child.stdout.on("data", (chunk) => {
      stdout = append(stdout, chunk)
    })

    child.stderr.on("data", (chunk) => {
      stderr = append(stderr, chunk)
    })

    child.on("error", (error) => {
      finishReject(
        new MatrixBridgeError(
          "MM_MANAGER_SPAWN_FAILED",
          "failed to start MM-manager core: " + error.message,
          { command },
        ),
      )
    })

    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs)

    child.on("close", (code, signal) => {
      clearTimeout(timer)
      if (settled) return

      if (overflow) {
        finishReject(
          new MatrixBridgeError(
            "MM_MANAGER_OUTPUT_LIMIT",
            "MM-manager core exceeded the configured output limit",
            { maxOutputBytes },
          ),
        )
        return
      }

      if (timedOut) {
        finishReject(
          new MatrixBridgeError(
            "MM_MANAGER_TIMEOUT",
            "MM-manager core exceeded the configured timeout",
            { timeoutMs },
          ),
        )
        return
      }

      const stdoutText = stdout.toString("utf8").trim()
      const stderrText = stderr.toString("utf8").trim()

      if (code !== 0) {
        finishReject(
          new MatrixBridgeError(
            "MM_MANAGER_PROCESS_FAILED",
            "MM-manager core exited non-zero",
            { code, signal, stderr: stderrText },
          ),
        )
        return
      }

      if (!stdoutText) {
        finishReject(
          new MatrixBridgeError(
            "MM_MANAGER_EMPTY_OUTPUT",
            "MM-manager core returned no JSON output",
            { stderr: stderrText },
          ),
        )
        return
      }

      let parsed
      try {
        parsed = JSON.parse(stdoutText)
      } catch (error) {
        finishReject(
          new MatrixBridgeError(
            "MM_MANAGER_INVALID_JSON",
            "MM-manager core returned invalid JSON: " + error.message,
            { stderr: stderrText },
          ),
        )
        return
      }

      try {
        assertNoAuthorityInflation(parsed)
      } catch (error) {
        finishReject(error)
        return
      }

      settled = true
      resolve(parsed)
    })
  })
}

export function runMatrixAgent(operation, flags, context = {}) {
  if (!AGENT_OPERATIONS.has(operation)) {
    throw new MatrixBridgeError(
      "MM_MANAGER_OPERATION_DENIED",
      "operation is not in the read-only MM-manager allowlist: " + operation,
      { operation },
    )
  }

  const env = context.env ?? process.env
  const binary = env.MM_MANAGER_BIN || "appdir-matrix"
  return runJSONProcess(binary, ["agent", operation, ...flags], {
    cwd: context.cwd,
    env,
    timeoutMs: context.timeoutMs,
    maxOutputBytes: context.maxOutputBytes,
  })
}
