# RFC 0020: Agent Query Language

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Data Plane
**Created:** 2026-05-03
**Updated:** 2026-05-04
**Working Group:** Data Plane
**Targets:** 1.3

## 1. Summary

This document specifies the Agent Query Language, a declarative constraint satisfaction language by which an Agent expresses what it wants from the open Agent Web rather than how to obtain it. The language generalizes the Procurement Intent of RFC 0013 from the commercial domain to the full surface of agent driven retrieval, action selection, and provider comparison. A query expressed in the language is a structured intent that is signed by the issuing Principal, that carries an explicit cost ceiling and a quality floor, that declares the projection it requires from the response, and that is satisfiable by any conformant Provider whose Manifest matches its constraints. The language is the canonical input to Match Brokers under RFC 0021, the canonical filter on Manifest Subscription feeds under RFC 0022, and the canonical access path to the Storage Substrate of RFC 0023.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

An **Intent** is a signed structured document expressing a desired outcome together with the constraints under which the outcome is acceptable. The Procurement Intent defined in RFC 0013 section 3.4 is a special case of an Intent whose category is commercial.

A **Constraint** is a single predicate over a field of a target Manifest, a field of a candidate Offer, a field of a Knowledge Node, or a field of a Receipt produced by a candidate Provider.

A **Projection** is the subset of the response fields that the Issuer requires, expressed in the projection vocabulary of RFC 0007.

A **Budget** is the maximum amount, expressed in a declared currency, that the Issuer is willing to pay for the entire Intent across all candidates evaluated.

A **Quality Floor** is the minimum acceptable value of one or more named Quality Signals, expressed against the Performance Record format of RFC 0009 or against the Conformance Receipt format of RFC 0019.

A **Resolver** is a conformant Match Broker, Storage Substrate, or Provider that accepts an Intent at a documented endpoint and returns a structured response within the validity window the Intent declares.

## 3. Specification

### 3.1 Intent Document Structure

An Intent is a JSON document conforming to `oap-intent.schema.json`. The document includes the following normative fields. The `intent_id` is a unique identifier minted by the Issuer. The `issuer_did` is the decentralized identifier of the Principal that signed the Intent. The `category` is one of the defined intent categories enumerated in section 3.6 of this document. The `constraints` array lists the predicates that any candidate response MUST satisfy. The `projection` block declares the field set that the response MUST include and the field set that the response MUST NOT include. The `budget` block declares the cost ceiling, the currency, and the allocation policy across candidates. The `quality_floor` block declares the minimum acceptable quality signals. The `validity` block declares the window during which the Intent is open for response. The `resolution_policy` block declares whether single best, ranked set, or full set responses are acceptable. The `signature` block carries the Issuer's signature over the canonicalized intent body.

### 3.2 The Constraint Algebra

A Constraint is a triple of `path`, `operator`, and `value`. The `path` identifies a field by its position in the target Manifest or candidate response, expressed in JSON Pointer syntax extended with the wildcard segment `*` for arrays and the descendant operator `**` for arbitrary depth. The `operator` is drawn from the closed set `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `not_in`, `contains`, `matches`, `before`, `after`, `within`, `outside`, and `exists`. The `value` is a JSON value compatible with the operator and the typed range of the path.

Constraints MAY be combined through the boolean operators `all_of`, `any_of`, and `not`, which take an array of Constraints as their argument. The combination forms a constraint tree whose root is the top level `constraints` field of the Intent. The semantics of the tree is the same as the semantics of an analogous expression in propositional logic. The full constraint tree is the predicate that any candidate response MUST satisfy.

The closed set of operators is intentional. An operator that is not in the set is one for which a conformant Resolver cannot evaluate the predicate without trusting the Issuer to provide an arbitrary execution payload, which is a result the protocol declines to produce. Operators that the closed set does not cover are introduced through additive minor versions of this RFC under the Backward Compatibility Gate of RFC 0019.

### 3.3 The Projection Block

The `projection` block declares the structural shape of the response that the Issuer will accept. The block has two sub fields. The `include` field is an array of JSON Pointers that the response MUST contain. The `exclude` field is an array of JSON Pointers that the response MUST NOT contain. Pointers in either field MAY use the wildcard and descendant operators of section 3.2.

A Resolver that returns a response containing fields outside the `include` set has produced a non conformant response. The Issuer MAY discard such a response and MAY record the discard against the Resolver's Performance Record under RFC 0009. A Resolver that returns a response missing fields from the `include` set has produced a non conformant response and the same consequence applies. The Projection is therefore the contract between the Issuer and the Resolver about exactly what data crosses the boundary, and it composes with the Pre Action Confidentiality Gate defined in the Confidentiality and Compliance Context paper to ensure that no field that the Issuer's Scope Policy forbids is returned.

### 3.4 The Budget Block

The `budget` block declares the maximum total cost that the Issuer authorizes for the resolution of the Intent. The block contains the `amount` field as a decimal string, the `currency` field as an ISO 4217 code or a registered crypto symbol, and the `allocation` field describing how the budget is distributed across candidates. The defined allocation policies are `single_winner` in which the entire budget is paid to the single best candidate, `ranked_top_k` in which the budget is split across the top k candidates by a declared distribution, and `proportional_quality` in which each candidate receives a share proportional to its Quality Score above the Quality Floor.

A Resolver that proposes a candidate whose cost exceeds the Issuer's remaining budget MUST flag the candidate as `over_budget` rather than silently truncating it. The Issuer's policy engine then decides whether to relax the budget, to discard the candidate, or to withdraw the Intent.

### 3.5 The Quality Floor

The `quality_floor` block declares the minimum acceptable values of one or more quality signals. Defined signals are `performance_score` from RFC 0009, `conformance_level` from RFC 0019, `latency_p99_ms` from the Build Versus Buy Decision Protocol, `provider_reputation` aggregated from Performance Records, `cooling_off_minutes` from RFC 0017, and any signal that future RFCs introduce through additive extensions of this list. A candidate response that fails to meet any declared floor MUST be rejected by the Resolver before being returned to the Issuer.

### 3.6 Defined Intent Categories

The protocol normatively defines the following Intent categories. The `commercial` category is the Procurement Intent of RFC 0013, with the additional constraint, projection, budget, and quality semantics defined in this document. The `knowledge` category is a request for one or more Knowledge Nodes that satisfy the constraints, with metering and Citation Attribution as defined in RFC 0013 section 3.5. The `action` category is a request for the invocation of a specific Action class on any conformant Provider, with the policy stack of the Safety and Policy Stack paper applied at the Resolver. The `delegation` category is a request to delegate a sub task under the cost attribution model of RFC 0004. The `discovery` category is a request to enumerate Providers whose Manifests satisfy the constraints, returning Manifest summaries rather than Offers. The `subscription` category is a request to subscribe to a feed of Manifest changes that satisfy the constraints, with the subscription mechanics of RFC 0022. Additional categories MAY be introduced through additive minor versions of this RFC.

### 3.7 The Wire Format

An Intent is submitted by the Issuer to a Resolver over the transports defined in OAP-CORE-1.0. A synchronous Resolver responds with an `IntentResponse` document containing the matching candidates, the AQL Decision Records that document why each candidate was selected or rejected, and a Resolver Signature over the response body. An asynchronous Resolver acknowledges the Intent and returns a stream of candidate responses over server sent events or WebSocket. The streaming response carries the same per candidate AQL Decision Records and the same Resolver Signature scoped to each event.

The `IntentResponse` document is canonical. A Resolver that produces a response in any other format is non conformant. The schema is published as `oap-intent-response.schema.json`. The per candidate AQL Decision Record is published as `oap-aql-decision.schema.json` and is distinct from the four layer Policy Stack Decision Record published as `oap-decision-record.schema.json`. The two records compose: an AQL Decision Record MAY reference a Policy Stack Decision Record through the `policy_decision_ref` field when the candidate evaluation triggered policy evaluation.

## 4. Backward Compatibility

This RFC introduces three new schemas, namely `oap-intent.schema.json`, `oap-intent-response.schema.json`, and `oap-aql-decision.schema.json`. The Procurement Intent schema published under RFC 0013 is preserved as a specialization of the new Intent schema. The four layer Policy Stack Decision Record published under `oap-decision-record.schema.json` is unchanged. Existing implementations that accept Procurement Intents continue to function under their current obligations and gain the option of accepting general Intents through the same endpoint, distinguished by the `category` field. No existing field of any normative schema is altered. The change satisfies the Backward Compatibility Gate of RFC 0019.

## 5. Security Considerations

The Intent document is signed by the Issuer and is therefore non repudiable. A Resolver that returns a response citing an Intent that the named Issuer did not sign is detectable and is subject to Performance Record slashing under RFC 0009. The Decision Records returned by the Resolver are themselves signed and become part of the Issuer's Receipt chain under the accountability layer described in the Accountability paper.

A malicious Issuer could attempt to use the Intent document to enumerate fields that a Resolver's Manifest declares but does not intend to expose. The Projection block defines the contract about what fields cross the boundary, and the Resolver's Pre Action Confidentiality Gate is the enforcement point. A Resolver whose enforcement is misconfigured produces over disclosed responses, which the Conformance Test Suite of RFC 0019 detects through the projection conformance behavior tests.

A malicious Resolver could attempt to construct candidates that satisfy the structural constraints while violating the spirit of the Intent. The protocol's response is the Performance Record format of RFC 0009, which carries the Issuer's post hoc judgment of the Resolver's performance and which the Issuer's future Intents MAY consult through the `quality_floor` block. The discipline of the market is therefore the structural defense against semantic gaming.

## 6. Privacy Considerations

Intents reveal information about the Issuer's preferences, financial state, and intended actions. Issuers SHOULD route privacy sensitive Intents through an aggregating Match Broker rather than broadcasting them directly to candidate Resolvers, and SHOULD apply the projection rules of RFC 0007 to mask fields that are not strictly necessary for the targeted Resolvers to evaluate the constraints. Issuers operating under Privileged Mode as defined in OAP-CORE-1.0 section 18 MUST NOT issue Intents whose constraints reveal privileged information.

## 7. Conformance Impact

A Resolver claiming conformance with this RFC at level Q1 MUST accept Intents in at least the `discovery` and `commercial` categories, MUST evaluate the full constraint algebra of section 3.2, MUST honor the projection contract of section 3.3, and MUST sign each response. A Resolver claiming conformance at level Q2 MUST additionally accept Intents in the `knowledge`, `action`, and `delegation` categories. A Resolver claiming conformance at level Q3 MUST additionally accept Intents in the `subscription` category and MUST satisfy the streaming response requirements of section 3.7.

## 8. Implementation Experience

The Reference Server in `reference/server/` exposes the Intent endpoint at `POST /oap/intent` and emits responses signed with the server's Ed25519 key. Each candidate is shaped from the server's Action manifest enriched with the manifest envelope, so probes may constrain on `/oap_version`, `/tool_did`, `/risk_class`, `/side_effects`, and the standard Action fields. The Conformance Test Suite exercises the discovery category through `test-suite/behavior/aql.test.js`, which validates the response against `oap-intent-response.schema.json` and asserts that every candidate carries a `decision_record.constraint_evaluations` array. The probe is skipped automatically for any Manifest that does not declare an `intent` endpoint, preserving backward compatibility for L0 and L1 implementations. The AssistNet platform operates an internal Resolver that accepts Intents in the `discovery`, `commercial`, and `subscription` categories at production volumes.

## 9. Alternatives Considered

A natural language query interface in which the Issuer expresses the request in free text was considered and rejected. The Resolver would be required to interpret the free text under its own model, which destroys the verifiability of the Decision Record and which makes Resolvers incomparable. A Turing complete query language with arbitrary code execution was considered and rejected for the same reason that the operator set in section 3.2 is closed, namely that the Resolver cannot honor a query whose evaluation it cannot control. A SQL or GraphQL surface was considered and rejected because both languages assume a single trusted database operator, an assumption that the Agent Web does not satisfy.

## 10. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0002, Negotiation Protocol.
* RFC 0004, Sub Agent Delegation.
* RFC 0005, Canonical Entity Schemas.
* RFC 0007, Privacy Preserving Projections.
* RFC 0009, Reputation and Performance Records.
* RFC 0013, Commerce Models for the Agent Economy.
* RFC 0017, Irreversibility and Cooling Off Periods.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0021, Verifiable Indexes and Match Broker Conformance.
* RFC 0022, Manifest Subscription Protocol.
* RFC 0023, Agent Native Storage Substrate.
* IETF RFC 6901, JSON Pointer.
* IETF RFC 2119 and RFC 8174.

## Appendix A: Formal Semantics of the Agent Query Language

This appendix is normative for the semantic claims it makes and informative for the supporting commentary. It defines the operational and denotational semantics of AQL Intents, proves soundness and completeness of any conformant Resolver against the denotational specification, and bounds the algorithmic complexity of constraint evaluation. The treatment follows the operational semantics framework of Plotkin (1981), the denotational semantics of Stoy (1977) and Schmidt (1986), and the database query semantics of Abiteboul, Hull, and Vianu (1995). It is consistent with the relational-algebra grounding of declarative query languages presented in Shoham and Leyton-Brown (2009, chapter 13) on knowledge representation in multi agent systems.

### A.1 The Constraint Algebra Formally

Let $\mathcal{D}$ denote the universe of JSON values defined by RFC 8259. Let $\mathcal{P}$ denote the set of well-formed JSON Pointers extended with the wildcard segment $\ast$ and the descendant operator $\ast\ast$ as specified in section 3.2. For a JSON document $d \in \mathcal{D}$ and pointer $p \in \mathcal{P}$, define the **resolution function**

$$
\llbracket p \rrbracket(d) \;\subseteq\; \mathcal{D}
$$

as the set of JSON values reachable from $d$ by following $p$. For ordinary pointers $\llbracket p \rrbracket(d)$ is a singleton or empty; the wildcard operators may produce sets of arbitrary cardinality.

The set of operators $\mathrm{Op} = \{\mathrm{eq}, \mathrm{ne}, \mathrm{lt}, \mathrm{lte}, \mathrm{gt}, \mathrm{gte}, \mathrm{in}, \mathrm{not\_in}, \mathrm{contains}, \mathrm{matches}, \mathrm{before}, \mathrm{after}, \mathrm{within}, \mathrm{outside}, \mathrm{exists}\}$ is closed (section 3.2). Each operator $o \in \mathrm{Op}$ has a **denotation** $\llbracket o \rrbracket: \mathcal{D} \times \mathcal{D} \to \{0, 1\}$ defined by the following table.

| Operator | Denotation $\llbracket o \rrbracket(x, y)$ |
|---|---|
| $\mathrm{eq}$ | $1$ iff $x = y$ structurally |
| $\mathrm{ne}$ | $1$ iff $x \ne y$ structurally |
| $\mathrm{lt}, \mathrm{lte}, \mathrm{gt}, \mathrm{gte}$ | comparison on numbers and ISO-8601 strings under the natural order |
| $\mathrm{in}, \mathrm{not\_in}$ | membership in $y$ when $y$ is a JSON array |
| $\mathrm{contains}$ | $1$ iff $y$ is a sub-string of $x$ when both are strings, or sub-array when both are arrays |
| $\mathrm{matches}$ | $1$ iff $x$ matches the ECMA-262 regular expression $y$ |
| $\mathrm{before}, \mathrm{after}$ | strict comparison of ISO-8601 timestamps |
| $\mathrm{within}, \mathrm{outside}$ | $x$ inside or outside the temporal interval $y$ given as `[start, end]` |
| $\mathrm{exists}$ | $1$ iff $\llbracket p \rrbracket(d)$ is non-empty (operates on the pointer, ignores $y$) |

A **Constraint** $c = (p, o, v)$ has denotation

$$
\llbracket c \rrbracket(d) \;=\; \bigvee_{x \in \llbracket p \rrbracket(d)} \llbracket o \rrbracket(x, v),
$$

that is, the constraint is satisfied if at least one resolved value passes the operator (existential interpretation; the universal variant is expressible by negating). Boolean combinators have the obvious denotation:

$$
\llbracket \mathrm{all\_of}(c_1, \ldots, c_k) \rrbracket(d) = \bigwedge_i \llbracket c_i \rrbracket(d), \quad
\llbracket \mathrm{any\_of}(c_1, \ldots, c_k) \rrbracket(d) = \bigvee_i \llbracket c_i \rrbracket(d), \quad
\llbracket \mathrm{not}(c) \rrbracket(d) = 1 - \llbracket c \rrbracket(d).
$$

### A.2 Intent Denotational Semantics

Let $I$ be an Intent with constraint tree $C$, projection $\pi = (\pi^+, \pi^-)$, budget $b$, and quality floor $q$. Let $\mathcal{R}$ be the set of all candidate responses available to a Resolver at evaluation time, modeled as the union of Manifests, Offers, Knowledge Nodes, and Receipts addressable by the Resolver.

Define the **denotational answer set**

$$
\llbracket I \rrbracket(\mathcal{R}) \;=\; \big\{ r \in \mathcal{R} \;\big|\; \llbracket C \rrbracket(r) = 1 \,\land\, \mathrm{cost}(r) \le b \,\land\, \mathrm{quality}(r) \succeq q \,\land\, \pi(r) \neq \bot \big\},
$$

where $\mathrm{cost}(r)$ is the candidate's declared cost in the Intent's currency, $\mathrm{quality}(r) \succeq q$ holds when every named quality signal of $q$ is satisfied or exceeded by $r$, and $\pi(r) \neq \bot$ asserts that the Projection block can be applied to $r$ without removing any field listed in $\pi^+$.

The **denotational semantics** of $I$ is then $\llbracket I \rrbracket(\mathcal{R})$ together with the resolution policy of section 3.4 applied to it.

### A.3 Resolver Operational Semantics

A Resolver is modeled as a state-transition system $\langle \Sigma, \to \rangle$ where $\Sigma$ is the set of Resolver states (Intent received, candidates enumerated, candidates filtered, response signed). The transition rules are:

**(R1) Receive.** Upon receipt of signed Intent $I$, the Resolver verifies the signature against $I.\mathrm{issuer\_did}$. On verification failure, the Resolver returns a signed error envelope and halts.

**(R2) Enumerate.** The Resolver assembles a candidate set $\mathcal{R}_{\mathrm{enum}} \subseteq \mathcal{R}$ by consulting its Manifest, Offer, Knowledge, and Receipt indexes. The enumeration MUST be conservative: $\mathcal{R}_{\mathrm{enum}} \supseteq \llbracket I \rrbracket(\mathcal{R})$, that is, no candidate satisfying the Intent is excluded at enumeration time.

**(R3) Filter.** For each $r \in \mathcal{R}_{\mathrm{enum}}$, the Resolver evaluates $\llbracket C \rrbracket(r)$, then $\mathrm{cost}(r) \le b$, then $\mathrm{quality}(r) \succeq q$. The filtered set is $\mathcal{R}_{\mathrm{pass}}$. For each rejected $r$, the Resolver constructs an AQL Decision Record naming the failing predicate (this is the `constraint_evaluations` array of the per-candidate Decision Record specified in section 3.7).

**(R4) Project.** For each $r \in \mathcal{R}_{\mathrm{pass}}$, the Resolver applies $\pi$, yielding $\pi(r)$. Any field in $\pi^+$ that the Resolver cannot supply MUST cause $r$ to be reclassified into $\mathcal{R}_{\mathrm{pass}} \setminus \{r\}$ and recorded in its Decision Record as a projection failure.

**(R5) Rank and Allocate.** The Resolver applies the resolution policy of section 3.4 to $\mathcal{R}_{\mathrm{pass}}$, producing the ordered candidate list returned in the IntentResponse.

**(R6) Sign.** The Resolver canonicalizes the IntentResponse and signs it with its Ed25519 key, producing the signed envelope of section 3.7.

The operational semantics is the relation $\to^* \subseteq \Sigma \times \Sigma$ generated by sequential application of (R1) through (R6).

### A.4 Theorem 1 (Soundness of Conformant Resolvers)

**Statement.** Let $\mathrm{Resp}(I, \mathcal{R})$ be the set of candidates returned by a conformant Resolver evaluating Intent $I$ over candidate set $\mathcal{R}$. Then

$$
\mathrm{Resp}(I, \mathcal{R}) \;\subseteq\; \llbracket I \rrbracket(\mathcal{R}).
$$

That is, every returned candidate satisfies the Intent's denotational specification.

**Proof.** A candidate $r$ is returned iff it passes (R3) and (R4) and survives the resolution policy of (R5). (R3) enforces $\llbracket C \rrbracket(r) = 1 \land \mathrm{cost}(r) \le b \land \mathrm{quality}(r) \succeq q$. (R4) enforces $\pi(r) \ne \bot$. Hence $r \in \llbracket I \rrbracket(\mathcal{R})$ by the definition of A.2. The resolution policy of (R5) restricts the set further but cannot add candidates not in $\llbracket I \rrbracket(\mathcal{R})$. $\blacksquare$

### A.5 Theorem 2 (Completeness Modulo Enumeration)

**Statement.** Let $\mathrm{Resp}(I, \mathcal{R})$ and $\mathcal{R}_{\mathrm{enum}}$ be as above. Suppose the Resolver's enumeration is exhaustive, that is $\mathcal{R}_{\mathrm{enum}} = \mathcal{R}$. Suppose further that the resolution policy of (R5) is `single_winner` with no quality-tie-breaking restriction, or `ranked_top_k` with $k \ge |\llbracket I \rrbracket(\mathcal{R})|$, or `proportional_quality`. Then

$$
\mathrm{Resp}(I, \mathcal{R}) \;=\; \llbracket I \rrbracket(\mathcal{R}).
$$

**Proof.** By Theorem 1, $\mathrm{Resp}(I, \mathcal{R}) \subseteq \llbracket I \rrbracket(\mathcal{R})$. For the reverse inclusion, let $r \in \llbracket I \rrbracket(\mathcal{R})$. By exhaustive enumeration $r \in \mathcal{R}_{\mathrm{enum}}$. By the definition of $\llbracket I \rrbracket$, $r$ passes (R3) and (R4). Under the three resolution policies named, $r$ is included in $\mathcal{R}_{\mathrm{pass}}$ and survives (R5). Hence $r \in \mathrm{Resp}(I, \mathcal{R})$. $\blacksquare$

**Corollary A.5.1 (Conservativity Bound).** A Resolver whose enumeration is non-exhaustive returns a subset of $\llbracket I \rrbracket(\mathcal{R})$. The conformance probe `behavior/aql.test.js` measures the **completeness ratio** $|\mathrm{Resp}(I, \mathcal{R})| / |\llbracket I \rrbracket(\mathcal{R})|$ against a synthetic candidate set of known $\llbracket I \rrbracket$ and reports it under the `aql_completeness_ratio` field of the conformance receipt.

### A.6 Theorem 3 (Determinism)

**Statement.** Two conformant Resolvers $R_1$ and $R_2$ given the same Intent $I$ and the same candidate set $\mathcal{R}$ produce IntentResponses with identical $\mathcal{R}_{\mathrm{pass}}$, identical Decision Records on the per-candidate evaluation of constraints, and identical projection outputs $\pi(r)$ for every $r \in \mathcal{R}_{\mathrm{pass}}$. The resolution policy may produce different rankings only when the policy is `proportional_quality` and the underlying Quality Score derivation is non-deterministic, in which case the Resolver MUST publish its Quality Score derivation under `oap.aql.quality.v1` in the OAP Registry.

**Proof.** The constraint denotation of A.1 is a pure function of $(C, r)$. The cost and quality predicates of A.2 are pure functions of $r$. The projection $\pi(r)$ is a pure function of $(r, \pi)$. Hence (R3) and (R4) are deterministic. The Decision Record fields are mechanically derived from the predicate evaluations and are therefore deterministic. The resolution policy of (R5) is deterministic for `single_winner` (with a documented tie-breaking rule), for `ranked_top_k` (with a documented Quality Score), and is deterministic for `proportional_quality` modulo the derivation rule. $\blacksquare$

### A.7 Theorem 4 (Polynomial-Time Evaluation)

**Statement.** Constraint evaluation $\llbracket C \rrbracket(r)$ is computable in time $O(|C| \cdot |r|)$, where $|C|$ is the number of constraint nodes in the Intent's constraint tree and $|r|$ is the size of the candidate response in JSON tokens.

**Proof sketch.** Each leaf constraint $(p, o, v)$ requires resolution of $p$ in $r$ and one application of $o$. JSON Pointer resolution is $O(|p| \cdot |r|)$ in the worst case (with wildcard expansion); the closed operator set has constant per-pair evaluation cost. Boolean combinators add a multiplicative factor in $|C|$. The total is $O(|C| \cdot |r|)$ assuming bounded $|p|$ per leaf, which the schema enforces through the `maxLength` constraint on path strings. $\blacksquare$

**Corollary A.7.1 (Tractability).** The closed operator set of section 3.2 is tractable in the data-complexity sense of Vardi (1982): the data complexity of AQL is in $\mathrm{LOGSPACE}$. Consequently, a Resolver's evaluation cost scales linearly with the size of its Manifest store, which is the property required for the Match Broker scaling claims of RFC 0021.

### A.8 Theorem 5 (Closed Operator Set Cannot Be Extended Without Versioning)

**Statement.** Suppose a non-conformant Resolver introduces a new operator $o^* \notin \mathrm{Op}$. Then the resulting language is non-conservative: there exists an Intent valid in the extended language whose denotation $\llbracket I \rrbracket$ depends on $o^*$, and a conformant Resolver cannot produce a sound response to that Intent.

**Proof.** A conformant Resolver rejects any constraint whose operator is not in $\mathrm{Op}$ at parse time, returning a signed error envelope (R1). The non-conformant Resolver evaluates $o^*$ on the candidate set; the resulting $\mathrm{Resp}$ is a subset of $\mathcal{R}$ defined by a predicate not expressible in the conformant language. There is no Intent in the conformant language whose denotation equals this subset for arbitrary $\mathcal{R}$. Hence the extended language is strictly more expressive, and the operator must be added through the additive minor-version process of section 3.2 to preserve cross-Resolver soundness. $\blacksquare$

### A.9 Differential Privacy Composition

The Projection block of section 3.3 is the protocol's data-release primitive. When composed with the Confidentiality and Compliance Context paper's Pre Action Confidentiality Gate, the projection enforces a per-Intent disclosure budget. For Intents that traverse multiple Resolvers (the Match Broker case of RFC 0021), the cumulative disclosure is bounded by the lattice meet of the per-Resolver projections, which preserves the disclosure-budget invariant under serial composition. The formal differential-privacy bound is the subject of a future appendix to the Confidentiality paper and is out of scope here.

### A.10 Implications for Downstream RFCs

1. **RFC 0021 (Verifiable Indexes).** Match Brokers must implement the operational semantics of A.3. The inclusion-proof property of RFC 0021 corresponds to a witness for $r \in \mathcal{R}_{\mathrm{enum}}$ at evaluation time.
2. **RFC 0022 (Manifest Subscription).** Subscription filters are AQL Intents in the `subscription` category. The denotational semantics of A.2 applies pointwise to Manifest update events.
3. **RFC 0023 (Storage Substrate).** The substrate's read API MUST honor the operational semantics of A.3 as a query interface; this is the source of the AQL-as-canonical-access-path claim of RFC 0020 section 1.
4. **RFC 0009 (Reputation).** The `quality_floor` block invokes Performance Records under RFC 0009. The manipulation-resistance bound of RFC 0009 Appendix A is the upper bound on the Resolver's freedom to game the quality predicate.

### A.11 References to Prior Treatments

- Plotkin, G. D. (1981). A Structural Approach to Operational Semantics. Technical Report DAIMI FN-19, Aarhus University.
- Stoy, J. E. (1977). *Denotational Semantics: The Scott-Strachey Approach to Programming Language Theory.* MIT Press.
- Schmidt, D. A. (1986). *Denotational Semantics: A Methodology for Language Development.* Allyn and Bacon.
- Vardi, M. Y. (1982). The Complexity of Relational Query Languages. *Proceedings of STOC '82.*
- Abiteboul, S., Hull, R., and Vianu, V. (1995). *Foundations of Databases.* Addison-Wesley.
- Shoham, Y., and Leyton-Brown, K. (2009). *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations.* Cambridge University Press, chapter 13.

## Appendix B: Payment Integration (Normative)

This appendix is normative. It specifies the `payment_constraints` block for AQL Intents and the normative `intent_id` traceability requirement that binds AQL Intents to OAP Payment Sessions and Settlement Confirmations. These extensions close the loose coupling identified between AQL's `budget` block and RFC 0032's payment lifecycle.

### B.1 The payment_constraints Block

An AQL Intent whose `category` is `commercial` MAY carry an optional `payment_constraints` block. When present, this block overrides the Mandate's `allowed_instruments` list and `allowed_commerce_primitives` list for the specific Session created to fulfill this Intent. It does not modify the Mandate itself.

```json
{
  "payment_constraints": {
    "allowed_instruments": ["sepa-instant", "sepa-ct"],
    "disallowed_instruments": ["lightning_network", "evm_stablecoin"],
    "preferred_instrument": "sepa-instant",
    "max_single_payment": { "amount": "500.00", "currency": "EUR" },
    "require_bank_account_vc": true,
    "allowed_commerce_primitives": ["retail_purchase", "subscription"],
    "settlement_currency_preference": "EUR",
    "auction_parametric_session": false
  }
}
```

The `payment_constraints.allowed_instruments` field, when present, replaces the Mandate's instrument list for this Intent's payment. The agent MUST propagate these constraints into the Payment Session creation request as `intent_payment_constraints`. The Wallet operator MUST enforce them and MUST reject a Session creation request where the intended instrument is excluded by the Intent-level constraints, even if the Mandate permits it.

This design preserves the Mandate as the persistent authorization framework and AQL as the per-transaction specification layer. The Mandate establishes what the agent is generally permitted to do; the AQL Intent constrains what the agent does for this specific task. The two compose without conflict by intersection: the Session instrument must be in both the Mandate's `allowed_instruments` and the Intent's `payment_constraints.allowed_instruments`.

The `require_bank_account_vc` field, when `true`, instructs the Wallet operator to enforce section 3.17 IBAN-DID binding verification for this Session regardless of the Wallet's default policy. This allows privacy-sensitive or high-value Intents to demand stronger counterparty verification.

The `auction_parametric_session` field, when `true`, instructs the Wallet operator to create a Parametric Long-Validity Session (RFC 0032 Appendix B) rather than a standard Session.

### B.2 intent_id Traceability

The AQL Intent's `intent_id` field MUST be propagated through the payment lifecycle as a normative traceability link. The following propagation rules apply:

1. **Intent to Session:** The Payment Session creation request MUST carry the `intent_id` of the AQL Intent that triggered it in a top-level `intent_id` field. The Wallet operator MUST record this field in the Session record.

2. **Session to Settlement Confirmation:** The Settlement Confirmation MUST carry the `intent_id` inherited from the Session. This field is included in the `oap-settlement-confirmation.schema.json` as a non-required field that becomes required when the Session was created from an AQL Intent.

3. **Settlement Confirmation to Receipt:** The OAP Receipt of type `settlement` that the agent creates from the Settlement Confirmation MUST carry the `intent_id` in its `action_id` field, establishing the cryptographic link between the original query intent and the completed payment.

The resulting chain is: `intent_id` in AQL Intent → `intent_id` in Payment Session → `intent_id` in Settlement Confirmation → `action_id` in Receipt. A principal querying their spending report can trace any payment back to the AQL Intent that authorized it, satisfying the EU AI Act Article 13 economic decision transparency requirement with full auditability.

### B.3 Budget Commitment and Exhaustion

The AQL `budget` block declares a ceiling for the entire Intent resolution. When an Intent spawns multiple Payment Sessions (for example a `ranked_top_k` resolution that requires payments to three providers), the `budget` must be partitioned across Sessions. The agent MUST track the sum of Session amounts against the Intent budget and MUST NOT create a Session that would cause the sum to exceed the budget, even if the Mandate's `max_single_payment` and `max_daily_spend` permit it.

The Wallet operator MUST NOT enforce the AQL budget (it is an agent-side constraint). The Wallet operator enforces only Mandate constraints. The agent is responsible for budget accounting at the Intent level.

### B.4 References

- RFC 0032, sections 3.3, 3.4, 3.17, and Appendix B.
- RFC 0013, section 3.4 (Procurement Intent).
- European Union (2024). EU AI Act, Article 13.
