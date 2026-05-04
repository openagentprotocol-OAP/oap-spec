/**
 * @oap-test
 * @levels L5
 * @rfcs RFC-0019 (Conformance Receipt), RFC-0026 (External Audit Attestation)
 * @category behavior
 * @description Verifies that L5 implementations carry an external audit
 *   attestation in their Conformance Receipt: framework, auditor_did,
 *   audit_report_uri (reachable), and a non-expired valid_until. Skipped
 *   when the implementation does not claim L5.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

const ALLOWED_FRAMEWORKS = new Set(['SOC2-Type-II', 'ISO-27001', 'ISO-42001', 'equivalent']);

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5'])) {
    rec('external-audit-attestation-not-applicable', true, 'Implementation does not claim L5.');
    return RESULTS;
  }

  const audit = receipt.external_audit;
  rec('external-audit-block-present', !!audit && typeof audit === 'object',
    audit ? null : 'receipt.external_audit missing (RFC 0026 section 4)');
  if (!audit) return RESULTS;

  rec('external-audit-framework-allowed', ALLOWED_FRAMEWORKS.has(audit.framework),
    `framework must be one of ${[...ALLOWED_FRAMEWORKS].join(', ')}`);

  rec('external-audit-auditor-did-present',
    typeof audit.auditor_did === 'string' && audit.auditor_did.startsWith('did:'),
    audit.auditor_did ? null : 'auditor_did missing or not a DID');

  const validUntil = audit.valid_until ? Date.parse(audit.valid_until) : NaN;
  rec('external-audit-not-expired', !Number.isNaN(validUntil) && validUntil > Date.now(),
    Number.isNaN(validUntil)
      ? 'valid_until missing or unparseable'
      : (validUntil > Date.now() ? null : `attestation expired at ${audit.valid_until}`));

  if (typeof audit.audit_report_uri === 'string' && audit.audit_report_uri.startsWith('http')) {
    let ok = false;
    let status = null;
    try {
      const r = await fetch(audit.audit_report_uri, { method: 'HEAD' });
      status = r.status;
      ok = r.status < 400;
    } catch (err) {
      rec('external-audit-report-uri-reachable', false, err.message);
    }
    if (status !== null) {
      rec('external-audit-report-uri-reachable', ok, ok ? null : `HTTP ${status}`);
    }
  } else {
    rec('external-audit-report-uri-present', false, 'audit_report_uri missing or not http(s)');
  }

  return RESULTS;
}

module.exports = { run };
