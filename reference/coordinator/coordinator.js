/**
 * OAP Reference Workflow Coordinator
 *
 * Implements RFC 0035 sections 4.1 through 4.5:
 *   - Workflow open with broker admissibility checks against the Broker Category
 *     Profile of RFC 0021 Appendix B.
 *   - Cross Match Receipt construction with the CMR.1 hash chain, CMR.2 temporal
 *     envelope, and CMR.3 constraint closure.
 *   - State machine: Opening -> Active -> {Invalidating, Closing, Expiring} -> terminal.
 *   - Heartbeat publication with monotone counter.
 *   - Failover assume protocol.
 *
 * The coordinator is transport agnostic. Networking is injected through the
 * `broker` and `registry` adapters supplied at construction. The defaults in
 * `inMemoryAdapters()` exist so the reference test suite can exercise the
 * state machine without requiring real broker endpoints.
 *
 * @license Apache-2.0
 */

const crypto = require('crypto');

const STATES = Object.freeze({
  OPENING: 'Opening',
  ACTIVE: 'Active',
  INVALIDATING: 'Invalidating',
  CLOSING: 'Closing',
  EXPIRING: 'Expiring',
  INVALIDATED: 'Invalidated',
  CLOSED: 'Closed',
  EXPIRED: 'Expired'
});

const TERMINAL_STATES = new Set([STATES.INVALIDATED, STATES.CLOSED, STATES.EXPIRED]);

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

function sha256Hex(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * The hash chain is defined over the WIRE form of the segment. Auxiliary
 * fields used by the local Coordinator state (the unprojected `payload` and
 * the `attestations` audit trail) are excluded so the hash chain a remote
 * verifier observes matches the hash chain the Coordinator constructed.
 */
function segmentHash(segment) {
  const { prev_segment_hash, payload, attestations, ...wire } = segment;
  return 'sha256:' + sha256Hex(canonicalize(wire));
}

function ulid(prefix) {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 16);
  return `${prefix}_${(t + r).slice(0, 26).padEnd(26, '0')}`;
}

/**
 * Evaluator for the closed predicate vocabulary of RFC 0035 section 4.5.
 * Returns true if and only if the predicate holds against the supplied
 * workflow context. Predicates not in the closed vocabulary return false
 * so that an unknown predicate cannot accidentally succeed.
 */
function evaluatePredicate(predicate, context) {
  const m = /^(\w+)\((.+)\)$/.exec(predicate);
  if (!m) return false;
  const fn = m[1];
  const args = splitArgs(m[2]);
  const r = (p) => resolvePath(p, context);
  switch (fn) {
    case 'equals': return JSON.stringify(r(args[0])) === JSON.stringify(r(args[1]));
    case 'less_than': return Number(r(args[0])) < Number(r(args[1]));
    case 'greater_than': return Number(r(args[0])) > Number(r(args[1]));
    case 'at_least': return Number(r(args[0])) >= Number(r(args[1]));
    case 'at_most': return Number(r(args[0])) <= Number(r(args[1]));
    case 'subset_of': {
      const a = r(args[0]); const b = r(args[1]);
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      return a.every(x => b.includes(x));
    }
    case 'disjoint': {
      const a = r(args[0]); const b = r(args[1]);
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      return !a.some(x => b.includes(x));
    }
    case 'attestation_present': {
      const segs = context.segments || {};
      const seg = segs[stripQuotes(args[0])];
      const type = stripQuotes(args[1]);
      return !!(seg && Array.isArray(seg.attestations) && seg.attestations.some(a => a.attestation_type === type));
    }
    default: return false;
  }
}

function splitArgs(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function stripQuotes(s) {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function resolvePath(p, context) {
  if (p.startsWith("'") || p.startsWith('"')) return stripQuotes(p);
  if (!isNaN(Number(p))) return Number(p);
  if (p === 'true') return true;
  if (p === 'false') return false;
  const parts = p.split('.');
  if (parts[0] === 'all_segments' && parts.length > 1) {
    const field = parts.slice(1).join('.');
    const segs = Object.values(context.segments || {});
    const values = segs.map(s => resolvePath(field, s));
    if (values.length === 0) return undefined;
    return values.every(x => JSON.stringify(x) === JSON.stringify(values[0])) ? values[0] : Symbol('mismatch');
  }
  let v = context;
  for (let i = 0; i < parts.length; i++) {
    if (v == null) return undefined;
    // Allow flat field access into a segment's `payload` subobject so
    // constraint predicates can be authored as `segments.finance.approved_amount`
    // (and `all_segments.jurisdiction`) rather than spelling `.payload.` each time.
    if (v && typeof v === 'object' && !(parts[i] in v) && v.payload && parts[i] in v.payload) {
      v = v.payload[parts[i]];
      continue;
    }
    v = v[parts[i]];
  }
  return v;
}

class Coordinator {
  constructor(opts) {
    this.coordinatorDid = opts.coordinatorDid;
    this.failoverDid = opts.failoverDid || null;
    this.broker = opts.broker;
    this.registry = opts.registry;
    this.signer = opts.signer;
    this.now = opts.now || (() => new Date().toISOString());
    this.workflows = new Map();
    this.heartbeatCounter = 0;
    this.heartbeatStore = new Map();
  }

  async openWorkflow({ manifest, initiatorDid, selectedBrokers }) {
    for (const role of manifest.roles) {
      const did = selectedBrokers[role.role_id];
      if (!did) throw new Error(`role ${role.role_id} not staffed`);
      const profile = await this.broker.fetchCategoryProfile(did);
      if (!profile) throw new Error(`broker ${did} has no Broker Category Profile`);
      if (profile.broker_category !== role.broker_category) {
        throw new Error(`broker ${did} category ${profile.broker_category} != role ${role.broker_category}`);
      }
      const requiredLevel = parseInt(role.min_conformance.replace('M', ''), 10);
      const declared = parseInt((profile.declared_conformance || 'M0').replace('M', ''), 10);
      if (declared < requiredLevel) {
        throw new Error(`broker ${did} declared ${profile.declared_conformance} below ${role.min_conformance}`);
      }
    }

    const workflowId = ulid('wf');
    const openedAt = this.now();
    const state = {
      workflowId,
      manifest,
      manifestHash: 'sha256:' + sha256Hex(canonicalize(manifest)),
      initiatorDid,
      selectedBrokers,
      openedAt,
      state: STATES.OPENING,
      segments: [],
      lastReceipt: null,
      auditLog: []
    };
    this.workflows.set(workflowId, state);
    this._audit(workflowId, 'WorkflowOpen', { initiatorDid, selectedBrokers, openedAt });
    return workflowId;
  }

  async ingestSegment(workflowId, segmentInput) {
    const w = this._mustWorkflow(workflowId);
    if (TERMINAL_STATES.has(w.state)) throw new Error('workflow terminal');
    const prevHash = w.segments.length === 0 ? null : segmentHash(w.segments[w.segments.length - 1]);
    const segment = {
      role_id: segmentInput.role_id,
      broker_did: segmentInput.broker_did,
      match_receipt_hash: segmentInput.match_receipt_hash,
      broker_tree_head: segmentInput.broker_tree_head,
      inclusion_proof: segmentInput.inclusion_proof,
      segment_signature: segmentInput.segment_signature,
      issued_at: segmentInput.issued_at || this.now(),
      expires_at: segmentInput.expires_at,
      prev_segment_hash: prevHash
    };
    if (segmentInput.payload) segment.payload = segmentInput.payload;
    if (segmentInput.attestations) segment.attestations = segmentInput.attestations;
    w.segments.push(segment);
    this._audit(workflowId, 'SegmentIngested', { role_id: segment.role_id });

    const requiredRoles = w.manifest.roles.filter(r => r.required).map(r => r.role_id);
    const presentRoles = new Set(w.segments.map(s => s.role_id));
    if (requiredRoles.every(r => presentRoles.has(r)) && w.state === STATES.OPENING) {
      w.state = STATES.ACTIVE;
      this._audit(workflowId, 'StateTransition', { to: STATES.ACTIVE });
    }
    return segment;
  }

  buildCrossMatchReceipt(workflowId) {
    const w = this._mustWorkflow(workflowId);
    if (w.segments.length < 2) throw new Error('need at least two segments');

    const effective = w.segments.reduce((min, s) =>
      !min || new Date(s.expires_at) < new Date(min) ? s.expires_at : min, null);

    const segMap = {};
    for (const s of w.segments) segMap[s.role_id] = s;
    const evalContext = { segments: segMap, workflow: { initiator_did: w.initiatorDid } };
    const evaluations = w.manifest.consistency_constraints.map(c => ({
      constraint_id: c.constraint_id,
      result: evaluatePredicate(c.predicate, evalContext),
      evidence: c.predicate
    }));

    const receipt = {
      version: '1.0',
      workflow_id: w.workflowId,
      workflow_manifest_id: w.manifest.workflow_manifest_id,
      workflow_manifest_hash: w.manifestHash,
      initiator_did: w.initiatorDid,
      coordinator_did: this.coordinatorDid,
      ...(this.failoverDid ? { failover_coordinator_did: this.failoverDid } : {}),
      opened_at: w.openedAt,
      expires_at: w.manifest.expires_at,
      segments: w.segments.map(s => {
        const { payload, attestations, ...wire } = s;
        return wire;
      }),
      consistency_evaluations: evaluations,
      effective_expires_at: effective,
      coordinator_heartbeat_anchor: `https://${this.coordinatorDid.replace(/^did:web:/, '')}/heartbeat/${w.workflowId}`,
      signatures: []
    };

    const body = canonicalize({ ...receipt, signatures: [] });
    const sig = this.signer.sign(body);
    receipt.signatures.push({ signer: this.coordinatorDid, sig });
    w.lastReceipt = receipt;
    this._audit(workflowId, 'CrossMatchReceiptIssued', { effective_expires_at: effective });
    return receipt;
  }

  handleRevocation(workflowId, event) {
    const w = this._mustWorkflow(workflowId);
    if (TERMINAL_STATES.has(w.state)) return;
    if (event.event_type !== 'revoked') return;
    if (event.consequence_class === 'workflow_invalidating') {
      w.state = STATES.INVALIDATING;
      this._audit(workflowId, 'Revocation', { reason: event.revocation_reason_code });
      w.state = STATES.INVALIDATED;
      this._audit(workflowId, 'StateTransition', { to: STATES.INVALIDATED });
    } else {
      this._audit(workflowId, 'RevocationNonFatal', { reason: event.revocation_reason_code });
    }
  }

  async closeWorkflow(workflowId, initiatorSignature) {
    const w = this._mustWorkflow(workflowId);
    if (w.state !== STATES.ACTIVE) throw new Error(`cannot close from ${w.state}`);
    const allTrue = w.lastReceipt
      ? w.lastReceipt.consistency_evaluations.every(e => e.result === true)
      : false;
    if (!allTrue) throw new Error('consistency constraints not satisfied');
    w.state = STATES.CLOSING;
    this._audit(workflowId, 'StateTransition', { to: STATES.CLOSING });
    await this.registry.anchor(w.lastReceipt);
    w.state = STATES.CLOSED;
    this._audit(workflowId, 'StateTransition', { to: STATES.CLOSED, initiatorSignature });
    return w.lastReceipt;
  }

  tickExpiry(now) {
    for (const [, w] of this.workflows) {
      if (TERMINAL_STATES.has(w.state)) continue;
      if (!w.lastReceipt) continue;
      if (new Date(w.lastReceipt.effective_expires_at) < new Date(now)) {
        w.state = STATES.EXPIRED;
        this._audit(w.workflowId, 'StateTransition', { to: STATES.EXPIRED });
      }
    }
  }

  publishHeartbeat() {
    const counter = ++this.heartbeatCounter;
    const heartbeats = [];
    for (const [, w] of this.workflows) {
      if (TERMINAL_STATES.has(w.state)) continue;
      const hb = {
        coordinator_did: this.coordinatorDid,
        workflow_id: w.workflowId,
        counter,
        latest_receipt_hash: w.lastReceipt ? 'sha256:' + sha256Hex(canonicalize(w.lastReceipt)) : null,
        issued_at: this.now()
      };
      hb.signature = this.signer.sign(canonicalize(hb));
      this.heartbeatStore.set(w.workflowId, hb);
      heartbeats.push(hb);
    }
    return heartbeats;
  }

  /**
   * Failover protocol of RFC 0035 section 4.4. A would-be failover invokes
   * `assume` after observing that the primary has missed its heartbeat
   * liveness window. The wait period of step 2 must be observed by the caller
   * (the test suite does so explicitly).
   */
  static assumeFromFailover({ workflowId, lastReceipt, observedMissedHeartbeatAt, waitedSeconds, failoverDid, signer, now }) {
    if (waitedSeconds < 120) throw new Error('failover wait under 2 minutes');
    if (lastReceipt.failover_coordinator_did !== failoverDid) {
      throw new Error('failover did not declared in receipt');
    }
    const assume = {
      type: 'FailoverAssume',
      workflow_id: workflowId,
      observed_missed_heartbeat_at: observedMissedHeartbeatAt,
      assumed_at: now(),
      failover_coordinator_did: failoverDid
    };
    assume.signature = signer.sign(canonicalize(assume));
    return assume;
  }

  _mustWorkflow(id) {
    const w = this.workflows.get(id);
    if (!w) throw new Error('workflow not found');
    return w;
  }

  _audit(workflowId, type, data) {
    const w = this.workflows.get(workflowId);
    if (!w) return;
    w.auditLog.push({ ts: this.now(), type, data });
  }
}

function inMemoryAdapters({ profiles = {}, anchoredReceipts = [] } = {}) {
  return {
    broker: {
      fetchCategoryProfile: async (did) => profiles[did] || null
    },
    registry: {
      anchor: async (receipt) => { anchoredReceipts.push(receipt); return { anchored: true }; }
    },
    anchored: anchoredReceipts
  };
}

function ed25519Signer() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey,
    sign(body) {
      const sig = crypto.sign(null, Buffer.from(body), privateKey);
      return 'ed25519:' + sig.toString('base64');
    },
    verify(body, signature) {
      if (!signature.startsWith('ed25519:')) return false;
      const sig = Buffer.from(signature.slice('ed25519:'.length), 'base64');
      return crypto.verify(null, Buffer.from(body), publicKey, sig);
    }
  };
}

function verifyCrossMatchReceipt(receipt, now = new Date().toISOString()) {
  const errors = [];
  for (let i = 1; i < receipt.segments.length; i++) {
    const prev = segmentHash(receipt.segments[i - 1]);
    if (receipt.segments[i].prev_segment_hash !== prev) {
      errors.push(`CMR.1 break at segment ${i}`);
    }
  }
  const effective = receipt.segments.reduce((min, s) =>
    !min || new Date(s.expires_at) < new Date(min) ? s.expires_at : min, null);
  if (effective !== receipt.effective_expires_at) errors.push('CMR.2 effective mismatch');
  if (new Date(now) > new Date(receipt.effective_expires_at)) errors.push('CMR.2 expired at observation');
  for (const e of receipt.consistency_evaluations) {
    if (e.result !== true) errors.push(`CMR.3 constraint ${e.constraint_id} false`);
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  Coordinator,
  STATES,
  TERMINAL_STATES,
  canonicalize,
  sha256Hex,
  segmentHash,
  evaluatePredicate,
  inMemoryAdapters,
  ed25519Signer,
  verifyCrossMatchReceipt
};
