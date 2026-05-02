# MCP Adapter

Bidirectional bridge between the Model Context Protocol and the Open Agent Protocol.

## Direction 1: OAP as MCP Server

Exposes OAP Tools as MCP tool definitions. Any MCP client (Claude Desktop, Cursor, Continue, Zed) can invoke OAP Tools through this adapter.

```javascript
const { createMcpServer } = require('./oap-mcp-adapter');
const manifest = require('../../examples/weather-pro/manifest.json');

createMcpServer(manifest, {
  principalDid: 'did:plc:your_user',
  agentDid: 'did:assistnet:your_agent',
  signingKey: null, // Provide EdDSA private key for production
});
```

## Direction 2: MCP to OAP Manifest

Wraps existing MCP tool definitions into a conformant OAP Manifest.

```javascript
const { mcpToolsToOapManifest } = require('./oap-mcp-adapter');

const manifest = mcpToolsToOapManifest({
  mcpTools: [{ name: 'read_file', description: 'Read file content', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } }],
  toolId: 'filesystem-mcp',
  toolName: 'Filesystem MCP',
  publisherDid: 'did:web:mymcp.example',
  publisherLegalName: 'My MCP Provider GmbH',
  baseUrl: 'https://mymcp.example',
});
```

## API

| Function | Description |
|----------|-------------|
| `oapActionToMcpTool(action)` | Convert single OAP Action to MCP tool. |
| `oapManifestToMcpTools(manifest)` | Convert full Manifest to MCP tool array. |
| `handleMcpToolCall(options)` | Proxy MCP call to OAP invoke endpoint. |
| `mcpToolToOapAction(mcpTool)` | Convert MCP tool to OAP Action (conservative defaults). |
| `mcpToolsToOapManifest(options)` | Generate complete OAP Manifest from MCP tools. |
| `createMcpServer(manifest, identity)` | Run an MCP stdio server exposing OAP Tools. |
