# RFC 0010: Memory Exchange Protocol

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Core Protocol
**Created:** 2026-05-03
**Working Group:** Core Protocol
**Targets:** 1.2

## 1. Summary

This RFC defines a normative protocol for exchanging structured memory between Agents. Memory Exchange enables a Principal to grant another Agent access to a defined slice of the Principal's Agent memory store, including conversational history, learned preferences, and semantic embeddings. Memory Exchange is the substrate for delegation that requires context, hand off between assistants, and continuity across vendor changes.

## 2. Motivation

A user who wants to delegate a project to a contractor's Agent currently faces a choice between forwarding raw chat logs (excessive disclosure, no privacy filter) and rebriefing the contractor manually (defeats the purpose of agent assistance). Production deployments solve this with bespoke memory export formats, but the formats are not interoperable.

Standardizing memory exchange unlocks four scenarios:

1. **Delegated Project Briefing.** A Sub Agent receives the relevant context for a delegated project without seeing unrelated personal data.
2. **Vendor Migration.** A user moves from Assistant A to Assistant B and brings their accumulated context with them.
3. **Team Continuity.** A team member's accumulated knowledge survives their departure into a successor's Agent.
4. **Cross Tool Context.** A workflow that spans multiple Tools shares relevant context across them.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Memory Item | A single structured unit of agent memory. |
| Memory Slice | A bounded subset of Memory Items selected by query and filter. |
| Memory Grant | A signed authorization to access a Memory Slice. |
| Memory Manifest | A self description of an Agent's memory store. |
| Embedding Profile | The model and dimensionality used for vector embeddings. |

### 3.2 Memory Item Schema

```json
{
  "item_id": "mem_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "owner_did": "did:web:user.example",
  "scope_id": "personal",
  "kind": "fact | preference | conversation_turn | summary | observation | document_reference",
  "subject_entity_id": "ent_org_acme",
  "content": {
    "text": "User prefers morning meetings on Tuesdays and Thursdays.",
    "structured": { "preference_kind": "scheduling", "value": { "preferred_days": ["tue", "thu"], "time_of_day": "morning" } }
  },
  "embedding": {
    "model": "openai/text-embedding-3-small",
    "dimensions": 1536,
    "vector_url": "https://example.com/oap/memory/vec/mem_01HX2QFXR0Q4S8U9V3W7X2Y0Z1.bin"
  },
  "provenance": {
    "source_receipt": "rec_01HX2QF8GZRP9V3K5YXJW0AQ7M",
    "captured_at": "2026-05-01T14:00:00Z",
    "confidence": 0.92
  },
  "labels": ["preference", "scheduling"],
  "ttl_days": 365,
  "exportable": true
}
```

### 3.3 Memory Manifest

```
https://{domain}/.well-known/oap-memory.json
```

```json
{
  "principal": "did:web:user.example",
  "scopes": ["personal", "professional"],
  "embedding_profiles": [
    { "model": "openai/text-embedding-3-small", "dimensions": 1536 },
    { "model": "voyage-2", "dimensions": 1024 }
  ],
  "kinds_supported": ["fact", "preference", "conversation_turn", "summary", "observation", "document_reference"],
  "endpoints": {
    "query": "https://example.com/oap/memory/query",
    "grant": "https://example.com/oap/memory/grant",
    "export": "https://example.com/oap/memory/export"
  },
  "max_grant_size_items": 10000
}
```

### 3.4 Memory Grant

```json
{
  "grant_id": "mgr_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "granter": "did:web:user.example#personal",
  "grantee": "did:web:contractor.example",
  "purpose": "Brief the contractor on the website redesign project.",
  "filter": {
    "subject_entity_ids": ["ent_proj_website_redesign"],
    "kinds": ["fact", "preference", "summary"],
    "captured_after": "2026-01-01T00:00:00Z",
    "labels_any": ["website_redesign"]
  },
  "max_items": 500,
  "expires_at": "2026-06-30T23:59:59Z",
  "revocable": true,
  "redaction_profile": "oap.profile.projection.contact.v1",
  "signature": "..."
}
```

### 3.5 Query

```http
POST /oap/memory/query
Authorization: Bearer {memory_grant_jwt}
Content-Type: application/oap+json

{
  "query": "what is the user's preferred meeting cadence with the contractor?",
  "max_results": 20,
  "include_embeddings": false
}
```

The response is a list of Memory Items filtered by the Grant and ranked by query relevance. The Tool MUST apply the Projection Profile (RFC 0007) named in the Grant before returning content.

### 3.6 Provenance and Hash Chain

Each returned Memory Item MUST include a chained hash that proves it was not altered relative to its capture state. Tools that store Memory Items MUST maintain a per Item provenance log.

### 3.7 Manifest Declaration

```json
{
  "memory_exchange": {
    "supported": true,
    "max_grant_duration_days": 180,
    "max_grant_size_items": 10000,
    "supported_redaction_profiles": [
      "oap.profile.projection.contact.v1"
    ]
  }
}
```

## 4. Backward Compatibility

Memory Exchange is additive. Tools without `memory_exchange.supported` continue to operate at v1.0.

## 5. Security Considerations

1. **Grant Token Theft.** Grants are bearer tokens and MUST be transmitted only over TLS, with short expiry and rotatable signing keys.
2. **Embedding Inversion.** Tools MUST NOT return raw embeddings to Grantees by default. Embedding access is a separate Grant scope.

## 6. Privacy Considerations

Memory contains intimate personal information. Tools MUST honor deletion requests under OAP-CORE-1.0 Section 17 across all Memory Items, including those covered by active Grants.

## 7. Conformance Impact

Memory Exchange is OPTIONAL at all Conformance Levels. The OAP community will publish reference implementations and a portable export format.

## 8. Implementation Experience

AssistNet operates a Memory Engine with semantic search over conversational history and learned facts. The mechanism described in this RFC is a generalization that decouples the Memory Store from the Tool that exposes it.

## 9. Alternatives Considered

1. **Plain text export only.** Rejected because it loses semantic structure and embeddings.
2. **Vector database federation.** Rejected because it forces a particular storage substrate on all participants.

## 10. References

1. OAP-CORE-1.0, Sections 17 (Data Policy), 19 (Receipts).
2. RFC 0007 (Privacy Preserving Projections).

## Appendix A: Epistemic Semantics of Memory Exchange

This appendix is normative for the epistemic claims it makes and informative for the supporting commentary. It provides the formal semantics that determine, for every Memory Item exchanged via this protocol, what each Agent in a multi agent system is entitled to be said to know, to believe, and to share with respect to the underlying proposition. The treatment follows the Kripke semantics of modal logic as developed by Hintikka (1962), the multi agent epistemic logic of Fagin, Halpern, Moses, and Vardi (1995), the common knowledge analysis of Aumann (1976) and Halpern and Moses (1990), and the dynamic epistemic logic of van Ditmarsch, van der Hoek, and Kooi (2008). Notation is consistent with the standard textbook treatment of Shoham and Leyton-Brown (2009), *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations*, chapters 13 and 14.

### A.1 The Epistemic Frame

Let $\mathcal{A}$ be the finite set of OAP Agents identified by their DIDs. Let $\Phi$ be a countable set of atomic propositions corresponding to the structured payload of Memory Items: each atomic proposition $p \in \Phi$ has the form `subject_entity_id has property X with value Y` and is decoded directly from the `content.structured` field of section 3.2.

An **OAP epistemic model** is a Kripke structure

$$
M \;=\; \langle W, \{\sim_a\}_{a \in \mathcal{A}}, V \rangle
$$

where

- $W$ is a non-empty set of possible worlds,
- $\sim_a \subseteq W \times W$ is an equivalence relation on $W$ for each Agent $a$, with $w \sim_a w'$ read as "Agent $a$ cannot distinguish $w$ from $w'$ on the basis of its current information state",
- $V: \Phi \to 2^W$ assigns to each atomic proposition the set of worlds in which it holds.

Equivalence (reflexive, symmetric, transitive) is the modal axiom system **S5**, which is the standard choice for knowledge in multi agent systems where introspection is closed under negation (Fagin et al. 1995, chapter 2). Belief (without negative introspection) corresponds to **KD45**; the protocol surfaces both modalities because Memory Items differ in confidence (section 3.2 `provenance.confidence`).

### A.2 The Knowledge and Belief Modalities

For Agent $a \in \mathcal{A}$ and formula $\varphi$, define

$$
M, w \models K_a \varphi \;\iff\; \forall w' \in W: w \sim_a w' \implies M, w' \models \varphi
$$

read as "Agent $a$ knows $\varphi$". The dual $\neg K_a \neg \varphi$ is "Agent $a$ considers $\varphi$ possible", written $\hat{K}_a \varphi$.

Belief is defined over a serial, transitive, Euclidean accessibility relation $R^B_a \subseteq W \times W$ derived from $\sim_a$ by the function

$$
R^B_a(w) \;=\; \{ w' \in W \,|\, w \sim_a w' \,\land\, \mathrm{conf}(w, a) \ge \tau \}
$$

where $\mathrm{conf}(w, a)$ is the confidence Agent $a$ assigns at $w$ to the worlds in its accessibility set, and $\tau \in [0, 1]$ is the protocol-fixed belief threshold (the default is $\tau = 0.5$, declared per Agent in `oap-memory.json` under the additive field `belief_threshold`). The belief modality is

$$
M, w \models B_a \varphi \;\iff\; \forall w' \in R^B_a(w): M, w' \models \varphi.
$$

KD45 follows from seriality, transitivity, and Euclideanity, the standard belief logic of Hintikka. Confidence below $\tau$ yields neither knowledge nor belief, only entitled possession (defined in A.3).

### A.3 The Possession Modality

Knowledge and belief are not the only relevant attitudes for a memory exchange protocol. An Agent may *possess* a Memory Item, in the operational sense that the Item is stored in the Agent's accessible memory store, without thereby believing the proposition it encodes. Possession is the modality the protocol can mechanically certify; knowledge and belief are downstream attitudes that depend on the Agent's confidence assessment.

Define the propositional constant $\mathrm{Pos}_a(p)$ for "Agent $a$ possesses a Memory Item whose content decodes to $p$". Possession is verifiable from the audit log: a Receipt of a successful `/oap/memory/query` response naming Agent $a$ as the Grantee and containing an Item that decodes to $p$ is evidence of $\mathrm{Pos}_a(p)$.

The protocol invariant is:

**(P1) Possession Soundness.** If $M, w \models \mathrm{Pos}_a(p)$, then there exists a verifiable Memory Grant $g$ with `grantee = a` whose `filter` admits the underlying Memory Item, an issued Receipt of a query response under $g$ containing the Item, and a hash chain (section 3.6) connecting the Item to its capture Receipt.

(P1) is mechanically checked by the conformance probe `behavior/memory-exchange-possession.test.js` against any Resolver claiming RFC 0010 conformance.

### A.4 Common Knowledge and Common Belief

For a coalition $G \subseteq \mathcal{A}$ and formula $\varphi$, define the **everyone knows** operator

$$
E_G \varphi \;\equiv\; \bigwedge_{a \in G} K_a \varphi,
$$

and the **common knowledge** operator $C_G$ as the transitive closure (Aumann 1976):

$$
C_G \varphi \;\equiv\; E_G \varphi \,\land\, E_G E_G \varphi \,\land\, E_G E_G E_G \varphi \,\land\, \ldots
$$

Equivalently, $C_G \varphi$ holds at $w$ iff $\varphi$ holds at every world reachable from $w$ by any finite sequence of $\sim_a$ steps for $a \in G$.

Common knowledge is the strongest epistemic attitude a coalition may attain, and Halpern and Moses (1990) showed that it is unattainable in asynchronous systems with unreliable communication. The protocol therefore distinguishes common knowledge from its weaker, attainable approximations:

- $E^k_G \varphi$, **k-th order mutual knowledge**, is $E_G$ iterated $k$ times. It is attainable in finite time given $k$ message rounds (Halpern and Moses 1990, theorem 7.2).
- $C^B_G \varphi$, **common belief**, replaces $K_a$ with $B_a$ throughout. It is attainable in eventually-consistent systems (Halpern and Moses 1990, section 5).

### A.5 The Memory Grant as an Epistemic Action

A Memory Grant $g$ (section 3.4) is modeled as an event in dynamic epistemic logic (van Ditmarsch et al. 2008, chapter 6). Issuing a Grant transforms the model $M$ to a successor model $M^{[g]}$ in which Grantee Agent $a$ has access to the worlds compatible with the Grant's filter applied to the Granter's memory store.

Formally, let $\mathrm{filter}(g)$ be the predicate over Memory Items that the Grant accepts. Let $\Phi_g \subseteq \Phi$ be the set of atomic propositions decoded from Items satisfying $\mathrm{filter}(g)$. Then

$$
M^{[g]} \;=\; \langle W, \{\sim^{[g]}_b\}_{b \in \mathcal{A}}, V \rangle
$$

with

$$
\sim^{[g]}_b = \begin{cases}
\sim_b \cap \{(w, w') : V(p)(w) = V(p)(w') \text{ for all } p \in \Phi_g\} & \text{if } b = a, \\
\sim_b & \text{otherwise.}
\end{cases}
$$

That is, the Grantee's accessibility relation is refined to discriminate worlds that disagree on the disclosed propositions; other Agents' relations are unchanged. This refinement is the formal counterpart of the operational statement "the Grantee now knows what the Grant disclosed".

### A.6 Theorem 1 (Soundness of Memory Exchange under S5)

**Statement.** Let $g$ be a valid Memory Grant signed by Granter $a$ and accepted by Grantee $b$, and let $p \in \Phi_g$ be any atomic proposition decoded from an Item delivered under $g$. Suppose the Granter knew $p$ at the world $w$ in which the Grant was issued, that is $M, w \models K_a p$. Then in the post-grant model $M^{[g]}$ at the same world $w$,

$$
M^{[g]}, w \models K_b p.
$$

**Proof.** The Granter's knowledge at $w$ implies that for every $w'$ with $w \sim_a w'$, $V(p)(w') = V(p)(w) = \mathrm{true}$. The Grant transmits the Item under hash-chain integrity (section 3.6), which guarantees that the Grantee receives the proposition with the same truth value the Granter held. By construction of $\sim^{[g]}_b$, every $w'$ with $w \sim^{[g]}_b w'$ satisfies $V(p)(w') = V(p)(w) = \mathrm{true}$. Hence $M^{[g]}, w \models K_b p$. $\blacksquare$

**Corollary A.6.1 (No spurious knowledge).** If $p \notin \Phi_g$ (the Grant filter excludes $p$), then $\sim^{[g]}_b = \sim_b$ on $V(p)$, hence $M^{[g]}, w \models K_b p$ iff $M, w \models K_b p$. The protocol creates no knowledge it does not transmit.

**Corollary A.6.2 (No knowledge from belief).** If $M, w \models B_a p$ but $M, w \not\models K_a p$ (Granter only believes $p$), then the Item is delivered with $\mathrm{provenance.confidence} < 1$ and the Grantee acquires at most $B_b p$, not $K_b p$, by the construction of $R^B_b$ in A.2.

### A.7 Theorem 2 (No Common Knowledge from a Single Grant)

**Statement.** A single Memory Grant from $a$ to $b$ disclosing proposition $p$ does not produce common knowledge of $p$ in the coalition $\{a, b\}$, even though $K_a p \land K_b p$ holds post-grant.

**Proof sketch.** Common knowledge requires $K_b K_a p$ at minimum. The Grantee receives the Item with provenance pointing to the Granter's capture Receipt, hence $K_b K_a p$ holds (the Grantee knows the Granter knew $p$ at capture time). However, $K_a K_b K_a p$ requires the Granter to know that the Grantee knows that the Granter knew $p$, which the Granter cannot verify without an acknowledgement from the Grantee. Without acknowledgement, the third-order iterate fails. Halpern and Moses (1990, theorem 6.1) proved this is the general pattern: bilateral exchange in asynchronous systems attains finite-order mutual knowledge but not common knowledge. $\blacksquare$

**Corollary A.7.1 (Common-knowledge attainability).** Common knowledge of $p$ in $\{a, b\}$ requires a Multi-Party Review style synchronous attestation in which both Agents simultaneously sign a joint Receipt. This is the mechanism specified in `papers/safety-and-policy-stack.md` section 5 and is invoked by Workflows of joint commitment type as defined in Appendix A of RFC 0008.

### A.8 The Coordinated Attack and OAP Grants

The Coordinated Attack problem (Halpern and Moses 1990, theorem 6.1) shows that no finite protocol over an unreliable channel can attain common knowledge of an attack time. The Memory Exchange protocol inherits this limitation: regardless of the number of Grants exchanged, the coalition $\{a, b\}$ attains $E^k_G p$ for arbitrarily large $k$ by repeated acknowledgement, but never $C_G p$. This is a fundamental property of the underlying communication model (HTTP over TLS, eventually consistent), not a deficiency of the Grant mechanism.

The protocol's response is the Common Belief approximation $C^B_G$, attainable when both Agents trust the eventually-consistent delivery guarantees of TLS and the integrity guarantees of the Grant signature. Common belief is sufficient for the practical purposes of joint planning, joint commitment, and accountable hand-off described in RFC 0008.

### A.9 Confidentiality as Negative Knowledge

The Pre Action Confidentiality Gate of `papers/confidentiality-and-compliance-context.md` is restated here as a negative knowledge invariant. For every Agent $a \in \mathcal{A}$, every world $w$, and every proposition $p$ classified as confidential under Scope Policy $\sigma_a$ at $w$:

$$
\text{If } p \in \mathrm{Confidential}(\sigma_a, w) \text{ then for every Agent } b \notin \mathrm{Authorized}(p, w): \; M^{[g]}, w \not\models K_b p \text{ for any Grant } g.
$$

This is enforced operationally by section 3.5 (the Tool MUST apply the Projection Profile before returning content) and section 5 (Embedding Inversion). The conformance probe `behavior/memory-exchange-confidentiality.test.js` mechanically verifies this invariant by issuing Grants that attempt to exfiltrate confidential propositions and asserting that the Grantee's post-grant accessibility relation is unchanged on those propositions.

### A.10 Implications for Downstream RFCs

The epistemic semantics of this appendix grounds claims made elsewhere in the OAP corpus.

1. **RFC 0002 (Negotiation).** The opponent-modeling discussion in Appendix A.7 of RFC 0002 references "the Party may infer the opponent's type". That inference is an update of the inferring Party's accessibility relation under the dynamic epistemic logic of A.5, restricted to what the protocol publicly transmits.
2. **RFC 0003 (Standing Permissions).** A Standing Permission grants $K_a$ for a class of propositions over a time window. The class is the propositions admitted by the Grant filter. The window is the validity period.
3. **RFC 0008 (Workflows).** Joint intentions in workflows require common belief (A.7), which is attainable. The construction is specified in Appendix A of RFC 0008.
4. **RFC 0009 (Reputation).** A Performance Record is an attestation that creates $K_b$ of the issuer's evaluation for any Agent $b$ that observes the Record. Aggregation across issuers under the reputation function of Appendix A of RFC 0009 produces common belief of the aggregate score among the verifiers.
5. **RFC 0007 (Projections).** Projection profiles partition $\Phi$ into disclosed and undisclosed subsets, exactly matching the $\Phi_g$ vs. $\Phi \setminus \Phi_g$ distinction of A.5.

### A.11 References to Prior Treatments

- Hintikka, J. (1962). *Knowledge and Belief: An Introduction to the Logic of the Two Notions.* Cornell University Press.
- Aumann, R. J. (1976). Agreeing to Disagree. *Annals of Statistics* 4(6).
- Halpern, J. Y., and Moses, Y. (1990). Knowledge and Common Knowledge in a Distributed Environment. *Journal of the ACM* 37(3).
- Fagin, R., Halpern, J. Y., Moses, Y., and Vardi, M. Y. (1995). *Reasoning About Knowledge.* MIT Press.
- van Ditmarsch, H., van der Hoek, W., and Kooi, B. (2008). *Dynamic Epistemic Logic.* Springer.
- Shoham, Y., and Leyton-Brown, K. (2009). *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations.* Cambridge University Press, chapters 13-14.
- Shokri, R., Stronati, M., Song, C., and Shmatikov, V. (2017). Membership Inference Attacks Against Machine Learning Models. *IEEE Symposium on Security and Privacy.* The attack class against which the negative-knowledge property of A.9 must be operationally hardened: a Recipient who learns $\Phi_g$ MUST NOT be able to infer membership of individual training examples in the Grantor's underlying corpus. The composition of the Grant-filter projection with the differential-privacy noise of RFC 0007 section 5 is the OAP defense against this inference channel.
- Carlini, N., Liu, C., Erlingsson, U., Kos, J., and Song, D. (2019). The Secret Sharer: Evaluating and Testing Unintended Memorization in Neural Networks. *USENIX Security Symposium.* The empirical demonstration that neural-network Grantors may unintentionally memorize and leak training-data secrets through their generated outputs; grounds the recommendation of section 6 that Grantors whose underlying knowledge is produced by a learned Model SHOULD apply the canary-extraction test of Carlini et al. before publishing a Grant filter and SHOULD declare the test result in the Grant Manifest under `confidentiality.memorization_audit`.
