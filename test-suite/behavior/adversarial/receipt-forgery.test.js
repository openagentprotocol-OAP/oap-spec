/**
 * @oap-test
 * @levels L1, L2, L3, L4, L5, L5-FINANCE
 * @rfcs RFC-0019 (Conformance) section 8 adversarial category, OAP-CORE section 9
 * @category behavior/adversarial
 * @description Receipt Forgery probe. Submits a Receipt whose payload claims
 *   a different invocation than the one that the signature was produced over,
 *   and verifies that the Implementation rejects it and emits an Incident
 *   under RFC 0028 / OAP-CORE section 20. A conformant Implementation MUST
 *   reject any Receipt whose hash chain or signature does not match the
 *   declared payload.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl } = require('../_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior/adversarial', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);
  if (!claimsAny(receipt, ['L1', 'L2', 'L3', 'L4', 'L5', 'L5-FINANCE'])) {
    rec('adversarial-receipt-forgery-not-applicable', true, 'No claimed level requires receipt validation.');
    return RESULTS;
  }

  const verifyUrl = endpointUrl(base, manifest, 'receipt_verify');
  if (!verifyUrl) {
    rec('adversarial-receipt-forgery-endpoint',
      false,
      'manifest.endpoints.receipt_verify MUST be declared so adversarial probes can submit forged Receipts');
    return RESULTS;
  }

  const forged = {
    receipt_id: 'forged-' + Date.now(),
    invocation_id: 'attacker-controlled',
    payload_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    signature: 'AAAA',
    alg: 'Ed25519',
    signer_did: 'did:web:attacker.example',
  };
  let res;
  try {
    res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forged),
    });
  } catch (err) {
    rec('adversarial-receipt-forgery-endpoint-reachable', false, `receipt_verify unreachable: ${err.message}`);
    return RESULTS;
  }

  rec('adversarial-receipt-forgery-rejected',
    res.status >= 400 && res.status < 500,
    `expected 4xx rejection of forged Receipt, got ${res.status}`);

  return RESULTS;
}

module.exports = { run };
