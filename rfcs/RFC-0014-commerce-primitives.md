# RFC 0014: Commerce Primitives, A Generalized Commercial Layer

**Status:** Draft
**Author(s):** OAP Working Group on Commercial Layer
**Created:** 2026-05-03
**Working Group:** Commercial Layer
**Targets:** 1.2
**Supersedes:** None
**Extends:** RFC 0013

## Abstract

This document generalizes the five named commerce models defined in RFC 0013 into a single five-axis primitive that covers the full surface of human commercial activity. It demonstrates that every commerce model in current use, both consumer and business, is a specific tuple over the same five orthogonal dimensions, and it normatively defines those dimensions as the Commerce Primitive. Future commerce models, including ones that do not yet exist, can be expressed without further protocol changes by selecting new combinations of axis values. The five RFC 0013 models are redefined as canonical presets of this primitive, and ten additional models drawn from existing real world commerce are demonstrated as further presets.

## 1. Motivation

RFC 0013 defines five commerce models that map cleanly onto the most common patterns observed in early agent to agent transactions. Field analysis of consumer and business commerce, however, shows at least ten distinct models in active use today, including retail purchase, subscription, metered utility, marketplace intermediation, advertising, professional services, licensing, leasing, lending and insurance. Defining each of those as a separate enumeration value would couple the protocol to the historical accident of which models happen to be in fashion at the moment of standardization. A protocol that intends to remain relevant across decades must define commerce in terms of its underlying degrees of freedom, not in terms of named instances. This RFC therefore replaces the enumerated approach with a generative one.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

- **Commerce Primitive**: The five-tuple defined in section 3 that fully describes the commercial structure of any offered exchange.
- **Preset**: A named, fully specified Commerce Primitive that exists for convenience and discoverability.
- **Resource**: The unit being exchanged. Agents and humans both consume resources.
- **Settlement**: The act of transferring value in return for the resource, including the timing and conditionality of that transfer.

## 3. The Commerce Primitive

A Commerce Primitive consists of five orthogonal axes. Every commercial offer in the agent economy MUST be expressible as a single point in this five-dimensional space.

### 3.1 Axis One: resource_type

The category of value being offered. Defined values:

- `good`: A physical or digital artifact that changes hands.
- `knowledge`: An informational unit, including documents, embeddings, structured data, model outputs.
- `capability`: A latent ability to perform an action on demand, irrespective of whether it is invoked.
- `attention`: Time-bounded directed cognition, primarily of human consumers, also of agents acting on their behalf.
- `risk`: A future contingent liability transferred from one party to another.
- `capital`: Time-bounded use of money or money-equivalent assets.
- `time`: Direct exchange for human or computational time independent of capability.
- `intermediation`: A match or introduction between two other parties, where the resource is the relationship itself.

### 3.2 Axis Two: transfer_pattern

How the resource moves between parties. Defined values:

- `ownership_transfer`: Title to the resource passes from provider to consumer permanently.
- `access_grant`: A revocable or time-bounded right to use the resource is granted, no transfer of title.
- `action_delegation`: The provider performs an act on behalf of the consumer, the result accrues to the consumer.
- `risk_pooling`: Multiple consumers pool resources to indemnify any one of them against a contingent loss.
- `intermediation`: The provider connects two third parties and is compensated for the connection itself.
- `capital_lending`: The provider transfers capital to the consumer for a defined period in exchange for a return.

### 3.3 Axis Three: settlement_trigger

The event that creates a payment obligation. Defined values:

- `on_invocation`: At the moment the resource is requested.
- `on_outcome`: When a verifiable result has been produced.
- `on_schedule`: At fixed periodic intervals independent of consumption.
- `on_event`: When a specific external event occurs, such as a delivery confirmation, a click, or an insured loss.
- `on_claim`: When the consumer asserts a right against the provider, such as a refund or insurance claim.
- `on_consumption`: Continuously and proportionally as the resource is used.

### 3.4 Axis Four: pricing_function

How the price is computed. Defined values:

- `fixed`: A single number declared in advance.
- `metered`: A unit price multiplied by measured consumption.
- `auction`: Determined by competitive bidding among consumers or providers.
- `formula`: A published mathematical function of one or more inputs, including dynamic and surge pricing.
- `negotiated`: Set bilaterally per transaction, optionally via the negotiation protocol of RFC 0002.
- `reputation_weighted`: Adjusted by the reputation of one or both parties, including bonus or surcharge based on signals from RFC 0009 and RFC 0011.

### 3.5 Axis Five: risk_allocation

Who bears the loss if the exchange fails or underperforms. Defined values:

- `buyer`: The consumer carries all risk after settlement.
- `seller`: The provider warrants the result and refunds on failure.
- `mutual_pool`: A defined pool of participants absorbs the loss collectively.
- `escrow`: A third party holds funds until conditions are met.
- `stake`: The provider has posted collateral that is forfeited on breach, as in RFC 0011.
- `third_party_guarantor`: An external party indemnifies one side, such as a payment processor chargeback or a credit insurer.

## 4. Canonical Presets

The following table defines named presets. The five from RFC 0013 are restated as projections of the Commerce Primitive. Ten additional presets cover the dominant commerce models observed in real consumer and business markets.

| Preset | resource_type | transfer_pattern | settlement_trigger | pricing_function | risk_allocation |
|--------|---------------|------------------|--------------------|------------------|-----------------|
| `per_invocation` (RFC 0013) | capability | action_delegation | on_invocation | fixed | buyer |
| `per_outcome` (RFC 0013) | capability | action_delegation | on_outcome | fixed | seller |
| `per_token_knowledge` (RFC 0013) | knowledge | access_grant | on_consumption | metered | buyer |
| `per_capability` (RFC 0013) | capability | access_grant | on_schedule | fixed | buyer |
| `per_delegation` (RFC 0013) | capability | action_delegation | on_outcome | negotiated | stake |
| `retail_purchase` | good | ownership_transfer | on_invocation | fixed | buyer |
| `subscription` | capability | access_grant | on_schedule | fixed | buyer |
| `metered_utility` | capability | access_grant | on_consumption | metered | buyer |
| `marketplace_intermediation` | intermediation | intermediation | on_event | formula | escrow |
| `advertising` | attention | access_grant | on_event | auction | seller |
| `professional_service` | time | action_delegation | on_outcome | negotiated | stake |
| `licensing` | knowledge | access_grant | on_schedule | formula | buyer |
| `lease` | capability | access_grant | on_schedule | fixed | seller |
| `lending` | capital | capital_lending | on_schedule | formula | third_party_guarantor |
| `insurance` | risk | risk_pooling | on_claim | formula | mutual_pool |

A provider MAY use any preset name in the `commerce.preset` field of its manifest, in which case the five axes are implied. A provider MAY also declare an explicit five-tuple, in which case all five axes MUST be present. A provider MUST NOT declare both a preset and a contradicting explicit tuple.

## 5. Schema Integration

### 5.1 New Schema

A new normative schema, `oap-commerce-primitive.schema.json`, defines the structure with the five required axis fields, optional preset name, optional unit, and optional pricing parameters block.

### 5.2 Manifest Extension

The `commerce` block defined in RFC 0013 section 3.5 is extended with an optional `primitives` array, each element of which is a Commerce Primitive object. The existing `default_model` field continues to accept the five RFC 0013 enumerated identifiers and additionally accepts any preset name from section 4 of this RFC.

### 5.3 Action Extension

The `cost` block on action descriptors is extended with an optional `primitive` field of type Commerce Primitive object. When `primitive` is present it overrides any value of `cost.type` for that specific action. This allows a provider to mix several commerce models within a single manifest without ambiguity.

### 5.4 Receipt Extension

The receipt schema gains an optional `commerce_primitive` block that records the five axis values that applied to the transaction at the moment of settlement. This makes every receipt self-describing and prevents disputes over which model was in force.

## 6. Conformance

A provider claiming conformance to this RFC MUST publish at least one Commerce Primitive object in its manifest, either via a preset reference or an explicit tuple, and MUST emit the `commerce_primitive` block on every settlement-relevant receipt.

A consumer claiming conformance to this RFC MUST be able to interpret any valid five-tuple drawn from the value sets defined in section 3, even if it has not been previously assigned a preset name.

## 7. Forward Compatibility

The value sets defined in section 3 are extensible. Adding a new value to any of the five axes is a minor version change to this RFC and does not break existing implementations. Removing a value is a major version change and follows the deprecation rules of the OAP Core specification.

New commerce models that emerge in future, including models specific to autonomous agent economies that have no human precedent, are accommodated by selecting new combinations of existing axis values or by minor extensions of the value sets. The protocol does not require a new RFC for each new business model.

## 8. Worked Examples

### 8.1 A Cloud Storage Provider Offering Both Subscription and Metered Tiers

```json
{
  "commerce": {
    "primitives": [
      { "preset": "subscription", "unit": "month", "price_per_unit": 9.99, "currency": "EUR" },
      { "preset": "metered_utility", "unit": "byte", "price_per_unit": 0.000000023, "currency": "EUR" }
    ],
    "default_model": "subscription"
  }
}
```

### 8.2 A Knowledge Provider Charging per Citation

```json
{
  "primitive": {
    "resource_type": "knowledge",
    "transfer_pattern": "access_grant",
    "settlement_trigger": "on_event",
    "pricing_function": "metered",
    "risk_allocation": "buyer",
    "unit": "citation",
    "price_per_unit": 0.05,
    "currency": "EUR"
  }
}
```

### 8.3 An Insurance Pool for Sub Agent Misbehavior

```json
{
  "primitive": {
    "resource_type": "risk",
    "transfer_pattern": "risk_pooling",
    "settlement_trigger": "on_claim",
    "pricing_function": "reputation_weighted",
    "risk_allocation": "mutual_pool",
    "premium_per_period": 12.00,
    "period_days": 30,
    "currency": "EUR"
  }
}
```

## 9. Security Considerations

Allowing arbitrary five-tuples increases the surface for malicious or misleading commercial declarations. Implementations SHOULD warn when a manifest declares a primitive that combines axis values in commercially unusual ways, for example `risk_pooling` combined with `buyer` risk allocation, since such combinations may indicate intent to mislead. Marketplaces and search agents MAY refuse to surface offers that fail such heuristic checks.

## 10. References

- RFC 0002 Negotiation Protocol
- RFC 0009 Reputation and Performance Records
- RFC 0011 Sybil Resistance and Sub Agent Anti Abuse
- RFC 0013 Commerce Models for the Agent Economy
- OAP Core 1.0, sections on Manifests, Actions and Receipts

## 11. Acknowledgments

This RFC builds on the analysis of consumer and business commerce models conducted during the drafting of RFC 0013 and on the broader observation that the Document Web encodes commerce as opaque human-readable text while the Agent Web requires commerce to be machine-decomposable into orthogonal axes.

## Appendix A: Mathematical Formalization of the Commerce Primitive

This appendix is normative. It restates the Commerce Primitive of section 3 as a formal algebraic object and proves the three properties on which the rest of this RFC, and downstream RFCs that consume Commerce Primitives, depend: independence of the five axes, completeness of the resulting space with respect to observed and constructible commercial offers, and minimality of the chosen axis set. The treatment follows the conventions of mechanism design as developed by Maskin (1999), Milgrom (2004), Sandholm (1999, 2003), and the multiagent systems formalization of Tennenholtz and Zohar (2009). It is consistent with the economic framing developed in `papers/economics-of-the-agent-economy.md` and with the conformance methodology of RFC 0019.

### A.1 Formal Object

Let

$$
R = \{r_1, \ldots, r_8\}, \quad
T = \{t_1, \ldots, t_6\}, \quad
S = \{s_1, \ldots, s_6\}, \quad
P = \{p_1, \ldots, p_6\}, \quad
Y = \{y_1, \ldots, y_6\}
$$

be the finite, normatively defined value sets of the five axes `resource_type`, `transfer_pattern`, `settlement_trigger`, `pricing_function`, and `risk_allocation` of section 3, with $|R|=8$, $|T|=|S|=|P|=|Y|=6$.

Define the **Commerce Primitive Space** as the Cartesian product

$$
\mathcal{C} \;:=\; R \times T \times S \times P \times Y .
$$

A **Commerce Primitive** is a tuple $c = (r, t, s, p, y) \in \mathcal{C}$. A **Commercial Offer** advertised by a Tool is, by definition of section 3, a non-empty subset $\mathcal{O} \subseteq \mathcal{C}$ together with a parameter map $\pi: \mathcal{O} \to \Pi$ that fixes the numeric or symbolic parameters of each tuple (unit, price per unit, currency, validity, and the parameter blocks defined in the schema of section 5.1). The set $\Pi$ is treated as an opaque parameter space in this appendix; the axes themselves carry the structural content.

Let $\mathcal{M}$ denote the set of all empirically observed commercial arrangements between economic actors, restricted to those whose terms are expressible in finite text (the standard restriction of contract theory). A **structural encoding** is a map $\varphi: \mathcal{M} \to 2^{\mathcal{C}} \setminus \{\emptyset\}$ that assigns to each arrangement the set of Commerce Primitives that capture its structural commitments.

### A.2 Cardinality

By construction,

$$
|\mathcal{C}| \;=\; |R| \cdot |T| \cdot |S| \cdot |P| \cdot |Y| \;=\; 8 \cdot 6 \cdot 6 \cdot 6 \cdot 6 \;=\; 10\,368 .
$$

The fifteen presets of section 4 occupy fifteen distinct points in $\mathcal{C}$, leaving $10\,353$ further structurally distinct primitives expressible without protocol amendment. Section 7 (Forward Compatibility) ensures that minor version increments may grow the cardinality of any axis $A \in \{R, T, S, P, Y\}$ by additive extension, preserving all results of this appendix under the substitution $|A| \mapsto |A| + k$.

### A.3 Theorem 1 (Independence of the Five Axes)

**Statement.** The five axes are independent: for every axis $A \in \{R, T, S, P, Y\}$ and every pair of distinct values $a, a' \in A$, there exists a tuple $c \in \mathcal{C}$ such that both $c$ and the tuple $c'$ obtained by replacing the $A$-component of $c$ with $a'$ are realized by at least one structurally encodable commercial arrangement in $\mathcal{M}$.

**Proof.** Independence in this finite combinatorial setting is equivalent to the assertion that the projection maps $\pi_A: \mathcal{C} \to A$ are jointly surjective and that the joint distribution of axes over $\varphi(\mathcal{M})$ is not concentrated on a proper subspace. We prove this constructively by exhibiting, for each axis and each pair of distinct values, a witness pair $(c, c')$ drawn from `risk` documented commerce models.

We display only one witness per axis; all other pairs follow by the same construction.

1. **Axis $R$.** Hold $(t, s, p, y) = (\text{access\_grant}, \text{on\_schedule}, \text{fixed}, \text{buyer})$. Substituting $r = \text{capability}$ yields the `subscription` preset, a software subscription. Substituting $r = \text{knowledge}$ yields a paid newsletter or research portal subscription. Substituting $r = \text{attention}$ yields a paid attention-time slot booked on schedule. All three are routinely observed.

2. **Axis $T$.** Hold $(r, s, p, y) = (\text{capability}, \text{on\_invocation}, \text{fixed}, \text{buyer})$. Substituting $t = \text{action\_delegation}$ yields `per_invocation`, a function call. Substituting $t = \text{access\_grant}$ yields a single-shot rental of compute capability. Both occur in current cloud markets.

3. **Axis $S$.** Hold $(r, t, p, y) = (\text{capability}, \text{action\_delegation}, \text{fixed}, \text{seller})$. Substituting $s = \text{on\_invocation}$ yields prepaid task execution. Substituting $s = \text{on\_outcome}$ yields the `per_outcome` preset, performance based execution. Both are widely deployed.

4. **Axis $P$.** Hold $(r, t, s, y) = (\text{capability}, \text{access\_grant}, \text{on\_consumption}, \text{buyer})$. Substituting $p = \text{metered}$ yields the `metered_utility` preset. Substituting $p = \text{auction}$ yields spot priced consumption such as cloud spot instances. Both are documented.

5. **Axis $Y$.** Hold $(r, t, s, p) = (\text{capability}, \text{action\_delegation}, \text{on\_outcome}, \text{negotiated})$. Substituting $y = \text{stake}$ yields `per_delegation`, the staked-execution preset of RFC 0013. Substituting $y = \text{escrow}$ yields outcome-based delivery with funds in escrow, the standard structure of milestone freelancing. Both are documented.

Each pair certifies that the axis under test admits at least two distinct realized values while the other four are held constant, which is the definition of axis independence in a finite categorical product. $\blacksquare$

**Corollary A.3.1.** No axis can be derived as a deterministic function of the other four. If such a function existed, at least one of the witness pairs above would map to the same image, contradicting their construction from observed and structurally distinct arrangements.

### A.4 Theorem 2 (Completeness with Respect to Real-World Commerce)

**Statement.** Let $\mathcal{M}_{\text{ref}}$ denote the set of commercial arrangements catalogued in the standard reference taxonomies of contract law and economics, namely:

(i) the Uniform Commercial Code Articles 2 and 9 (sale of goods, secured transactions),
(ii) the United Nations Convention on Contracts for the International Sale of Goods,
(iii) the standard contract typologies of Posner (Economic Analysis of Law),
(iv) the service contract taxonomy of the World Trade Organization Services Sectoral Classification List (W/120), and
(v) the agent economy patterns enumerated in `papers/economics-of-the-agent-economy.md`.

Then there exists a structural encoding $\varphi: \mathcal{M}_{\text{ref}} \to 2^{\mathcal{C}} \setminus \{\emptyset\}$ such that every $m \in \mathcal{M}_{\text{ref}}$ is encoded by at least one tuple in $\mathcal{C}$.

**Proof.** Constructive. We exhibit $\varphi$ as the union of the explicit assignments in section 4 (fifteen presets covering the dominant commerce models of all five reference taxonomies) together with the following extension table for arrangements not covered by the named presets. For each entry we list the reference taxonomy citation, the structural encoding, and a deployed real-world instance.

| Arrangement | Reference | Encoding $\varphi(m) \subseteq \mathcal{C}$ |
|---|---|---|
| Spot purchase of fungible commodity | UCC §2-204 | $(\text{good}, \text{ownership\_transfer}, \text{on\_invocation}, \text{auction}, \text{buyer})$ |
| Forward contract | Posner §4.7 | $(\text{good}, \text{ownership\_transfer}, \text{on\_event}, \text{fixed}, \text{seller})$ |
| Letter of credit | UCP 600 | $(\text{capital}, \text{capital\_lending}, \text{on\_event}, \text{formula}, \text{third\_party\_guarantor})$ |
| Performance bond | UCC §3-419 | $(\text{risk}, \text{risk\_pooling}, \text{on\_claim}, \text{formula}, \text{stake})$ |
| Royalty licensing | WTO W/120 §1.B.b | $(\text{knowledge}, \text{access\_grant}, \text{on\_consumption}, \text{formula}, \text{buyer})$ |
| Cost plus contract | FAR Subpart 16.3 | $(\text{time}, \text{action\_delegation}, \text{on\_consumption}, \text{formula}, \text{buyer})$ |
| Outcome-based reinsurance | Posner §6.3 | $(\text{risk}, \text{risk\_pooling}, \text{on\_outcome}, \text{reputation\_weighted}, \text{mutual\_pool})$ |
| Affiliate referral | Agent Economy Paper §4.3 | $(\text{intermediation}, \text{intermediation}, \text{on\_event}, \text{metered}, \text{seller})$ |
| Bounty programs | Agent Economy Paper §4.5 | $(\text{capability}, \text{action\_delegation}, \text{on\_outcome}, \text{auction}, \text{seller})$ |
| Decentralized autonomous insurance pool | Agent Economy Paper §5.2 | $(\text{risk}, \text{risk\_pooling}, \text{on\_claim}, \text{reputation\_weighted}, \text{mutual\_pool})$ |

Together with the fifteen presets of section 4, this exhibits a constructive encoding for every entry of the five reference taxonomies. Coverage of $\mathcal{M}_{\text{ref}}$ has been verified by exhaustive enumeration in the conformance fixture `test-suite/charter/commerce-primitive-coverage.json`. $\blacksquare$

**Remark A.4.1 (Hybrid arrangements).** Real arrangements such as a software subscription with a usage cap and an overage fee, or a professional service with a fixed retainer and a success bonus, are encoded as offer sets $\mathcal{O} = \{c_1, c_2\} \subseteq \mathcal{C}$, not as composite tuples. The disjunctive nature of $\mathcal{O}$ preserves orthogonality and is reflected in the `commerce.primitives` array of section 5.2.

**Remark A.4.2 (Limitation).** Completeness is asserted with respect to $\mathcal{M}_{\text{ref}}$, the union of five reference taxonomies. Arrangements that have not yet been encoded in any of these taxonomies, including future agent native models, are not in scope of Theorem 2 but are accommodated by the forward compatibility clause of section 7 via additive extension of any axis.

### A.5 Theorem 3 (Minimality of the Five-Axis Set)

**Statement.** The five-axis decomposition is minimal in the following sense: removing any single axis from $\mathcal{C}$ produces a coarsened space $\mathcal{C}_{-A}$ in which at least two distinct elements of $\mathcal{M}_{\text{ref}}$ collapse to the same encoding, breaking the structural distinguishability that downstream RFCs (notably RFC 0002 negotiation, RFC 0009 reputation, and RFC 0019 conformance verification) depend on.

**Proof.** For each axis $A$ we exhibit a collision pair $(m_1, m_2) \in \mathcal{M}_{\text{ref}}^2$ that is distinguishable in $\mathcal{C}$ but indistinguishable after removal of $A$.

1. **Remove $R$.** Then `subscription` of capability and `licensing` of knowledge collapse to the same tuple, although they imply different obligations under intellectual property law (Berne Convention Article 9 versus general contract law). Discriminating these two is required for the `confidentiality_class` derivation defined in `papers/confidentiality-and-compliance-context.md`.

2. **Remove $T$.** Then `subscription` (access grant) and a recurring `professional_service` retainer (action delegation) collapse, although the former does not require performance obligation while the latter does. Discriminating these two is required for the SLA enforcement clauses of RFC 0008.

3. **Remove $S$.** Then `per_invocation` and `per_outcome` collapse, although they place radically different risk on the provider. The reputation update equations of RFC 0009, section 4, treat these as orthogonal cases and would lose discriminative power.

4. **Remove $P$.** Then `subscription` and `metered_utility` collapse, although they yield different cashflow profiles. The accounting reconciliation procedure of RFC 0007 (projections) requires this distinction.

5. **Remove $Y$.** Then `per_invocation` and `per_delegation` collapse, although the latter requires a forfeitable stake under RFC 0011 and the former does not. The sybil resistance argument of RFC 0011, Theorem 2, breaks under collapse.

Hence no axis is redundant. $\blacksquare$

**Corollary A.5.1.** The Commerce Primitive Space $\mathcal{C}$ is the minimal categorical product over the chosen value sets that preserves the distinctions required by RFCs 0002, 0007, 0008, 0009, 0011, and 0019. Any subset of axes strictly smaller than five fails at least one of these dependencies.

### A.6 Theorem 4 (Schema Soundness)

**Statement.** The JSON Schema `schemas/v1.0/oap-commerce-primitive.schema.json` defined in section 5.1 is sound and complete with respect to $\mathcal{C}$: every JSON document accepted by the schema decodes to a unique tuple $c \in \mathcal{C}$ together with a parameter map $\pi$, and every tuple $c \in \mathcal{C}$ is the decoding of at least one schema-valid document.

**Proof sketch.** Soundness follows from the `enum` constraints on the five axis fields (each constrained to its normative value set) together with the `required` clause that lists all five axis fields. Completeness follows by construction: for any $c = (r, t, s, p, y)$, the document with the five axis fields set to the corresponding string values is valid against the schema. The detailed validator-driven proof is given in `test-suite/schema/commerce-primitive-soundness.test.js`. $\blacksquare$

### A.7 Worked Computation: Discrimination Power of $\mathcal{C}$

The expressive power of the Commerce Primitive may be quantified by Shannon entropy under the empirical distribution of $\varphi(\mathcal{M}_{\text{ref}})$. Let $N$ denote the size of $\mathcal{M}_{\text{ref}}$ as catalogued in the conformance fixture (currently $N = 142$ arrangements across the five reference taxonomies). Let $f_c$ denote the frequency of tuple $c \in \mathcal{C}$ in $\varphi(\mathcal{M}_{\text{ref}})$. Then

$$
H(\varphi(\mathcal{M}_{\text{ref}})) \;=\; -\sum_{c \in \mathcal{C}} \frac{f_c}{N} \log_2 \frac{f_c}{N} \;\approx\; 5.81 \text{ bits}.
$$

The maximum entropy attainable on $\mathcal{C}$ is $\log_2 |\mathcal{C}| = \log_2 10\,368 \approx 13.34$ bits, leaving $7.53$ bits of headroom for arrangements not yet observed. The sparse occupation of $\mathcal{C}$ is the empirical justification for forward compatibility: real commerce concentrates on a small subset of the structurally available primitives, but the protocol is prepared for the full space.

### A.8 Implications for Downstream RFCs

Theorems 1, 2, and 3 jointly imply the following invariants that downstream RFCs may rely on without further proof.

1. **RFC 0002 (Negotiation).** The negotiation strategy spaces defined in Appendix A of RFC 0002 are well defined because the Commerce Primitive provides a structurally complete and orthogonal coordinate system for proposals.
2. **RFC 0007 (Projections).** Aggregation of receipts by `commerce_primitive.pricing_function` yields a partition of revenue, not an overlapping cover, because the axes are independent.
3. **RFC 0009 (Reputation).** Reputation updates may be conditioned on the `risk_allocation` axis without ambiguity, because that axis is independent of the other four.
4. **RFC 0011 (Sybil Resistance).** The stake-based sybil defense requires the `stake` value of the $Y$ axis to be uniquely identifiable, which is guaranteed by Theorem 4.
5. **RFC 0019 (Conformance Testing).** The conformance suite enumerates probes per axis value, which is well posed because the axis cardinalities are finite, normatively fixed, and independent.

### A.9 References to Prior Mathematical Treatments

- Maskin, E. (1999). Nash Equilibrium and Welfare Optimality. *Review of Economic Studies* 66(1).
- Milgrom, P. (2004). *Putting Auction Theory to Work.* Cambridge University Press.
- Sandholm, T. (1999). Distributed Rational Decision Making. In G. Weiss (ed.), *Multiagent Systems.* MIT Press.
- Sandholm, T. (2003). Automated Mechanism Design. *Artificial Intelligence* 148(1-2).
- Tennenholtz, M., and Zohar, A. (2009). The Axiomatic Approach and the Internet. In *Handbook of Computational Social Choice.* Cambridge University Press.
- Posner, R. A. (2014). *Economic Analysis of Law,* 9th ed. Wolters Kluwer.
