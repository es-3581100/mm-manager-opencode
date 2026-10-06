import { projectPath } from "./compose.js"
import {
  closeMatrixUiServer,
  matrixFooterEnabled,
  resolveMatrixArtifact,
  startMatrixUiServer,
} from "./ui.js"

export const FOOTER_MARKER = "<!-- mm-matrix-footer:v1 -->"

export function formatMatrixFooter({ url, projectID }) {
  return `${FOOTER_MARKER}\n\n──────── ◈ MM ────────\n[Open Matrix](${url}) · project: \`${projectID}\` · authority: none`
}

export function appendMatrixFooter(text, ui) {
  if (typeof text !== "string" || !text) return text
  if (!ui?.url || !ui?.projectID) return text
  if (text.includes(FOOTER_MARKER)) return text
  return `${text.replace(/\s+$/, "")}\n\n${formatMatrixFooter(ui)}\n`
}

function unwrap(result) {
  if (result && typeof result === "object" && "data" in result) return result.data
  return result
}

export function selectFinalTextTarget(messages) {
  if (!Array.isArray(messages)) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.info?.role !== "assistant") continue
    const parts = Array.isArray(message.parts) ? message.parts : []
    for (let j = parts.length - 1; j >= 0; j--) {
      const part = parts[j]
      if (part?.type !== "text") continue
      if (part.synthetic || part.ignored) continue
      if (typeof part.text !== "string" || !part.text.trim()) continue
      return { message, part }
    }
    return null
  }
  return null
}

async function patchTextPart(client, part, text) {
  const transport = client?._client
  if (!transport || typeof transport.patch !== "function") return false
  const response = await transport.patch({
    url: "/session/{id}/message/{messageID}/part/{partID}",
    path: {
      id: part.sessionID,
      messageID: part.messageID,
      partID: part.id,
    },
    body: { ...part, text },
    bodySerializer: (value) => JSON.stringify(value),
    headers: { "Content-Type": "application/json" },
    throwOnError: true,
  })
  return Boolean(response)
}

export async function decorateIdleSession({ client, sessionID, getUi, env = process.env }) {
  if (!matrixFooterEnabled(env)) return "disabled"
  if (!client?.session || !sessionID) return "unavailable"

  const session = unwrap(await client.session.get({ path: { id: sessionID } }))
  if (!session || session.parentID) return "child-session"

  const messages = unwrap(await client.session.messages({ path: { id: sessionID } }))
  const target = selectFinalTextTarget(messages)
  if (!target) return "no-final-text"
  if (target.part.text.includes(FOOTER_MARKER)) return "already-decorated"

  const ui = await getUi()
  if (!ui) return "ui-unavailable"

  const text = appendMatrixFooter(target.part.text, ui)
  if (text === target.part.text) return "unchanged"
  if (!(await patchTextPart(client, target.part, text))) return "patch-unavailable"
  return "decorated"
}

export function createMatrixFooterRuntime(input = {}, options = {}) {
  const env = options.env ?? process.env
  if (!matrixFooterEnabled(env) || !input.client || !(input.worktree || input.directory)) {
    return { event: async () => {}, dispose: async () => {} }
  }

  const context = { worktree: input.worktree, directory: input.directory }
  let uiPromise = null
  let ui = null
  const inFlight = new Map()

  async function getUi() {
    if (ui) return ui
    if (!uiPromise) {
      uiPromise = (async () => {
        const selectedProject = projectPath({}, context)
        const artifact = await resolveMatrixArtifact(selectedProject, { env })
        if (!artifact) return null
        const started = await startMatrixUiServer(artifact, { env })
        if (started) ui = started
        return started
      })().finally(() => {
        uiPromise = null
      })
    }
    return uiPromise
  }

  async function decorate(sessionID) {
    const previous = inFlight.get(sessionID) ?? Promise.resolve()
    const current = previous
      .catch(() => {})
      .then(() => decorateIdleSession({ client: input.client, sessionID, getUi, env }))
      .catch((error) => {
        if (env.MM_MATRIX_DEBUG === "1") console.warn("MM Matrix footer skipped:", error)
        return "error"
      })
      .finally(() => {
        if (inFlight.get(sessionID) === current) inFlight.delete(sessionID)
      })
    inFlight.set(sessionID, current)
    return current
  }

  return {
    async event({ event }) {
      if (event?.type !== "session.idle") return
      await decorate(event.properties?.sessionID)
    },
    async dispose() {
      await Promise.allSettled([...inFlight.values()])
      await closeMatrixUiServer(ui)
      ui = null
    },
  }
}
