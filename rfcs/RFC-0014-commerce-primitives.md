# RFC 0014: Commerce Primitives, A Generalized Commercial Layer

**Status:** Draft
**Author(s):** OAP Foundation, Working Group on Commercial Layer
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
