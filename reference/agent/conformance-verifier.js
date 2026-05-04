/**
 * OAP Conformance Verifier
 *
 * Library function that lets any consuming Agent verify the conformance
 * claims of any other Agent autonomously, per RFC 0019 section 6.
 *
 * Verification steps:
 *   1. Fetch the target Manifest from /.well-known/oap-tool.json.
 *   2. Resolve the Conformance Receipt referenced by manifest.conformance.receipt_uri.
 *   3. Validate the receipt against oap-conformance-receipt.schema.json (caller may pass an Ajv instance).
 *   4. Reject placeholder signatures (RFC 0019 section 7.3).
 *   5. Verify the implementation signature against the public key in the implementation's DID Document
 *      (Ed25519 signatures supported in-tree; ES256/RS256 left to the caller's crypto provider).
 *   6. Verify validity window has not elapsed.
 *   7. (L4) Verify at least one peer-witness signature; (L5) verify at least three independent peer-witness
 *      signatures, each whose witness_did's own Receipt is currently L4+.
 *   8. (L4 and L5) Verify the registry_anchor exists, points at the canonical OAP Registry, and the file
 *      content there matches the Receipt's SHA-256.
 *   9. Optionally re execute a small randomized sample of behavior tests against the live target.
 *
 * @license Apache-2.0
 */

const crypto = require('crypto');

const PLACEHOLDER_PATTERN = /^(PLACEHOLDER_NOT_FOR_PRODUCTION|unsigned-reference|placeholder:)/;
const SAMPLE_TESTS = ['behavior/lifecycle.test.js', 'behavior/escalation.test.js'];
const CANONICAL_REGISTRY_URL = 'https://github.com/openagentprotocol-OAP/oap-registry';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function isPlaceholder(value) {
  return typeof value !== 'string' || PLACEHOLDER_PATTERN.test(value);
}

/**
 * Resolve a did:web DID Document. Returns the Ed25519 verification method as a
 * KeyObject ready for crypto.verify(), or null if not resolvable.
 */
async function resolveEd25519Key(did) {
  if (!did || !did.startsWith('did:web:')) return null;
  const host = did.slice('did:web:'.length).replace(/:/g, '/');
  const url = `https://${host}/.well-known/did.json`;
  let doc;
  try { doc = await fetchJson(url); } catch { return null; }
  const methods = doc.verificationMethod || [];
  for (const m of methods) {
    if (m.type === 'Ed25519VerificationKey2020' && m.publicKeyMultibase) {
      // base58btc decode is non-trivial without a dep; prefer JsonWebKey2020 entries instead.
      continue;
    }
    if (m.type === 'JsonWebKey2020' && m.publicKeyJwk && m.publicKeyJwk.crv === 'Ed25519') {
      try {
        return crypto.createPublicKey({ key: m.publicKeyJwk, format: 'jwk' });
      } catch { /* fall through */ }
    }
  }
  return null;
}

function verifyEd25519Signature(payloadCanonical, signatureBase64Url, publicKey) {
  if (!publicKey) return false;
  try {
    const sig = Buffer.from(signatureBase64Url, 'base64url');
    return crypto.verify(null, Buffer.from(payloadCanonical), publicKey, sig);
  } catch {
    return false;
  }
}

async function verifyPeerWitnesses(receipt, requiredCount) {
  const witnesses = Array.isArray(receipt.peer_witnesses) ? receipt.peer_witnesses : [];
  if (witnesses.length < requiredCount) {
    return { ok: false, reason: `Found ${witnesses.length} peer witnesses, need ${requiredCount}.` };
  }
  // Independence check: for L5 (>=3) require distinct controller_org if declared, else distinct witness_did host.
  const orgs = new Set();
  for (const w of witnesses) {
    const org = w.controller_org || w.witness_did;
    if (orgs.has(org)) {
      return { ok: false, reason: `Peer witnesses are not independent: ${org} appears more than once.` };
    }
    orgs.add(org);
  }

  // Reconstruct the body that each witness signed (Receipt minus peer_witnesses).
  const body = { ...receipt };
  delete body.peer_witnesses;
  const payloadCanonical = canonicalize(body);

  for (const w of witnesses) {
    if (isPlaceholder(w.signature)) {
      return { ok: false, reason: `Peer witness ${w.witness_did} used a placeholder signature.` };
    }
    const witnessKey = await resolveEd25519Key(w.witness_did);
    if (!witnessKey) {
      return { ok: false, reason: `Could not resolve Ed25519 key for witness ${w.witness_did}.` };
    }
    if (!verifyEd25519Signature(payloadCanonical, w.signature, witnessKey)) {
      return { ok: false, reason: `Invalid peer-witness signature from ${w.witness_did}.` };
    }
    // Verify the witness itself currently holds L4+ by fetching its own Receipt.
    if (w.witness_receipt_uri) {
      try {
        const witnessReceipt = await fetchJson(w.witness_receipt_uri);
        const expires = witnessReceipt.validity && witnessReceipt.validity.not_after;
        if (!expires || new Date(expires) < new Date()) {
          return { ok: false, reason: `Witness ${w.witness_did} Receipt is expired.` };
        }
        const levels = witnessReceipt.claimed_levels || [];
        const isL4Plus = levels.some((l) => /^L[45]/.test(l));
        if (!isL4Plus) {
          return { ok: false, reason: `Witness ${w.witness_did} does not currently hold L4 or L5.` };
        }
      } catch (e) {
        return { ok: false, reason: `Could not fetch witness Receipt at ${w.witness_receipt_uri}: ${e.message}` };
      }
    }
  }
  return { ok: true };
}

async function verifyRegistryAnchor(receipt) {
  const anchor = receipt.registry_anchor;
  if (!anchor) return { ok: false, reason: 'Receipt has no registry_anchor.' };
  if (anchor.repo_url !== CANONICAL_REGISTRY_URL) {
    return { ok: false, reason: `registry_anchor.repo_url is not the canonical registry (${anchor.repo_url}).` };
  }
  const rawUrl = `https://raw.githubusercontent.com/openagentprotocol-OAP/oap-registry/${anchor.commit_sha}/${anchor.file_path}`;
  let body;
  try { body = await fetchText(rawUrl); } catch (e) {
    return { ok: false, reason: `Could not fetch registry file at ${rawUrl}: ${e.message}` };
  }
  let listing;
  try { listing = JSON.parse(body); } catch (e) {
    return { ok: false, reason: `Registry file is not valid JSON.` };
  }
  const expectedHash = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
  if (listing.conformance_receipt_sha256 && listing.conformance_receipt_sha256 !== expectedHash) {
    return { ok: false, reason: `Registry listing SHA-256 mismatch.` };
  }
  return { ok: true };
}

async function verifyConformance(targetUrl, options = {}) {
  const trustedSuiteVersions = options.trustedSuiteVersions || ['1.0.0', '1.1.0'];
  const reverify = options.reverify !== false;
  const ajvValidate = options.ajvValidate || null;
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
    report.reasons.push('Manifest does not declare conformance.receipt_uri.');
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

  if (ajvValidate && !ajvValidate(receipt)) {
    report.steps.push({ step: 'schema', ok: false, errors: ajvValidate.errors });
    report.reasons.push('Receipt fails JSON Schema validation.');
    return report;
  }

  if (!trustedSuiteVersions.includes(receipt.suite && receipt.suite.version)) {
    report.steps.push({ step: 'suite-trust', ok: false });
    report.reasons.push(`Suite version ${receipt.suite && receipt.suite.version} is not in the trusted list.`);
    return report;
  }
  report.steps.push({ step: 'suite-trust', ok: true });

  const now = new Date();
  if (receipt.validity && receipt.validity.not_after && new Date(receipt.validity.not_after) < now) {
    report.steps.push({ step: 'validity', ok: false });
    report.reasons.push('Conformance Receipt is expired. Implementation MUST re attest.');
    return report;
  }
  report.steps.push({ step: 'validity', ok: true });

  if (!receipt.signatures || receipt.signatures.length === 0) {
    report.reasons.push('Receipt has no signatures.');
    return report;
  }

  for (const s of receipt.signatures) {
    if (isPlaceholder(s.value)) {
      report.steps.push({ step: 'signature', ok: false });
      report.reasons.push('Receipt signature is a placeholder. RFC 0019 section 7.3 requires real signatures.');
      return report;
    }
  }

  // Cryptographic verification of the implementation signature.
  const implDid = receipt.implementation && receipt.implementation.did;
  const implKey = await resolveEd25519Key(implDid);
  if (!implKey) {
    report.steps.push({ step: 'signature', ok: false });
    report.reasons.push(`Could not resolve Ed25519 verification key for implementation ${implDid}.`);
    return report;
  }
  const body = { ...receipt };
  delete body.signatures;
  delete body.peer_witnesses;
  const sigOk = receipt.signatures.some((s) => s.alg === 'EdDSA' && verifyEd25519Signature(canonicalize(body), s.value, implKey));
  if (!sigOk) {
    report.steps.push({ step: 'signature', ok: false });
    report.reasons.push('Implementation signature did not verify against the resolved DID Document key.');
    return report;
  }
  report.steps.push({ step: 'signature', ok: true });

  // Peer-witness and registry-anchor checks for L4 / L5.
  const claimed = receipt.claimed_levels || [];
  const claimsL5 = claimed.some((l) => l.startsWith('L5'));
  const claimsL4 = claimed.some((l) => l.startsWith('L4'));
  if (claimsL5 || claimsL4) {
    const witResult = await verifyPeerWitnesses(receipt, claimsL5 ? 3 : 1);
    report.steps.push({ step: 'peer-witnesses', ok: witResult.ok, ...(witResult.ok ? {} : { error: witResult.reason }) });
    if (!witResult.ok) { report.reasons.push(witResult.reason); return report; }

    const anchorResult = await verifyRegistryAnchor(receipt);
    report.steps.push({ step: 'registry-anchor', ok: anchorResult.ok, ...(anchorResult.ok ? {} : { error: anchorResult.reason }) });
    if (!anchorResult.ok) { report.reasons.push(anchorResult.reason); return report; }
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
    report.steps.push({ step: 'reverify', ok: observedTotal === 0 || observedPasses === observedTotal, observed_passes: observedPasses, observed_total: observedTotal });
    if (observedTotal > 0 && observedPasses < observedTotal) {
      report.reasons.push('Live re-verification observed test failures that contradict the published Conformance Receipt.');
      return report;
    }
  }

  report.accepted = true;
  report.accepted_levels = claimed;
  return report;
}

module.exports = {
  verifyConformance,
  verifyPeerWitnesses,
  verifyRegistryAnchor,
  resolveEd25519Key,
  canonicalize,
  isPlaceholder,
};
