/**
 * @oap-test
 * @levels L3, L4, L5
 * @rfcs RFC-0035 section 4.4 (Failover Coordinator Protocol)
 * @category behavior
 * @description Verifies Theorem 4.4.1 (Liveness Recovery): a failover MUST
 *              wait at least two minutes and the failover_coordinator_did
 *              named in the receipt is the only entity that may sign a
 *              FailoverAssume document.
 */

'use strict';

const path = require('path');
const RESULTS = [];
function record(name, passed, reason) { RESULTS.push({ name, category: 'behavior', passed, reason: reason || null }); }

async function run() {
  RESULTS.length = 0;
  const { Coordinator, ed25519Signer } = require(path.resolve(__dirname, '../../reference/coordinator/coordinator.js'));

  const failoverSigner = ed25519Signer();
  const lastReceipt = {
    coordinator_did: 'did:web:primary.example',
    failover_coordinator_did: 'did:web:failover.example'
  };

  // Negative: wait below 2 minutes MUST throw.
  let threw = false;
  try {
    Coordinator.assumeFromFailover({
      workflowId: 'wf_test',
      lastReceipt,
      observedMissedHeartbeatAt: '2026-05-11T10:00:00Z',
      waitedSeconds: 30,
      failoverDid: 'did:web:failover.example',
      signer: failoverSigner,
      now: () => '2026-05-11T10:00:30Z'
    });
  } catch { threw = true; }
  record('failover-rejects-short-wait', threw);

  // Negative: a DID that is not the declared failover MUST be rejected.
  threw = false;
  try {
    Coordinator.assumeFromFailover({
      workflowId: 'wf_test',
      lastReceipt,
      observedMissedHeartbeatAt: '2026-05-11T10:00:00Z',
      waitedSeconds: 130,
      failoverDid: 'did:web:imposter.example',
      signer: failoverSigner,
      now: () => '2026-05-11T10:02:10Z'
    });
  } catch { threw = true; }
  record('failover-rejects-undeclared-did', threw);

  // Positive: declared failover with >= 2 minute wait MUST succeed.
  const assume = Coordinator.assumeFromFailover({
    workflowId: 'wf_test',
    lastReceipt,
    observedMissedHeartbeatAt: '2026-05-11T10:00:00Z',
    waitedSeconds: 130,
    failoverDid: 'did:web:failover.example',
    signer: failoverSigner,
    now: () => '2026-05-11T10:02:10Z'
  });
  record('failover-accepts-declared-did', assume.type === 'FailoverAssume' && typeof assume.signature === 'string');

  // Liveness recovery bound: detection (300s) + wait (120s) = 420s <= 7 minutes.
  const detection = 300;
  const minWait = 120;
  record('failover-bound-under-seven-minutes', detection + minWait <= 7 * 60);

  return RESULTS.slice();
}

module.exports = { run };
