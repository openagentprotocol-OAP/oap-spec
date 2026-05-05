/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy) section 3.6
 * @category behavior
 * @description Verifies that L5-FINANCE implementations declare a Disparate
 *   Impact Audit policy, enumerate the Protected Classes against which the
 *   audit is performed, and publish the most recent audit report URI plus
 *   audit cadence (RFC 0028 section 3.6 requires at least quarterly).
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, fetchJson } = require('./_helpers');

const QUARTER_MS = 1000 * 60 * 60 * 24 * 92;

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-FINANCE'])) {
    rec('disparate-impact-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const audit = manifest && manifest.model_risk && manifest.model_risk.disparate_impact_audit;
  rec('disparate-impact-audit-declared', !!audit,
    'L5-FINANCE manifests MUST declare model_risk.disparate_impact_audit per RFC 0028 section 3.6');
  if (!audit) return RESULTS;

  const classes = Array.isArray(audit.protected_classes) ? audit.protected_classes : [];
  rec('disparate-impact-protected-classes-present', classes.length > 0,
    'disparate_impact_audit.protected_classes MUST enumerate at least one Protected Class');

  const lastAudit = audit.last_audit_at ? Date.parse(audit.last_audit_at) : NaN;
  const fresh = !Number.isNaN(lastAudit) && (Date.now() - lastAudit) <= QUARTER_MS;
  rec('disparate-impact-audit-fresh', fresh,
    'last_audit_at MUST be within the last quarter (~92 days) per RFC 0028 section 3.6');

  if (audit.report_uri) {
    const report = await fetchJson(audit.report_uri);
    rec('disparate-impact-report-resolvable', report !== null,
      'report_uri MUST resolve to a fetchable JSON audit report');
  } else {
    rec('disparate-impact-report-uri-present', false,
      'disparate_impact_audit.report_uri MUST be declared');
  }

  return RESULTS;
}

module.exports = { run };
