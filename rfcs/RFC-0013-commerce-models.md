# RFC 0013: Commerce Models for the Agent Economy

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Commercial Layer
**Created:** 2026-05-03
**Targets:** 1.2

## 1. Summary

This RFC defines five normative commerce models that the Open Agent Protocol supports as
first class options for any conforming Origin or Capability Provider. The five models are
Per Invocation Commerce, Per Outcome Commerce, Per Token Knowledge Commerce, Per Capability
Commerce, and Per Delegation Commerce. Together they replace the assumptions that the
present web encodes around subscriptions, ranked product listings, fixed price digital
content, and seat based licensing.

The motivation is structural. In an economy populated by autonomous agents, the unit of
purchase shrinks from a monthly subscription to a single invocation, the unit of selection
shifts from a ranked search result to a constraint satisfying offer, and the unit of metered
value extends downward from a file or page to an individual token or knowledge node consumed.
None of these shifts is fully addressed by the existing OAP commercial schemas. This RFC
extends those schemas, introduces the Procurement Intent and the Knowledge License, and
defines the Build versus Buy Decision Protocol that allows agents to choose rationally
between invoking a paid Capability and producing the same result with their own inference
budget.

## 2. Motivation

Three observations about agent economics motivate this RFC.

The first observation is that classical Software as a Service is not stable in an agent
economy. A subscription priced per human seat assumes that the consumer of the service is a
human who returns to the product repeatedly during a billing period. An autonomous agent
does not return to a product. It evaluates each task, decides whether to invoke a Capability
or to produce the result with its own inference, and selects the option that minimizes cost
plus latency under a quality constraint. The Capability that wins this evaluation is a
Capability whose price per invocation is below the agent's own marginal token cost for
performing the same task, or whose latency is materially better, or whose quality is
verifiably better than the agent can produce alone. Capabilities that do not satisfy any of
these conditions lose the agent's traffic regardless of the goodwill their brand has
accumulated in the human market.

The second observation is that classical electronic commerce, in which a human visitor
browses a catalog and clicks Add to Cart, is not the right interaction surface for an agent
acting on a user's behalf. The user delegates an outcome rather than a product instance. The
user says, in the natural language equivalent of a structured intent, "find me running shoes
in size 43 under eighty euros delivered by Friday from a seller with a verified return
policy." The agent that receives this intent does not browse a catalog. It broadcasts a
Procurement Intent to a set of Capability Providers and Match Brokers, ranks the resulting
Offers under the user's policy, and commits to one. Marketplaces survive in this world only
to the extent that they transform from destinations into Match Brokers that can fulfil
Procurement Intents at competitive cost, latency, and reputation.

The third observation is that knowledge becomes a metered commodity. When an agent reads a
proprietary database to answer a question, the value extracted is proportional to the volume
and specificity of the information consumed, not to the existence of a flat license. The
incentive structure that supports continued investment in high quality knowledge sources
requires that the metering be granular and the attribution be cryptographically anchored to
the consuming agent's outputs. Without such metering, the rational behavior of agents is to
extract maximum value under any flat license, which destroys the supply side of knowledge.
With it, knowledge sources can charge per token, per knowledge node, or per citation, and
agents can transact with them at the same rate at which they would transact with their own
inference engine.

## 3. Specification

### 3.1 Terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED,
NOT RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in
RFC 2119 and RFC 8174.

A **Capability** is an action enumerated in an Origin's manifest under the rules of OAP
Core 1.0 and RFC 0012. A Capability has a price expressed under one of the commerce models
defined in this RFC.

A **Procurement Intent** is a signed structured document expressing a user's desired
outcome together with the constraints under which the outcome is acceptable.

An **Offer** is a signed structured document by which a Capability Provider commits to
fulfilling a specific Procurement Intent at stated terms within a stated validity window.

A **Match Broker** is a Capability Provider whose declared role is to receive Procurement
Intents from agents and to return ranked sets of Offers from other Capability Providers it
has indexed. A Match Broker MUST disclose the methodology by which it ranks Offers and MAY
charge a fee per match.

A **Knowledge Node** is the typed addressable record defined in RFC 0012. In this RFC a
Knowledge Node is also a unit of metering and billing for Per Token Knowledge Commerce.

A **Consumption Proof** is the cryptographic record by which a Knowledge Provider can verify
that a particular agent retrieved a particular volume of content during a particular billing
window. A Consumption Proof is a substructure of the Receipt schema defined in OAP Core 1.0
and is normative under this RFC for the Per Token Knowledge Commerce model.

### 3.2 Commerce Model Taxonomy

A conforming Origin MUST select one or more of the following commerce models for each
Capability or Knowledge Node it offers, and MUST declare the selection in its manifest under
the `commerce.model` field of the relevant entry.

| Model | Identifier | Unit of Charge | Replaces |
|-------|------------|----------------|----------|
| Per Invocation | `per_invocation` | One completed action | Pay as you go API pricing |
| Per Outcome | `per_outcome` | One satisfied Procurement Intent | Catalog and checkout commerce |
| Per Token Knowledge | `per_token_knowledge` | Tokens, bytes, or Knowledge Nodes consumed | Flat fee content licensing |
| Per Capability | `per_capability` | Bounded budget over a fixed window | Per seat subscription pricing |
| Per Delegation | `per_delegation` | One successfully delivered delegated task | Bilateral service contracts |

An Origin MAY combine models for a single Capability, for example by charging Per Invocation
within a Per Capability budget cap. The combination MUST be expressible in the manifest and
MUST be unambiguous at the point of pricing. An Origin SHALL NOT change a published price
retroactively for any invocation already covered by a signed Quote.

### 3.3 Per Invocation Commerce

A Capability priced Per Invocation MUST publish in its manifest entry the following fields.
A `quote_endpoint` URI is REQUIRED and MUST return a signed Quote document in response to a
request that contains the agent's intended invocation parameters. A `price_estimate` field
is OPTIONAL and MAY express an indicative price for budgeting purposes only. The Quote
document is the binding price commitment. Quotes MUST carry a validity window, a
denomination, and a unique identifier that the agent passes to the invocation endpoint as a
proof that the price was agreed.

A Capability priced Per Invocation SHOULD additionally publish a `cost_disclosure` block
that allows agents to perform the Build versus Buy evaluation defined in Section 3.7.

### 3.4 Per Outcome Commerce and Procurement Intent

A Capability Provider that accepts Procurement Intents MUST publish a `procurement_endpoint`
URI in its manifest and MUST list in the manifest the categories of intents it can fulfil.
Each category corresponds to a schema for the structured constraints that intents in that
category may carry. Categories of intent that this RFC defines schemas for include physical
goods, digital goods, scheduled services, professional services, transportation, and
information retrieval tasks. The schemas are normative and are published alongside the OAP
Core schema set under `schemas/v1.0/oap-procurement-intent-*.schema.json`.

The protocol for a Per Outcome transaction proceeds in five steps. First, the agent
constructs a Procurement Intent that satisfies the schema for the relevant category, signs
it under its DID, and submits it to one or more `procurement_endpoint` URIs, optionally
through a Match Broker. Second, each addressed Capability Provider returns either an Offer
or a structured rejection. Each Offer is signed by the Provider, references the Intent
identifier, and includes the price, the delivery commitment, the goods or service
identification (for example by GTIN, ISBN, or service code), the Provider's current
Reputation handle, and the validity window. Third, the agent ranks the received Offers under
its principal's policy, which MAY weight price, latency, reputation, return policy, carbon
intensity, or any other declared criterion. Fourth, the agent commits to the selected Offer
by submitting a signed Acceptance to the Offer's commitment endpoint. Fifth, on completion
of delivery, the Provider returns a Receipt that includes a Delivery Proof appropriate to
the category, and the agent records a Performance Record under RFC 0009 that flows into the
Provider's reputation.

A Procurement Intent MUST include an explicit budget cap and SHALL be considered void if any
returned Offer would exceed the cap. A Procurement Intent MAY designate alternative
fallbacks, such as accepting a slower delivery time at a lower price.

### 3.5 Per Token Knowledge Commerce

A Knowledge Provider that prices content under the Per Token Knowledge model MUST declare in
its manifest the unit of metering, the price per unit, the rounding rule, and the audit
mechanism. Permitted units of metering are `token`, `byte`, `knowledge_node`, and
`citation`. The price per unit MAY differ between units, between content classes within the
provider's catalog, and between agent identities according to a published rate schedule.

For each request to a Knowledge Node served under this model, the Provider MUST return a
Consumption Proof together with the response. The Consumption Proof is a JSON object that
contains the Knowledge Node identifier, the unit of metering, the count of units delivered,
the cryptographic digest of the delivered payload, the agent identifier, the Provider
identifier, and a timestamp. The Provider MUST sign the Consumption Proof under the same
key it uses to sign Receipts.

Consumption Proofs aggregate into a Wallet Statement on a billing window agreed in the
manifest. At the close of each window the Provider issues a single signed Settlement Statement
that references all Consumption Proofs in the window and states the total amount due. The
agent acknowledges by signing the Settlement Statement and triggering payment through one of
the payment instruments enumerated in the Provider's `wallet.json`.

The Per Token Knowledge model SHOULD additionally support **Citation Attribution Receipts**.
A Citation Attribution Receipt is a Receipt issued by an agent to a Knowledge Provider when
the agent produces an output that incorporates content from the Provider's Knowledge Nodes.
The Receipt names the consumed Knowledge Nodes, quantifies the contribution where the
agent's runtime supports such quantification, and is signed by the agent under its DID.
Citation Attribution Receipts are the primary mechanism by which Knowledge Providers can
charge for downstream value created by their content beyond the immediate read.

### 3.6 Per Capability Commerce

A Capability priced under the Per Capability model is offered as a budget cap over a fixed
window. The manifest MUST declare the window length, the budget amount, the renewal
behavior at window close (for example `roll_over`, `expire`, or `prorate`), and the
Capability or set of Capabilities included in the budget. Within the window the agent MAY
invoke the included Capabilities without per call payment, subject only to the budget being
unexhausted. When the budget is exhausted the Provider MUST either refuse further calls or
fall back to Per Invocation pricing as declared in the manifest.

This model is the closest analogue to classical subscription pricing and is provided so that
Knowledge Providers and high fixed cost service providers can offer predictable revenue
arrangements where Per Invocation pricing would be operationally infeasible.

### 3.7 Build versus Buy Decision Protocol

Every Capability priced under Per Invocation, Per Token Knowledge, or Per Capability
Commerce SHOULD publish a `cost_disclosure` block in its manifest that allows agents to
compare the cost of using the Capability against the cost of producing the same result with
their own inference. The block is normative for Capabilities at conformance level C2 or
higher and OPTIONAL otherwise.

The `cost_disclosure` block contains the following fields. The `token_equivalent` field
expresses the cost of one invocation in units of a reference inference model output, for
example "this invocation produces output equivalent in volume to 12000 tokens of a 70 billion
parameter model". The `latency_p50_ms` and `latency_p99_ms` fields express the median and
99th percentile latency the Provider commits to. The `quality_claim` field is a free text
description of what the Capability does that an agent cannot do alone, such as access to a
proprietary database, regulated execution authority, or hardware bound action. The
`quality_evidence` field is OPTIONAL and references a signed benchmark, attestation, or
audit that supports the quality claim.

Agents implementing the Build versus Buy Decision Protocol evaluate the following inequality
for each candidate invocation. The agent invokes the Capability if the Provider's price plus
the agent's latency penalty for the Provider's stated latency, divided by a Quality
adjustment factor that reflects the agent's confidence in the `quality_claim`, is lower than
the agent's own inference cost plus its latency penalty for self execution. The exact form
of the latency penalty and the Quality adjustment is implementation defined and MAY be set
by the agent's principal as part of its policy. The protocol does not require any specific
weighting, only that the comparison is performed and that the decision is logged in a
Decision Record under OAP Core 1.0.

### 3.8 Per Delegation Commerce

A Capability priced under the Per Delegation model is one in which an agent delegates a task
to another agent and the compensation depends on successful delivery. The manifest MUST
declare the unit of work, the price per delivered unit, the failure penalty, and the stake
requirement if any.

A Per Delegation transaction proceeds as follows. The delegating agent posts a signed Task
Order to the receiving agent's `delegation_endpoint`. The receiving agent accepts by
signing the Task Order and, where required, posting a Stake to a mutually agreed escrow
endpoint. The receiving agent executes the task and returns a signed Completion Record. On
acceptance of the Completion Record by the delegating agent, the agreed compensation is
released and the Stake is returned. On rejection of the Completion Record, the dispute is
resolved through the procedure declared in the manifest, which MUST be one of bilateral
arbitration, third party arbitration, or stake forfeiture.

This model supports research delegation, multi step task execution, and any other case where
a delegating agent cannot pre verify the receiving agent's output and where stake aligned
incentives are required to ensure honest performance.

### 3.9 Knowledge Metering Mechanisms

This section describes the four normative metering mechanisms that Knowledge Providers MAY
combine to support the Per Token Knowledge model and the Citation Attribution Receipts
defined in Section 3.5.

The first mechanism is **Volume Metering**. The Provider counts the units delivered for each
request and signs a Consumption Proof. This is the simplest mechanism and is REQUIRED for
all Knowledge Providers operating under this model.

The second mechanism is **Watermark Metering**. The Provider embeds statistically detectable
patterns into the delivered content such that the Provider can later prove with high
confidence that a given downstream output incorporates the watermarked content. Watermarks
SHALL NOT degrade the human readability of the content. Watermark Metering is OPTIONAL but
RECOMMENDED for Providers whose content is at risk of unauthorized reuse.

The third mechanism is **Embedding Attribution**. The Provider publishes vector embeddings
of its Knowledge Nodes at a discoverable URI and offers an audit endpoint that returns a
similarity score between an agent's output and the Provider's catalog. Where similarity
exceeds a publicly declared threshold, the agent SHOULD issue a Citation Attribution Receipt.
This mechanism enables retrospective billing where prospective metering was not feasible.

The fourth mechanism is **Zero Knowledge Consumption Proof**. The Provider and the agent
participate in an interactive protocol that allows the Provider to verify the agent's
consumption claim without the agent revealing the content of its downstream output. This
mechanism is OPTIONAL and is intended for cases where the agent's output is itself
confidential, for example outputs produced under attorney client privilege as described in
RFC 0007.

### 3.10 Settlement and Dispute Resolution

Settlement under all five commerce models proceeds through the Wallet Statement mechanism
defined in OAP Core 1.0, extended in this RFC by the Settlement Statement defined in
Section 3.5. Disputes between agents and Capability Providers proceed through the Incident
Record mechanism defined in OAP Core 1.0, extended by a structured Dispute Record that names
the disputed transactions, the requested remedy, and the evidence the disputing party
supplies. A Capability Provider that fails to respond to a Dispute Record within the window
declared in its manifest forfeits the disputed amount and incurs a Reputation slash under
RFC 0009.

The OAP OAP community operates a public Reconciliation Log in which Capability Providers and
agents MAY anchor periodic hashes of their Wallet Statements and Settlement Statements. The
log is append only and timestamped. Anchoring is voluntary, but Capabilities at conformance
level C3 MUST anchor at least quarterly.

## 4. Security Considerations

The price oracle problem is the central security concern of this RFC. An adversary that can
manipulate the prices an agent sees in Quotes or Offers can extract value from the agent's
principal. Mitigations include requiring that all Quotes and Offers be signed under the
Provider's DID, that agents collect Quotes from multiple Providers for any task above a
material price threshold, and that Match Brokers disclose their ranking methodology and
signed audit history.

The knowledge replay problem is the secondary concern. An agent that downloads a Knowledge
Node once might attempt to reuse it indefinitely without further metered access. Knowledge
Providers SHOULD treat each Consumption Proof as covering only the immediate use of the
delivered content, MAY include freshness terms in the license under which the content is
delivered, and SHOULD use Watermark Metering or Embedding Attribution to detect downstream
reuse beyond the licensed scope.

The Sybil attack on Per Outcome Commerce is addressed by the rules of RFC 0011. A Capability
Provider that operates Sub Agents to flood Procurement Intent broadcasts with low quality
Offers, in order to crowd out competitors or to manipulate the agent's selection, is
detected by the Coordinated Behavior Score and is subject to Reputation slashing.

The Per Delegation stake escrow MUST be implemented with a mutually trusted third party or a
verifiable escrow mechanism. Stakes held by the receiving agent itself do not provide the
intended incentive alignment.

## 5. Privacy Considerations

Procurement Intents reveal information about the user's preferences, financial state, and
intended actions. Agents SHOULD route Procurement Intents through an aggregating Match
Broker rather than broadcasting them directly to Capability Providers when the Intent
contains personally sensitive criteria, and SHOULD apply the projection rules of RFC 0007
to mask fields that are not strictly necessary for the targeted Providers to evaluate.

Citation Attribution Receipts reveal information about what the agent's output contained.
Agents operating under privacy sensitive scopes MUST NOT issue Citation Attribution Receipts
that reveal the content of attorney client privileged outputs, medical analyses governed by
patient confidentiality, or other categories of confidential output enumerated in their
scope policy under RFC 0006. In such cases the Zero Knowledge Consumption Proof mechanism
SHOULD be used instead.

## 6. Conformance

Conforming Origins are classified into three commerce conformance levels under this RFC, in
addition to the broader Conformance Levels defined in OAP Core 1.0.

Level **C1 Priced** requires that every Capability listed in the manifest declare a
commerce model from Section 3.2 and accept payment through at least one instrument
enumerated in `wallet.json`.

Level **C2 Comparable** additionally requires that every Capability priced under Per
Invocation, Per Token Knowledge, or Per Capability Commerce publish a `cost_disclosure`
block under Section 3.7.

Level **C3 Auditable** additionally requires that the Origin participate in the OAP
Reconciliation Log on at least a quarterly cadence and that all Knowledge Providers under
the Origin support at least one of the metering mechanisms defined in Section 3.9 beyond
basic Volume Metering.

## 7. References

This RFC depends normatively on RFC 2119, RFC 8174, OAP Core 1.0, RFC 0004, RFC 0006,
RFC 0007, RFC 0009, RFC 0011, and RFC 0012. The Procurement Intent schemas are published
under `schemas/v1.0/oap-procurement-intent-*.schema.json`. The Settlement Statement schema
is published under `schemas/v1.0/oap-settlement-statement.schema.json`. The Citation
Attribution Receipt schema is published as an extension of the Receipt schema under
`schemas/v1.0/oap-receipt.schema.json` with the new `consumption_proof` and `citations`
substructures.

## 8. Open Questions

The first open question concerns the canonical denomination for prices. The current draft
permits any ISO 4217 currency code and any registered cryptocurrency symbol. Whether the OAP
OAP community should designate a recommended unit of account for inter agent transactions, and
how to handle currency conversion in Procurement Intents that solicit Offers across
jurisdictions, is unresolved.

The second open question concerns the Match Broker disclosure regime. The current draft
requires that Match Brokers disclose their ranking methodology, but does not specify the
form of disclosure. Whether disclosures should be expressed in a structured language, signed
by an external auditor, or accompanied by reproducible test cases, is under discussion.

The third open question concerns the relationship between Per Token Knowledge Commerce and
training data licensing. A Citation Attribution Receipt covers the use of content in a
specific generated output. Whether a separate license category is needed to cover the use of
content in the training of an agent's underlying model, and how such a license could be
metered without unduly restricting model development, is the subject of active discussion in
the Working Group on Trust and Reputation jointly with the Working Group on Commercial
Layer.

The fourth open question concerns the survival path for traditional marketplaces. The
current draft treats Match Brokers as a Capability Provider category and does not privilege
incumbent marketplaces. Whether transition mechanisms should be defined that allow existing
catalog based marketplaces to expose their inventory under the Per Outcome model without
rebuilding their entire customer interface is a deployment question that the OAP community will
revisit after observing early adoption.
