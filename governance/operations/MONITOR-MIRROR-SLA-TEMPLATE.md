# Monitor and Mirror Service SLA Template (RFC 0021 Appendix B.7)

This template defines the contractual SLA that a Match Broker SHOULD execute with each of its independent Monitor and Mirror operators. The template is informative; the SLA values are RECOMMENDED defaults that an individual broker MAY tighten but SHOULD NOT loosen without recording the deviation in the Broker Category Profile.

## 1. Monitor SLA

The Monitor pulls the broker's Tree Head endpoint at the broker's declared `publication_interval_seconds` cadence, verifies the threshold signature against the broker's published group public key, verifies that the new head extends the previously observed head (no fork), and publishes its own signed observation at a stable URL.

Recommended terms:

- Pull cadence: at least every `publication_interval_seconds`, latency budget 10 percent of the interval.
- Observation publication latency: at most 30 seconds after pull completes.
- Uptime SLA: 99.9 percent per quarter, with planned maintenance excluded only when announced 72 hours in advance.
- Alert escalation: a missing Tree Head publication or a fork detection triggers a signed MonitorAlert event within 60 seconds and notifies the broker's operations team plus the Working Group monitoring channel.
- Independence: the Monitor operator MUST NOT be a maintainer of the observed broker, MUST NOT share controlling shareholders, and MUST NOT have a direct customer relationship that would create coercive leverage.

Termination: either party may terminate with 30 days notice; the Monitor MUST continue to publish historical observations for at least 365 days after termination.

## 2. Mirror SLA

The Mirror maintains a synchronized copy of the broker's Verifiable Index and Listing payloads in a distinct geographic region. The Mirror serves read traffic with the same Inclusion Proof and Completeness Attestation surface as the primary.

Recommended terms:

- Lag bound: Mirror MUST be no more than 90 seconds behind the primary's most recent Tree Head publication. Sustained lag above the bound is an SLA breach.
- Region separation: the Mirror MUST be sited in a distinct region from the primary, where region is interpreted as a distinct AWS region equivalent, a distinct EU country, or a different continent.
- Storage retention: the Mirror MUST retain all entries for at least the broker's `listing_payload_ttl_seconds`.
- Failover capacity: the Mirror MUST be capable of serving the broker's full query load if the primary is offline.

## 3. Compensation and credits

Failure of either Monitor or Mirror to meet its SLA triggers service credits proportional to the duration of non compliance. The broker MAY publish these credits as a structured field in its Broker Category Profile so that consumers can include SLA history in their Reputation evaluation under RFC 0009.

## 4. Vendor candidates (informative)

Independent Monitor operators that have publicly committed to operating Transparency Log style monitors include the Sigstore community Rekor monitors, the Trail of Bits monitors, and the OAP Working Group reference monitor. Mirror operators are typically commercial cloud providers; brokers SHOULD consider sovereign cloud providers in their primary jurisdiction.
