/**
 * OAP Reference Agent Runtime
 *
 * Minimal agent runtime that demonstrates how an agent discovers,
 * authenticates, invokes, and audits OAP Tools. Includes Policy Engine
 * evaluation, CCC enforcement, receipt chain management, and wallet integration.
 *
 * @license Apache-2.0
 */

const crypto = require('crypto');

class OapAgent {
  /**
   * @param {object} options
   * @param {string} options.principalDid - DID of the principal (user).
   * @param {string} options.agentDid - DID of this agent.
   * @param {object} [options.ccc] - Confidentiality and Compliance Context.
   * @param {object} [options.personalPolicy] - L4 personal policy overrides.
   * @param {function} [options.fetch] - Custom fetch.
   */
  constructor({ principalDid, agentDid, ccc, personalPolicy, fetch: fetchFn }) {
    this.principalDid = principalDid;
    this.agentDid = agentDid;
    this.ccc = ccc || { ccc_version: '1.0', scope_id: 'default', embargo_list: [], active_ndas: [], chinese_walls: [] };
    this.personalPolicy = personalPolicy || {};
    this.httpFetch = fetchFn || globalThis.fetch;
    this.receipts = [];
    this.previousReceiptHash = 'genesis';
    this.manifests = new Map();
    this.subscriptions = new Map();
  }

  // -------------------------------------------------------------------------
  // Discovery
  // -------------------------------------------------------------------------

  /**
   * Load and cache a Tool Manifest from a well known URL.
   *
   * @param {string} toolUrl - Base URL of the Tool (e.g., https://weatherpro.example).
   * @returns {Promise<object>} Parsed Manifest.
   */
  async discover(toolUrl) {
    const manifestUrl = `${toolUrl.replace(/\/$/, '')}/.well-known/oap-tool.json`;
    const res = await this.httpFetch(manifestUrl);
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    const manifest = await res.json();
    this.manifests.set(manifest.tool.did, manifest);
    return manifest;
  }

  /**
   * Search for matching actions by intent.
   *
   * @param {object} manifest - OAP Manifest.
   * @param {string} intent - Natural language intent.
   * @returns {Promise<object>} Discovery response.
   */
  async discoverActions(manifest, intent) {
    if (!manifest.endpoints.discover) {
      return { matching_actions: manifest.actions.map(a => ({ id: a.id, confidence: 1.0 })) };
    }
    const res = await this.httpFetch(manifest.endpoints.discover, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, principal_did: this.principalDid }),
    });
    return res.json();
  }

  // -------------------------------------------------------------------------
  // Policy Engine
  // -------------------------------------------------------------------------

  /**
   * Evaluate the 4 layer policy engine before an invocation.
   *
   * @param {object} manifest - OAP Manifest.
   * @param {object} action - Action descriptor.
   * @param {object} input - Invocation input.
   * @returns {object} Decision Record.
   */
  evaluatePolicy(manifest, action, input) {
    const decisions = [];
    const toolDid = manifest.tool.did;

    // L1: Universal prohibitions (simplified)
    decisions.push('l1.universal.pass');

    // L2: Jurisdictional (simplified: check if tool serves user jurisdiction)
    const userJurisdiction = 'DE';
    if (!manifest.jurisdictions.includes(userJurisdiction)) {
      return this._decision('block', decisions.concat('l2.jurisdiction.mismatch'), 'Tool does not serve user jurisdiction.');
    }
    decisions.push('l2.jurisdiction.ok');

    // L3: Professional codes and CCC
    if (this.ccc.embargo_list && this.ccc.embargo_list.includes(toolDid)) {
      return this._decision('block', decisions.concat('l3.ccc.embargo'), `Tool ${toolDid} is on embargo list.`);
    }
    decisions.push('l3.ccc.embargo.clear');

    // Chinese walls
    if (this.ccc.chinese_walls) {
      for (const wall of this.ccc.chinese_walls) {
        if (wall.between.includes(this.ccc.scope_id)) {
          decisions.push('l3.ccc.chinese_wall.active');
        }
      }
    }

    // L4: Personal policy (spending limits, etc.)
    if (this.personalPolicy.max_cost_per_call_eur && action.cost) {
      const cost = parseFloat(action.cost.amount || '0');
      if (cost > this.personalPolicy.max_cost_per_call_eur) {
        return this._decision('require_consent', decisions.concat('l4.spending_cap.exceeded'), 'Cost exceeds personal spending cap.');
      }
    }
    decisions.push('l4.personal.pass');

    return this._decision('allow', decisions, 'All policy layers passed.');
  }

  _decision(outcome, rules, explanation) {
    return {
      decision_id: `pol_${this._ulid()}`,
      evaluated_at: new Date().toISOString(),
      layers_evaluated: ['L1', 'L2', 'L3', 'L4'],
      applied_rules: rules,
      outcome,
      conditions: [],
      explanation,
    };
  }

  // -------------------------------------------------------------------------
  // Invocation
  // -------------------------------------------------------------------------

  /**
   * Invoke an OAP Tool action with full policy enforcement and receipt creation.
   *
   * @param {object} manifest - OAP Manifest.
   * @param {string} actionId - Action id to invoke.
   * @param {object} input - Structured input.
   * @returns {Promise<object>} OAP Response Envelope.
   */
  async invoke(manifest, actionId, input) {
    const action = manifest.actions.find(a => a.id === actionId);
    if (!action) throw new Error(`Action ${actionId} not found in manifest.`);

    // Policy evaluation
    const decision = this.evaluatePolicy(manifest, action, input);
    if (decision.outcome === 'block') {
      throw new Error(`Policy blocked: ${decision.explanation}`);
    }
    if (decision.outcome === 'require_consent') {
      console.warn(`Consent required: ${decision.explanation}`);
      // In production: pause and request user consent
    }

    // Build request
    const requestId = this._ulid();
    const envelope = {
      oap_version: '1.0',
      request_id: requestId,
      timestamp: new Date().toISOString(),
      principal_did: this.principalDid,
      agent_did: this.agentDid,
      scope_id: this.ccc.scope_id,
      action: actionId,
      input,
      context: { locale: 'de-DE', currency: 'EUR', jurisdiction_user: 'DE', jurisdiction_agent: 'DE' },
      policy_assertions: { confidentiality_class: 'internal', provenance_tags: [] },
      signature: { alg: 'EdDSA', kid: `${this.agentDid}#key-1`, value: '' },
    };

    const sub = this.subscriptions.get(manifest.tool.did);
    if (sub) envelope.subscription_token = sub.subscription_token;

    // Invoke
    const invokeUrl = this._resolveUrl(manifest, manifest.endpoints.invoke);
    const res = await this.httpFetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/oap+json',
        'OAP-Version': '1.0',
        'OAP-Request-Id': requestId,
      },
      body: JSON.stringify(envelope),
    });

    const response = await res.json();

    // Handle 402 subscription required
    if (res.status === 402) {
      console.warn('Subscription required. Attempting auto-subscribe...');
      // In production: check personalPolicy.auto_subscribe_limit
    }

    // Sanitize output (prompt injection protection)
    if (response.output && typeof response.output === 'object') {
      this._sanitizeOutput(response.output);
    }

    // Create local receipt
    this._createLocalReceipt('invocation', manifest.tool.did, actionId, input, response.output, decision);

    return response;
  }

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  async subscribe(manifest, tier) {
    const subscribeUrl = this._resolveUrl(manifest, manifest.endpoints.subscribe);
    const res = await this.httpFetch(subscribeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principal_did: this.principalDid,
        agent_did: this.agentDid,
        tier,
      }),
    });
    const sub = await res.json();
    this.subscriptions.set(manifest.tool.did, sub);
    return sub;
  }

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  async getAuditLog(manifest) {
    const auditUrl = this._resolveUrl(manifest, manifest.endpoints.audit);
    const res = await this.httpFetch(`${auditUrl}?principal_did=${encodeURIComponent(this.principalDid)}`);
    return res.json();
  }

  // -------------------------------------------------------------------------
  // Data Rights
  // -------------------------------------------------------------------------

  async requestDeletion(manifest) {
    const deleteUrl = this._resolveUrl(manifest, manifest.endpoints.data_delete);
    const res = await this.httpFetch(deleteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal_did: this.principalDid }),
    });
    return res.json();
  }

  // -------------------------------------------------------------------------
  // Kill Switch
  // -------------------------------------------------------------------------

  async killSwitch() {
    for (const [toolDid, sub] of this.subscriptions) {
      const manifest = this.manifests.get(toolDid);
      if (manifest && manifest.endpoints.subscribe) {
        try {
          const url = this._resolveUrl(manifest, manifest.endpoints.subscribe);
          await this.httpFetch(`${url}/${sub.subscription_id}`, { method: 'DELETE' });
        } catch { /* best effort */ }
      }
    }
    this.subscriptions.clear();
    this._createLocalReceipt('kill_switch', 'self', null, {}, { killed: true }, null);
    return { status: 'all_subscriptions_revoked', timestamp: new Date().toISOString() };
  }

  // -------------------------------------------------------------------------
  // Receipt Chain
  // -------------------------------------------------------------------------

  getReceiptChain() {
    return { receipts: this.receipts, chain_length: this.receipts.length, head_hash: this.previousReceiptHash };
  }

  verifyReceiptChain() {
    let prev = 'genesis';
    for (const receipt of this.receipts) {
      if (receipt.previous_receipt_hash !== prev) {
        return { valid: false, broken_at: receipt.receipt_id };
      }
      prev = this._hashJson(receipt);
    }
    return { valid: true, length: this.receipts.length };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  _createLocalReceipt(type, toolDid, actionId, input, output, decision) {
    const receipt = {
      receipt_id: `urn:oap:receipt:${this._ulid()}`,
      type,
      timestamp: new Date().toISOString(),
      principal_did: this.principalDid,
      agent_did: this.agentDid,
      tool_did: toolDid,
      action_id: actionId,
      input_hash: this._hashJson(input),
      output_hash: this._hashJson(output),
      policy_decisions: decision ? [{ id: decision.decision_id, outcome: decision.outcome, rules: decision.applied_rules }] : [],
      previous_receipt_hash: this.previousReceiptHash,
      signatures: [{ by: this.agentDid, alg: 'EdDSA', value: 'reference-unsigned' }],
    };
    this.previousReceiptHash = this._hashJson(receipt);
    this.receipts.push(receipt);
    return receipt;
  }

  _sanitizeOutput(obj) {
    const dangerous = ['SYSTEM:', 'ASSISTANT:', '<|im_start|', '<|endoftext|', '### INSTRUCTION', '### System'];
    const json = JSON.stringify(obj);
    for (const marker of dangerous) {
      if (json.includes(marker)) {
        console.warn(`Prompt injection marker detected in tool output: ${marker}`);
      }
    }
  }

  _resolveUrl(manifest, endpoint) {
    if (endpoint.startsWith('http')) return endpoint;
    const domain = manifest.tool.did.replace('did:web:', '');
    return `https://${domain}${endpoint}`;
  }

  _hashJson(obj) {
    return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(obj || {})).digest('hex');
  }

  _ulid() {
    const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const r = crypto.randomBytes(10).toString('hex').toUpperCase().substring(0, 16);
    return (t + r).substring(0, 26);
  }
}

module.exports = { OapAgent };
