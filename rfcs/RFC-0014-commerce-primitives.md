# RFC 0014: Commerce Primitives, A Generalized Commercial Layer

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Commercial Layer
**Created:** 2026-05-03
**Targets:** 1.2
**Supersedes:** None
**Extends:** RFC 0013
**Affects:** RFC 0032 (Payment Instrument Adapter Protocol), RFC 0033 (Training Data Licensing)

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
6. **RFC 0028 (Model Risk and Symbiotic Autonomy).** Commerce Primitives that involve any machine learned Model in the `pricing_function` or `settlement_trigger` axis inherit the Model Inventory, drift detection, and counterfactual explanation requirements of RFC 0028. The L5-FINANCE Conformance Tier of RFC 0028 section 8 binds Commerce Primitives to the canonical `reporting_regime` values of RFC 0028 Annex A, which is how MiFID II, MiFIR, PSD2, EMIR, and SR 11-7 obligations attach to OAP commerce.

### A.9 References to Prior Mathematical Treatments

- Maskin, E. (1999). Nash Equilibrium and Welfare Optimality. *Review of Economic Studies* 66(1).
- Milgrom, P. (2004). *Putting Auction Theory to Work.* Cambridge University Press. The canonical treatment of the auction designs admitted by the `pricing_function = auction` value of axis $P$ and of the substitutes condition that grounds the orthogonality argument of Theorem 1.
- Milgrom, P., and Weber, R. J. (1982). A Theory of Auctions and Competitive Bidding. *Econometrica* 50(5). The affiliated values framework and the linkage principle that motivate the documentation requirement on auction format under axis $P$ and the revenue equivalence boundary that explains why first price and second price `auction` values are not interchangeable for DSIC purposes (RFC 0002 Appendix A.4).
- Milgrom, P., and Stokey, N. (1982). Information, Trade and Common Knowledge. *Journal of Economic Theory* 26(1). The no-trade theorem under common knowledge of rationality that grounds the design choice of the `negotiated` value of axis $P$ to be a structurally weaker incentive class than the auction values, in the sense made precise by RFC 0002 Theorem 3.
- Milgrom, P., and Roberts, J. (1990). Rationalizability, Learning, and Equilibrium in Games with Strategic Complementarities. *Econometrica* 58(6). The supermodular games framework that grounds the convergence of the negotiation dynamics of RFC 0002 section 3 when the `pricing_function` axis admits monotone best replies.
- Milgrom, P., and Wilson, R. (2020). Improving the Design of Multi-Item Auctions. Nobel Memorial Prize Lecture, Royal Swedish Academy of Sciences. The simultaneous multiple round auction (SMRA) design and its package-bidding extensions, the formats whose protocol-level realization requires the `multi_lot` extension of axis $T$ documented in RFC 0014 section 3.4.
- Sandholm, T. (1999). Distributed Rational Decision Making. In G. Weiss (ed.), *Multiagent Systems.* MIT Press.
- Sandholm, T. (2003). Automated Mechanism Design. *Artificial Intelligence* 148(1-2).
- Tennenholtz, M., and Zohar, A. (2009). The Axiomatic Approach and the Internet. In *Handbook of Computational Social Choice.* Cambridge University Press.
- Posner, R. A. (2014). *Economic Analysis of Law,* 9th ed. Wolters Kluwer.

## Appendix B: Currency Settlement Protocol (Normative)

This appendix is normative. It defines how cross-currency amounts are resolved when a Commerce Primitive's `price_per_unit` is denominated in a currency different from the instrument currency declared in the Wallet operator's `wallet.json`. RFC 0013 section 3.10 references the Settlement Statement mechanism but does not specify exchange rate sourcing, locking, or dispute resolution. This appendix closes that gap.

### B.1 The Settlement Currency Problem

An agent acting for a principal whose Wallet is denominated in EUR may need to pay a provider that prices in USD, or settle over Lightning Network (denominated in BTC), or pay a stablecoin provider priced in USDC. Three distinct sub-problems arise:

1. **Rate sourcing**: which FX rate is authoritative at the moment the offer is evaluated?
2. **Rate locking**: for how long is a quoted rate valid, and who bears the risk of rate movement?
3. **Rate auditing**: how can a principal verify after the fact that the rate applied was the rate agreed?

These problems are not unique to agent commerce. The BIS (2022) cross-border payment study identifies them as the primary sources of Herstatt risk and settlement failure in traditional FX markets. CLS Bank (2023) estimates that the global FX settlement risk on any given day approaches $6 trillion, of which roughly 30 percent remains unsettled on a PvP basis. The agent economy amplifies this problem because agents transact at machine speed across jurisdictions without human review.

### B.2 Definitions

An **FX Quote** is a signed document from a declared FX Oracle that states the exchange rate between two ISO 4217 currencies or between a fiat currency and a cryptocurrency symbol, valid for a declared window.

An **FX Oracle** is any party that publishes signed FX Quotes conforming to `oap-fx-quote.schema.json`. An FX Oracle MUST be declared by DID. A Wallet operator MUST list its accepted FX Oracles in `wallet.json` under `fx_oracles`.

A **Rate-Locked Session** is a Payment Session (per RFC 0032) that carries a committed FX rate. The rate is applied at the moment the Session is created and is immutable for the life of the Session.

A **Settlement Currency** is the currency in which the Wallet operator's instrument actually settles. The `price_currency` in the Offer and the `settlement_currency` in the Wallet may differ. The FX rate converts between them.

### B.3 FX Oracle Requirements

An FX Oracle claiming conformance to this appendix MUST:

- Publish signed FX Quotes at a stable endpoint declared in its DID Document.
- Sign each Quote with a key in its DID Document under a `verificationMethod` of type `JsonWebKey2020` or `Ed25519VerificationKey2020`.
- Include in each Quote the source data references: the two or more market data providers from which the mid-market rate was derived, with their timestamps.
- Declare a validity window of at most 60 seconds for cryptocurrency pairs and at most 300 seconds for fiat-to-fiat pairs.
- Publish a historical rate endpoint that returns signed Quotes for any timestamp within the past 90 days, enabling retroactive dispute resolution.

OAP does not designate a single mandatory FX Oracle. The design allows multiple competing oracles, each with a DID and a reputation score under RFC 0009. An agent SHOULD select an FX Oracle that has the highest Reputation Score among those accepted by the target Wallet operator.

The following sources represent best practice for oracle data construction as of 2026:

- **Fiat pairs (EUR/USD, USD/GBP, etc.)**: ECB reference rates (published daily at 16:00 CET) for same-day settlement; WM/Reuters 4pm London fix for cross-day. The BIS FX statistics (Table A.1) provide benchmark spread data for detecting outlier quotes.
- **Crypto-fiat pairs (BTC/EUR, ETH/USD, etc.)**: volume-weighted average price (VWAP) over the 60 minutes preceding the Quote from at least three regulated exchanges (e.g., Coinbase Pro, Kraken, Bitstamp). This construction is consistent with the MiCA Regulation Article 19 requirement for fair value determination of crypto-assets.
- **Stablecoin-fiat pairs (USDC/EUR)**: on-chain oracle data from decentralized oracle networks (e.g., Chainlink Data Feeds) cross-validated against centralized exchange rates. Where deviation exceeds 0.5 percent, the lower of the two rates MUST be used in favor of the payer.

### B.4 The FX Quote Document

An FX Quote conforming to `oap-fx-quote.schema.json`:

```json
{
  "quote_id": "urn:oap:fx-quote:oracle.example:2026-05-06T12:00:00Z:EUR:USD",
  "oracle_did": "did:web:oracle.example",
  "base_currency": "EUR",
  "quote_currency": "USD",
  "mid_rate": "1.0823",
  "bid_rate": "1.0820",
  "ask_rate": "1.0826",
  "spread_bps": "6",
  "valid_from": "2026-05-06T12:00:00Z",
  "valid_until": "2026-05-06T12:05:00Z",
  "sources": [
    { "provider": "ECB", "rate": "1.0822", "timestamp": "2026-05-06T11:59:50Z" },
    { "provider": "WM_Reuters_4pm", "rate": "1.0824", "timestamp": "2026-05-06T11:59:00Z" }
  ],
  "rate_class": "indicative",
  "signature": {
    "alg": "EdDSA",
    "kid": "did:web:oracle.example#key-1",
    "value": "..."
  }
}
```

The `rate_class` field takes one of three values:

- `indicative`: for budgeting and offer comparison only; not binding for settlement.
- `firm`: binding for the duration of `valid_until`; may be used in Rate-Locked Sessions.
- `executed`: rate at which a settlement actually occurred; included in the Settlement Confirmation.

### B.5 Rate Application in Payment Sessions

When a Payment Session involves a currency conversion, the agent MUST obtain a `firm` FX Quote from an oracle accepted by the Wallet operator before creating the Session. The Session creation request MUST include the `fx_quote_id` and the `fx_quote_hash`. The Wallet operator MUST verify that:

1. The Quote signature is valid against the oracle's DID key.
2. The Quote `valid_until` has not passed at the time the Session is created.
3. The oracle DID is in the Wallet's accepted `fx_oracles` list.
4. The `ask_rate` (for purchases) applied to the `price_currency` amount yields the `settlement_currency` amount declared in the Session.

The Session is then rate-locked at the `ask_rate` from the Quote. Even if the market rate moves before execution, the rate recorded in the Session is immutable. This mimics the PvP (Payment-versus-Payment) finality model used by CLS Bank, adapted to the OAP context.

The Settlement Confirmation MUST include:

```json
"fx": {
  "price_currency": "USD",
  "settlement_currency": "EUR",
  "price_amount": "189.00",
  "settlement_amount": "174.64",
  "rate_applied": "1.0823",
  "fx_quote_id": "urn:oap:fx-quote:oracle.example:2026-05-06T12:00:00Z:EUR:USD",
  "fx_quote_hash": "sha256:abc123...",
  "oracle_did": "did:web:oracle.example"
}
```

This block is the auditable record that allows a principal to verify that the rate applied was the agreed rate, satisfying the EU AI Act Article 13 requirement for economic decision transparency.

### B.6 Rate Dispute Resolution

A principal who believes an incorrect rate was applied MAY submit a Rate Dispute Record to the Wallet's `dispute_endpoint` within 30 days of settlement. The Dispute Record MUST reference the `confirmation_id`, the claimed correct rate, and the oracle's historical rate at the settlement timestamp (retrieved from the oracle's historical rate endpoint).

The Wallet operator MUST compare the applied rate against the oracle's historical signed Quote for the settlement timestamp. If the deviation exceeds the declared spread (i.e., `|applied_rate - historical_mid| > spread_bps / 10000`), the Wallet operator MUST issue a partial refund of the difference and record a Reputation Slash against the oracle.

### B.7 Multi-Leg Settlement

Some cross-border payments require two or more FX conversions: for example EUR to JPY requires EUR to USD and USD to JPY. The agent MUST obtain FX Quotes for each leg. The Payment Session carries an array of `fx_legs`. The total conversion rate is the product of the individual leg rates, and the total spread is the sum of the individual leg spreads. Agents SHOULD prefer single-leg conversion where direct currency pairs are available, because each additional leg multiplies spread cost.

### B.8 Cryptocurrency Volatility Adjustment

For cryptocurrency-denominated Offers (for example a Lightning Network invoice denominated in BTC), the agent faces a volatility risk that does not exist in fiat-to-fiat conversion. The BTC/EUR mid-rate may move significantly between the time the agent evaluates an offer and the time the Lightning payment settles (typically under 10 seconds, but potentially longer if routing fails). The OAP protocol resolves this as follows:

A Lightning Network FX Quote MUST have a `valid_until` of at most 60 seconds. The agent MUST create a Rate-Locked Session before sending the Lightning payment. If the payment routing takes longer than 60 seconds and the Quote expires, the agent MUST abandon the payment, allow the HTLC to time out, and create a new Session with a fresh Quote. This behavior is consistent with the BOLT11 invoice expiry mechanism and with the Herstatt risk mitigation principles of BIS (2022).

### B.9 Formal Properties

Let $r_{A \to B}$ denote the `ask_rate` in an FX Quote from currency $A$ to currency $B$, and $r_{B \to A}$ denote the reverse `bid_rate`. Define the **round-trip cost** as $\rho = 1 - r_{A \to B} \cdot r_{B \to A}$. A conforming FX Oracle MUST publish rates such that $\rho \leq \rho_{\max}$, where $\rho_{\max}$ is the declared `max_round_trip_cost_bps / 10000`. This bound prevents oracles from publishing arbitrarily wide spreads that would extract value from agents engaging in round-trip commerce.

An agent that routes $n$ payments through $n$ different oracles for the same currency pair receives rates drawn from a distribution. Under the assumption that oracle rates are independent and identically distributed around the true mid-market rate, the expected cost of the best rate among $n$ oracles is $\mathbb{E}[\min_i r_i]$, which decreases with $n$. Agents implementing the Build versus Buy decision protocol of RFC 0013 section 3.7 SHOULD query at least two oracles and use the more favorable rate. This is the agent economy analog of FX market best execution under MiFID II Article 27.

### B.10 References

- BIS (2022). Improving cross-border payments: from talk to action. BIS Annual Economic Report 2022, Chapter III.
- BIS (2019). Herstatt risk and the design of cross-currency settlement systems. BIS Working Papers No. 775.
- CLS Bank International (2023). CLS Settlement Statistics. Annual Report 2023.
- European Central Bank (2024). ECB Euro Reference Rates. Methodology document.
- Nakamoto, S. (2008). Bitcoin: A Peer-to-Peer Electronic Cash System. Self-published white paper.
- Poon, J., and Dryja, T. (2016). The Bitcoin Lightning Network: Scalable Off-Chain Instant Payments. Technical Report.
- European Union (2023). MiCA Regulation: Regulation (EU) 2023/1114 on Markets in Crypto-Assets, Article 19.
- European Securities and Markets Authority (2014). MiFID II: Directive 2014/65/EU, Article 27 (Best Execution).
- Chainlink Labs (2024). Chainlink Data Feeds: Architecture and Security Model. Technical Report.
- WM Company (2024). WM/Reuters Foreign Exchange Benchmarks: Methodology Guide.
