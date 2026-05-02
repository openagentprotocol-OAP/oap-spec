# OpenAI Functions Adapter

Transforms OAP Action Schemas to and from OpenAI function calling definitions.

## OAP to OpenAI

```javascript
const { oapManifestToOpenAiTools } = require('./oap-openai-adapter');
const manifest = require('../../examples/weather-pro/manifest.json');

const tools = oapManifestToOpenAiTools(manifest);

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  tools,
});
```

## Handle tool_calls

```javascript
const { handleOpenAiToolCall } = require('./oap-openai-adapter');

for (const toolCall of message.tool_calls) {
  const result = await handleOpenAiToolCall({
    manifest,
    toolCall,
    identity: { principalDid: 'did:plc:user', agentDid: 'did:web:myagent' },
  });
  messages.push(result);
}
```

## API

| Function | Description |
|----------|-------------|
| `oapActionToOpenAiFunction(action)` | Single OAP Action to OpenAI function. |
| `oapManifestToOpenAiTools(manifest)` | Full Manifest to OpenAI tools array. |
| `openAiFunctionToOapAction(fn)` | OpenAI function to OAP Action (best effort). |
| `openAiToolsToOapActions(tools)` | OpenAI tools array to OAP Actions array. |
| `handleOpenAiToolCall(options)` | Proxy OpenAI tool_call to OAP invoke. |
