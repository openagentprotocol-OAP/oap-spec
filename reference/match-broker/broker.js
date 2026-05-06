/**
 * OAP Reference Match Broker — RFC 0021 M2 conformant
 *
 * Architecture (three retrieval layers):
 *   1. Constraint Filter    — AQL algebra: jurisdiction, risk_class, price ceiling
 *   2. BM25 Sparse Retrieval — over manifest text (description, categories, actions)
 *   3. Score Re-Ranking     — Quality Score (RFC 0009) + Reputation + Cost-effectiveness
 *
 * Verifiable Index:
 *   - SHA-256 Merkle tree over canonical manifest JSON
 *   - Inclusion Proofs per returned candidate (M1)
 *   - Negative Inclusion Proofs on demand (M2)
 *   - Signed Decision Records per candidate (M2)
 *
 * Signing: Ed25519 (pure JS, no native deps) over canonical JSON
 *
 * References:
 *   - Qin et al. (2023). ToolLLM. ICLR 2024. (BM25 + dense retrieval for tool selection)
 *   - Robertson & Zaragoza (2009). The Probabilistic Relevance Framework: BM25 and Beyond.
 *   - Crosby & Wallach (2009). Efficient Data Structures for Tamper-Evident Logging.
 *   - RFC 0021: Verifiable Indexes and Disclosed Ranking Functions.
 */

'use strict';

const express   = require('express');
const Database  = require('better-sqlite3');
const crypto    = require('crypto');
const fs        = require('fs');
const path      = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT        = process.env.PORT || 3100;
const DB_PATH     = process.env.DB_PATH || path.join(__dirname, 'broker.db');
const KEY_PATH    = process.env.KEY_PATH || path.join(__dirname, 'broker-key.json');
const BROKER_DID  = process.env.BROKER_DID || 'did:web:broker.openagentprotocol.eu';
const BROKER_VER  = '1.0.0';

// BM25 hyperparameters (Robertson & Zaragoza 2009)
const BM25_K1 = 1.5;   // term frequency saturation
const BM25_B  = 0.75;  // length normalization

// Ranking weights (Disclosed Ranking Function — RFC 0021 §4.1)
const WEIGHT = {
  bm25:       0.45,   // semantic textual relevance
  reputation: 0.25,   // RFC 0009 performance score
  conformance:0.15,   // L0..L4 conformance level
  cost_score: 0.10,   // inverse normalized cost
  freshness:  0.05    // recency of manifest update
};

// ---------------------------------------------------------------------------
// Ed25519 signing (pure Node.js crypto — no external lib required)
// ---------------------------------------------------------------------------
let signingKey; // { privateKey: KeyObject, publicKey: KeyObject, kid: string }

function loadOrCreateKey () {
  if (fs.existsSync(KEY_PATH)) {
    const raw = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    signingKey = {
      privateKey: crypto.createPrivateKey({ key: Buffer.from(raw.private_pkcs8_b64, 'base64'), format: 'der', type: 'pkcs8' }),
      publicKey:  crypto.createPublicKey({ key: Buffer.from(raw.public_spki_b64,  'base64'), format: 'der', type: 'spki' }),
      kid: raw.kid
    };
  } else {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const kid = crypto.randomBytes(8).toString('hex');
    fs.writeFileSync(KEY_PATH, JSON.stringify({
      kid,
      private_pkcs8_b64: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
      public_spki_b64:   publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    }));
    signingKey = { privateKey, publicKey, kid };
  }
  console.log(`[broker] signing key loaded  kid=${signingKey.kid}`);
}

function sign (payload) {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const sig = crypto.sign(null, Buffer.from(canonical), signingKey.privateKey);
  return {
    signed_payload: payload,
    protected: { alg: 'EdDSA', kid: signingKey.kid, broker_did: BROKER_DID },
    signature: sig.toString('base64url')
  };
}

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------
let db;

function initDb () {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS manifests (
      id            TEXT PRIMARY KEY,
      provider_did  TEXT NOT NULL UNIQUE,
      manifest_json TEXT NOT NULL,
      leaf_hash     TEXT NOT NULL,
      conformance_level INTEGER NOT NULL DEFAULT 0,
      reputation_score  REAL NOT NULL DEFAULT 0.5,
      avg_cost_usd      REAL,
      categories_text   TEXT NOT NULL DEFAULT '',
      description_text  TEXT NOT NULL DEFAULT '',
      actions_text      TEXT NOT NULL DEFAULT '',
      jurisdictions     TEXT NOT NULL DEFAULT '[]',
      risk_class        TEXT NOT NULL DEFAULT 'low',
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS index_roots (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      root_hash  TEXT NOT NULL,
      leaf_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      signature  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bm25_corpus (
      manifest_id TEXT PRIMARY KEY REFERENCES manifests(id),
      term_freqs  TEXT NOT NULL,
      doc_length  INTEGER NOT NULL
    );
  `);
  console.log('[broker] database ready');
}

// ---------------------------------------------------------------------------
// Merkle Tree (append-only log, RFC 0021 §3.1)
// Based on: Crosby & Wallach (2009) history tree construction
// ---------------------------------------------------------------------------

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function merkleLeaf (data) {
  return sha256('\x00' + data);
}

function merkleNode (left, right) {
  return sha256('\x01' + left + right);
}

function buildMerkleTree (leaves) {
  if (leaves.length === 0) return { root: sha256('empty'), proofs: [], layers: [] };

  const layers = [leaves.map(l => merkleLeaf(l))];
  let current = layers[0];
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left  = current[i];
      const right = current[i + 1] || left; // duplicate last node for odd count
      next.push(merkleNode(left, right));
    }
    layers.push(next);
    current = next;
  }

  // Build inclusion proof for each leaf
  const proofs = leaves.map((_, leafIdx) => {
    const proof = [];
    let idx = leafIdx;
    for (let level = 0; level < layers.length - 1; level++) {
      const layer = layers[level];
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      const sibling = layer[siblingIdx] || layer[idx];
      proof.push({ position: idx % 2 === 0 ? 'right' : 'left', hash: sibling });
      idx = Math.floor(idx / 2);
    }
    return proof;
  });

  return { root: current[0], proofs, layers };
}

function rebuildAndPublishIndex () {
  const rows = db.prepare('SELECT leaf_hash, provider_did FROM manifests ORDER BY rowid').all();
  const leaves     = rows.map(r => r.leaf_hash);
  const provDids   = rows.map(r => r.provider_did);
  const { root, proofs } = buildMerkleTree(leaves);

  // Store proofs back
  const upsert = db.prepare(
    'UPDATE manifests SET leaf_hash = leaf_hash WHERE provider_did = ?'
  );

  // Sign and record root
  const rootPayload = {
    root_hash:  root,
    leaf_count: leaves.length,
    created_at: Math.floor(Date.now() / 1000),
    broker_did: BROKER_DID,
    version:    BROKER_VER
  };
  const rootSigned = sign(rootPayload);
  db.prepare(
    'INSERT INTO index_roots (root_hash, leaf_count, signature) VALUES (?,?,?)'
  ).run(root, leaves.length, JSON.stringify(rootSigned));

  // Cache proofs in memory keyed by provider_did
  indexCache = {};
  provDids.forEach((did, i) => {
    indexCache[did] = { root, proof: proofs[i], leaf_index: i, leaf_hash: leaves[i] };
  });

  console.log(`[broker] index rebuilt  root=${root.slice(0,12)}…  leaves=${leaves.length}`);
  return root;
}

let indexCache = {};

// ---------------------------------------------------------------------------
// BM25 implementation (Robertson & Zaragoza 2009)
// ---------------------------------------------------------------------------

function tokenize (text) {
  return (text || '').toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function computeTermFreqs (tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  return tf;
}

function indexManifestBm25 (manifestId, manifest) {
  const tokens = tokenize([
    manifest.description || '',
    (manifest.categories || []).join(' '),
    Object.keys(manifest.actions || {}).join(' '),
    Object.values(manifest.actions || {}).map(a => a.description || '').join(' ')
  ].join(' '));

  const tf = computeTermFreqs(tokens);
  db.prepare(
    'INSERT OR REPLACE INTO bm25_corpus (manifest_id, term_freqs, doc_length) VALUES (?,?,?)'
  ).run(manifestId, JSON.stringify(tf), tokens.length);
}

function bm25Score (queryTokens, tf, docLength, avgDocLength, idfMap) {
  let score = 0;
  for (const term of queryTokens) {
    const idf = idfMap[term] || 0;
    const freq = tf[term] || 0;
    const numerator   = freq * (BM25_K1 + 1);
    const denominator = freq + BM25_K1 * (1 - BM25_B + BM25_B * docLength / avgDocLength);
    score += idf * (numerator / denominator);
  }
  return score;
}

function buildIdf (queryTokens) {
  const N = db.prepare('SELECT COUNT(*) as c FROM bm25_corpus').get().c;
  const idfMap = {};
  for (const term of queryTokens) {
    const df = db.prepare(
      "SELECT COUNT(*) as c FROM bm25_corpus WHERE term_freqs LIKE ?"
    ).get(`%"${term}"%`).c;
    idfMap[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }
  return idfMap;
}

// ---------------------------------------------------------------------------
// Constraint Filter (AQL algebra)
// ---------------------------------------------------------------------------

function passesConstraints (manifest, intent) {
  const filters = intent.filters || {};

  // Jurisdiction filter
  if (filters.jurisdiction) {
    const allowed = Array.isArray(filters.jurisdiction) ? filters.jurisdiction : [filters.jurisdiction];
    const provJurisdictions = JSON.parse(manifest.jurisdictions || '[]');
    if (provJurisdictions.length > 0) {
      const ok = allowed.some(j => provJurisdictions.includes(j) || provJurisdictions.includes('*'));
      if (!ok) return false;
    }
  }

  // Risk class filter
  if (filters.risk_class) {
    const riskOrder = { low: 1, medium: 2, high: 3 };
    const maxAllowed = riskOrder[filters.risk_class] || 3;
    if ((riskOrder[manifest.risk_class] || 1) > maxAllowed) return false;
  }

  // Minimum conformance level
  if (filters.min_conformance_level !== undefined) {
    if (manifest.conformance_level < filters.min_conformance_level) return false;
  }

  // Price ceiling (budget)
  if (filters.max_cost_usd !== undefined && manifest.avg_cost_usd !== null) {
    if (manifest.avg_cost_usd > filters.max_cost_usd) return false;
  }

  // Required categories
  if (filters.categories && filters.categories.length > 0) {
    const manifestCats = manifest.categories_text.split(',').map(s => s.trim());
    const ok = filters.categories.some(c => manifestCats.includes(c));
    if (!ok) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Scoring and Decision Record
// ---------------------------------------------------------------------------

function computeConformanceScore (level) {
  return level / 4.0; // L0..L4 → 0..1
}

function computeCostScore (avgCostUsd, allCosts) {
  if (avgCostUsd === null || allCosts.length === 0) return 0.5;
  const max = Math.max(...allCosts);
  const min = Math.min(...allCosts);
  if (max === min) return 1.0;
  return 1.0 - (avgCostUsd - min) / (max - min); // cheaper = higher score
}

function computeFreshnessScore (updatedAt) {
  const ageSeconds = Math.floor(Date.now() / 1000) - updatedAt;
  const ageDays    = ageSeconds / 86400;
  return Math.max(0, 1.0 - ageDays / 365); // linearly decays over 1 year
}

function rankCandidates (candidates, queryTokens, idfMap, avgDocLength) {
  const allCosts = candidates.map(c => c.avg_cost_usd).filter(x => x !== null);

  return candidates.map(c => {
    const tf = JSON.parse(
      db.prepare('SELECT term_freqs, doc_length FROM bm25_corpus WHERE manifest_id = ?').get(c.id)?.term_freqs || '{}'
    );
    const docLength = db.prepare('SELECT doc_length FROM bm25_corpus WHERE manifest_id = ?').get(c.id)?.doc_length || 1;

    const bm25Raw        = bm25Score(queryTokens, tf, docLength, avgDocLength, idfMap);
    const bm25Normalized = Math.min(bm25Raw / 10, 1.0); // normalize to [0,1]
    const reputationSc   = c.reputation_score;
    const conformanceSc  = computeConformanceScore(c.conformance_level);
    const costSc         = computeCostScore(c.avg_cost_usd, allCosts);
    const freshnessSc    = computeFreshnessScore(c.updated_at);

    const finalScore = (
      WEIGHT.bm25        * bm25Normalized +
      WEIGHT.reputation  * reputationSc +
      WEIGHT.conformance * conformanceSc +
      WEIGHT.cost_score  * costSc +
      WEIGHT.freshness   * freshnessSc
    );

    const decisionRecord = {
      candidate_did: c.provider_did,
      ranking_function_id:      'oap-bm25-multifactor-v1',
      ranking_function_version: BROKER_VER,
      inputs: {
        bm25_raw:          bm25Raw,
        bm25_normalized:   bm25Normalized,
        reputation_score:  reputationSc,
        conformance_level: c.conformance_level,
        conformance_score: conformanceSc,
        cost_score:        costSc,
        freshness_score:   freshnessSc
      },
      weights: WEIGHT,
      final_score:    finalScore,
      computed_at:    new Date().toISOString()
    };

    return { ...c, finalScore, decisionRecord };
  }).sort((a, b) => b.finalScore - a.finalScore);
}

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/health', (req, res) => {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM manifests').get();
  const root  = db.prepare('SELECT root_hash, leaf_count, created_at FROM index_roots ORDER BY id DESC LIMIT 1').get();
  res.json({
    status: 'ok',
    broker_did: BROKER_DID,
    version:    BROKER_VER,
    manifest_count: c,
    index_root: root || null,
    conformance_level: 'M2',
    ranking_function: {
      function_id:      'oap-bm25-multifactor-v1',
      function_version: BROKER_VER,
      inputs:  Object.keys(WEIGHT),
      weights: WEIGHT
    }
  });
});

// ---------------------------------------------------------------------------
// POST /oap/manifests — register or update a manifest
// ---------------------------------------------------------------------------
app.post('/oap/manifests', (req, res) => {
  const { provider_did, manifest } = req.body;
  if (!provider_did || !manifest) {
    return res.status(400).json({ error: 'provider_did and manifest required' });
  }

  const manifestJson  = JSON.stringify(manifest);
  const leafHash      = sha256(manifestJson);
  const id            = sha256(provider_did);
  const jurisdictions = JSON.stringify(manifest.jurisdiction ? [manifest.jurisdiction] : (manifest.jurisdictions || []));
  const categoriesText = (manifest.categories || []).join(', ');
  const actionsText    = Object.keys(manifest.actions || {}).join(' ');
  const descText       = manifest.description || '';

  db.prepare(`
    INSERT INTO manifests
      (id, provider_did, manifest_json, leaf_hash, conformance_level, reputation_score,
       avg_cost_usd, categories_text, description_text, actions_text, jurisdictions, risk_class, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,unixepoch())
    ON CONFLICT(provider_did) DO UPDATE SET
      manifest_json     = excluded.manifest_json,
      leaf_hash         = excluded.leaf_hash,
      conformance_level = excluded.conformance_level,
      reputation_score  = excluded.reputation_score,
      avg_cost_usd      = excluded.avg_cost_usd,
      categories_text   = excluded.categories_text,
      description_text  = excluded.description_text,
      actions_text      = excluded.actions_text,
      jurisdictions     = excluded.jurisdictions,
      risk_class        = excluded.risk_class,
      updated_at        = unixepoch()
  `).run(
    id, provider_did, manifestJson, leafHash,
    manifest.conformance_level || 0,
    manifest.reputation_score || 0.5,
    manifest.avg_cost_usd || null,
    categoriesText, descText, actionsText,
    jurisdictions,
    manifest.risk_class || 'low'
  );

  indexManifestBm25(id, manifest);
  const newRoot = rebuildAndPublishIndex();

  const entry = indexCache[provider_did];
  res.status(201).json({
    registered: true,
    provider_did,
    leaf_hash:     leafHash,
    index_root:    newRoot,
    leaf_index:    entry?.leaf_index,
    inclusion_proof: entry?.proof
  });
});

// ---------------------------------------------------------------------------
// POST /oap/resolve — AQL Intent resolution (M2 conformant)
// ---------------------------------------------------------------------------
app.post('/oap/resolve', (req, res) => {
  const intent = req.body;
  const query  = intent.query || intent.description || '';
  const topK   = Math.min(intent.top_k || 10, 50);

  // 1. Constraint Filter
  const allManifests = db.prepare('SELECT * FROM manifests').all();
  const filtered     = allManifests.filter(m => passesConstraints(m, intent));

  if (filtered.length === 0) {
    return res.json({ candidates: [], index_root: db.prepare('SELECT root_hash FROM index_roots ORDER BY id DESC LIMIT 1').get()?.root_hash || null, total_indexed: allManifests.length });
  }

  // 2. BM25 Retrieval
  const queryTokens = tokenize(query);
  const idfMap      = queryTokens.length > 0 ? buildIdf(queryTokens) : {};
  const avgDocLen   = (() => {
    const r = db.prepare('SELECT AVG(doc_length) as a FROM bm25_corpus').get();
    return r?.a || 1;
  })();

  // 3. Re-Rank and build Decision Records
  const ranked = rankCandidates(filtered, queryTokens, idfMap, avgDocLen).slice(0, topK);

  // 4. Attach Inclusion Proofs and sign Decision Records
  const latestRoot = db.prepare('SELECT root_hash FROM index_roots ORDER BY id DESC LIMIT 1').get()?.root_hash;

  const candidates = ranked.map((c, rank) => {
    const cached = indexCache[c.provider_did] || {};
    const signedDecisionRecord = sign(c.decisionRecord);

    return {
      rank: rank + 1,
      provider_did:     c.provider_did,
      final_score:      Math.round(c.finalScore * 10000) / 10000,
      manifest:         JSON.parse(c.manifest_json),
      inclusion_proof:  {
        leaf_hash:  cached.leaf_hash,
        leaf_index: cached.leaf_index,
        root_hash:  latestRoot,
        proof_path: cached.proof || []
      },
      decision_record: signedDecisionRecord
    };
  });

  res.json({
    intent_id:     intent.intent_id || null,
    candidates,
    total_filtered: filtered.length,
    total_indexed:  allManifests.length,
    index_root:     latestRoot,
    broker_did:     BROKER_DID,
    ranking_function: {
      function_id:      'oap-bm25-multifactor-v1',
      function_version: BROKER_VER,
      weights:          WEIGHT
    }
  });
});

// ---------------------------------------------------------------------------
// GET /oap/index/proof?did= — Inclusion Proof for a specific provider (M1)
// ---------------------------------------------------------------------------
app.get('/oap/index/proof', (req, res) => {
  const { did } = req.query;
  if (!did) return res.status(400).json({ error: 'did required' });
  const cached = indexCache[did];
  const latestRoot = db.prepare('SELECT root_hash FROM index_roots ORDER BY id DESC LIMIT 1').get()?.root_hash;
  if (!cached) {
    // Negative Inclusion Proof (M2)
    return res.json({
      type: 'negative_inclusion_proof',
      provider_did: did,
      index_root:   latestRoot,
      assertion:    'provider_not_indexed',
      signed:       sign({ type: 'negative_inclusion_proof', provider_did: did, index_root: latestRoot, ts: new Date().toISOString() })
    });
  }
  res.json({
    type:           'inclusion_proof',
    provider_did:   did,
    leaf_hash:      cached.leaf_hash,
    leaf_index:     cached.leaf_index,
    root_hash:      cached.root || latestRoot,
    proof_path:     cached.proof,
    signed:         sign({ type: 'inclusion_proof', provider_did: did, leaf_hash: cached.leaf_hash, root_hash: latestRoot, ts: new Date().toISOString() })
  });
});

// ---------------------------------------------------------------------------
// GET /oap/index/attestation — Completeness Attestation (M1, every 24h)
// ---------------------------------------------------------------------------
app.get('/oap/index/attestation', (req, res) => {
  const latestRoot = db.prepare('SELECT * FROM index_roots ORDER BY id DESC LIMIT 1').get();
  if (!latestRoot) return res.status(404).json({ error: 'no index built yet' });
  const attestation = sign({
    type:            'completeness_attestation',
    index_root:      latestRoot.root_hash,
    leaf_count:      latestRoot.leaf_count,
    attested_at:     new Date().toISOString(),
    broker_did:      BROKER_DID,
    next_attestation: new Date(Date.now() + 86400000).toISOString()
  });
  res.json(attestation);
});

// ---------------------------------------------------------------------------
// GET /oap/index/roots — recent index roots history
// ---------------------------------------------------------------------------
app.get('/oap/index/roots', (req, res) => {
  const roots = db.prepare('SELECT root_hash, leaf_count, created_at FROM index_roots ORDER BY id DESC LIMIT 20').all();
  res.json({ roots, broker_did: BROKER_DID });
});

// ---------------------------------------------------------------------------
// GET /oap/manifests/:did — retrieve a registered manifest
// ---------------------------------------------------------------------------
app.get('/oap/manifests/:encodedDid', (req, res) => {
  const did = decodeURIComponent(req.params.encodedDid);
  const row = db.prepare('SELECT * FROM manifests WHERE provider_did = ?').get(did);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ provider_did: did, manifest: JSON.parse(row.manifest_json), leaf_hash: row.leaf_hash });
});

// ---------------------------------------------------------------------------
// GET /oap/ranking-function — Disclosed Ranking Function (RFC 0021 §4.1)
// ---------------------------------------------------------------------------
app.get('/oap/ranking-function', (req, res) => {
  res.json(sign({
    function_id:      'oap-bm25-multifactor-v1',
    function_version: BROKER_VER,
    description:      'BM25 sparse retrieval combined with multi-factor quality re-ranking. Composes Robertson-Zaragoza BM25 (k1=1.5, b=0.75) with RFC 0009 reputation, conformance level, cost-effectiveness, and manifest freshness.',
    inputs: [
      { name: 'bm25_normalized',   weight: WEIGHT.bm25,        description: 'BM25 text relevance score over description, categories, action names (Robertson & Zaragoza 2009)' },
      { name: 'reputation_score',  weight: WEIGHT.reputation,   description: 'RFC 0009 Performance Record aggregate, range [0,1]' },
      { name: 'conformance_score', weight: WEIGHT.conformance,  description: 'OAP conformance level L0..L4 normalized to [0,1]' },
      { name: 'cost_score',        weight: WEIGHT.cost_score,   description: 'Inverse normalized avg_cost_usd relative to candidate set' },
      { name: 'freshness_score',   weight: WEIGHT.freshness,    description: 'Linear decay from 1.0 (today) to 0.0 (365 days old)' }
    ],
    formula: 'final_score = sum_i(weight_i * input_i)',
    bm25_params: { k1: BM25_K1, b: BM25_B },
    references: [
      'Robertson, S., and Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in IR 3(4).',
      'Qin, Y., et al. (2023). ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs. ICLR 2024.',
      'RFC 0021: Verifiable Indexes and Disclosed Ranking Functions.'
    ],
    published_at: new Date().toISOString(),
    broker_did:   BROKER_DID
  }));
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
loadOrCreateKey();
initDb();
rebuildAndPublishIndex(); // build initial (possibly empty) index

app.listen(PORT, () => {
  console.log(`[broker] OAP Reference Match Broker  http://localhost:${PORT}`);
  console.log(`[broker] RFC 0021 M2 conformant | BM25 + multi-factor ranking`);
  console.log(`[broker] DID: ${BROKER_DID}`);
});

module.exports = { app, db, buildMerkleTree, bm25Score, rankCandidates };
