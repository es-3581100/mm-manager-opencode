import assert from "node:assert/strict"
import http from "node:http"
import test from "node:test"

import { createOpencodeClient } from "@opencode-ai/sdk/client"

async function listen(handler) {
  const server = http.createServer(handler)
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  }
}

test("OpenCode 1.18.34 low-level PATCH carries the complete JSON part body", async () => {
  let observed
  const { server, baseUrl } = await listen(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString("utf8")
    observed = {
      method: req.method,
      url: req.url,
      contentType: req.headers["content-type"],
      directory: req.headers["x-opencode-directory"],
      raw,
      body: raw ? JSON.parse(raw) : null,
    }
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(raw || "{}")
  })

  try {
    const client = createOpencodeClient({
      baseUrl,
      directory: "/tmp/mm-host-contract",
    })

    assert.equal(typeof client._client.patch, "function")

    const part = {
      id: "prt_test",
      sessionID: "ses_test",
      messageID: "msg_test",
      type: "text",
      text: "answer\n\n<!-- mm-matrix-footer:v1 -->",
    }

    await client._client.patch({
      url: "/session/{id}/message/{messageID}/part/{partID}",
      path: {
        id: part.sessionID,
        messageID: part.messageID,
        partID: part.id,
      },
      body: part,
      bodySerializer: (value) => JSON.stringify(value),
      headers: { "Content-Type": "application/json" },
      throwOnError: true,
    })

    assert.equal(observed.method, "PATCH")
    assert.equal(
      observed.url,
      "/session/ses_test/message/msg_test/part/prt_test",
    )
    assert.equal(observed.contentType, "application/json")
    assert.equal(
      observed.directory,
      encodeURIComponent("/tmp/mm-host-contract"),
    )
    assert.deepEqual(observed.body, part)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
