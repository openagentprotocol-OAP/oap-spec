# A2A Adapter

Bidirectional bridge between Google Agent2Agent Protocol and the Open Agent Protocol.

## Direction 1: Publish OAP Tool as A2A Agent

Generate an A2A Agent Card from an OAP Manifest:

```javascript
const { oapManifestToAgentCard } = require('./oap-a2a-adapter');
const manifest = require('../../examples/weather-pro/manifest.json');

const card = oapManifestToAgentCard(manifest, 'https://my-gateway.example/a2a');
// Serve as GET /.well-known/agent.json
```

## Direction 2: Receive A2A Tasks as OAP Invocations

Express middleware that serves as an A2A gateway:

```javascript
const { createA2aGateway } = require('./oap-a2a-adapter');

app.use('/a2a', createA2aGateway(manifest, identity, async (oapRequest) => {
  // Route to your OAP invoke handler
  return await invokeOapTool(oapRequest);
}));
```

## Direction 3: Call External A2A Agents from OAP

```javascript
const { submitA2aTask } = require('./oap-a2a-adapter');

const result = await submitA2aTask({
  agentCardUrl: 'https://external-agent.example/.well-known/agent.json',
  input: { query: 'What is the weather in Berlin?' },
  skill: 'get_forecast',
});
```

## API

| Function | Description |
|----------|-------------|
| `oapManifestToAgentCard(manifest, endpoint)` | OAP Manifest to A2A Agent Card. |
| `a2aTaskToOapRequest(task, identity, actionId)` | A2A Task to OAP Request Envelope. |
| `oapResponseToA2aTask(response, taskId)` | OAP Response to A2A Task result. |
| `submitA2aTask(options)` | Submit Task to external A2A agent. |
| `createA2aGateway(manifest, identity, invokeOap)` | Express middleware for A2A gateway. |
