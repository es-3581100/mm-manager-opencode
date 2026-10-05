const mode = process.argv[2]

if (mode === "ok") {
  console.log(JSON.stringify({
    schema: "app-dir-matrix.test/v1",
    authority: "none",
    result: { value: 42 },
  }))
  process.exit(0)
}

if (mode === "nested-ok") {
  console.log(JSON.stringify({
    result: [{ evidence: { authority: "none" } }],
  }))
  process.exit(0)
}

if (mode === "authority") {
  console.log(JSON.stringify({
    result: { evidence: { authority: "execute" } },
  }))
  process.exit(0)
}

if (mode === "bad-json") {
  console.log("{not-json")
  process.exit(0)
}

if (mode === "fail") {
  console.error("fixture failure")
  process.exit(7)
}

console.error("unknown fixture mode")
process.exit(9)
