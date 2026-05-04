/**
 * Smoke tests for all OAP adapters.
 *
 * Boots the L4-ready Reference Server on an ephemeral port and exercises every
 * adapter against it. Verifies that:
 *
 *   - Each adapter can transform the OAP Manifest into its target framework's
 *     tool/agent-card representation.
 *   - Each adapter's invoke shim produces a valid OAP Request Envelope and
 *     receives a valid OAP Response Envelope from the live Reference Server.
 *
 * Used by CI in oap-spec/.github/workflows/release.yml.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Boot the reference server on an ephemeral port with a temp DB/key.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oap-adapters-'));
process.env.OAP_DB_PATH = path.join(TMP, 'smoke.db');
process.env.OAP_SIGNING_KEY_PEM = path.join(TMP, 'smoke-key.pem');
process.env.PORT = '0';

const refApp = require('../../reference/server/server.js');

const mcp = require('../mcp/oap-mcp-adapter.js');
const a2a = require('../a2a/oap-a2a-adapter.js');
const openai = require('../openai-functions/oap-openai-adapter.js');
const lang = require('../langgraph/oap-langgraph-adapter.js');

let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log(`  ok  ${name}`);
  else { console.log(`  FAIL ${name} :: ${detail || ''}`); failed++; }
}

async function postEnvelope(invokeUrl, envelope) {
  const r = await fetch(invokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/oap+json' },
    body: JSON.stringify(envelope),
  });
  return { status: r.status, body: await r.json() };
}

async function run() {
  const server = refApp.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const manifest = await (await fetch(`${base}/.well-known/oap-tool.json`)).json();
    // Adapters dispatch to manifest.endpoints.invoke verbatim. Patch to absolute URL.
    manifest.endpoints = Object.fromEntries(
      Object.entries(manifest.endpoints).map(([k, v]) =>
        [k, v.startsWith('http') ? v : `${base}${v}`]
      )
    );

    const identity = { principalDid: 'did:plc:adapter_smoke', agentDid: 'did:assistnet:adapter_smoke' };

    // ─── MCP ────────────────────────────────────────────────────────────────
    console.log('## MCP');
    const mcpTools = mcp.oapManifestToMcpTools(manifest);
    ok('mcp: tools list mirrors actions', mcpTools.length === manifest.actions.length);
    ok('mcp: each tool has name+inputSchema', mcpTools.every((t) => t.name && t.inputSchema));

    const mcpEcho = await mcp.handleMcpToolCall({
      manifest, actionId: 'echo', input: { hi: 'mcp' }, identity, fetch: globalThis.fetch,
    });
    ok('mcp: echo via handleMcpToolCall returns OAP success',
       mcpEcho && mcpEcho.status === 'success' && mcpEcho.output && mcpEcho.output.echo && mcpEcho.output.echo.hi === 'mcp');

    const oapFromMcp = mcp.mcpToolToOapAction({ name: 'do_thing', description: 'Does it.', inputSchema: { type: 'object' } });
    ok('mcp: mcpToolToOapAction produces well-shaped Action',
       oapFromMcp.id === 'do_thing' && oapFromMcp.input_schema && oapFromMcp.output_schema);

    // ─── A2A ────────────────────────────────────────────────────────────────
    console.log('## A2A');
    const card = a2a.oapManifestToAgentCard(manifest, `${base}/a2a/tasks`);
    ok('a2a: agent card has skills array', Array.isArray(card.skills) && card.skills.length === manifest.actions.length);
    ok('a2a: agent card declares card protocol fields', !!card.name && !!card.url && !!card.version);

    const a2aEnvelope = a2a.a2aTaskToOapRequest(
      { id: 'task_1', skill: 'echo', message: { parts: [{ type: 'application/json', data: { hi: 'a2a' } }] } },
      identity,
      'echo'
    );
    ok('a2a: a2aTaskToOapRequest emits OAP envelope',
       a2aEnvelope.oap_version === '1.0' && a2aEnvelope.action === 'echo' && a2aEnvelope.input && a2aEnvelope.input.hi === 'a2a');

    // Round-trip the resulting envelope through the live reference server,
    // then map the OAP response back into an A2A task result.
    const a2aLive = await postEnvelope(manifest.endpoints.invoke, a2aEnvelope);
    const a2aTaskResult = a2a.oapResponseToA2aTask({ ...a2aLive.body, status: a2aLive.body.status === 'success' ? 'ok' : a2aLive.body.status }, 'task_1');
    ok('a2a: oapResponseToA2aTask emits completed task with artifact',
       a2aTaskResult.status && a2aTaskResult.status.state === 'completed'
       && Array.isArray(a2aTaskResult.artifacts) && a2aTaskResult.artifacts.length === 1);

    // ─── OpenAI Functions ───────────────────────────────────────────────────
    console.log('## OpenAI Functions');
    const oaiTools = openai.oapManifestToOpenAiTools(manifest);
    ok('openai: tools array has type=function entries',
       oaiTools.length === manifest.actions.length && oaiTools.every((t) => t.type === 'function' && t.function && t.function.name));

    const oaiResp = await openai.handleOpenAiToolCall({
      toolCall: { id: 'call_1', function: { name: 'echo', arguments: JSON.stringify({ hi: 'openai' }) } },
      manifest, identity, fetch: globalThis.fetch,
    });
    ok('openai: handleOpenAiToolCall returns role=tool message',
       oaiResp && oaiResp.role === 'tool' && oaiResp.tool_call_id === 'call_1' && typeof oaiResp.content === 'string');
    const parsedOai = JSON.parse(oaiResp.content);
    ok('openai: tool message content carries OAP output',
       parsedOai && parsedOai.echo && parsedOai.echo.hi === 'openai');

    const oapFromOai = openai.openAiFunctionToOapAction({
      name: 'lookup', description: 'Lookup a thing.', parameters: { type: 'object', properties: { q: { type: 'string' } } },
    });
    ok('openai: openAiFunctionToOapAction produces well-shaped Action',
       oapFromOai.id === 'lookup' && oapFromOai.input_schema && oapFromOai.output_schema);

    // ─── LangGraph / LangChain ──────────────────────────────────────────────
    console.log('## LangGraph');
    const lcTools = lang.oapManifestToLangChainTools({ manifest, identity, fetch: globalThis.fetch });
    ok('langgraph: tools array length matches Actions', lcTools.length === manifest.actions.length);
    ok('langgraph: each tool has name+description+func', lcTools.every((t) => t.name && t.description && typeof t.func === 'function'));

    const echoTool = lcTools.find((t) => t.name === 'echo');
    const lcResultRaw = await echoTool.func({ hi: 'lang' });
    const lcOutput = typeof lcResultRaw === 'string' ? JSON.parse(lcResultRaw) : lcResultRaw;
    const echoVal = lcOutput && (lcOutput.echo || (lcOutput.output && lcOutput.output.echo));
    ok('langgraph: func returns OAP output',
       echoVal && echoVal.hi === 'lang',
       'received: ' + JSON.stringify(lcOutput).slice(0, 200));

  } finally {
    server.close();
  }

  console.log('---');
  console.log(failed === 0 ? 'PASS (adapters smoke)' : `FAIL ${failed} check(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(2); });
