'use strict';

/**
 * Custom Fallback Policy template (RFC 0027 section 3.4a).
 *
 * Implementers MUST publish their own assumptions and a citation to a
 * peer-reviewed or preprint description in the Manifest field
 * `aht_fallback_policy.policy_ref`.
 *
 * The skeleton below documents the contract; the no-op default returns a
 * sentinel action that implementers replace.
 */

function policy(history, posterior) {
  return {
    kind: 'custom_no_op',
    note: 'Replace with implementer-defined policy. See RFC 0027 section 3.4a.',
    history_len: (history || []).length,
    posterior_size: Object.keys(posterior || {}).length,
  };
}

module.exports = {
  policyClass: 'Custom',
  assumptions: ['implementer_defined'],
  policy,
};
