/**
 * Smoke test: verifies the website example actually works.
 * Run with: npm test
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { OapServer } from '../src/index.js';

test('OapServer: website example builds, serves, invokes, signs', async () => {
  // Mirrors the example shown on https://openagentprotocol.eu/sdks
  const server = new OapServer({
    did: 'did:web:tool.example',
    conformance: 'L1-NC',
    name: 'Test Tool',
  });

  server.action({
    id: 'create_task',
    intent: 'create a task with title and due date',
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, due: { type: 'string' } },
      required: ['title'],
    },
    outputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, title: { type: 'string' } },
      required: ['id', 'title'],
    },
    riskClass: 'low',
    sideEffects: 'write',
    handler: async ({ input }) => {
      const i = input as { title: string };
      return { id: `task_${Math.random().toString(36).slice(2, 10)}`, title: i.title };
    },
  });

  const handle = server.serve({ port: 8765 });

  try {
    // Manifest reachable
    const manifestRes = await fetch('http://127.0.0.1:8765/.well-known/oap-tool.json');
    assert.equal(manifestRes.status, 200);
    const manifest = (await manifestRes.json()) as Record<string, unknown>;
    assert.equal((manifest as any).oap_version, '1.0');
    assert.equal((manifest as any).conformance.level, 'L1-NC');
    assert.equal((manifest as any).actions.length, 1);
    assert.equal((manifest as any).actions[0].id, 'create_task');

    // DID document reachable
    const didRes = await fetch('http://127.0.0.1:8765/.well-known/did.json');
    assert.equal(didRes.status, 200);
    const did = (await didRes.json()) as any;
    assert.equal(did.id, 'did:web:tool.example');
    assert.equal(did.verificationMethod[0].publicKeyJwk.kty, 'OKP');

    // Invoke (write action -> requires Bearer)
    const invokeRes = await fetch('http://127.0.0.1:8765/oap/invoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' },
      body: JSON.stringify({
        oap_version: '1.0',
        request_id: 'req_smoke_1',
        principal_did: 'did:web:user.example',
        agent_did: 'did:web:agent.example',
        action: 'create_task',
        input: { title: 'Buy milk', due: '2026-12-01' },
      }),
    });
    assert.equal(invokeRes.status, 200);
    const invoke = (await invokeRes.json()) as any;
    assert.equal(invoke.status, 'success');
    assert.equal(invoke.output.title, 'Buy milk');
    assert.match(invoke.receipt_id, /^urn:oap:receipt:/);
    assert.match(invoke.receipt_hash, /^sha256:/);

    // Audit shows the receipt
    const auditRes = await fetch(
      'http://127.0.0.1:8765/oap/audit?principal_did=did:web:user.example',
    );
    const audit = (await auditRes.json()) as any;
    assert.equal(audit.receipts.length, 1);
    assert.equal(audit.receipts[0].action_id, 'create_task');
    assert.ok(audit.receipts[0].signatures[0].value.length > 50, 'signature is non-trivial');

    // Discover finds the action
    const discoverRes = await fetch('http://127.0.0.1:8765/oap/discover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'create task' }),
    });
    const discover = (await discoverRes.json()) as any;
    assert.ok(discover.matching_actions[0].confidence > 0.5);
    assert.equal(discover.matching_actions[0].id, 'create_task');

    // Subscribe
    const subRes = await fetch('http://127.0.0.1:8765/oap/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ principal_did: 'did:web:user.example', tier: 'free' }),
    });
    const sub = (await subRes.json()) as any;
    assert.equal(sub.status, 'active');
    assert.match(sub.subscription_token, /^oap_sub_live_/);

    // Conformance receipt
    const confRes = await fetch('http://127.0.0.1:8765/oap/conformance-receipt');
    const conf = (await confRes.json()) as any;
    assert.equal(conf.claimed_levels[0], 'L1-NC');
    assert.equal(conf.profile, 'non-commercial');

    // GDPR delete returns signed receipt
    const delRes = await fetch('http://127.0.0.1:8765/oap/data/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ principal_did: 'did:web:user.example' }),
    });
    const del = (await delRes.json()) as any;
    assert.equal(del.method, 'cryptographic_erasure');
    assert.ok(del.signature.value.length > 50);
    // 2 receipts for this principal: invoke + subscription
    assert.equal(del._diagnostics.receipts_deleted, 2);
  } finally {
    await handle.close();
  }
});

test('OapServer: rejects invalid conformance level', () => {
  assert.throws(
    () =>
      new OapServer({
        did: 'did:web:tool.example',
        conformance: 'L99' as any,
      }),
    /conformance must be one of/,
  );
});

test('OapServer: rejects missing DID', () => {
  assert.throws(
    () =>
      new OapServer({
        did: '',
        conformance: 'L1-NC',
      }),
    /did is required/,
  );
});

test('OapServer: invoke without auth on write action returns 401', async () => {
  const server = new OapServer({
    did: 'did:web:tool.example',
    conformance: 'L1-NC',
  });
  server.action({
    id: 'write_thing',
    sideEffects: 'write',
    handler: async () => ({ ok: true }),
  });
  const handle = server.serve({ port: 8766 });
  try {
    const res = await fetch('http://127.0.0.1:8766/oap/invoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        oap_version: '1.0',
        request_id: 'r1',
        principal_did: 'did:web:user.example',
        agent_did: 'did:web:agent.example',
        action: 'write_thing',
        input: {},
      }),
    });
    assert.equal(res.status, 401);
  } finally {
    await handle.close();
  }
});

test('OapServer: policy hook can deny', async () => {
  const server = new OapServer({
    did: 'did:web:tool.example',
    conformance: 'L1-NC',
    policy: ({ actionId }) => ({ allow: actionId !== 'forbidden', reason: 'test deny', rules: ['test.deny'] }),
  });
  server.action({ id: 'forbidden', handler: async () => ({}) });
  const handle = server.serve({ port: 8767 });
  try {
    const res = await fetch('http://127.0.0.1:8767/oap/invoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        oap_version: '1.0',
        request_id: 'r1',
        principal_did: 'did:web:user.example',
        agent_did: 'did:web:agent.example',
        action: 'forbidden',
        input: {},
      }),
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.equal(body.error.code, 'policy_denied');
    assert.match(body.receipt_id, /^urn:oap:receipt:/);
  } finally {
    await handle.close();
  }
});
