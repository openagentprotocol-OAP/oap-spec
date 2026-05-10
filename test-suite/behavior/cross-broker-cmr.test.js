/**
 * @oap-test
 * @levels L3, L4, L5
 * @rfcs RFC-0035 section 4.2 and section 6 (Soundness Theorem)
 * @category behavior
 * @description Verifies the three Cross Match Receipt invariants of RFC 0035:
 *              CMR.1 hash chain soundness, CMR.2 temporal envelope, CMR.3
 *              constraint closure. Each invariant is exercised in both the
 *              passing and the failing direction so the verifier accepts only
 *              the sound case and rejects every defect.
 */

'use strict';

const path = require('path');
const RESULTS = [];
function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run() {
  RESULTS.length = 0;
  let mod;
  try {
    mod = require(path.resolve(__dirname, '../../reference/coordinator/coordinator.js'));
  } catch (err) {
    record('cross-broker-cmr-module-loadable', false, err.message);
    return RESULTS.slice();
  }
  record('cross-broker-cmr-module-loadable', true);

  const { Coordinator, inMemoryAdapters, ed25519Signer, verifyCrossMatchReceipt, segmentHash } = mod;

  const profiles = {
    'did:web:id.example':       { broker_category: 'identity_issuer', declared_conformance: 'M3' },
    'did:web:re.example':       { broker_category: 'real_estate',     declared_conformance: 'M2' },
    'did:web:fin.example':      { broker_category: 'finance',         declared_conformance: 'M2' },
    'did:web:legal.example':    { broker_category: 'legal',           declared_conformance: 'M2' }
  };

  const manifest = {
    workflow_manifest_id: 'wfm_01HZA1B2C3D4E5F6G7H8J9K0L1',
    workflow_type: 'real_estate_purchase_de_v1',
    version: '1.0.0',
    publisher: 'did:web:publisher.example',
    issued_at: '2026-05-11T10:00:00Z',
    expires_at: '2027-05-11T10:00:00Z',
    roles: [
      { role_id: 'identity',    broker_category: 'identity_issuer', required: true, min_conformance: 'M3' },
      { role_id: 'real_estate', broker_category: 'real_estate',     required: true, min_conformance: 'M2' },
      { role_id: 'finance',     broker_category: 'finance',         required: true, min_conformance: 'M2' },
      { role_id: 'legal',       broker_category: 'legal',           required: true, min_conformance: 'M2' }
    ],
    consistency_constraints: [
      { constraint_id: 'jurisdiction_alignment', predicate: "equals(all_segments.jurisdiction, 'DE')" },
      { constraint_id: 'financing_sufficiency',  predicate: "at_least(segments.finance.approved_amount, segments.real_estate.purchase_price)" }
    ],
    max_total_duration_seconds: 7776000,
    revocation_propagation_floor_seconds: 60,
    coordinator_requirements: { min_independent_heartbeat_paths: 2, failover_required: true, audit_log_retention_seconds: 315360000 }
  };

  const adapters = inMemoryAdapters({ profiles });
  const signer = ed25519Signer();
  const c = new Coordinator({
    coordinatorDid: 'did:web:coordinator.example',
    failoverDid: 'did:web:failover.example',
    broker: adapters.broker,
    registry: adapters.registry,
    signer
  });

  let workflowId;
  try {
    workflowId = await c.openWorkflow({
      manifest,
      initiatorDid: 'did:web:buyer.example',
      selectedBrokers: {
        identity: 'did:web:id.example',
        real_estate: 'did:web:re.example',
        finance: 'did:web:fin.example',
        legal: 'did:web:legal.example'
      }
    });
    record('cmr-open-passes-admissibility', true);
  } catch (err) {
    record('cmr-open-passes-admissibility', false, err.message);
    return RESULTS.slice();
  }

  function mkSegment(role, broker, expiresAt, payload, attestations) {
    return {
      role_id: role,
      broker_did: broker,
      match_receipt_hash: 'sha256:' + 'a'.repeat(64),
      broker_tree_head: 'sha256:' + 'b'.repeat(64),
      inclusion_proof: 'merkle:00',
      segment_signature: 'ed25519:partsig',
      issued_at: '2026-05-11T10:00:00Z',
      expires_at: expiresAt,
      payload,
      attestations: attestations || []
    };
  }

  await c.ingestSegment(workflowId, mkSegment('identity', 'did:web:id.example', '2026-08-09T10:00:00Z', { jurisdiction: 'DE', subject_did: 'did:web:buyer.example' }));
  await c.ingestSegment(workflowId, mkSegment('real_estate', 'did:web:re.example', '2026-08-09T10:00:00Z', { jurisdiction: 'DE', purchase_price: 780000 }));
  await c.ingestSegment(workflowId, mkSegment('finance', 'did:web:fin.example', '2026-07-11T11:30:00Z', { jurisdiction: 'DE', approved_amount: 850000 }));
  await c.ingestSegment(workflowId, mkSegment('legal', 'did:web:legal.example', '2026-08-09T14:00:00Z', { jurisdiction: 'DE' }));

  const receipt = c.buildCrossMatchReceipt(workflowId);

  const v1 = verifyCrossMatchReceipt(receipt, '2026-05-11T15:00:00Z');
  record('cmr-soundness-baseline', v1.ok, v1.errors.join('; '));

  // CMR.1 violation: tamper with prev_segment_hash of segment 2.
  const tampered = JSON.parse(JSON.stringify(receipt));
  tampered.segments[2].prev_segment_hash = 'sha256:' + '0'.repeat(64);
  const v2 = verifyCrossMatchReceipt(tampered, '2026-05-11T15:00:00Z');
  record('cmr1-hash-chain-detects-tamper', !v2.ok && v2.errors.some(e => e.startsWith('CMR.1')),
    v2.errors.join('; '));

  // CMR.2 violation: observation after effective_expires_at.
  const v3 = verifyCrossMatchReceipt(receipt, '2026-09-01T00:00:00Z');
  record('cmr2-temporal-envelope-rejects-expired', !v3.ok && v3.errors.some(e => e.includes('CMR.2')),
    v3.errors.join('; '));

  // CMR.2 effective_expires_at must equal min over segments
  const minExpires = receipt.segments.reduce((m, s) =>
    !m || new Date(s.expires_at) < new Date(m) ? s.expires_at : m, null);
  record('cmr2-effective-equals-min', receipt.effective_expires_at === minExpires,
    `${receipt.effective_expires_at} vs ${minExpires}`);

  // CMR.3 violation: financing insufficient.
  const badAdapters = inMemoryAdapters({ profiles });
  const c2 = new Coordinator({
    coordinatorDid: 'did:web:coordinator.example',
    failoverDid: 'did:web:failover.example',
    broker: badAdapters.broker,
    registry: badAdapters.registry,
    signer
  });
  const wf2 = await c2.openWorkflow({
    manifest,
    initiatorDid: 'did:web:buyer.example',
    selectedBrokers: {
      identity: 'did:web:id.example', real_estate: 'did:web:re.example',
      finance: 'did:web:fin.example', legal: 'did:web:legal.example'
    }
  });
  await c2.ingestSegment(wf2, mkSegment('identity', 'did:web:id.example', '2026-08-09T10:00:00Z', { jurisdiction: 'DE', subject_did: 'did:web:buyer.example' }));
  await c2.ingestSegment(wf2, mkSegment('real_estate', 'did:web:re.example', '2026-08-09T10:00:00Z', { jurisdiction: 'DE', purchase_price: 780000 }));
  await c2.ingestSegment(wf2, mkSegment('finance', 'did:web:fin.example', '2026-07-11T11:30:00Z', { jurisdiction: 'DE', approved_amount: 500000 })); // INSUFFICIENT
  await c2.ingestSegment(wf2, mkSegment('legal', 'did:web:legal.example', '2026-08-09T14:00:00Z', { jurisdiction: 'DE' }));
  const r2 = c2.buildCrossMatchReceipt(wf2);
  const v4 = verifyCrossMatchReceipt(r2, '2026-05-11T15:00:00Z');
  record('cmr3-constraint-rejects-underfunded',
    !v4.ok && v4.errors.some(e => e.includes('financing_sufficiency')),
    v4.errors.join('; '));

  // Revocation flow: workflow_invalidating event drives state to Invalidated.
  c.handleRevocation(workflowId, {
    event_type: 'revoked',
    revocation_reason_code: 'key_compromise',
    consequence_class: 'workflow_invalidating',
    effective_at: '2026-06-12T09:00:00Z'
  });
  const w = c.workflows.get(workflowId);
  record('cmr-revocation-drives-invalidated', w.state === 'Invalidated', `state ${w.state}`);

  return RESULTS.slice();
}

module.exports = { run };
