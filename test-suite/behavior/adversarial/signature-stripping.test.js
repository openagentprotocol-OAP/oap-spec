/**
 * @oap-test
 * @levels L1, L2, L3, L4, L5, L5-FINANCE
 * @rfcs RFC-0019 (Conformance) section 8 adversarial category, OAP-CORE section 9
 * @category behavior/adversarial
 * @description Signature Stripping probe. Submits a Receipt envelope whose
 *   `signature` field has been removed but whose other fields are otherwise
 *   well-formed, and verifies that the Implementation rejects it. A
 *   conformant verifier MUST NOT accept any Receipt whose signature is
 *   missing or empty, regardless of how plausible the payload appears.
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
    rec('adversarial-signature-stripping-not-applicable', true, 'No claimed level requires receipt validation.');
    return RESULTS;
  }

  const verifyUrl = endpointUrl(base, manifest, 'receipt_verify');
  if (!verifyUrl) {
    rec('adversarial-signature-stripping-endpoint', false, 'manifest.endpoints.receipt_verify MUST be declared');
    return RESULTS;
  }

  const stripped = {
    receipt_id: 'stripped-' + Date.now(),
    invocation_id: 'plausible-id',
    payload_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    alg: 'Ed25519',
    signer_did: 'did:web:plausible.example',
  };
  let res;
  try {
    res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stripped),
    });
  } catch (err) {
    rec('adversarial-signature-stripping-endpoint-reachable', false, `receipt_verify unreachable: ${err.message}`);
    return RESULTS;
  }

  rec('adversarial-signature-stripping-rejected',
    res.status >= 400 && res.status < 500,
    `expected 4xx rejection of unsigned Receipt, got ${res.status}`);

  return RESULTS;
}

module.exports = { run };
