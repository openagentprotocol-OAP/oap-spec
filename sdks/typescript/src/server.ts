/**
 * OapServer: the main entry point for building OAP-conformant tool servers.
 *
 * @example
 * ```ts
 * import { OapServer } from '@openagentprotocol/sdk';
 *
 * const server = new OapServer({
 *   did: 'did:web:tool.example',
 *   conformance: 'L1-NC',
 *   name: 'My Tool',
 * });
 *
 * server.action({
 *   id: 'create_task',
 *   intent: 'create a task with title and due date',
 *   inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
 *   handler: async ({ input }) => ({ id: 'task_1', ...input }),
 * });
 *
 * server.serve({ port: 8080 });
 * ```
 */

import express, { type Express, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { MemoryStore } from './storage.js';
import {
  buildDidDocument,
  buildManifest,
  deriveDomain,
  VALID_LEVELS,
} from './manifest.js';
import {
  canonicalize,
  generateUlid,
  loadSigningKey,
  sha256Hex,
  signEd25519,
  type SigningKeys,
} from './signing.js';
import type {
  ActionDefinition,
  ConformanceLevel,
  Incident,
  InvokeEnvelope,
  InvokeResponse,
  PolicyHook,
  Receipt,
  ReceiptStore,
  ServerConfig,
  Subscription,
} from './types.js';

export interface ServeOptions {
  port?: number;
  host?: string;
}

export class OapServer {
  readonly did: string;
  readonly conformance: ConformanceLevel;
  readonly storage: ReceiptStore;
  readonly app: Express;

  private readonly config: ServerConfig;
  private readonly actions = new Map<string, ActionDefinition<any, any>>();
  private readonly keys: SigningKeys;
  private readonly policy?: PolicyHook;
  private readonly adminToken?: string;
  private domain: string;

  constructor(config: ServerConfig) {
    if (!config.did) throw new Error('OapServer config: did is required');
    if (!VALID_LEVELS.includes(config.conformance)) {
      throw new Error(
        `OapServer config: conformance must be one of ${VALID_LEVELS.join(', ')}, got '${config.conformance}'`,
      );
    }

    this.config = config;
    this.did = config.did;
    this.conformance = config.conformance;
    this.storage = config.storage || new MemoryStore();
    this.keys = loadSigningKey(config.signingKeyPem);
    this.policy = config.policy;
    this.adminToken = config.adminToken;
    this.domain = deriveDomain(config, 8080);
    this.app = this.buildApp();
  }

  /** Register an Action handler. */
  action<I = unknown, O = unknown>(definition: ActionDefinition<I, O>): this {
    if (!definition.id) throw new Error('action(): id is required');
    if (typeof definition.handler !== 'function') {
      throw new Error(`action(${definition.id}): handler must be a function`);
    }
    if (this.actions.has(definition.id)) {
      throw new Error(`action(${definition.id}): already registered`);
    }
    this.actions.set(definition.id, definition as ActionDefinition);
    return this;
  }

  /** Returns the JSON manifest served at /.well-known/oap-tool.json. */
  manifest(): Record<string, unknown> {
    return buildManifest(this.config, this.actions, this.domain);
  }

  /** Returns the DID document served at /.well-known/did.json. */
  didDocument(): Record<string, unknown> {
    return buildDidDocument(this.did, this.domain, this.keys.publicJwk);
  }

  /** Start the HTTP server. */
  serve(opts: ServeOptions = {}): { close: () => Promise<void> } {
    const port = opts.port ?? 8080;
    const host = opts.host ?? '0.0.0.0';
    if (!this.config.domain && !this.config.did.startsWith('did:web:')) {
      this.domain = `localhost:${port}`;
    }
    const httpServer = this.app.listen(port, host, () => {
      // eslint-disable-next-line no-console
      console.log(`[oap] listening on http://${host}:${port}`);
      // eslint-disable-next-line no-console
      console.log(`[oap]   Manifest: /.well-known/oap-tool.json`);
      // eslint-disable-next-line no-console
      console.log(`[oap]   DID:      /.well-known/did.json`);
      // eslint-disable-next-line no-console
      console.log(`[oap]   Tool DID: ${this.did}`);
      // eslint-disable-next-line no-console
      console.log(`[oap]   Conformance: ${this.conformance}`);
    });
    return {
      close: () =>
        new Promise<void>((resolve, reject) =>
          httpServer.close((err) => (err ? reject(err) : resolve())),
        ),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────────

  private buildApp(): Express {
    const app = express();
    app.use(express.json({ type: ['application/json', 'application/oap+json'], limit: '2mb' }));

    app.get('/.well-known/oap-tool.json', (_req, res) => res.json(this.manifest()));
    app.get('/.well-known/did.json', (_req, res) => res.json(this.didDocument()));

    app.post('/oap/invoke', (req, res) => this.handleInvoke(req, res));
    app.get('/oap/audit', (req, res) => this.handleAudit(req, res));
    app.post('/oap/data/delete', (req, res) => this.handleDelete(req, res));
    app.get('/oap/incident', (_req, res) => this.handleIncidentList(res));
    app.post('/oap/incident', (req, res) => this.handleIncidentCreate(req, res));
    app.post('/oap/discover', (req, res) => this.handleDiscover(req, res));
    app.get('/oap/billing', (req, res) => this.handleBilling(req, res));
    app.post('/oap/subscribe', (req, res) => this.handleSubscribe(req, res));
    app.delete('/oap/subscribe/:id', (req, res) => this.handleUnsubscribe(req, res));
    app.get('/oap/conformance-receipt', (_req, res) => this.handleConformanceReceipt(res));

    return app;
  }

  private async handleInvoke(req: Request, res: Response): Promise<void> {
    const env = (req.body || {}) as InvokeEnvelope;
    const required = ['oap_version', 'request_id', 'principal_did', 'agent_did', 'action', 'input'];
    const missing = required.filter((k) => env[k] === undefined);
    if (missing.length) {
      res.status(400).json({
        status: 'error',
        error: { code: 'invalid_envelope', message: `Missing: ${missing.join(', ')}` },
      });
      return;
    }
    if (env.oap_version !== '1.0') {
      res.status(400).json({ status: 'error', error: { code: 'unsupported_version' } });
      return;
    }

    const action = this.actions.get(env.action);
    if (!action) {
      res
        .status(404)
        .json({ status: 'error', error: { code: 'action_not_found', message: env.action } });
      return;
    }

    const requiresAuth =
      action.requiresAuth ?? (action.sideEffects === 'write' || action.sideEffects === 'external');
    if (requiresAuth) {
      const auth = req.headers.authorization || '';
      if (!/^Bearer\s+\S+/i.test(auth)) {
        res.status(401).json({
          status: 'error',
          error: { code: 'auth_required', message: 'Bearer token required.' },
        });
        return;
      }
    }

    const principal = env.principal_did;

    if (action.rateLimit?.rpm) {
      const minuteBucket = Math.floor(Date.now() / 60000);
      const key = `${principal}__${action.id}__${minuteBucket}`;
      const next = this.storage.rateBucketIncrement(key, 60_000);
      if (next > action.rateLimit.rpm) {
        res
          .status(429)
          .set('Retry-After', String(60 - Math.floor((Date.now() % 60000) / 1000)))
          .json({ status: 'error', error: { code: 'rate_limited' } });
        return;
      }
    }

    const ctx = { principal, agent: env.agent_did, envelope: env };

    if (this.policy) {
      try {
        const decision = await this.policy({ actionId: action.id, input: env.input, context: ctx });
        if (!decision.allow) {
          const denyReceipt = this.persistReceipt(
            'invocation_denied',
            principal,
            env.agent_did,
            action.id,
            env.input,
            null,
            { id: `pol_${generateUlid()}`, outcome: 'deny', rules: decision.rules || [], reason: decision.reason },
          );
          res
            .status(403)
            .json({
              status: 'error',
              error: { code: 'policy_denied', message: decision.reason || 'Denied by policy hook.' },
              receipt_id: denyReceipt.receipt_id,
            });
          return;
        }
      } catch (err) {
        const e = err as Error;
        res
          .status(500)
          .json({ status: 'error', error: { code: 'policy_error', message: e.message } });
        return;
      }
    }

    let output: unknown;
    try {
      output = await action.handler({ input: env.input as never, context: ctx });
    } catch (err) {
      const e = err as Error & { code?: string; status?: number };
      const errReceipt = this.persistReceipt(
        'invocation_error',
        principal,
        env.agent_did,
        action.id,
        env.input,
        null,
        { id: `pol_${generateUlid()}`, outcome: 'allow', rules: [] },
      );
      res
        .status(e.status || 500)
        .json({
          status: 'error',
          error: { code: e.code || 'internal', message: e.message },
          receipt_id: errReceipt.receipt_id,
        });
      return;
    }

    const receipt = this.persistReceipt(
      'invocation',
      principal,
      env.agent_did,
      action.id,
      env.input,
      output,
    );

    const response: InvokeResponse = {
      oap_version: '1.0',
      request_id: env.request_id,
      response_id: `res_${generateUlid()}`,
      timestamp: new Date().toISOString(),
      tool_did: this.did,
      status: 'success',
      output,
      error: null,
      metering: { duration_ms: 1, units_charged: 0, currency: 'EUR' },
      receipt_id: receipt.receipt_id,
      receipt_hash: receipt.self_hash || '',
    };
    res.status(200).set('Content-Type', 'application/oap+json').json(response);
  }

  private handleAudit(req: Request, res: Response): void {
    const principalDid = req.query.principal_did as string | undefined;
    const limit = Math.min(500, parseInt((req.query.limit as string) || '100', 10));
    const receipts = principalDid
      ? this.storage.receiptsByPrincipal(principalDid, limit)
      : this.storage.allReceipts(limit);
    res.json({ receipts, total: receipts.length });
  }

  private handleDelete(req: Request, res: Response): void {
    const principalDid = req.body?.principal_did;
    if (!principalDid) {
      res.status(400).json({ error: 'principal_did required' });
      return;
    }
    const requestReceivedAt = new Date().toISOString();
    const deleted = this.storage.deleteByPrincipal(principalDid);
    const completedAt = new Date().toISOString();
    const core = {
      receipt_id: `urn:oap:deletion:${randomBytes(12).toString('hex')}`,
      tool_did: this.did,
      principal_did: principalDid,
      request_received_at: requestReceivedAt,
      completed_at: completedAt,
      method: 'cryptographic_erasure',
      scope: {
        data_classes: ['oap_receipts'],
        provenance_tags: ['gdpr-art-17'],
        subprocessors_propagated_to: [],
      },
    };
    const sigValue = signEd25519(this.keys.privateKey, core);
    res
      .status(200)
      .set('Content-Type', 'application/oap+json')
      .json({
        ...core,
        signature: { alg: 'EdDSA', kid: 'oap-signing', value: sigValue },
        _diagnostics: { receipts_deleted: deleted },
      });
  }

  private handleIncidentList(res: Response): void {
    res.json({ incidents: this.storage.listIncidents(100) });
  }

  private handleIncidentCreate(req: Request, res: Response): void {
    if (this.adminToken && req.headers['x-admin-token'] !== this.adminToken) {
      res.status(401).json({ error: 'admin_token_required' });
      return;
    }
    const body = req.body || {};
    const incident: Incident = {
      incident_id: `inc_${generateUlid()}`,
      severity: body.severity || 'minor',
      created_at: new Date().toISOString(),
      ...body,
    };
    this.storage.insertIncident(incident);
    res.status(201).json(incident);
  }

  private handleDiscover(req: Request, res: Response): void {
    const intent = String(req.body?.intent || '').toLowerCase();
    const matches = Array.from(this.actions.values()).map((a) => {
      const haystack = `${a.id} ${a.summary || ''} ${a.intent || ''} ${a.description || ''}`.toLowerCase();
      const tokens = intent.split(/\s+/).filter(Boolean);
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      const confidence = tokens.length === 0 ? 0.4 : Math.min(0.95, 0.4 + 0.55 * (hits / tokens.length));
      return {
        id: a.id,
        summary: a.summary || a.intent || a.id,
        confidence,
        estimated_cost_eur: a.cost?.amount || '0',
      };
    });
    matches.sort((x, y) => y.confidence - x.confidence);
    res.json({ matching_actions: matches });
  }

  private handleBilling(req: Request, res: Response): void {
    const principalDid = req.query.principal_did as string | undefined;
    const sub = principalDid ? this.storage.activeSubscription(principalDid) : null;
    res.json({ subscription: sub, pricing: this.manifest().pricing });
  }

  private handleSubscribe(req: Request, res: Response): void {
    const principalDid = req.body?.principal_did;
    if (!principalDid) {
      res.status(400).json({ error: 'principal_did required' });
      return;
    }
    const sub: Subscription = {
      subscription_id: generateUlid(),
      principal_did: principalDid,
      agent_did: req.body.agent_did || null,
      tool_did: this.did,
      tier: req.body.tier || 'free',
      status: 'active',
      created_at: new Date().toISOString(),
      subscription_token: `oap_sub_live_${randomBytes(16).toString('hex')}`,
    };
    this.storage.insertSubscription(sub);
    this.persistReceipt('subscription', principalDid, sub.agent_did, null, req.body, sub);
    res.json(sub);
  }

  private handleUnsubscribe(req: Request, res: Response): void {
    const ok = this.storage.cancelSubscription(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({
      subscription_id: req.params.id,
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    });
  }

  private handleConformanceReceipt(res: Response): void {
    const claimed = [this.conformance];
    const core = {
      receipt_id: `urn:oap:conformance:${randomBytes(12).toString('hex')}`,
      type: 'conformance',
      timestamp: new Date().toISOString(),
      implementation: {
        did: this.did,
        name: this.config.name || 'OAP Tool',
        version: this.config.version || '0.1.0',
      },
      suite: { name: 'oap-sdk-runtime', version: '0.1.0', spec_version: '1.0' },
      target: { uri: `https://${this.domain}` },
      claimed_levels: claimed,
      profile: this.conformance === 'L1-NC' ? 'non-commercial' : 'standard',
      results_summary: {
        note:
          'Runtime self-attestation only. For an audited Receipt, run oap-spec/test-suite/attest.js in CI.',
      },
      validity: {
        not_before: new Date().toISOString(),
        not_after: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      },
      previous_receipt_hash: 'genesis',
    };
    const sigValue = signEd25519(this.keys.privateKey, core);
    res.json({
      ...core,
      signatures: [{ by: `${this.did}#oap-signing`, alg: 'EdDSA', value: sigValue }],
    });
  }

  private persistReceipt(
    type: string,
    principalDid: string | null,
    agentDid: string | null,
    actionId: string | null,
    input: unknown,
    output: unknown,
    decision?: { id: string; outcome: string; rules: string[]; reason?: string },
  ): Receipt {
    const previous = this.storage.getChainTip();
    const core = {
      receipt_id: `urn:oap:receipt:${generateUlid()}`,
      type,
      timestamp: new Date().toISOString(),
      principal_did: principalDid,
      agent_did: agentDid,
      tool_did: this.did,
      action_id: actionId,
      input_hash: 'sha256:' + sha256Hex(canonicalize(input || {})),
      output_hash: 'sha256:' + sha256Hex(canonicalize(output || {})),
      cost: { amount: '0', currency: 'EUR' },
      policy_decisions: [
        decision || { id: `pol_${generateUlid()}`, outcome: 'allow', rules: ['l1.universal.pass'] },
      ],
      previous_receipt_hash: previous,
    };
    const sigValue = signEd25519(this.keys.privateKey, core);
    const receipt: Receipt = {
      ...core,
      signatures: [{ by: `${this.did}#oap-signing`, alg: 'EdDSA', value: sigValue }],
    };
    const selfHash = 'sha256:' + sha256Hex(canonicalize(receipt));
    receipt.self_hash = selfHash;
    this.storage.insertReceipt(receipt);
    this.storage.setChainTip(selfHash);
    return receipt;
  }
}
