# license-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/license-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/license-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: look up SPDX license metadata. Backed by `spdx-license-list/full`
so the data set is the official SPDX list.

## Tools

- `lookup` — `{ id: "MIT" }` → `{ id, name, osi_approved, url }`. Returns `null` if unknown.
- `search` — `{ query: "apache" }` → list of matching licenses (id + name token search).

## Configure

```json
{ "mcpServers": { "license": { "command": "npx", "args": ["-y", "@mukundakatta/license-mcp"] } } }
```

## License

MIT.
