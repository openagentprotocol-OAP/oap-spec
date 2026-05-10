# RFC 0030: Agent Organizations, Roles, Scenes, and Norms

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Identity and Organizations
**Created:** 2026-05-05
**Targets:** 1.2
**Affects:** RFC 0006 (Personas), RFC 0007 (Projections), RFC 0008 (Workflows), RFC 0003 (Standing Permissions), RFC 0028 (Model Risk and Symbiotic Autonomy), Safety and Policy Stack paper, OAP-CORE-1.0 Section 14 (Personas), Section 17 (Organizational Policy), Section 30 (Regulatory Mapping).

## 1. Summary

This RFC introduces a first-class **Agent Organization** model into OAP. Until this RFC, organizational structure was represented implicitly through Personas (RFC 0006), Affiliations metadata in Projections (RFC 0007), Standing Permissions (RFC 0003), and Org Policy in the Policy Stack. These mechanisms are sufficient for two-party commercial interactions and for free-form multi-agent collaboration (RFC 0027), but they cannot express the structural constraints that regulated, hierarchical, or role-bound institutions require. A hospital cannot say "only an attending cardiologist may authorize cardiac surgery" as a structural rule; it can only say so as an ad hoc policy that any new participant must rediscover.

This RFC closes that gap by introducing four entities, signed and registered in the same way as Manifests and Personas, that together formalize an Agent Organization in the sense of Dignum (2003, 2017, 2019) and the OperA / ALIVE / OperettA tradition of multi-agent organizational modeling. The four entities are: **Role**, **Scene**, **Norm**, and **Organization**. A Role is a typed position an Agent can occupy; a Scene is a structured interaction context that prescribes which Roles participate; a Norm is an obligation, prohibition, or permission attached to a Role within a Scene; and an Organization binds all three together with a governance contract.

The RFC also formalizes the **ART principles** of Dignum (Accountability, Responsibility, Transparency) at the protocol level, with **Responsibility** defined as the protocol-level obligation of an Agent to refuse actions exceeding its published competence and to escalate proactively, complementing the Accountability mechanisms of RFC 0009 (Reputation) and the Transparency mechanisms of OAP-CORE Section 20 (Decision Records).

The RFC introduces a single new conformance probe and one new schema, and is fully backward compatible: implementations that do not declare an Organization continue to operate exactly as before.

## 2. Motivation

OAP today supports three patterns of multi-agent interaction:

1. **Two-party commercial transactions** (RFC 0001 Sessions, RFC 0002 Negotiation, RFC 0014 Commerce Primitives), where the parties are individual Agents.
2. **Sub-agent delegation** (RFC 0004), where a parent Agent spawns subordinate Agents that inherit a restricted scope.
3. **Ad hoc teamwork** (RFC 0027), where Agents that have never met coordinate through capability announcements and convention discovery.

None of these patterns expresses the structural reality of a regulated institution. A hospital is not a collection of independent Agents, nor a delegation tree, nor an ad hoc team. It is a structured organization with typed Roles (attending physician, resident, nurse, pharmacist), structured Scenes (ward round, surgical authorization, prescription dispensing, discharge planning), and Norms attached to Role-Scene pairs (only an attending physician may sign a discharge order; only a pharmacist may dispense a Schedule II controlled substance). The same is true of a law firm (partner, associate, paralegal), a bank (trader, risk officer, compliance officer), a research lab (principal investigator, postdoc, graduate student), and many other settings where OAP is intended to operate.

Without a first-class Organization model, an OAP implementation that wishes to deploy in such a setting must encode the structure as ad hoc Org Policy entries that every counterparty must independently parse and trust. This forfeits interoperability across the institutional boundary, prevents conformance testing of organizational constraints, and makes the protocol unappealing to the very class of users (regulated institutions) that have the most to gain from a verifiable agent infrastructure.

The mature literature on agent organizations, beginning with Dignum (2003), formalizes exactly the structure that is missing. Adopting the OperA framework as the schema layer, with adaptations for cryptographic signing and Registry anchoring (RFC 0026), is the minimal step that closes the gap without inventing a new theoretical apparatus.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Organization | A signed declaration of a structured agent collective, conforming to the Organization schema of section 3.6, anchored in the Registry of RFC 0026. |
| Role | A typed position within an Organization, conforming to the Role schema of section 3.3. A Role is the OAP analog of Dignum's *role* in OperA. |
| Scene | A structured interaction context, conforming to the Scene schema of section 3.4, that prescribes which Roles participate and what transitions are permitted. The OAP analog of Dignum's *scene* in OperA. |
| Norm | An obligation, prohibition, or permission attached to a Role within a Scene, conforming to the Norm schema of section 3.5. The OAP analog of Dignum's *norm* in OperA. |
| Role Enactment | A signed claim by an Agent that it occupies a particular Role within an Organization, valid for a stated time window. |
| Organizational Policy | The set of Norms in force within a Scene, evaluated by the Policy Stack of the Safety and Policy Stack paper at the Org Policy layer. |
| ART Principles | Accountability, Responsibility, Transparency, in the sense of Dignum (2017, 2019). |
| Responsibility | The protocol-level obligation of an Agent to refuse actions exceeding its published competence and to escalate proactively in the sense of section 3.8. |

### 3.2 Architecture and Composition

An Organization is composed of a finite, totally ordered set of Roles, a finite set of Scenes, and a finite set of Norms each attached to a (Role, Scene) pair. A Scene declares the set of Roles that may participate, the permitted transitions between Scene states, and a termination predicate. A Norm declares one of the deontic operators **OBLIGATION**, **PROHIBITION**, or **PERMISSION** over a parameterized action expression.

The composition rules are:

* Every Norm in an Organization MUST refer to a Role and a Scene that are declared in the same Organization.
* Every Scene in an Organization MUST refer only to Roles declared in the same Organization.
* The Norm set MUST be deontically consistent in the sense of section 3.7: no Role-Scene pair may simultaneously carry an OBLIGATION and a PROHIBITION over the same action expression.
* An Organization MAY import Roles, Scenes, or Norms from another Organization by reference; the imported entities are evaluated as if locally declared.

The rules of section 3.5 of the Safety and Policy Stack paper apply: Org Policy (which now includes Norms) lies between Platform Policy and Scope Policy in the precedence order. Norms tighten what is permitted; they do not loosen Platform Policy.

### 3.3 Role Schema

A Role is a JSON document with the following fields. The schema is `oap.role.v1`.

```json
{
  "id": "did:web:hospital.example.org#role/attending-cardiologist",
  "organization": "did:web:hospital.example.org",
  "label": {
    "en": "Attending Cardiologist",
    "de": "Oberarzt Kardiologie"
  },
  "supersedes": ["did:web:hospital.example.org#role/cardiologist"],
  "qualifications": [
    {
      "type": "credential",
      "claim": "https://schema.org/MedicalSpecialty/Cardiology",
      "issuer_constraint": "did:web:bundesaerztekammer.de"
    },
    {
      "type": "credential",
      "claim": "board_certification:cardiology",
      "issuer_constraint": "did:web:abim.org"
    }
  ],
  "competence": {
    "actions": ["authorize_cardiac_surgery", "prescribe_anticoagulant", "interpret_ecg"],
    "confidence_floor": 0.85
  },
  "ranking": 4,
  "valid_from": "2026-05-01T00:00:00Z",
  "valid_until": "2031-05-01T00:00:00Z"
}
```

The `qualifications` field is the verifiable predicate an Agent must satisfy to enact the Role. The `competence` field is the protocol-level published competence in the sense of RFC 0028 section 3.5 (`agent_confidence_score`); actions outside the listed set MUST be refused under the Responsibility principle of section 3.8. The `ranking` field totally orders Roles within the Organization for the conflict resolution of section 3.7. The `supersedes` field declares Role inheritance: an Agent enacting a superseding Role automatically enacts all superseded Roles.

### 3.4 Scene Schema

A Scene is a JSON document with the following fields. The schema is `oap.scene.v1`.

```json
{
  "id": "did:web:hospital.example.org#scene/surgical-authorization",
  "organization": "did:web:hospital.example.org",
  "label": { "en": "Surgical Authorization", "de": "Operationsfreigabe" },
  "participants": [
    { "role": "attending-cardiologist", "cardinality": 1, "necessity": "required" },
    { "role": "anesthesiologist", "cardinality": 1, "necessity": "required" },
    { "role": "patient-or-proxy", "cardinality": 1, "necessity": "required" },
    { "role": "scrub-nurse", "cardinality": "1..n", "necessity": "optional" }
  ],
  "states": ["proposed", "informed-consent", "anesthesia-cleared", "authorized", "withdrawn"],
  "initial_state": "proposed",
  "transitions": [
    { "from": "proposed", "to": "informed-consent", "trigger": "patient_acknowledged" },
    { "from": "informed-consent", "to": "anesthesia-cleared", "trigger": "anesthesia_assessed" },
    { "from": "anesthesia-cleared", "to": "authorized", "trigger": "attending_signed" },
    { "from": "*", "to": "withdrawn", "trigger": "any_required_party_withdrew" }
  ],
  "terminal_states": ["authorized", "withdrawn"],
  "termination_predicate": "current_state in terminal_states",
  "audit_record_required": true
}
```

A Scene is in effect a finite state machine over the participants. The `cardinality` and `necessity` fields constrain enactment: a Scene with a `required` participant cannot proceed to non-initial states without an Agent that has signed a Role Enactment for the relevant Role. The `audit_record_required` field, if true, requires that a Decision Record under OAP-CORE Section 20 be written upon every transition.

### 3.5 Norm Schema

A Norm is a JSON document with the following fields. The schema is `oap.norm.v1`.

```json
{
  "id": "did:web:hospital.example.org#norm/cardiac-surgery-authorization",
  "organization": "did:web:hospital.example.org",
  "scene": "surgical-authorization",
  "role": "attending-cardiologist",
  "deontic": "OBLIGATION",
  "action": {
    "expression": "sign_authorization(target=cardiac_surgery)",
    "preconditions": ["informed_consent_recorded", "anesthesia_cleared"]
  },
  "violation_consequence": {
    "type": "scene_termination",
    "withdraw_to_state": "withdrawn",
    "notify_roles": ["chief-of-surgery", "compliance-officer"]
  },
  "evidence_required": "decision_record_with_attending_signature"
}
```

The `deontic` field is one of OBLIGATION, PROHIBITION, or PERMISSION. Standard deontic logic semantics apply: an OBLIGATION that is not discharged before Scene termination produces a violation; a PROHIBITION that is breached produces a violation; a PERMISSION grants explicit standing where no OBLIGATION applies. Violations are first-class events, recorded as Decision Records and (when configured) reflected in Reputation under RFC 0009.

### 3.6 Organization Schema

An Organization is a JSON document with the following fields. The schema is `oap.organization.v1`.

```json
{
  "id": "did:web:hospital.example.org",
  "label": { "en": "Example University Hospital", "de": "Universitätsklinikum Beispiel" },
  "kind": "institution",
  "regulatory_regime": ["EU-AI-ACT-Annex-III-5b", "GDPR", "MDR-2017-745"],
  "roles": ["attending-cardiologist", "anesthesiologist", "scrub-nurse", "patient-or-proxy", "compliance-officer", "chief-of-surgery"],
  "scenes": ["surgical-authorization", "ward-round", "discharge-planning"],
  "norms": ["cardiac-surgery-authorization", "controlled-substance-dispensing", "discharge-summary-completeness"],
  "governance_contract": "https://hospital.example.org/oap-governance-v1.pdf",
  "registry_anchor": "did:web:hospital.example.org#registry-entry-2026-05",
  "superseded_by": null,
  "valid_from": "2026-05-01T00:00:00Z"
}
```

The `kind` field is one of `institution`, `consortium`, `network`, or `community`. The `regulatory_regime` field declares the legal framework under which the Organization operates and feeds into the EU AI Act mapping of RFC 0028 Annex B. The `governance_contract` field is a stable URL to the legal document that binds the Organization's signing authorities. The `registry_anchor` field anchors the Organization in the Registry of RFC 0026.

### 3.7 Deontic Consistency and Norm Conflict Resolution

The Norm set of an Organization MUST satisfy the following consistency requirement.

**Definition.** Two Norms $n_1$ and $n_2$ on the same (Role, Scene) pair *conflict* iff one is OBLIGATION and the other is PROHIBITION over action expressions whose unification is non-empty.

**Theorem D.1 (Decidability of Norm Consistency).** *Norm consistency is decidable in time polynomial in the size of the Norm set, when action expressions are restricted to first-order terms over a finite signature.*

The proof is by reduction to the unification problem on first-order terms, which is decidable in linear time (Paterson and Wegman 1978). The OAP signature is finite by construction (it is the union of action names declared in the Roles' `competence.actions` fields), so the precondition is satisfied. $\blacksquare$

When two Norms on different Role-Scene pairs both apply to the same action by an Agent enacting two Roles simultaneously (a permitted situation under section 3.3 Role inheritance), conflict is resolved by the lexicographic order on Role `ranking`: the Norm attached to the higher-ranked Role wins. If rankings are equal, the Organization MUST declare an explicit precedence list; absence of declaration is a Validation Error and the Organization is rejected at Registry submission.

### 3.8 The Responsibility Principle

This section formalizes the Responsibility component of the ART principles at the protocol level.

**Definition (Responsibility).** An Agent satisfies the Responsibility principle iff, for every requested action $a$, the Agent:

1. Refuses $a$ when $a$ is outside the `competence.actions` set of every Role the Agent currently enacts within a relevant Scene;
2. Refuses $a$ when the Agent's `agent_confidence_score` for $a$, defined in RFC 0028 section 3.5, falls below the `confidence_floor` of every applicable Role;
3. Proactively escalates under RFC 0028 section 3.6 (proactive escalation) when conditions 1 or 2 apply;
4. Records the refusal or escalation in a Decision Record under OAP-CORE Section 20.

**Theorem D.2 (Composition of Accountability, Responsibility, Transparency).** *An Agent satisfying the Responsibility principle of this section, the Accountability mechanisms of RFC 0009 (Reputation), and the Transparency mechanisms of OAP-CORE Section 20 (Decision Records) jointly satisfies the ART principles of Dignum (2017, 2019). The Manifest declaration of Responsibility compliance is verifiable through the conformance probe of section 7 and is auditable through the same Decision Record chain that supports Accountability and Transparency.*

The proof is an unrolling of the three definitions: Accountability is the property that every action is attributable to a signed Agent (Reputation receipts), Transparency is the property that every action carries a Decision Record (Section 20), and Responsibility is the property that no action is taken outside competence (this section). The same Decision Record chain serves all three. $\blacksquare$

### 3.9 Composition with Existing RFCs

| Other RFC | Composition |
|-----------|-------------|
| RFC 0006 (Personas) | A Persona MAY declare a list of `enacted_roles`, each referencing a Role within an Organization. The Persona acts within the union of competences of its enacted Roles. |
| RFC 0007 (Projections) | The `affiliations` field of a Projection MAY include `role_enactments`, signed claims that the Agent enacts specific Roles. Projections continue to be evaluated by the Privacy mechanisms of RFC 0007 unchanged. |
| RFC 0008 (Workflows) | A Workflow MAY declare a hosting Scene; participants are then constrained to enact compatible Roles. The Shapley value distribution of RFC 0008 Appendix B operates on Roles rather than raw participant identities, providing organization-aware credit assignment. |
| RFC 0003 (Standing Permissions) | A Standing Permission MAY be granted to a Role rather than to a specific Agent; any Agent enacting that Role then inherits the permission for the duration of enactment. This is the OAP realization of role-based access control. |
| RFC 0027 (Ad Hoc Teamwork, revision 2) | The Capability Announcement of RFC 0027 section 3.2 MAY include a Role enactment claim (`evidence.role_enactment`), allowing ad hoc teams to discover that a stranger occupies a known Role within a known Organization. The Three-Tier Convention Discovery Handshake of RFC 0027 section 3.4 composes with Organizational Norms: the feasible Convention set $\mathcal{F}$ of Tier 3 is restricted to Conventions consistent with active Norms in the hosting Scene, and Norm violations detected during inference trigger a Convention Drift Receipt (RFC 0027 section 3.4b). The AHT Fallback Policy declared per RFC 0027 section 3.4a MAY differ across Roles within the same Organization, allowing institutional Role enactment to govern fallback behavior. |
| RFC 0028 (Model Risk and Symbiotic Autonomy) | The Responsibility principle of section 3.8 of this RFC operationalizes the symbiotic-autonomy threshold logic of RFC 0028 section 3.6 in the organizational setting. RFC 0028 Annex B (added in this RFC's commit set) maps Organization `regulatory_regime` values to EU AI Act articles. |
| RFC 0029 (Axiomatic Foundations) | The $k$-implementation analysis of RFC 0029 Theorem C.1 applies to Organizations: the Standing Permissions granted to Roles are the operational subsidies that implement cooperative Norm compliance. |

## 4. Backward Compatibility

Implementations that do not declare an Organization continue to operate exactly as before. The Role, Scene, Norm, and Organization entities are opt-in. An Agent that does not enact any Role behaves identically to a pre-RFC-0030 Agent. Existing Manifests, Personas, Projections, and Standing Permissions are unaffected.

## 5. Security Considerations

**Role Forgery.** An Agent that falsely claims to enact a Role gains the permissions and competence floor of that Role. Mitigation: Role Enactments MUST be signed by the Organization's signing authority (recorded in the `governance_contract`) and MUST be verifiable against the Registry. Implementations MUST reject Role Enactment claims that are not anchored to a current, non-revoked Organization registration.

**Norm Sandbagging.** A regulated Organization MAY attempt to publish a permissive Norm set to bypass external regulation. Mitigation: the `regulatory_regime` field is a public commitment; the Conformance probe of section 7 verifies that the declared Norms cover the obligations the regime requires. Discrepancies are observable to peer witnesses under RFC 0019.

**Scene Hijacking.** An adversary may attempt to inject themselves into a Scene by claiming a Role they do not enact. Mitigation: the `cardinality` and `necessity` constraints of section 3.4 are enforced at the protocol level; the Scene state machine refuses transitions when required participants are absent or unverified.

**Deontic Consistency Bypass.** An Organization MAY attempt to publish a Norm set with hidden conflicts. Mitigation: Theorem D.1 shows consistency is decidable in polynomial time; the Registry validation pipeline of RFC 0026 MUST run the consistency check at submission and reject inconsistent sets.

## 6. Privacy Considerations

Role Enactments are public claims about an Agent's position within an Organization. Implementations that wish to keep enactments confidential MUST use Privacy-Preserving Projections under RFC 0007, which already supports redaction of organizational affiliations. The Organization, Role, Scene, and Norm schemas themselves are public by design, because their interoperability value depends on shared knowledge.

## 7. Conformance Impact

One new conformance probe is added to RFC 0019:

* `behavior/organization-norm-compliance.test.js` runs a synthetic Scene with declared Norms and verifies that the implementation refuses prohibited actions, fulfills obligated actions, and records all transitions in Decision Records. The probe is RECOMMENDED at L3 and REQUIRED at L4. It is bundled into the L5-FINANCE Tier of RFC 0028.

A new conformance level suffix is **not** introduced by this RFC. Organizations are an opt-in feature; conformance with this RFC at L4 means "the implementation correctly enforces Organization, Role, Scene, and Norm semantics when the deployer has declared them."

## 8. Implementation Experience

The reference Organization Service in `reference/server/organization-service/` implements the four schemas of this RFC. A test suite of three Organizations (a small hospital, a law firm, a research lab) is deployed in `examples/organizations/` and is exercised by the `organization-norm-compliance.test.js` probe. Norm consistency checking runs in O(n log n) on the test set, well within the polynomial bound of Theorem D.1.

## 9. Alternatives Considered

* **Embed organizational structure in Manifest extensions.** Considered and rejected. Manifests describe Tools, not collectives. Embedding would conflate two abstractions and prevent independent versioning of the Organization.
* **Adopt a foreign organizational standard (BPMN, ArchiMate).** Considered and rejected. BPMN and ArchiMate are workflow and architecture languages, not deontic-norm languages. They lack the OBLIGATION/PROHIBITION/PERMISSION primitives that the regulated settings require.
* **Defer to a future major version.** Considered and rejected. The expressivity gap is blocking for healthcare, legal, and finance deployments. Adoption today is the lowest-cost path; the schema is opt-in and backward compatible.

## 10. References

* Dignum, V. (2003). *A Model for Organizational Interaction: based on Agents, founded in Logic*. PhD Thesis, Utrecht University.
* Dignum, V., Vazquez-Salceda, J., Dignum, F. (2005). OMNI: Introducing Social Structure, Norms and Ontologies into Agent Organizations. *Lecture Notes in Computer Science* 3346.
* Dignum, V. (2017). Responsible Autonomy. *Proceedings of the 26th International Joint Conference on Artificial Intelligence (IJCAI)*.
* Dignum, V. (2019). *Responsible Artificial Intelligence: How to Develop and Use AI in a Responsible Way*. Springer.
* Aldewereld, H., Dignum, V. (2011). OperettA: Organization-Oriented Development Environment. *Languages, Methodologies, and Development Tools for Multi-Agent Systems (LADS)*.
* Esteva, M., Rosell, B., Rodríguez-Aguilar, J. A., Arcos, J. L. (2004). AMELI: An Agent-based Middleware for Electronic Institutions. *AAMAS*.
* von Wright, G. H. (1951). Deontic Logic. *Mind* 60(237).
* Paterson, M. S., Wegman, M. N. (1978). Linear Unification. *Journal of Computer and System Sciences* 16(2).
* European Union (2024). Regulation (EU) 2024/1689 (Artificial Intelligence Act).
* European Commission High-Level Expert Group on AI (2019). *Ethics Guidelines for Trustworthy AI*.
* European Commission High-Level Expert Group on AI (2020). *Assessment List for Trustworthy AI (ALTAI)*.
