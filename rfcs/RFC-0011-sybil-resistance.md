# RFC 0011: Sybil Resistance and Sub Agent Anti Abuse

**Status:** Draft
**Author(s):** OAP Working Group on Trust and Reputation
**Created:** 2026-05-03
**Working Group:** Trust and Reputation
**Targets:** 1.1

## 1. Summary

This RFC defines a normative defense against the most predictable failure mode of an autonomous
agent ecosystem: a single Principal or Agent spawning a large number of Sub Agents in order to
inflate Reputation, manipulate Marketplace rankings, dominate Negotiation rounds, exhaust rate
limits of competitors, or reconstruct redacted data through coordinated Projection requests.

OAP already provides Delegation Tokens (RFC 0004) and Sybil filtering on Issuer identity
(RFC 0009). This RFC introduces three additional primitives that close the remaining gap:
**Sub Tree Aggregation**, the **Coordinated Behavior Score**, and a normative list of
**Restricted Actions** that MUST NOT be invoked by Sub Agents at all.

## 2. Motivation

Three concrete attacks motivate this RFC:

1. **Reputation Inflation.** Agent A spawns 200 Sub Agents that each issue a five star
   Performance Record about Tool X. Without coordination detection, Tool X jumps to the top of
   every Marketplace ranking.
2. **Negotiation Flooding.** Agent A spawns 50 Sub Agents that submit competing bids in a
   scheduling Negotiation, exhausting the counterparty's per round budget and forcing acceptance
   of A's actual offer by attrition.
3. **Projection Reconstruction.** Agent A spawns 30 Sub Agents that each request a different
   minimal Projection of the same Contact, then reassembles the union into the full record that
   no single Sub Agent was authorized to see.

Existing OAP mechanisms catch each Sub Agent in isolation but treat them as independent
Principals. The fix is to recognize the Sub Tree as one accountable Actor.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Delegation Tree | The set of all Agents reachable from a single root Principal through chained Delegation Tokens. |
| Sub Tree Bucket | The aggregation unit used by a Tool to apply rate limits, budgets, and reputation weighting against an entire Delegation Tree as one Actor. |
| Coordinated Behavior Score | A scalar between 0 and 1 expressing the probability that a set of Sub Agents are acting in concert under the direction of a single Principal. |
| Restricted Action | An Action that MUST NOT be invoked by a Sub Agent regardless of its Delegation Token scope. |
| Anti Sybil Proof | A cryptographic proof attached to a Sub Agent spawn that imposes a non trivial cost on the spawning Principal. |

### 3.2 Sub Tree Aggregation

Tools MUST treat all Invocations originating from a single Delegation Tree as one accountable
Actor for the purposes of:

1. Rate limits (`max_invocations_per_minute`, `max_invocations_per_day`).
2. Spending caps under Standing Permissions (RFC 0003).
3. Reputation weighting (RFC 0009).
4. Negotiation participation caps (one bid per Sub Tree per Negotiation round).
5. Projection request frequency (per RFC 0007 Section 5.2).

A Tool determines the Sub Tree of an incoming Invocation by walking the `parent_invocation_id`
chain of Delegation Tokens up to the root Principal DID. The root DID identifies the Sub Tree
Bucket.

### 3.3 Restricted Actions

The following Action categories MUST NOT be invoked by a Sub Agent. They require either direct
Principal action or an explicit Standing Permission Grant (RFC 0003) that names the specific
Restricted Action by ID.

| Category | Rationale |
|----------|-----------|
| `oap.reputation.record.issue` | Prevents Sybil Reputation inflation. |
| `oap.marketplace.vote` | Prevents Marketplace ranking manipulation. |
| `oap.marketplace.review.publish` | Prevents review flooding. |
| `oap.negotiation.bid` | Prevents Negotiation flooding. |
| `oap.governance.poll.vote` | Prevents governance capture. |
| `oap.entity.deal.close` (above declared `human_required_threshold`) | Prevents commercial commitment laundering. |

A Tool MUST reject a Restricted Action invoked by an Agent whose request envelope contains a
Delegation Token, unless the request also presents a Standing Permission Grant whose
`actions` list literally contains the Action ID.

### 3.4 Coordinated Behavior Score

For a set of Invocations from the same Sub Tree Bucket within a sliding window, the Tool
SHOULD compute a Coordinated Behavior Score using observable signals:

| Signal | Weight |
|--------|--------|
| Identical or near identical input payload (cosine similarity above 0.92) | 0.30 |
| Identical target Entity or counterparty | 0.20 |
| Temporal clustering (more than 5 invocations within 60 seconds) | 0.15 |
| Identical projection profile request | 0.15 |
| Identical Negotiation category and overlapping price band | 0.20 |

A Tool MAY refuse, throttle, or label any Invocation whose Sub Tree exhibits a
Coordinated Behavior Score above 0.6. The Tool MUST disclose the threshold and signal weights
it uses in its Manifest, so that legitimate distributed work patterns can be designed
to remain below the threshold.

### 3.5 Anti Sybil Proof

Tools MAY require an Anti Sybil Proof for Sub Agent Invocations that target high risk Actions.
Acceptable Proof types:

1. **Delegation Stake Proof.** The Parent Principal commits a refundable stake (in EUR or any
   declared unit of account) for a defined window. Misbehavior by any Sub Agent in the
   Delegation Tree forfeits the stake.
2. **Verifiable Computation Proof.** A small but non zero proof of work is computed at spawn
   time, scaled to the risk class of the Action.
3. **Verified Principal Proof.** The Parent Principal carries an `OAPPersonhoodVerified` or
   `OAPPublisherVerified` Verifiable Credential issued by a recognized Issuer.

The Tool MUST declare which Proof types it accepts in its Manifest under
`delegation.requires_anti_sybil_proof`.

### 3.6 Reputation Decay by Sibling Count

For Performance Records (RFC 0009), the Trust Anchor MUST apply a sibling decay factor:

```
weight(record) = base_weight / (1 + alpha * log2(sibling_count))
```

where `sibling_count` is the number of Sub Agents in the same Delegation Tree that have issued
a Performance Record about the same Subject within the Reputation aggregation window. The
recommended `alpha` is 1.0. The decay applies before all other RFC 0009 weighting steps.

### 3.7 Manifest Declaration

The `delegation` block from RFC 0004 is extended with anti abuse fields:

```json
{
  "delegation": {
    "supported": true,
    "max_concurrent_sub_agents_per_parent": 5,
    "max_delegation_depth": 3,
    "sub_tree_bucket_enforcement": true,
    "requires_anti_sybil_proof": ["VerifiedPrincipal", "DelegationStake"],
    "minimum_delegation_stake_eur": "5.00",
    "coordinated_behavior_threshold": 0.6,
    "restricted_actions_policy": "platform_default"
  }
}
```

### 3.8 Receipts

Every Receipt produced from an Invocation that originated in a Delegation Tree MUST disclose:

1. The root Principal DID of the Delegation Tree.
2. The Sub Tree Bucket identifier used for rate accounting.
3. The Coordinated Behavior Score at the time of evaluation, if computed.
4. Any Anti Sybil Proof identifier accepted, if required.

This permits independent audit of whether the Tool actually applied the rules it published.

## 4. Backward Compatibility

Existing v1.0 Tools that do not implement Sub Tree Aggregation continue to interoperate.
Conformance Levels L4 and above (Collaborative, Certified) MUST implement at least Sub Tree
Aggregation and Restricted Actions. Anti Sybil Proof remains OPTIONAL at all Levels.

## 5. Security Considerations

1. **Bucket Identification Failure.** A malicious Parent MAY attempt to obscure the Delegation
   Tree by issuing Sub Agents under throwaway DIDs. Tools MUST verify the Delegation Token
   chain cryptographically and MUST refuse Tokens whose chain does not resolve to a verifiable
   root DID.
2. **Behavioral Score Evasion.** Sophisticated attackers MAY introduce noise to keep the score
   below the threshold. The score is therefore a defense in depth signal, not a substitute for
   Restricted Actions and rate limits.
3. **Stake Attack on Honest Principals.** Delegation Stake creates a financial liability that
   could be exploited by competitors triggering false misbehavior reports. Stake forfeiture
   MUST require either a signed Receipt of the misbehavior or a Stewards Dispute Resolution
   ruling.

## 6. Privacy Considerations

The root Principal DID disclosed in Receipts is sensitive. Tools MAY pseudonymize the root DID
in receipts shared with third parties, as long as the original mapping remains available to the
data subject and to authorized auditors.

## 7. Conformance Impact

| Level | Sub Tree Aggregation | Restricted Actions | Coordinated Behavior Score | Anti Sybil Proof |
|-------|----------------------|--------------------|----------------------------|------------------|
| L0–L2 | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL |
| L3    | RECOMMENDED | REQUIRED | OPTIONAL | OPTIONAL |
| L4    | REQUIRED | REQUIRED | REQUIRED | OPTIONAL |
| L5    | REQUIRED | REQUIRED | REQUIRED | REQUIRED for Reputation Issuance |

## 8. Implementation Experience

AssistNet enforces Sub Tree Aggregation across its Sub Agent Engine in production. The
Restricted Actions list above corresponds one to one to AssistNet actions that are blocked
when the request envelope contains a Delegation Token. Coordinated Behavior Score is
implemented but disclosed only to Tool operators; public disclosure follows the manifest
extension defined in this RFC.

## 9. Alternatives Considered

1. **Per Sub Agent rate limits only.** Rejected because it does not aggregate the attacker's
   true capacity.
2. **Disallow Sub Agents entirely for high risk Actions.** Rejected because legitimate
   delegation patterns (assistant of an executive, automation script of a researcher) require
   Sub Agent participation under explicit grant.
3. **Mandatory captcha for every Sub Agent.** Rejected because it defeats the purpose of
   autonomous delegation.

## 10. References

1. RFC 0004 (Sub Agent Delegation).
2. RFC 0007 (Privacy Preserving Projections).
3. RFC 0009 (Reputation and Performance Records).
4. OAP-CORE-1.0, Section 18 (Confidentiality and Compliance Context).
