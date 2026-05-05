# RFC 0031: Agent Provisioning, Context Mobility, and Organizational Handoff

**Status:** Draft
**Author(s):** OAP Working Group on Identity and Organizations
**Created:** 2026-05-05
**Working Group:** Identity and Organizations, in coordination with Confidentiality and Compliance, Core Protocol
**Targets:** 1.2
**Affects:** RFC 0003 (Standing Permissions), RFC 0004 (Delegation), RFC 0006 (Personas), RFC 0007 (Projections), RFC 0010 (Memory Exchange), RFC 0027 (Ad Hoc Teamwork), RFC 0030 (Agent Organizations), Safety and Policy Stack paper, OAP-CORE-1.0 Section 14 (Personas), Section 17 (Organizational Policy).

## 1. Summary

This RFC introduces a normative protocol for Agent Provisioning, Context Mobility, and Organizational Handoff. When a natural person operates across multiple institutional contexts, each context may provision a distinct agent with its own model, permissions, data access, billing owner, and compliance obligations. Today this situation produces a fragmented experience in which the person must manually manage separate agents, manually prevent cross context data leakage, and manually coordinate task continuity across context boundaries. This RFC closes the gap by introducing five entities: the **Provisioning Manifest**, the **Context Mobility Envelope**, the **BYOA Attestation**, the **Offboarding Receipt**, and the **Context Bridge Declaration**. Together they formalize the lifecycle of an agent relationship between a person and an institution, from onboarding through daily context switching to offboarding, in a way that composes with the Persona layer of RFC 0006, the Organization model of RFC 0030, the Policy Stack of the Safety and Policy Stack paper, and the Standing Permissions of RFC 0003.

The RFC draws on the organizational theory of Castelfranchi (1998, 2003) on the delegation of authority in institutional contexts, on Singh (1999, 2013) on commitments as the primitive of social interaction in multiagent systems, on Artikis, Sergot, and Pitt (2009) on the computational specification of open agent societies with norm governed institutions, and on the Dignum (2003, 2019) OperA framework already adopted by RFC 0030. The BYOA Attestation primitive draws on the trust establishment literature of Josang, Ismail, and Boyd (2007) on trust and reputation systems and on Sabater and Sierra (2005) on computational trust and reputation models.

## 2. Motivation

A natural person in 2026 operates in at least five institutional contexts that will provision or constrain an AI agent: employer, bank, health insurer, professional association, and government services. Each context has a different model provider, a different compliance regime, a different data residency requirement, and a different billing owner. The person also has a personal agent that is not constrained by any institution.

Without a normative provisioning and context mobility protocol, the person faces four operational failures.

The first failure is **context contamination**. The personal agent learns facts during the workday that are subject to the employer's confidentiality obligations. Without protocol enforced scope isolation, the personal agent may surface those facts in a personal context, violating the employer's Organizational Policy.

The second failure is **redundant onboarding**. Every time the person joins an institution, a new agent must be configured from scratch. The person's preferences, accessibility requirements, communication style, and trusted tool list must be re entered manually because there is no standard format for a provisioning manifest that an institution can publish and a personal agent can consume.

The third failure is **orphaned state**. When the person leaves an institution, the institutional agent's memory, standing permissions, role enactments, and audit trail must be handled according to the institution's data retention policy and the person's data portability rights. Without a normative offboarding receipt, the cleanup is ad hoc and unverifiable.

The fourth failure is **BYOA friction**. Some institutions permit the person to use their personal agent within the institutional context, subject to compliance conditions (audit logging, model certification, data residency). Without a normative attestation format, each institution invents its own compliance check, and the person cannot demonstrate compliance portably.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Provisioning Manifest | A signed declaration by an Organization of the agent configuration it offers or requires for its members. |
| Context Mobility Envelope | A signed message that governs the transition of a Principal's active agent context from one Scope to another. |
| BYOA Attestation | A signed credential issued by an Organization to a Principal's personal agent, certifying that the agent satisfies the Organization's compliance requirements for operation within the organizational Scope. |
| Offboarding Receipt | A signed receipt that records the termination of an agent relationship between a Principal and an Organization, including data disposition. |
| Context Bridge Declaration | A refinement of the Cross Scope Bridge of RFC 0006 section 3.6, specialized for the provisioning lifecycle. |
| Provisioned Agent | An agent instance created or designated by an Organization for a Principal's use within the organizational Scope. |
| Personal Agent | An agent instance owned and controlled by the Principal outside any organizational context. |

### 3.2 Provisioning Manifest Schema

An Organization that provisions agents for its members MUST publish a Provisioning Manifest. The schema is `oap.provisioning.v1`.

```json
{
  "id": "did:web:acme.example#provisioning",
  "schema": "oap.provisioning.v1",
  "organization": "did:web:acme.example",
  "label": { "en": "Acme Corp Employee Agent", "de": "Acme Mitarbeiter Agent" },
  "published_at": "2026-05-05T00:00:00Z",
  "valid_until": "2027-05-05T00:00:00Z",
  "model_policy": {
    "required_provider": "azure-openai",
    "required_model_family": "gpt-4o",
    "minimum_capability_level": "L3",
    "approved_alternatives": ["anthropic-claude-sonnet-4", "google-gemini-2.5-pro"],
    "prohibited_models": [],
    "model_evaluation_required": true,
    "evaluation_framework": "oap.eval.v1"
  },
  "byoa_policy": {
    "permitted": true,
    "conditions": {
      "required_certifications": ["SOC2-Type-II"],
      "data_residency": ["EU"],
      "audit_log_required": true,
      "training_on_org_data": "never",
      "model_evaluation_required": true,
      "attestation_validity_days": 90,
      "re_attestation_cadence": "quarterly"
    }
  },
  "scope_template": {
    "id_pattern": "{principal_fragment}#{org_slug}-{role_id}",
    "industry_profile": "oap.profile.default",
    "data_categories_accessible": ["company_internal", "project_data"],
    "data_categories_prohibited": ["competitor_intelligence_raw"],
    "approval_required_for": ["data_export", "external_sharing", "model_fine_tuning"],
    "default_standing_permissions": [
      { "actions": ["calendar.read", "task.crud", "message.internal"], "max_invocations_per_day": 500 }
    ]
  },
  "context_bridges": {
    "permitted_inbound": [
      { "from_scope_pattern": "#personal", "data_categories": ["calendar_busy_only", "preferred_language", "accessibility_requirements"], "direction": "read_only" }
    ],
    "permitted_outbound": [],
    "bridge_requires_principal_consent": true
  },
  "billing": {
    "owner": "organization",
    "budget_per_principal_eur_month": "500.00",
    "overage_policy": "block_and_notify",
    "personal_use_policy": "prohibited"
  },
  "offboarding": {
    "data_retention_days": 90,
    "principal_data_export_allowed": true,
    "principal_memory_export_allowed": false,
    "credential_revocation_timing": "immediate",
    "standing_permission_revocation_timing": "immediate",
    "role_enactment_revocation_timing": "immediate",
    "transition_handoff_supported": true,
    "transition_data_categories": ["task_titles", "calendar_commitments"]
  },
  "discovery": {
    "well_known_endpoint": "https://acme.example/.well-known/oap-provisioning.json",
    "organization_did_service_type": "OAPProvisioning"
  },
  "signature": "..."
}
```

### 3.3 Discovery

A Personal Agent MUST be able to discover an Organization's Provisioning Manifest through two mechanisms.

The first mechanism is the Well Known endpoint. An Organization MUST publish its Provisioning Manifest at `https://{domain}/.well-known/oap-provisioning.json`.

The second mechanism is DID Service resolution. The Organization's DID Document MAY include a service entry of type `OAPProvisioning` whose `serviceEndpoint` resolves to the Provisioning Manifest.

### 3.4 Context Mobility Envelope

When a Principal transitions their active agent context from one Scope to another, the transition MUST be recorded in a Context Mobility Envelope. The schema is `oap.context-switch.v1`.

```json
{
  "envelope_id": "ctx_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "schema": "oap.context-switch.v1",
  "principal": "did:web:alice.example",
  "timestamp": "2026-05-05T09:00:00Z",
  "from_scope": "did:web:alice.example#personal",
  "to_scope": "did:web:alice.example#acme-engineer",
  "from_agent": {
    "did": "did:key:z6Mk_personal_agent",
    "model_family": "anthropic-claude-opus",
    "controller": "did:web:alice.example"
  },
  "to_agent": {
    "did": "did:key:z6Mk_acme_agent",
    "model_family": "azure-openai-gpt-4o",
    "controller": "did:web:acme.example"
  },
  "context_transfer": {
    "categories_transferred": ["active_task_titles", "schedule_commitments"],
    "categories_prohibited": ["personal_messages", "health_data", "financial_data"],
    "transfer_receipt_id": "urn:oap:receipt:ctx_transfer_001",
    "redaction_profile": "oap.profile.projection.organizational_minimal"
  },
  "active_bridges": ["brg_01HX2QFXR0Q4S8U9V3W7X2Y0Z1"],
  "policy_evaluation": {
    "platform_rules": "pass",
    "org_policy": "pass",
    "scope_policy": "pass",
    "personal_preference": "pass"
  },
  "decision_record_id": "dec_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "signature": "..."
}
```

The Context Mobility Envelope MUST be evaluated against all four layers of the Policy Stack before the transition proceeds. A transition that any layer refuses MUST NOT proceed.

### 3.5 BYOA Attestation

When an Organization permits a Principal to use their personal agent within the organizational Scope, the Organization MUST issue a BYOA Attestation after verifying compliance. The schema is `oap.byoa-attestation.v1`.

```json
{
  "attestation_id": "byoa_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "schema": "oap.byoa-attestation.v1",
  "organization": "did:web:acme.example",
  "principal": "did:web:alice.example",
  "personal_agent": {
    "did": "did:key:z6Mk_personal_agent",
    "model_family": "anthropic-claude-opus",
    "model_version": "4.6",
    "provider_did": "did:web:anthropic.com"
  },
  "compliance_evaluation": {
    "data_residency_verified": true,
    "data_residency_regions": ["EU"],
    "audit_log_capability_verified": true,
    "audit_log_endpoint": "https://alice.example/.well-known/oap-audit",
    "training_on_org_data_policy": "never",
    "training_on_org_data_verified": true,
    "certifications_verified": ["SOC2-Type-II"],
    "model_evaluation_passed": true,
    "model_evaluation_report_uri": "https://acme.example/evaluations/alice-agent-2026-05.json"
  },
  "scope_binding": "did:web:alice.example#acme-engineer",
  "org_policy_enforced": true,
  "restrictions": {
    "model_output_logged": true,
    "memory_wipe_on_offboarding": true,
    "no_cross_scope_memory_persistence": true,
    "max_context_window_tokens": 200000
  },
  "issued_at": "2026-05-05T10:00:00Z",
  "valid_until": "2026-08-05T10:00:00Z",
  "re_attestation_due": "2026-08-01T00:00:00Z",
  "revocable": true,
  "revocation_endpoint": "https://acme.example/.well-known/oap-revocation",
  "signature": "..."
}
```

### 3.6 Offboarding Receipt

When a Principal's relationship with an Organization terminates, the Organization MUST issue an Offboarding Receipt. The schema is `oap.offboarding-receipt.v1`.

```json
{
  "receipt_id": "urn:oap:offboarding:off_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "schema": "oap.offboarding-receipt.v1",
  "organization": "did:web:acme.example",
  "principal": "did:web:alice.example",
  "offboarding_initiated_at": "2026-09-01T00:00:00Z",
  "offboarding_completed_at": "2026-09-01T00:05:00Z",
  "revocations": {
    "scope_revoked": "did:web:alice.example#acme-engineer",
    "standing_permissions_revoked": ["grn_001", "grn_002", "grn_003"],
    "role_enactments_revoked": ["attending-cardiologist"],
    "byoa_attestation_revoked": "byoa_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
    "context_bridges_revoked": ["brg_01HX2QFXR0Q4S8U9V3W7X2Y0Z1"]
  },
  "data_disposition": {
    "org_data_retained_until": "2026-12-01T00:00:00Z",
    "principal_data_exported": true,
    "principal_data_export_receipt_id": "urn:oap:export:exp_001",
    "memory_wiped": true,
    "memory_wipe_method": "cryptographic_erasure",
    "audit_trail_preserved": true,
    "audit_trail_retention_days": 3650
  },
  "transition_handoff": {
    "performed": true,
    "successor_scope": "did:web:alice.example#personal",
    "categories_transferred": ["task_titles", "calendar_commitments"],
    "categories_withheld": ["company_internal", "trade_secrets", "client_data"]
  },
  "signature": "..."
}
```

### 3.7 Context Bridge Declaration

A Context Bridge Declaration is a refinement of the Cross Scope Bridge of RFC 0006 section 3.6. It MUST reference the Provisioning Manifest that authorized it.

```json
{
  "bridge_id": "brg_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "principal": "did:web:alice.example",
  "from_scope": "did:web:alice.example#personal",
  "to_scope": "did:web:alice.example#acme-engineer",
  "provisioning_manifest_id": "did:web:acme.example#provisioning",
  "data_categories": ["calendar_busy_only", "preferred_language"],
  "direction": "read_only",
  "valid_until": "2027-05-05T00:00:00Z",
  "revocable_by_principal": true,
  "revocable_by_organization": true,
  "principal_consent_timestamp": "2026-05-05T09:30:00Z",
  "signature": "..."
}
```

### 3.8 Lifecycle

The provisioning lifecycle has five phases.

**Phase 1: Discovery.** The Principal's personal agent discovers the Organization's Provisioning Manifest via the well known endpoint or DID service resolution. The personal agent presents the Manifest to the Principal for review.

**Phase 2: Onboarding.** The Organization creates a Scope for the Principal per the scope template. If BYOA is permitted and the Principal elects it, the Organization evaluates the personal agent and issues a BYOA Attestation. Otherwise the Organization provisions an institutional agent. Standing Permissions are granted per the scope template. Role Enactments per RFC 0030 are issued. Context Bridges are established with Principal consent.

**Phase 3: Daily operation.** The Principal switches between Scopes using Context Mobility Envelopes. Each switch is evaluated against the Policy Stack. Memory is isolated by Scope tags per RFC 0006 section 3.5. Context Bridges permit controlled data flow.

**Phase 4: Re attestation.** BYOA Attestations expire and must be renewed. The Organization MAY re evaluate the personal agent's compliance at each renewal. Failure to renew results in automatic fallback to a provisioned agent.

**Phase 5: Offboarding.** The Organization revokes all credentials, Standing Permissions, Role Enactments, and Context Bridges. An Offboarding Receipt is issued. Data disposition follows the Provisioning Manifest's offboarding policy. Transition handoff transfers permitted categories to the personal Scope.

### 3.9 Formal Properties

**Theorem 1 (Context Isolation).** Let $S_1$ and $S_2$ be two Scopes of a Principal $P$ with no active Context Bridge between them. Then no data item tagged with $S_1$ is accessible to any agent operating under $S_2$, and no data item tagged with $S_2$ is accessible to any agent operating under $S_1$.

*Proof.* By RFC 0006 section 3.5, every data item carries a `scope_id` tag. By RFC 0006 section 3.5 rule 1, an Action invoked under Scope $X$ cannot read data tagged with Scope $Y$ unless a Cross Scope Bridge exists. By hypothesis no Bridge exists between $S_1$ and $S_2$. Therefore no cross scope data access is possible. $\blacksquare$

**Theorem 2 (Policy Monotonicity under Provisioning).** An Organization's Provisioning Manifest cannot grant permissions that the Organization's Organizational Policy in the Policy Stack does not already permit.

*Proof.* The Provisioning Manifest's `scope_template.default_standing_permissions` create Standing Permissions at Layer 5 of the Policy Stack. By the precedence rules of the Safety and Policy Stack paper section 4, Standing Permissions at Layer 5 cannot loosen restrictions imposed by Organizational Policy at Layer 3 (renumbered from the original four layer model to accommodate Standing Permissions at Layer 5, per RFC 0003 section 3.3). Therefore the Provisioning Manifest's grants are bounded above by Organizational Policy. $\blacksquare$

**Theorem 3 (Offboarding Completeness).** If an Offboarding Receipt is valid according to the `oap.offboarding-receipt.v1` schema, then all access paths from the Principal to organizational data through OAP mechanisms are severed.

*Proof.* The access paths through OAP are: (a) Scope membership, (b) Standing Permissions, (c) Role Enactments, (d) BYOA Attestations, and (e) Context Bridges. The Offboarding Receipt schema requires the `revocations` object to enumerate all five. A valid receipt attests that each has been revoked. By the revocation semantics of RFC 0003 section 3.5 (Standing Permissions), RFC 0030 section 3.3 (Role Enactments), section 3.5 of this RFC (BYOA Attestations), and RFC 0006 section 3.6 (Bridges), revoked credentials MUST NOT permit further access. $\blacksquare$

### 3.10 Composition with Existing RFCs

| Other RFC | Composition |
|-----------|-------------|
| RFC 0003 (Standing Permissions) | The Provisioning Manifest's `scope_template.default_standing_permissions` are instantiated as Standing Permission Grants per RFC 0003. Offboarding revokes them. |
| RFC 0004 (Delegation) | A provisioned agent MAY delegate to the personal agent and vice versa, subject to the Delegation Token constraints of RFC 0004. The delegation scope is intersected with the organizational Scope. |
| RFC 0006 (Personas) | The Provisioning Manifest creates a new Scope for the Principal per section 3.2 of RFC 0006. Context Mobility Envelopes formalize the switch between Scopes. |
| RFC 0007 (Projections) | Context transfer during mobility uses Projections to redact data that the target Scope is not permitted to see. |
| RFC 0010 (Memory Exchange) | Memory items transferred during context switch follow the Memory Exchange Protocol. Items are tagged with the originating Scope and are subject to the receiving Scope's data categories. |
| RFC 0027 (Ad Hoc Teamwork) | A personal agent and a provisioned agent MAY form an ad hoc team per RFC 0027. The Capability Announcement of RFC 0027 section 3.2 MAY include BYOA Attestation claims. |
| RFC 0030 (Organizations) | The Provisioning Manifest references the Organization of RFC 0030. Role Enactments are issued to the provisioned or attested agent. Norms apply to the agent within organizational Scenes. |

## 4. Backward Compatibility

Implementations that do not publish a Provisioning Manifest continue to operate exactly as before. A Principal whose agent does not support Context Mobility Envelopes experiences no change. The five entities introduced by this RFC are opt in. Existing Manifests, Personas, Projections, and Standing Permissions are unaffected.

## 5. Security Considerations

**Provisioning Manifest Forgery.** An adversary may publish a fraudulent Provisioning Manifest to trick a personal agent into onboarding under a malicious Organization. Mitigation: Provisioning Manifests MUST be signed by the Organization's DID and MUST be anchored in the OAP Registry per RFC 0026.

**BYOA Attestation Replay.** An adversary may replay a valid BYOA Attestation after the underlying compliance conditions have changed. Mitigation: BYOA Attestations carry `valid_until` and `re_attestation_due` fields. Tools MUST verify currency before honoring an Attestation.

**Context Switch Injection.** An adversary may inject a fraudulent Context Mobility Envelope to force a context switch. Mitigation: Context Mobility Envelopes MUST be signed by the Principal and verified by both the source and target agents.

**Offboarding Incompleteness.** An Organization may issue an Offboarding Receipt without actually revoking all credentials. Mitigation: the conformance probe of section 7 verifies that revoked credentials are no longer honored after offboarding.

## 6. Privacy Considerations

Provisioning Manifests are organizational documents and are public by design. Context Mobility Envelopes contain the Principal's movement between Scopes and MUST be stored only by the Principal and the participating agents. BYOA Attestations reveal the Principal's personal agent model to the Organization; this disclosure is inherent in the compliance evaluation and is consented to during onboarding. Offboarding Receipts contain the Principal's data disposition and MUST be available to the Principal indefinitely.

## 7. Conformance Impact

Two new conformance probes are added to RFC 0019:

* `behavior/agent-provisioning.test.js` exercises the provisioning lifecycle: discovery, onboarding with BYOA, context switch, re attestation, and offboarding. RECOMMENDED at L3 and REQUIRED at L4.
* `behavior/context-isolation-cross-scope.test.js` verifies that data tagged with one Scope is inaccessible from another Scope without a Bridge. REQUIRED at L4.

## 8. Implementation Experience

The reference Provisioning Service in `reference/server/provisioning/` implements the five schemas of this RFC. A test suite covering a three organization scenario (a technology company, a hospital, and a university) is deployed in `examples/enterprise-agent-provisioning/` and exercised by the conformance probes of section 7.

## 9. Alternatives Considered

* **Embed provisioning in the existing Manifest schema.** Considered and rejected. Manifests describe Tools, not organizational member relationships. Embedding would conflate two abstractions.
* **Rely on OAuth 2.0 scopes for context separation.** Considered and rejected. OAuth scopes are authorization primitives, not identity context primitives. They lack the data tagging, memory isolation, and lifecycle management that context mobility requires.
* **Defer to platform specific solutions (Microsoft Entra Agent ID, FIDO Alliance Agentic Auth).** Considered and rejected. These are single vendor or single concern solutions. OAP provides the cross organizational interoperability layer that composes with them.

## 10. References

* Castelfranchi, C. (1998). Modelling Social Action for AI Agents. *Artificial Intelligence* 103(1-2).
* Castelfranchi, C., Falcone, R. (2003). From Automaticity to Autonomy: The Frontier of Artificial Agents. *Agent Autonomy*, Springer.
* Singh, M. P. (1999). An Ontology for Commitments in Multiagent Systems. *Artificial Intelligence and Law* 7(1).
* Singh, M. P. (2013). Norms as a Basis for Governing Sociotechnical Systems. *ACM Transactions on Intelligent Systems and Technology* 5(1).
* Artikis, A., Sergot, M. J., Pitt, J. V. (2009). Specifying Norm Governed Computational Societies. *ACM Transactions on Computational Logic* 10(1).
* Dignum, V. (2003). *A Model for Organizational Interaction: based on Agents, founded in Logic*. PhD Thesis, Utrecht University.
* Dignum, V. (2019). *Responsible Artificial Intelligence*. Springer.
* Josang, A., Ismail, R., Boyd, C. (2007). A Survey of Trust and Reputation Systems for Online Service Provision. *Decision Support Systems* 43(2).
* Sabater, J., Sierra, C. (2005). Review on Computational Trust and Reputation Models. *Artificial Intelligence Review* 24(1).
* Floridi, L. (2018). Soft Ethics, the Governance of the Digital and the General Data Protection Regulation. *Philosophical Transactions of the Royal Society A* 376.
* Russell, S. J. (2019). *Human Compatible: Artificial Intelligence and the Problem of Control*. Viking.
* FIDO Alliance (2026). Agentic Authentication Technical Working Group Charter.
* Microsoft (2026). Microsoft Entra Agent ID Documentation.
* European Union (2024). Regulation (EU) 2024/1689 (Artificial Intelligence Act).
