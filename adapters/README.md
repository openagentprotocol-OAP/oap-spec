# Reference Adapters

This directory will host normative adapters that bridge OAP with other agent and tool protocols.

| Adapter | Status | Description |
|---------|--------|-------------|
| `mcp/` | Complete | Bidirectional bridge between Model Context Protocol and OAP. Translates MCP `tool` and `resource` definitions to OAP Actions and exposes OAP Tools as MCP servers. |
| `a2a/` | Complete | Bidirectional bridge between Agent2Agent Protocol and OAP. Translates A2A Tasks to OAP Coordination Sessions and augments A2A Agent Cards with OAP profiles. |
| `openai-functions/` | Complete | Bidirectional mapping between OpenAI Function Calling and OAP Action Schemas. |
| `langgraph/` | Complete | LangGraph/LangChain tool wrappers that consume OAP Tools natively. |

Adapters are released under the Apache License 2.0.
