/**
 * @oap-test
 * @levels L5
 * @rfcs RFC-0019 (Conformance Receipt), RFC-0027 (Registry Anchor)
 * @category behavior
 * @description Verifies that L5 implementations anchor their Conformance
 *   Receipt in a public Git registry: registry_anchor must include a
 *   repo_url, a 40-character commit_sha, and a file_path, and the commit
 *   must be reachable. Skipped when the implementation does not claim L5.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

function isShaHex40(s) {
  return typeof s === 'string' && /^[0-9a-f]{40}$/i.test(s);
}

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5'])) {
    rec('registry-anchor-not-applicable', true, 'Implementation does not claim L5.');
    return RESULTS;
  }

  const anchor = receipt.registry_anchor;
  rec('registry-anchor-block-present', !!anchor && typeof anchor === 'object',
    anchor ? null : 'receipt.registry_anchor missing (RFC 0027 section 3)');
  if (!anchor) return RESULTS;

  rec('registry-anchor-repo-url-present',
    typeof anchor.repo_url === 'string' && /^https?:\/\//.test(anchor.repo_url),
    anchor.repo_url ? null : 'repo_url missing or not http(s)');

  rec('registry-anchor-commit-sha-shape', isShaHex40(anchor.commit_sha),
    isShaHex40(anchor.commit_sha) ? null : `commit_sha must be 40 hex chars, got ${JSON.stringify(anchor.commit_sha)}`);

  rec('registry-anchor-file-path-present',
    typeof anchor.file_path === 'string' && anchor.file_path.length > 0,
    anchor.file_path ? null : 'file_path missing');

  if (typeof anchor.repo_url === 'string' && isShaHex40(anchor.commit_sha)) {
    // Best-effort reachability check via the GitHub commit URL.
    const isGithub = /github\.com\//i.test(anchor.repo_url);
    if (isGithub) {
      const commitUrl = `${anchor.repo_url.replace(/\/$/, '')}/commit/${anchor.commit_sha}`;
      let status = null;
      try {
        const r = await fetch(commitUrl, { method: 'HEAD' });
        status = r.status;
        rec('registry-anchor-commit-reachable', r.status < 400, r.status < 400 ? null : `HTTP ${status}`);
      } catch (err) {
        rec('registry-anchor-commit-reachable', false, err.message);
      }
    }
  }

  return RESULTS;
}

module.exports = { run };
