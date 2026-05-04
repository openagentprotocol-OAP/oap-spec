/**
 * Smoke test for the OAP Reference Server.
 *
 * Boots the Express app on an ephemeral port, exercises every declared Action
 * (echo, compute_hash, store_note, request_cooling_off), then exercises the
 * audit, deletion, and discover endpoints. Verifies signed receipts are
 * Ed25519-verifiable against the published did.json.
 *
 * Used by CI in .github/workflows/release.yml.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Use a temp DB and key path so smoke runs do not pollute the working tree.
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'oap-ref-'));
process.env.OAP_DB_PATH = path.join(TMP, 'smoke.db');
process.env.OAP_SIGNING_KEY_PEM = path.join(TMP, 'smoke-key.pem');
process.env.PORT = '0'; // express picks ephemeral
process.env.TOOL_DOMAIN = 'localhost:0';

const app = require('../server.js');

let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log(`  ok  ${name}`);
  else { console.log(`  FAIL ${name} :: ${detail || ''}`); failed++; }
}

async function run() {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Manifest
    const manifest = await (await fetch(`${base}/.well-known/oap-tool.json`)).json();
    ok('manifest served', manifest.oap_version === '1.0');
    ok('manifest declares >= 4 actions', manifest.actions.length >= 4);
    ok('manifest declares conformance_receipt endpoint', !!manifest.endpoints.conformance_receipt);

    // 2. did.json
    const did = await (await fetch(`${base}/.well-known/did.json`)).json();
    ok('did.json id matches manifest', did.id === manifest.tool.did);
    ok('did.json has Ed25519 verification method',
       did.verificationMethod.some((v) => v.publicKeyJwk && v.publicKeyJwk.crv === 'Ed25519'));

    const publicJwk = did.verificationMethod[0].publicKeyJwk;
    const publicKey = crypto.createPublicKey({ key: publicJwk, format: 'jwk' });

    function canonicalize(obj) {
      if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
      if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
      const keys = Object.keys(obj).sort();
      return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
    }

    function makeUlid() {
      const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      let s = ''; for (let i = 0; i < 26; i++) s += A[Math.floor(Math.random() * 32)];
      return s;
    }

    async function invoke(action, input, opts = {}) {
      const r = await fetch(`${base}/oap/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/oap+json', ...(opts.headers || {}) },
        body: JSON.stringify({
          oap_version: '1.0', request_id: makeUlid(),
          principal_did: opts.principal || 'did:plc:smoke',
          agent_did: 'did:assistnet:smoke',
          action, input,
          context: { locale: 'en-US', currency: 'EUR', jurisdiction_user: 'DE', jurisdiction_agent: 'DE' },
          signature: { alg: 'EdDSA', kid: 'probe', value: 'probe' },
        }),
      });
      return { status: r.status, body: await r.json() };
    }

    // 3. Each action
    const echo = await invoke('echo', { hello: 'world' });
    ok('echo 200', echo.status === 200);
    ok('echo returns input', echo.body.output && echo.body.output.echo && echo.body.output.echo.hello === 'world');

    const hash = await invoke('compute_hash', { value: 'oap' });
    ok('compute_hash 200', hash.status === 200);
    ok('compute_hash returns sha256',
       hash.body.output && hash.body.output.digest_hex === crypto.createHash('sha256').update('oap').digest('hex'));

    // store_note requires Bearer auth
    const noteUnauthed = await invoke('store_note', { content: 'x' });
    ok('store_note rejects without Bearer', noteUnauthed.status === 401);
    const noteAuthed = await invoke('store_note', { content: 'reference smoke' }, { headers: { Authorization: 'Bearer smoke-token' } });
    ok('store_note accepts with Bearer', noteAuthed.status === 200);
    ok('store_note returns note_id', !!noteAuthed.body.output?.note_id);

    const cooling = await invoke('request_cooling_off', { for_action_id: 'echo' });
    ok('request_cooling_off 200', cooling.status === 200);
    ok('request_cooling_off returns wait_seconds', typeof cooling.body.output?.wait_seconds === 'number');

    // 4. Verify receipt signature
    const audit = await (await fetch(`${base}/oap/audit?principal_did=did:plc:smoke`)).json();
    ok('audit returns receipts', Array.isArray(audit.receipts) && audit.receipts.length >= 4);
    const sample = audit.receipts[0];
    const sig = sample.signatures[0];
    const sampleCore = { ...sample };
    delete sampleCore.signatures;
    delete sampleCore.self_hash;
    const verified = crypto.verify(null, Buffer.from(canonicalize(sampleCore)), publicKey, Buffer.from(sig.value, 'base64url'));
    ok('receipt signature verifies under did.json key', verified);

    // 5. Deletion
    const del = await (await fetch(`${base}/oap/data/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal_did: 'did:plc:smoke' }),
    })).json();
    ok('deletion receipt has urn:oap:deletion id', /^urn:oap:deletion:/.test(del.receipt_id));
    ok('deletion receipt is signed', del.signature && del.signature.alg === 'EdDSA');

    // 6. Discover
    const disc = await (await fetch(`${base}/oap/discover`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'echo something back' }),
    })).json();
    ok('discover returns matches', Array.isArray(disc.matching_actions) && disc.matching_actions.length === 4);

    // 7. Conformance receipt
    const cr = await (await fetch(`${base}/oap/conformance-receipt`)).json();
    ok('conformance receipt signed', cr.signatures && cr.signatures[0].alg === 'EdDSA');
    ok('conformance receipt claims L0+L1', JSON.stringify(cr.claimed_levels) === JSON.stringify(['L0', 'L1']));

  } finally {
    server.close();
  }

  console.log('---');
  console.log(failed === 0 ? `PASS (smoke)` : `FAIL ${failed} check(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(2); });
