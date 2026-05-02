# LangGraph Adapter

Provides LangGraph and LangChain compatible node wrappers for OAP Tools.

## As LangChain Tools

```javascript
const { oapManifestToLangChainTools } = require('./oap-langgraph-adapter');
const manifest = require('../../examples/weather-pro/manifest.json');

const tools = oapManifestToLangChainTools({
  manifest,
  identity: { principalDid: 'did:plc:user', agentDid: 'did:web:myagent' },
});

// Use with LangChain AgentExecutor or tool calling models
```

## As LangGraph Nodes

```javascript
const { createOapNode } = require('./oap-langgraph-adapter');

const weatherNode = createOapNode({
  manifest,
  actionId: 'get_forecast',
  identity: { principalDid: 'did:plc:user', agentDid: 'did:web:myagent' },
  stateKey: 'weather',
  inputKey: 'location_query',
});

graph.addNode('weather', weatherNode);
```

## Discovery

```javascript
const { discoverOapTools } = require('./oap-langgraph-adapter');

const tools = await discoverOapTools({
  manifestUrl: 'https://weatherpro.example/.well-known/oap-tool.json',
  intent: 'check weather in Berlin tomorrow',
  identity: { principalDid: 'did:plc:user', agentDid: 'did:web:myagent' },
});
```

## API

| Function | Description |
|----------|-------------|
| `oapActionToLangChainTool(options)` | Single OAP Action to LangChain tool. |
| `oapManifestToLangChainTools(options)` | All Actions to LangChain tools. |
| `createOapNode(options)` | LangGraph node function for a specific Action. |
| `discoverOapTools(options)` | Discover matching tools by intent. |
