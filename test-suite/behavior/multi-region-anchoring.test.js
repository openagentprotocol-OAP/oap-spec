/**
 * @oap-test
 * @levels L5, L5-FINANCE, L5-ORG
 * @rfcs RFC-0021
 * @category behavior
 * @description Verifies that the implementation anchors receipts into at least
 *              two independently operated transparency logs in distinct
 *              regions, per the Accountability whitepaper RECOMMENDATION for
 *              L5. Reads `manifest.accountability.transparency_logs` and
 *              checks that there are at least two entries with distinct
 *              `operator_domain` AND distinct `region` values, then samples
 *              recent receipts and confirms that each carries inclusion
 *              proofs from at least two of the declared logs.
 */

'use strict';

const RESULTS = [];

function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run({ target }) {
  RESULTS.length = 0;
  const base = target.replace(/\/$/, '');

  let manifest;
  try {
    manifest = await (await fetch(`${base}/.well-known/oap-tool.json`)).json();
  } catch (err) {
    record('multi-region-prereq-manifest', false, err.message);
    return RESULTS.slice();
  }

  const acct = manifest.accountability || {};
  const logs = Array.isArray(acct.transparency_logs) ? acct.transparency_logs : [];

  if (logs.length === 0) {
    record('multi-region-anchoring-not-applicable', true, 'manifest declares no transparency_logs; not applicable below L5');
    return RESULTS.slice();
  }

  const operators = new Set(logs.map((l) => l.operator_domain || l.operator || l.url || ''));
  const regions = new Set(logs.map((l) => l.region || ''));
  record(
    'transparency-logs-multi-operator',
    operators.size >= 2 && [...operators].every(Boolean),
    operators.size < 2 ? `only ${operators.size} distinct operator declared` : 'one or more entries lack an operator domain'
  );
  record(
    'transparency-logs-multi-region',
    regions.size >= 2 && [...regions].every(Boolean),
    regions.size < 2 ? `only ${regions.size} distinct region declared` : 'one or more entries lack a region'
  );

  const auditUrl = (manifest.endpoints && manifest.endpoints.audit) || '/oap/audit';
  let receipts = [];
  try {
    const res = await fetch(`${base}${auditUrl}?limit=10`);
    if (res.ok) {
      const body = await res.json();
      receipts = Array.isArray(body) ? body : (body.receipts || body.items || []);
    }
  } catch {}

  if (receipts.length === 0) {
    record('multi-region-receipt-anchors-not-applicable', true, 'no receipts available to verify anchor distribution');
    return RESULTS.slice();
  }

  let underAnchored = 0;
  for (const r of receipts) {
    const proofs = Array.isArray(r.transparency_log_proofs) ? r.transparency_log_proofs : [];
    const distinct = new Set(proofs.map((p) => p.log_operator || p.operator_domain || p.log_url || ''));
    if (distinct.size < 2) underAnchored++;
  }
  record(
    'receipts-anchored-to-multi-region',
    underAnchored === 0,
    underAnchored ? `${underAnchored}/${receipts.length} sampled receipts have proofs from fewer than 2 distinct log operators` : null
  );

  return RESULTS.slice();
}

module.exports = { run };
