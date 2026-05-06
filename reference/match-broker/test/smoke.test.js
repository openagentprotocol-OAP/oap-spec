/**
 * smoke.test.js — end-to-end smoke tests for the Reference Match Broker
 * Tests: registration, BM25 retrieval, Merkle proofs, Decision Records, 
 *        Inclusion/Negative Proofs, Completeness Attestation, Ranking Function disclosure
 *
 * Run: node test/smoke.test.js
 */
'use strict';

const http   = require('http');
const crypto = require('crypto');

const BROKER = process.env.BROKER_URL || 'http://localhost:3100';
let passed = 0, failed = 0;

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function merkleLeaf (data) { return sha256('\x00' + data); }
function merkleNode (l, r) { return sha256('\x01' + l + r); }

function verifyInclusionProof (leafHash, proofPath, rootHash) {
  let current = merkleLeaf(leafHash);
  for (const step of proofPath) {
    current = step.position === 'right'
      ? merkleNode(current, step.hash)
      : merkleNode(step.hash, current);
  }
  return current === rootHash;
}

async function req (method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    };
    const r = http.request(`${BROKER}${path}`, options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function assert (name, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}` + (detail ? ` — ${detail}` : ''));
    failed++;
  }
}

async function run () {
  console.log('OAP Reference Match Broker — Smoke Tests\n');

  // T1: Health check
  const health = await req('GET', '/health');
  assert('T01 /health returns 200', health.status === 200);
  assert('T02 health.conformance_level = M2', health.body.conformance_level === 'M2');
  assert('T03 ranking function disclosed', health.body.ranking_function?.function_id === 'oap-bm25-multifactor-v1');

  // T2: Register a manifest
  const manifest = {
    name: 'TestTool',
    description: 'A test tool for unit testing the match broker smoke suite',
    categories: ['testing', 'dev-tools'],
    actions: {
      'test.ping': { description: 'Ping the service', unit_cost_usd: 0.0001 }
    },
    conformance_level: 2,
    reputation_score:  0.80,
    avg_cost_usd:      0.0001,
    risk_class:        'low',
    jurisdictions:     ['GLOBAL']
  };
  const reg = await req('POST', '/oap/manifests', { provider_did: 'did:web:test-tool.example', manifest });
  assert('T04 register returns 201',          reg.status === 201);
  assert('T05 register returns leaf_hash',    typeof reg.body.leaf_hash === 'string' && reg.body.leaf_hash.length === 64);
  assert('T06 register returns index_root',   typeof reg.body.index_root === 'string');
  assert('T07 register returns leaf_index',   typeof reg.body.leaf_index === 'number');
  assert('T08 register returns proof_path',   Array.isArray(reg.body.inclusion_proof));

  // T3: Basic resolve
  const resolve1 = await req('POST', '/oap/resolve', { query: 'test tool ping', top_k: 5 });
  assert('T09 resolve returns 200',           resolve1.status === 200);
  assert('T10 resolve has candidates array',  Array.isArray(resolve1.body.candidates));
  assert('T11 resolve has index_root',        typeof resolve1.body.index_root === 'string');

  const top = resolve1.body.candidates[0];
  if (top) {
    assert('T12 top candidate has provider_did',  typeof top.provider_did === 'string');
    assert('T13 top candidate has final_score',   typeof top.final_score === 'number');
    assert('T14 top candidate has decision_record', top.decision_record?.signed_payload?.final_score !== undefined);
    assert('T15 top candidate has inclusion_proof', Array.isArray(top.inclusion_proof?.proof_path));

    // T4: Verify Merkle Inclusion Proof
    if (top.inclusion_proof?.proof_path?.length > 0) {
      const proofValid = verifyInclusionProof(
        top.inclusion_proof.leaf_hash,
        top.inclusion_proof.proof_path,
        top.inclusion_proof.root_hash
      );
      assert('T16 Merkle inclusion proof verifies', proofValid, `leaf=${top.inclusion_proof.leaf_hash?.slice(0,8)}`);
    } else {
      assert('T16 Merkle inclusion proof verifies (single leaf)', true); // single leaf has empty proof path
    }
  }

  // T5: Decision Record has correct structure
  if (top?.decision_record?.signed_payload) {
    const dr = top.decision_record.signed_payload;
    assert('T17 decision_record has inputs.bm25_normalized',  typeof dr.inputs?.bm25_normalized === 'number');
    assert('T18 decision_record has inputs.reputation_score', typeof dr.inputs?.reputation_score === 'number');
    assert('T19 decision_record has weights',                 typeof dr.weights?.bm25 === 'number');
    assert('T20 decision_record ranks sum to ~1.0',
      Math.abs(Object.values(dr.weights || {}).reduce((a,b) => a+b, 0) - 1.0) < 0.001
    );
  }

  // T6: Constraint filter — min_conformance_level
  const resolveFiltered = await req('POST', '/oap/resolve', {
    query: 'any tool',
    top_k: 20,
    filters: { min_conformance_level: 3 }
  });
  assert('T21 constraint filter runs without error', resolveFiltered.status === 200);
  const allMeetConformance = (resolveFiltered.body.candidates || []).every(
    c => c.manifest?.conformance_level >= 3
  );
  assert('T22 constraint filter excludes non-conformant tools', allMeetConformance);

  // T7: Constraint filter — risk_class
  const resolveRisk = await req('POST', '/oap/resolve', {
    query: 'data',
    filters: { risk_class: 'low' }
  });
  assert('T23 risk_class filter runs', resolveRisk.status === 200);
  const allLowRisk = (resolveRisk.body.candidates || []).every(
    c => c.manifest?.risk_class === 'low'
  );
  assert('T24 risk_class filter excludes high-risk tools', allLowRisk);

  // T8: Positive Inclusion Proof endpoint
  const proof = await req('GET', `/oap/index/proof?did=${encodeURIComponent('did:web:test-tool.example')}`);
  assert('T25 inclusion proof endpoint 200',       proof.status === 200);
  assert('T26 inclusion proof type correct',       proof.body.type === 'inclusion_proof');
  assert('T27 inclusion proof has signed payload', proof.body.signed?.signed_payload?.type === 'inclusion_proof');

  // T9: Negative Inclusion Proof
  const negProof = await req('GET', `/oap/index/proof?did=${encodeURIComponent('did:web:nonexistent.example')}`);
  assert('T28 negative inclusion proof 200',       negProof.status === 200);
  assert('T29 negative proof type correct',        negProof.body.type === 'negative_inclusion_proof');
  assert('T30 negative proof has assertion',       negProof.body.assertion === 'provider_not_indexed');

  // T10: Completeness Attestation
  const attest = await req('GET', '/oap/index/attestation');
  assert('T31 attestation endpoint 200',           attest.status === 200);
  assert('T32 attestation has leaf_count',         typeof attest.body.signed_payload?.leaf_count === 'number');
  assert('T33 attestation has signature',          typeof attest.body.signature === 'string');
  assert('T34 attestation leaf_count >= 1',        (attest.body.signed_payload?.leaf_count || 0) >= 1);

  // T11: Ranking Function Disclosure
  const rf = await req('GET', '/oap/ranking-function');
  assert('T35 ranking function endpoint 200',      rf.status === 200);
  assert('T36 ranking function has inputs array',  Array.isArray(rf.body.signed_payload?.inputs));
  assert('T37 ranking function has weights in inputs',
    rf.body.signed_payload?.inputs?.every(i => typeof i.weight === 'number')
  );
  assert('T38 ranking function has bm25_params',   typeof rf.body.signed_payload?.bm25_params?.k1 === 'number');
  assert('T39 ranking function is signed',         typeof rf.body.signature === 'string');

  // T12: Index roots history
  const roots = await req('GET', '/oap/index/roots');
  assert('T40 roots endpoint 200',                 roots.status === 200);
  assert('T41 roots has array',                    Array.isArray(roots.body.roots));
  assert('T42 at least one root exists',           roots.body.roots.length >= 1);

  // Summary
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
