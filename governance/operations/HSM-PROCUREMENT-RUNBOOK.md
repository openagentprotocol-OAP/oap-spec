# HSM Procurement and Key Ceremony Runbook (RFC 0021 Appendix B.6)

This runbook is the operational reference for provisioning the threshold signing infrastructure that a Match Broker requires to claim conformance level M3 or above under RFC 0021. It is not part of the normative specification; it is the procurement and execution guide for the engineering and security operations team that brings a broker live.

## 1. Hardware selection

Choose at least N = 5 share holders sited in three or more independent regions. The currently recommended HSM lines are the YubiHSM 2 (USB, FIPS 140-3 Level 3 module variant, cost roughly EUR 700 per device), the Entrust nShield 5c (network, Level 3, roughly EUR 25k per device including HSE), and AWS CloudHSM (managed, Level 3, billed per HSM hour). Mixing vendors across the share holders reduces correlated supply chain risk and is RECOMMENDED for any broker that anchors workflows above EUR 100k transaction value.

Confirm in writing from the vendor the FIPS 140-3 module certificate number, the validated firmware version, and the certificate validity end date. Reject any device whose certificate expires within twelve months of the planned go live.

## 2. Region selection

Place share holders in at least three legal jurisdictions and at least three independent operator entities. Acceptable triads for an EU centered broker include Frankfurt plus Dublin plus Stockholm; for a multi continent broker, Frankfurt plus Singapore plus Virginia. The independence requirement of RFC 0021 Appendix B section B.7 is satisfied only if no single legal entity controls a quorum of share holders.

## 3. Key ceremony

Schedule the key ceremony at least two weeks in advance. Required attendees are the share holder operators, an independent witness who is not a maintainer of the broker, the broker's chief information security officer, and an audit log notary who will sign the ceremony transcript.

Ceremony agenda:

1. Verify firmware fingerprints on each HSM against the vendor's published values.
2. Run the FROST distributed key generation protocol with all N share holders participating. Use a vetted implementation (ZF FROST, frost-ed25519, or equivalent). The reference wrapper at `reference/threshold-signing/threshold-signing.js` is a stub and MUST NOT be used in production.
3. Each share holder confirms by signed attestation that the share is sealed inside the HSM and never appeared on the host operating system.
4. The combined group public key is published to the broker's well known endpoint and recorded in the meta registry.
5. The audit log notary signs the ceremony transcript and publishes it. A minimum of three of five share holder signatures over the transcript are required for the transcript to be considered authoritative.

## 4. Operational policies

The threshold M is configured at floor(2N/3) + 1 = 4 for N = 5, 5 for N = 7, and 7 for N = 10. M MUST NOT be set lower than this floor. M MAY be set higher when the broker prefers liveness conservatism over share holder availability.

Key rotation is mandatory at least every 90 days. The rotation procedure is documented in `runbooks/KEY-ROTATION.md` and is rehearsed at least once before go live. Failure of a single share holder triggers a rotation within seven days; failure of two share holders triggers an emergency rotation within twenty four hours.

## 5. Incident response

A suspected key compromise triggers the following sequence within two hours of detection: notify all share holders, publish a signed alert at the broker's incident endpoint, suspend signing of new Tree Heads, perform the emergency rotation under section 4, publish a post incident report within seven days. The OAP Registry maintains a public list of historical incidents under the broker's listing for the lifetime of the broker.

## 6. Cost envelope (informative)

Hardware capital: EUR 4k to EUR 150k depending on the device line, for N = 5 share holders.
Hosting and connectivity: EUR 6k to EUR 24k per year for three regions of CloudHSM equivalents, or EUR 3k to EUR 9k per year for self hosted YubiHSM in colo space.
Annual key ceremony costs (witness fees, notary, travel): EUR 8k to EUR 20k.
External audit of the HSM operation: EUR 30k to EUR 80k per year.

Total run rate for a single broker at M3 conformance: EUR 50k to EUR 280k per year before any human operational headcount.
