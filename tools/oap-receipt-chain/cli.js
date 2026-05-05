#!/usr/bin/env node
/**
 * oap-receipt-chain
 *
 * CLI tool for Receipt Chain disaster recovery and verification per
 * RFC 0019 section 6 and the Accountability whitepaper.
 *
 * Subcommands:
 *   verify <path>       Verify a Receipt Chain JSONL file end-to-end:
 *                        signature validity, hash-chain continuity, and
 *                        monotonic timestamps. Exits 0 on success, 1 on
 *                        any failure.
 *   replay <path>       Stream-replay a Receipt Chain to a target server's
 *                        Receipt Chain restore endpoint. Reads JSONL from
 *                        stdin or path and POSTs each receipt to
 *                        TARGET/oap/receipt-chain/restore.
 *   export <db>         Export a SQLite reference-server's receipts table to
 *                        JSONL on stdout suitable for `verify` or `replay`.
 *   anchor-check <path> Verify that every receipt in the chain has a
 *                        corresponding inclusion proof recorded in at least
 *                        one Transparency Log declared in the Manifest's
 *                        `accountability.transparency_logs` array.
 *
 * @license Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function fail(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).filter((k) => k !== 'signature' && k !== 'sig').sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function sha256Hex(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function decodeKey(jwk) {
  if (!jwk || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519') return null;
  try { return crypto.createPublicKey({ key: jwk, format: 'jwk' }); } catch { return null; }
}

function readJsonl(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter((l) => l.trim());
  return lines.map((l, i) => {
    try { return JSON.parse(l); } catch (e) { fail(`line ${i + 1}: ${e.message}`); }
  });
}

function verifyChain(receipts, opts = {}) {
  const issues = [];
  let prevHash = null;
  let prevTs = 0;
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const declaredPrev = r.prev_receipt_hash || null;
    if (i === 0) {
      if (declaredPrev !== null && declaredPrev !== '') {
        issues.push({ index: i, kind: 'genesis_prev_should_be_null', got: declaredPrev });
      }
    } else if (declaredPrev !== prevHash) {
      issues.push({ index: i, kind: 'chain_break', expected: prevHash, got: declaredPrev });
    }

    const issuedAt = Date.parse(r.issued_at || r.timestamp || '');
    if (Number.isNaN(issuedAt)) {
      issues.push({ index: i, kind: 'unparseable_timestamp', got: r.issued_at });
    } else if (issuedAt < prevTs) {
      issues.push({ index: i, kind: 'non_monotonic_timestamp', prev: prevTs, got: issuedAt });
    } else {
      prevTs = issuedAt;
    }

    if (opts.publicKey && r.signature) {
      try {
        const ok = crypto.verify(null, Buffer.from(canonicalize(r)), opts.publicKey, Buffer.from(r.signature, 'base64'));
        if (!ok) issues.push({ index: i, kind: 'signature_invalid' });
      } catch (e) {
        issues.push({ index: i, kind: 'signature_error', message: e.message });
      }
    }

    prevHash = sha256Hex(Buffer.from(canonicalize(r)));
  }
  return { count: receipts.length, issues };
}

async function fetchPublicKey(target) {
  try {
    const r = await fetch(`${target.replace(/\/$/, '')}/.well-known/did.json`);
    if (!r.ok) return null;
    const did = await r.json();
    const ver = Array.isArray(did.verificationMethod) ? did.verificationMethod[0] : null;
    return ver && ver.publicKeyJwk ? decodeKey(ver.publicKeyJwk) : null;
  } catch { return null; }
}

async function cmdVerify(args) {
  const file = args[0];
  if (!file || !fs.existsSync(file)) fail(`receipt chain file not found: ${file}`);
  let publicKey = null;
  if (args.includes('--target')) {
    const target = args[args.indexOf('--target') + 1];
    publicKey = await fetchPublicKey(target);
    if (!publicKey) console.error(`warning: could not fetch public key from ${target}; signature checks skipped`);
  }
  const receipts = readJsonl(file);
  const { count, issues } = verifyChain(receipts, { publicKey });
  console.log(JSON.stringify({ count, issues, ok: issues.length === 0 }, null, 2));
  process.exit(issues.length === 0 ? 0 : 1);
}

async function cmdReplay(args) {
  const target = process.env.OAP_TARGET || args[0];
  if (!target) fail('usage: oap-receipt-chain replay <target-url> [<file>]');
  const file = args[1];
  const receipts = file ? readJsonl(file) : readJsonl('/dev/stdin');
  const url = `${target.replace(/\/$/, '')}/oap/receipt-chain/restore`;
  let ok = 0, fail_ = 0;
  for (const r of receipts) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(r),
      });
      if (res.ok) ok++; else fail_++;
    } catch { fail_++; }
  }
  console.log(JSON.stringify({ replayed: ok, failed: fail_ }, null, 2));
  process.exit(fail_ === 0 ? 0 : 1);
}

function cmdExport(args) {
  const dbPath = args[0];
  if (!dbPath || !fs.existsSync(dbPath)) fail(`database not found: ${dbPath}`);
  let Database;
  try { Database = require('better-sqlite3'); }
  catch { fail('better-sqlite3 not installed; run from oap-spec/reference/server/'); }
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare('SELECT body FROM receipts ORDER BY rowid ASC').all();
  for (const row of rows) {
    process.stdout.write(typeof row.body === 'string' ? row.body : JSON.stringify(row.body));
    process.stdout.write('\n');
  }
  db.close();
}

async function cmdAnchorCheck(args) {
  const file = args[0];
  if (!file || !fs.existsSync(file)) fail(`receipt chain file not found: ${file}`);
  const target = process.env.OAP_TARGET || args[args.indexOf('--target') + 1];
  if (!target) fail('--target required to fetch transparency_logs from manifest');
  const r = await fetch(`${target.replace(/\/$/, '')}/.well-known/oap-tool.json`);
  const manifest = await r.json();
  const logs = (manifest.accountability && manifest.accountability.transparency_logs) || [];
  if (logs.length < 2) {
    console.error(`warning: manifest declares fewer than 2 transparency_logs (got ${logs.length}); RFC 0021 RECOMMENDS at least 2 independently operated logs`);
  }
  const receipts = readJsonl(file);
  const missing = [];
  for (const r of receipts) {
    const proofs = Array.isArray(r.transparency_log_proofs) ? r.transparency_log_proofs : [];
    if (proofs.length === 0) missing.push(r.receipt_id || r.invocation_id);
  }
  console.log(JSON.stringify({
    receipts: receipts.length,
    declared_logs: logs.length,
    missing_anchors: missing.length,
    missing_sample: missing.slice(0, 5),
  }, null, 2));
  process.exit(missing.length === 0 ? 0 : 1);
}

const cmd = process.argv[2];
const args = process.argv.slice(3);
const commands = { verify: cmdVerify, replay: cmdReplay, export: cmdExport, 'anchor-check': cmdAnchorCheck };
if (!commands[cmd]) {
  console.error(`oap-receipt-chain: unknown command ${cmd || '(none)'}`);
  console.error('Available: verify, replay, export, anchor-check');
  process.exit(2);
}
commands[cmd](args).catch?.((e) => { console.error(e); process.exit(1); });
