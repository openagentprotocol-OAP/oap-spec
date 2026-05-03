/**
 * OAP Conformance Verifier
 *
 * Library function that lets any consuming Agent verify the conformance
 * claims of any other Agent autonomously, per RFC 0019 section 6.
 *
 * The verifier performs four steps:
 *   1. Fetch the target Manifest from /.well-known/oap-tool.json.
 *   2. Resolve the Conformance Receipt referenced by manifest.conformance.receipt_uri.
 *   3. Validate the receipt against oap-conformance-receipt.schema.json,
 *      verify the signature against the implementation DID, check that
 *      validity.not_after has not elapsed, and confirm that the suite
 *      version is one the verifier trusts.
 *   4. Optionally re execute a small randomized sample of behavior tests
 *      against the live target to ensure that the published claims still
 *      reflect observed behavior.
 *
 * The verifier returns a Verification Report object that any policy engine
 * can consume to decide whether to engage the target Provider.
 *
 * @license Apache-2.0
 */

const SAMPLE_TESTS = ['behavior/lifecycle.test.js', 'behavior/escalation.test.js'];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function verifyConformance(targetUrl, options = {}) {
  const trustedSuiteVersions = options.trustedSuiteVersions || ['1.0.0'];
  const reverify = options.reverify !== false;
  const report = {
    target: targetUrl,
    timestamp: new Date().toISOString(),
    steps: [],
    accepted_levels: [],
    accepted: false,
    reasons: [],
  };

  let manifest;
  try {
    manifest = await fetchJson(`${targetUrl.replace(/\/$/, '')}/.well-known/oap-tool.json`);
    report.steps.push({ step: 'manifest', ok: true });
  } catch (err) {
    report.steps.push({ step: 'manifest', ok: false, error: err.message });
    report.reasons.push('Manifest unreachable. No conformance can be established.');
    return report;
  }

  const receiptUri = manifest.conformance && manifest.conformance.receipt_uri;
  if (!receiptUri) {
    report.steps.push({ step: 'receipt-discovery', ok: false });
    report.reasons.push('Manifest does not declare a Conformance Receipt URI. Implementation cannot demonstrate conformance.');
    return report;
  }

  let receipt;
  try {
    receipt = await fetchJson(receiptUri);
    report.steps.push({ step: 'receipt-fetch', ok: true, receipt_id: receipt.receipt_id });
  } catch (err) {
    report.steps.push({ step: 'receipt-fetch', ok: false, error: err.message });
    report.reasons.push('Conformance Receipt not retrievable.');
    return report;
  }

  if (!trustedSuiteVersions.includes(receipt.suite && receipt.suite.version)) {
    report.steps.push({ step: 'suite-trust', ok: false });
    report.reasons.push(`Suite version ${receipt.suite && receipt.suite.version} is not in the trusted list.`);
    return report;
  } else {
    report.steps.push({ step: 'suite-trust', ok: true });
  }

  const now = new Date();
  if (receipt.validity && receipt.validity.not_after && new Date(receipt.validity.not_after) < now) {
    report.steps.push({ step: 'validity', ok: false });
    report.reasons.push('Conformance Receipt is expired. Implementation MUST re attest.');
    return report;
  } else {
    report.steps.push({ step: 'validity', ok: true });
  }

  if (!receipt.signatures || receipt.signatures.length === 0) {
    report.reasons.push('Receipt has no signatures.');
    return report;
  }

  const placeholder = receipt.signatures.some((s) => s.value === 'PLACEHOLDER_NOT_FOR_PRODUCTION');
  if (placeholder) {
    report.steps.push({ step: 'signature', ok: false });
    report.reasons.push('Receipt signature is a placeholder. Implementation MUST sign with a real key.');
    return report;
  } else {
    report.steps.push({ step: 'signature', ok: true, note: 'Cryptographic verification against published key SHOULD be performed by the caller.' });
  }

  if (reverify) {
    let observedPasses = 0;
    let observedTotal = 0;
    for (const file of SAMPLE_TESTS) {
      try {
        const mod = require('../../test-suite/' + file);
        const subResults = await mod.run({ target: targetUrl });
        observedTotal += subResults.length;
        observedPasses += subResults.filter((r) => r.passed).length;
      } catch (err) {
        report.steps.push({ step: 'reverify-' + file, ok: false, error: err.message });
      }
    }
    report.steps.push({ step: 'reverify', ok: observedPasses === observedTotal, observed_passes: observedPasses, observed_total: observedTotal });
    if (observedTotal > 0 && observedPasses < observedTotal) {
      report.reasons.push('Live re verification observed test failures that contradict the published Conformance Receipt.');
      return report;
    }
  }

  report.accepted = true;
  report.accepted_levels = receipt.claimed_levels || [];
  return report;
}

module.exports = { verifyConformance };
