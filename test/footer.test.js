import assert from "node:assert/strict"
import test from "node:test"

import {
  FOOTER_MARKER,
  appendMatrixFooter,
  decorateIdleSession,
  formatMatrixFooter,
  selectFinalTextTarget,
} from "../src/footer.js"

const ui = { url: "http://127.0.0.1:43210/matrix/demo", projectID: "demo" }

function assistant(text, extra = {}) {
  return {
    info: { id: extra.messageID ?? "msg_a", role: "assistant" },
    parts: [
      {
        id: extra.partID ?? "prt_a",
        sessionID: "ses_a",
        messageID: extra.messageID ?? "msg_a",
        type: "text",
        text,
        ...extra.part,
      },
    ],
  }
}

test("footer is explicit navigation with authority none", () => {
  const text = formatMatrixFooter(ui)
  assert.match(text, /Open Matrix/)
  assert.match(text, /authority: none/)
  assert.ok(text.startsWith(FOOTER_MARKER))
})

test("append is idempotent", () => {
  const once = appendMatrixFooter("done", ui)
  const twice = appendMatrixFooter(once, ui)
  assert.equal(twice, once)
  assert.equal((once.match(new RegExp(FOOTER_MARKER, "g")) ?? []).length, 1)
})

test("selects only the last visible assistant text part", () => {
  const messages = [
    assistant("old", { messageID: "msg_old", partID: "prt_old" }),
    { info: { id: "msg_u", role: "user" }, parts: [{ type: "text", text: "prompt" }] },
    {
      info: { id: "msg_new", role: "assistant" },
      parts: [
        { id: "prt_tool", type: "tool" },
        {
          id: "prt_synth",
          sessionID: "ses_a",
          messageID: "msg_new",
          type: "text",
          text: "synthetic",
          synthetic: true,
        },
        {
          id: "prt_final",
          sessionID: "ses_a",
          messageID: "msg_new",
          type: "text",
          text: "final",
        },
      ],
    },
  ]
  assert.equal(selectFinalTextTarget(messages).part.id, "prt_final")
})

test("idle decoration patches the final part exactly once", async () => {
  const calls = []
  const message = assistant("result")
  const client = {
    session: {
      async get() {
        return { data: { id: "ses_a" } }
      },
      async messages() {
        return { data: [message] }
      },
      _client: {
        async patch(args) {
          calls.push(args)
          message.parts[0] = args.body
          return { data: args.body }
        },
      },
    },
  }

  assert.equal(
    await decorateIdleSession({
      client,
      sessionID: "ses_a",
      getUi: async () => ui,
      env: {},
    }),
    "decorated",
  )
  assert.equal(calls.length, 1)
  assert.match(calls[0].body.text, /authority: none/)

  assert.equal(
    await decorateIdleSession({
      client,
      sessionID: "ses_a",
      getUi: async () => ui,
      env: {},
    }),
    "already-decorated",
  )
  assert.equal(calls.length, 1)
})

test("child sessions are not decorated", async () => {
  let listed = false
  const client = {
    session: {
      async get() {
        return { data: { id: "ses_child", parentID: "ses_parent" } }
      },
      async messages() {
        listed = true
        return { data: [] }
      },
    },
  }
  assert.equal(
    await decorateIdleSession({
      client,
      sessionID: "ses_child",
      getUi: async () => ui,
      env: {},
    }),
    "child-session",
  )
  assert.equal(listed, false)
})

test("benchmark disable leaves output untouched", async () => {
  let touched = false
  const client = {
    session: {
      async get() {
        touched = true
        return { data: {} }
      },
      async messages() {
        touched = true
        return { data: [] }
      },
    },
  }
  assert.equal(
    await decorateIdleSession({
      client,
      sessionID: "ses_a",
      getUi: async () => ui,
      env: { MM_MATRIX_FOOTER: "0" },
    }),
    "disabled",
  )
  assert.equal(touched, false)
})
