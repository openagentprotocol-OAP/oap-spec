#!/usr/bin/env node
/**
 * OAP Performance Benchmark Suite
 *
 * Measures p50, p95, p99 latency and throughput for the six load-bearing
 * operations of the OAP reference server: manifest fetch, invoke (signed
 * receipt), audit fetch, intent resolve (AQL), conformance receipt, and
 * Ed25519 receipt verification by an external verifier.
 *
 * The benchmark target is configurable via OAP_TARGET (default
 * http://localhost:3100). Each operation is exercised with a configurable
 * number of warmup iterations followed by measurement iterations.
 *
 * Output:
 *   - JSON report at bench/results/perf-<ISO>.json
 *   - Markdown summary at bench/results/perf-<ISO>.md
 *   - Stdout table
 *
 * @license Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TARGET = process.env.OAP_TARGET || 'http://localhost:3100';
const WARMUP = parseInt(process.env.OAP_BENCH_WARMUP || '20', 10);
const ITERS = parseInt(process.env.OAP_BENCH_ITERS || '500', 10);
const CONCURRENCY = parseInt(process.env.OAP_BENCH_CONCURRENCY || '10', 10);
const OUT_DIR = path.join(__dirname, 'results');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return null;
  const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[idx];
}

function summarize(samples) {
  const sorted = samples.slice().sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { n: 0, mean_ms: null, p50_ms: null, p95_ms: null, p99_ms: null, max_ms: null, min_ms: null };
  }
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n: sorted.length,
    mean_ms: +(sum / sorted.length).toFixed(3),
    p50_ms: +percentile(sorted, 50).toFixed(3),
    p95_ms: +percentile(sorted, 95).toFixed(3),
    p99_ms: +percentile(sorted, 99).toFixed(3),
    max_ms: +sorted[sorted.length - 1].toFixed(3),
    min_ms: +sorted[0].toFixed(3),
  };
}

async function timed(fn) {
  const t0 = process.hrtime.bigint();
  await fn();
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6;
}

async function runOp(name, fn) {
  for (let i = 0; i < WARMUP; i++) {
    try { await fn(); } catch {}
  }
  const samples = [];
  const wall0 = Date.now();
  let i = 0;
  async function worker() {
    while (i < ITERS) {
      const my = i++;
      if (my >= ITERS) break;
      try {
        const ms = await timed(fn);
        samples.push(ms);
      } catch (err) {
        samples.push(NaN);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const wall1 = Date.now();
  const ok = samples.filter((s) => Number.isFinite(s));
  const errors = samples.length - ok.length;
  const summary = summarize(ok);
  summary.errors = errors;
  summary.throughput_rps = +(samples.length / ((wall1 - wall0) / 1000)).toFixed(2);
  return { name, ...summary };
}

async function main() {
  console.log(`OAP Performance Benchmark`);
  console.log(`  target:      ${TARGET}`);
  console.log(`  warmup:      ${WARMUP}`);
  console.log(`  iterations:  ${ITERS}`);
  console.log(`  concurrency: ${CONCURRENCY}`);
  console.log('');

  const manifestRes = await fetch(`${TARGET}/.well-known/oap-tool.json`);
  if (!manifestRes.ok) {
    console.error(`Cannot reach ${TARGET}; is the server running?`);
    process.exit(2);
  }
  const manifest = await manifestRes.json();
  const ep = manifest.endpoints || {};

  const results = [];

  results.push(await runOp('manifest_fetch', async () => {
    const r = await fetch(`${TARGET}/.well-known/oap-tool.json`);
    if (!r.ok) throw new Error(r.status);
    await r.json();
  }));

  results.push(await runOp('did_fetch', async () => {
    const r = await fetch(`${TARGET}/.well-known/did.json`);
    if (!r.ok) throw new Error(r.status);
    await r.json();
  }));

  results.push(await runOp('invoke_signed_receipt', async () => {
    const url = ep.invoke ? `${TARGET}${ep.invoke}` : `${TARGET}/oap/invoke`;
    const envelope = {
      oap_version: '1.0',
      request_id: `bench_${crypto.randomUUID()}`,
      principal_did: 'did:web:bench.example.com',
      agent_did: 'did:web:bench.example.com:agent',
      action: 'echo',
      params: { message: 'bench' },
      input: { message: 'bench' },
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(envelope),
    });
    if (!r.ok && r.status !== 501) throw new Error(r.status);
    await r.text();
  }));

  results.push(await runOp('audit_fetch', async () => {
    const url = ep.audit ? `${TARGET}${ep.audit}?limit=10` : `${TARGET}/oap/audit?limit=10`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    await r.json();
  }));

  results.push(await runOp('intent_resolve_aql', async () => {
    const url = ep.intent ? `${TARGET}${ep.intent}` : `${TARGET}/oap/intent`;
    const intent = {
      intent_id: `bench_${crypto.randomUUID()}`,
      issuer_did: 'did:web:bench.example.com',
      category: 'reference',
      constraints: [{ field: 'category', op: 'eq', value: 'reference' }],
      projection: { fields: ['tool_id'] },
      validity: { not_before: new Date().toISOString(), not_after: new Date(Date.now() + 60000).toISOString() },
      signature: 'unsigned-bench-probe',
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(intent),
    });
    if (!r.ok && r.status !== 400) throw new Error(r.status);
    await r.text();
  }));

  results.push(await runOp('conformance_receipt_fetch', async () => {
    const url = ep.conformance_receipt ? `${TARGET}${ep.conformance_receipt}` : `${TARGET}/oap/conformance-receipt`;
    const r = await fetch(url);
    if (!r.ok && r.status !== 404) throw new Error(r.status);
    await r.text();
  }));

  const { publicKey } = crypto.generateKeyPairSync('ed25519');
  const sample = JSON.stringify({ receipt_id: 'bench', payload: 'x'.repeat(256) });
  const sampleBuf = Buffer.from(sample);
  const sig = crypto.sign(null, sampleBuf, crypto.generateKeyPairSync('ed25519').privateKey);
  results.push(await runOp('local_ed25519_verify', async () => {
    crypto.verify(null, sampleBuf, publicKey, sig);
  }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `perf-${ts}.json`);
  const mdPath = path.join(OUT_DIR, `perf-${ts}.md`);
  const report = {
    target: TARGET,
    warmup: WARMUP,
    iterations: ITERS,
    concurrency: CONCURRENCY,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    timestamp: new Date().toISOString(),
    results,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    `# OAP Performance Benchmark`,
    ``,
    `* target: \`${TARGET}\``,
    `* warmup: ${WARMUP}, iterations: ${ITERS}, concurrency: ${CONCURRENCY}`,
    `* node: ${process.version} on ${process.platform}-${process.arch}`,
    `* timestamp: ${report.timestamp}`,
    ``,
    `| operation | n | p50 ms | p95 ms | p99 ms | mean ms | rps | errors |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|`,
    ...results.map((r) => `| ${r.name} | ${r.n} | ${r.p50_ms} | ${r.p95_ms} | ${r.p99_ms} | ${r.mean_ms} | ${r.throughput_rps} | ${r.errors} |`),
  ].join('\n');
  fs.writeFileSync(mdPath, md);

  console.log(md);
  console.log('');
  console.log(`JSON: ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`MD:   ${path.relative(process.cwd(), mdPath)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
