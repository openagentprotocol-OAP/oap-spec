# RFC 0032: Payment Instrument Adapter Protocol

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Commercial Layer
**Created:** 2026-05-06
**Targets:** 1.2
**Extends:** RFC 0013, RFC 0014
**Affects:** RFC 0001 (Sessions), RFC 0004 (Delegation), RFC 0009 (Reputation), RFC 0011 (Sybil Resistance), RFC 0013 (Commerce Models), RFC 0014 (Commerce Primitives), RFC 0016 (User Sovereignty Charter), RFC 0017 (Irreversibility and Cooling Off), RFC 0028 (Model Risk and Symbiotic Autonomy).

## 1. Summary

RFC 0013 defines five commerce models and a Wallet Statement schema. RFC 0014 defines the five-axis Commerce Primitive. Neither RFC specifies how funds actually move between the agent and the provider. The existing `wallet.json` document declares which payment instruments a provider accepts, but the normative flow for initiating, authorizing, executing, and settling a payment across those instruments is absent.

This RFC closes that gap. It defines the Payment Instrument Adapter (PIA) protocol: a normative, instrument-agnostic envelope that wraps concrete payment rails (SEPA Credit Transfer, card networks, Lightning Network, ISO 20022 pacs.008, stablecoins, and future instruments) under a single, signed, policy-governed interface. The protocol introduces three new entities: the Payment Mandate, the Payment Session, and the Settlement Confirmation. It specifies the six-step payment lifecycle, the authorization model under the User Sovereignty Charter of RFC 0016, the cooling-off integration with RFC 0017, the fraud and sybil-resistance integration with RFC 0011, and the regulatory mapping under PSD2, ISO 20022, and the EU AI Act Article 13 obligation for spending transparency.

## 2. Motivation

### 2.1 The Gap Between Commerce and Settlement

RFC 0013 describes a Procurement Intent, an Offer, and a Settlement Statement. What is missing is the protocol that connects them: the mechanism by which an agent, on behalf of a principal, instructs a specific payment instrument to move a specific amount to a specific counterparty, receives a machine-verifiable confirmation, and records the result in the OAP Receipt chain.

Without this protocol, implementations must resolve payment flows out-of-band, producing settlements that are invisible to the OAP accountability layer. OAP receipts that lack a confirmed Settlement Reference cannot be anchored in the Transparency Log, and disputes over amounts, timing, and finality cannot be resolved mechanically.

### 2.2 The Agent Authorization Problem

Human-initiated payments assume the human is present, authenticated, and intentional at the moment of payment. PSD2 Strong Customer Authentication (SCA) mandates challenge-response flows (biometric, OTP, push notification) that presuppose a human in the loop. An autonomous agent acting on a principal's behalf has no means to complete an SCA challenge inline.

The industry response in 2025 to 2026 has been a proliferation of proprietary agent payment frameworks: Google AP2 uses signed Mandates to pre-authorize agent spending categories; Stripe MPP introduces pre-authorized sessions with per-session budget caps; Coinbase x402 uses HTTP 402 responses to trigger micropayment flows; OpenAI and Stripe ACP standardizes checkout delegation. Each solves the authorization problem differently, and none produces a machine-verifiable, OAP-compatible audit trail.

OAP requires a generalization that (a) subsumes all four approaches as conforming adapters, (b) anchors authorization in the principal's DID-signed Mandate, (c) integrates with the Policy Stack defined in OAP Core, and (d) produces a Receipt that chains to the existing OAP Receipt schema.

### 2.3 Regulatory Alignment

The November 2025 migration of all cross-border payment messages from SWIFT MT to ISO 20022 MX format makes structured, machine-readable payment data mandatory for any agent operating across the SEPA zone or any jurisdiction that has adopted ISO 20022 for high-value payments. The EU AI Act Article 13 requires that operators of high-risk AI systems disclose their systems' decisions to principals in a comprehensible form. For economic agents, "decisions" include spending decisions, which must be recorded with sufficient granularity that a principal can audit their agent's expenditure without relying solely on bank statements.

## 3. Specification

### 3.1 Terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Payment Mandate** is a DID-signed authorization document in which a principal grants an agent the authority to initiate payments within defined constraints for a defined period.

A **Payment Session** is a scoped, time-bounded authorization derived from a Payment Mandate for a specific transaction or batch of transactions. A Payment Session is the OAP analog of a PSD2 SCA-authenticated consent object and of a Google AP2 session token.

A **Payment Instrument Adapter (PIA)** is a conforming implementation that translates OAP Payment Sessions into concrete instructions on a specific payment rail and returns a Settlement Reference to the OAP layer.

A **Settlement Reference** is the instrument-native confirmation identifier returned by a PIA on successful execution. For SEPA it is the Transaction Reference Number (TRN). For card networks it is the Authorization Code and Retrieval Reference Number. For Lightning Network it is the payment preimage and payment hash pair. For ISO 20022 it is the End-to-End Identification field of the pacs.008 message. For stablecoins it is the on-chain transaction hash.

A **Settlement Confirmation** is the OAP-layer receipt, conforming to the `oap-settlement-confirmation.schema.json` schema, that wraps the Settlement Reference together with timing, amount, FX rate (if applicable, per RFC 0014 Appendix A), and signatures of both the agent and the Wallet operator.

### 3.2 The wallet.json Document

A conforming Wallet operator MUST publish a `wallet.json` document at `https://{domain}/.well-known/oap/wallet.json`. This document declares the instruments the Wallet accepts and the endpoints through which those instruments are accessed. The document MUST conform to `oap-wallet.schema.json`.

```json
{
  "wallet_did": "did:web:wallet.example",
  "wallet_type": "operator",
  "mandate_endpoint": "https://wallet.example/oap/mandate",
  "session_endpoint": "https://wallet.example/oap/session",
  "confirm_endpoint": "https://wallet.example/oap/confirm",
  "dispute_endpoint": "https://wallet.example/oap/dispute",
  "instruments": [
    {
      "instrument_id": "sepa-ct",
      "rail": "sepa_credit_transfer",
      "currency": "EUR",
      "min_amount": "0.01",
      "max_amount": "100000.00",
      "settlement_latency_typical_seconds": 10,
      "settlement_finality": "irrevocable_on_confirmation",
      "iso20022_pacs": "pacs.008.001.08",
      "sca_mechanism": "mandate_pre_auth"
    },
    {
      "instrument_id": "lightning-btc",
      "rail": "lightning_network",
      "currency": "BTC",
      "min_amount": "0.00000001",
      "max_amount": "0.04",
      "settlement_latency_typical_seconds": 3,
      "settlement_finality": "irrevocable_on_preimage",
      "bolt_version": "BOLT11",
      "sca_mechanism": "mandate_pre_auth"
    },
    {
      "instrument_id": "usdc-base",
      "rail": "evm_stablecoin",
      "currency": "USDC",
      "chain_id": "8453",
      "contract_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "min_amount": "0.01",
      "max_amount": "1000000.00",
      "settlement_latency_typical_seconds": 2,
      "settlement_finality": "irrevocable_on_finalized_block",
      "sca_mechanism": "mandate_pre_auth"
    }
  ],
  "spending_report_endpoint": "https://wallet.example/oap/spending-report",
  "regulatory_regime": ["PSD2", "EU_AI_ACT_ART13"],
  "signature": {
    "alg": "EdDSA",
    "kid": "did:web:wallet.example#key-1",
    "value": "..."
  }
}
```

### 3.3 Payment Mandate

A Payment Mandate is the principal's pre-authorization for an agent to spend within defined constraints. It is the normative resolution of the PSD2 SCA problem for autonomous agents: the human authenticates once to create the Mandate; the agent operates under the Mandate without requiring further human challenges.

A Payment Mandate MUST be signed by the principal's DID key. It MUST NOT be signed by the agent alone. A Wallet operator that accepts a Mandate not signed by the principal's DID key MUST reject it.

A Payment Mandate carries the following normative fields:

```json
{
  "mandate_id": "urn:oap:mandate:2026-05-06-001",
  "version": "1.0",
  "principal_did": "did:web:alice.example",
  "agent_did": "did:web:alice-agent.example",
  "wallet_did": "did:web:wallet.example",
  "constraints": {
    "max_single_payment": { "amount": "500.00", "currency": "EUR" },
    "max_daily_spend": { "amount": "2000.00", "currency": "EUR" },
    "max_monthly_spend": { "amount": "20000.00", "currency": "EUR" },
    "allowed_counterparty_dids": null,
    "blocked_counterparty_dids": [],
    "allowed_commerce_primitives": ["per_invocation", "per_outcome", "retail_purchase"],
    "require_confirmation_above": { "amount": "200.00", "currency": "EUR" },
    "allowed_instruments": ["sepa-ct", "usdc-base"],
    "allowed_jurisdictions": ["EU", "CH", "NO"],
    "blocked_categories": ["gambling", "adult_content", "sanctioned_entities"]
  },
  "validity": {
    "not_before": "2026-05-06T00:00:00Z",
    "not_after": "2026-08-06T00:00:00Z"
  },
  "revocation_endpoint": "https://alice.example/oap/mandate/revoke",
  "spending_report_webhook": "https://alice.example/oap/spending-report",
  "cooling_off_class": "irreversible_financial",
  "signatures": [
    {
      "by": "did:web:alice.example",
      "alg": "EdDSA",
      "value": "..."
    }
  ]
}
```

The `constraints.require_confirmation_above` field implements the RFC 0016 User Sovereignty Charter right to meaningful control: for payments above the threshold the Wallet operator MUST challenge the principal (not the agent) through a registered channel before executing. For payments below the threshold the agent may execute autonomously under the Mandate.

The `constraints.cooling_off_class` field integrates with RFC 0017. If set to `irreversible_financial`, payments above `require_confirmation_above` MUST produce an Irreversibility Pending Receipt before execution and are subject to the cooling-off window declared in the principal's policy.

### 3.4 Payment Session

A Payment Session is a short-lived, single-transaction or batch-bounded authorization derived from a Mandate. It is the OAP analog of a Stripe MPP session and of a PSD2 AIS consent object.

To create a Payment Session the agent POSTs to the Wallet's `session_endpoint`:

```http
POST /oap/session HTTP/1.1
Content-Type: application/json

{
  "mandate_id": "urn:oap:mandate:2026-05-06-001",
  "agent_did": "did:web:alice-agent.example",
  "intent_ref": "urn:oap:intent:hotel-search-berlin-2026-05-06",
  "offer_ref": "urn:oap:offer:hotel-adlon-2026-05-06-001",
  "amount": { "value": "189.00", "currency": "EUR" },
  "instrument_id": "sepa-ct",
  "counterparty_did": "did:web:hotel-adlon.example",
  "purpose": "hotel_reservation",
  "commerce_primitive": {
    "preset": "retail_purchase"
  },
  "idempotency_key": "alice-agent-2026-05-06-001-a"
}
```

The Wallet validates the request against the Mandate constraints and returns a Payment Session:

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "session_id": "urn:oap:session:wlt-2026-05-06-abc123",
  "status": "authorized",
  "mandate_id": "urn:oap:mandate:2026-05-06-001",
  "expires_at": "2026-05-06T12:15:00Z",
  "execute_endpoint": "https://wallet.example/oap/session/wlt-2026-05-06-abc123/execute",
  "signature": {
    "alg": "EdDSA",
    "by": "did:web:wallet.example",
    "value": "..."
  }
}
```

A Payment Session MUST expire within 60 minutes of creation. A Wallet operator MUST reject execution requests against expired sessions. A Payment Session MUST be bound to the `idempotency_key` such that duplicate execution requests return the original Settlement Confirmation without double-charging.

If the requested amount exceeds `require_confirmation_above`, the Wallet operator MUST return `status: "pending_principal_confirmation"` and MUST NOT return an `execute_endpoint` until the principal has confirmed through a registered channel.

### 3.5 Payment Execution

To execute a Payment Session the agent POSTs to the `execute_endpoint`:

```http
POST /oap/session/{session_id}/execute HTTP/1.1
Content-Type: application/json

{
  "session_id": "urn:oap:session:wlt-2026-05-06-abc123",
  "agent_did": "did:web:alice-agent.example",
  "receipt_chain_tip": "sha256:abc123...",
  "agent_signature": {
    "alg": "EdDSA",
    "value": "..."
  }
}
```

The Wallet operator executes the payment on the declared instrument and returns a Settlement Confirmation:

```json
{
  "confirmation_id": "urn:oap:settlement:wlt-2026-05-06-abc123-confirmed",
  "session_id": "urn:oap:session:wlt-2026-05-06-abc123",
  "status": "settled",
  "instrument_id": "sepa-ct",
  "settlement_reference": "AAAABBBBCCCCDDDD20260506",
  "settled_amount": { "value": "189.00", "currency": "EUR" },
  "settlement_timestamp": "2026-05-06T12:00:05Z",
  "finality": "irrevocable_on_confirmation",
  "iso20022_uetr": "97ed4827-7b6f-4191-aa5d-e7e2ceaa31c4",
  "signatures": [
    { "by": "did:web:wallet.example", "alg": "EdDSA", "value": "..." },
    { "by": "did:web:alice-agent.example", "alg": "EdDSA", "value": "..." }
  ]
}
```

The agent MUST record the Settlement Confirmation as a Receipt of type `settlement` in its Receipt chain. The `settlement_reference` field carries the instrument-native identifier. The `iso20022_uetr` field carries the ISO 20022 Unique End-to-End Transaction Reference where applicable, enabling reconciliation against bank statements and regulatory reporting.

### 3.6 Instrument-Specific Adapter Normative Requirements

#### 3.6.1 SEPA Credit Transfer Adapter

A conforming SEPA Credit Transfer Adapter MUST:
- Produce ISO 20022 `pacs.008.001.08` messages for all outgoing transfers.
- Populate the `EndToEndId` field with the OAP `session_id` truncated and encoded per ISO 20022 character limits.
- Populate the `InstrInf` field with the string `OAP:` followed by the `mandate_id`.
- Return the Creditor's `IBAN` and `BIC` in the Settlement Confirmation as `instrument_details.iban` and `instrument_details.bic`.
- Declare settlement finality as `irrevocable_on_confirmation` because SEPA Instant (SCT Inst) achieves 10-second settlement with irrevocability.
- For SEPA regular (non-Instant) transfers, declare finality as `irrevocable_d1` indicating next business day irrevocability.

#### 3.6.2 Lightning Network Adapter

A conforming Lightning Network Adapter MUST:
- Accept BOLT11 invoices or BOLT12 offers as the payment target. The provider publishes its invoice endpoint in `wallet.json` under `instrument_details.invoice_endpoint`.
- Generate a payment by deriving the payment hash from the BOLT11 invoice. The `settlement_reference` is the preimage upon successful payment.
- Declare settlement finality as `irrevocable_on_preimage` because knowledge of the preimage proves payment irrevocably in the Lightning protocol.
- Record the `payment_hash` and `preimage` in the Settlement Confirmation under `instrument_details`.
- Enforce the Mandate `max_single_payment` by refusing to route invoices that exceed the limit. Lightning routing fees MUST be included in the limit check.

#### 3.6.3 EVM Stablecoin Adapter

A conforming EVM Stablecoin Adapter MUST:
- Accept ERC-20 transfers on the declared chain. The `chain_id` and `contract_address` are published in `wallet.json`.
- Derive the recipient address from the counterparty's DID Document under the `blockchainAccountId` verification method.
- Record the transaction hash as `settlement_reference` and include the block number and block hash at time of finality in `instrument_details`.
- Declare finality as `irrevocable_on_finalized_block`. A block is finalized once the chain has advanced by the declared `finality_block_depth` (minimum 12 blocks on Ethereum mainnet; immediate on Base due to L1 anchoring).
- The Settlement Confirmation MUST be issued only after finality, not upon mempool acceptance.

#### 3.6.4 Card Network Adapter

A conforming Card Network Adapter MUST:
- Operate as a PSD2 Technical Service Provider (TSP) holding the principal's payment method credential in a PCI DSS Level 1 compliant vault.
- Never expose raw card numbers to agents. The Mandate references a tokenized payment method identified by a `payment_method_id` registered with the Wallet operator.
- Execute payments using network tokenization (Visa Token Service or Mastercard MDES).
- Record the `authorization_code` and `retrieval_reference_number` as `settlement_reference`.
- Support the `require_confirmation_above` threshold by implementing MIT (Merchant Initiated Transaction) for amounts below the threshold and 3DS2 challenge for amounts above.

### 3.7 The Payment Lifecycle

The normative six-step lifecycle is:

```
1. Principal signs and registers Mandate with Wallet operator.
2. Agent creates Payment Session against the Mandate for a specific Offer.
   a. If amount < require_confirmation_above: Session status = "authorized".
   b. If amount >= require_confirmation_above: Session status = "pending_principal_confirmation".
      Agent waits for Wallet to notify principal and receive confirmation.
      Optional: RFC 0017 Irreversibility Pending Receipt is issued at this step.
3. Agent executes the Session. Wallet translates to instrument-specific instructions.
4. Instrument settles. Wallet records Settlement Reference.
5. Wallet issues Settlement Confirmation. Agent countersigns and records as OAP Receipt.
6. Agent issues Performance Record to RFC 0009 referencing the Settlement Confirmation.
```

A failed execution (instrument timeout, NSF, policy violation) MUST return an `oap-payment-error` document that includes the `session_id`, an error code from the normative taxonomy defined in Appendix A, a human-readable `detail` string, and a `retry_after` hint if retry is permissible under the Mandate.

### 3.8 Spending Reports

A Wallet operator MUST support the Spending Report endpoint declared in `wallet.json`. A principal MAY query their spending report at any time. The report covers a requested period and returns:
- Total spend by counterparty DID.
- Total spend by commerce primitive preset.
- Total spend by instrument.
- Each individual Settlement Confirmation reference.
- Any pending sessions and their expiry.

The Spending Report endpoint MUST require authentication under the principal's DID. An agent may not query the Spending Report without a principal-signed authorization token.

This endpoint satisfies the EU AI Act Article 13 requirement that principals of high-risk AI systems be able to inspect the economic decisions made on their behalf.

### 3.9 Dispute Resolution

A dispute against a settled payment follows the procedure of RFC 0013 section 3.10, extended as follows:

1. The agent or principal POSTs a `dispute_record` to the Wallet's `dispute_endpoint` within the dispute window declared in the Mandate.
2. The dispute record MUST reference the `confirmation_id`, the `offer_ref`, the `receipt_chain_tip` at time of settlement, and the stated grievance from the normative taxonomy (overcharge, non-delivery, quality_failure, unauthorized_charge).
3. The Wallet operator MUST respond within 72 hours with either a `refund_session` (a Payment Session in the reverse direction from provider to principal) or a `dispute_rejection` with a specific reason.
4. If the provider fails to respond, the Wallet operator MUST issue an automatic refund for the disputed amount and record a Reputation Slash against the provider in the RFC 0009 system.

### 3.10 Sybil Resistance Integration

The Payment Mandate system provides inherent Sybil resistance for the payment layer. Because each Mandate is signed by a human-controlled principal DID, and because the Wallet operator is required to validate the principal's DID chain before accepting a Mandate, the same Sybil attack surface analysis of RFC 0011 applies. A provider that attempts to operate multiple fake-agent sub-principals to inflate its own reputation through self-payment is detectable by the Wallet operator through the Coordinated Behavior Score defined in RFC 0011 section 4.3, because self-payments from the same DID controller domain must be disclosed in the `wallet.json` under `related_dids`.

### 3.11 Regulatory Mapping

| Regulation | OAP Component | Obligation |
|---|---|---|
| PSD2 Art. 4(17) | Payment Mandate | Mandate is the normative Payment Service Contract. |
| PSD2 Art. 97 (SCA) | `require_confirmation_above` | Threshold above which human authentication is required. |
| ISO 20022 (pacs.008) | SEPA Adapter | UETR populates end-to-end traceability required post-2025. |
| EU AI Act Art. 13 | Spending Report | Operators of high-risk agents must provide spending transparency to principals. |
| GDPR Art. 17 | Wallet Statement | Settlement Confirmations carry retention period; Wallet must delete on request. |
| FATF Recommendation 16 | counterparty_did | Travel Rule: DID of originator and beneficiary embedded in all cross-border payments. |

### 3.12 Know Your Agent (KYA)

Several regulatory frameworks under development in 2025 to 2026 (notably the US CFPB Circular 2025-02 on AI in financial services and the EBA Guidelines on AI in payment initiation) require that payment service providers establish a "Know Your Agent" program analogous to KYC/KYB. The OAP mechanism for KYA is the agent's OAP Manifest, the attached Conformance Receipt, and the Registry entry under RFC 0026. A Wallet operator MAY require a minimum conformance level (for example L2 Verified) before accepting a Mandate from an agent. The Wallet operator records the conformance receipt hash in the Mandate acceptance record.

## 4. Conformance

A Wallet operator claiming conformance to this RFC MUST:
- Publish `wallet.json` at the declared well-known URI.
- Implement the Mandate endpoint, the Session endpoint, and the Confirm endpoint.
- Implement at least one instrument adapter from section 3.6.
- Issue Settlement Confirmations conforming to `oap-settlement-confirmation.schema.json`.
- Implement the Spending Report endpoint.
- Implement the Dispute endpoint.

A Wallet operator claiming PW2 (Payment Wallet Level 2) conformance additionally MUST:
- Implement at least two instrument adapters including at least one from each of: (traditional fiat, cryptocurrency).
- Implement the ISO 20022 UETR field for all SEPA transfers.
- Enforce the `cooling_off_class` integration with RFC 0017.
- Pass all conformance test fixtures in `test-suite/behavior/payment-wallet-*.test.js`.

## 5. Security Considerations

**Mandate Replay.** A stolen Mandate signature allows an attacker to initiate payments up to the Mandate's constraints without the principal's knowledge. Mitigation: Wallet operators MUST verify that the Mandate `not_after` has not passed, MUST store Mandates in a server-side registry, and MUST support instant Mandate revocation through the `revocation_endpoint`. The revocation endpoint MUST respond within 5 seconds to any revocation request from the principal's DID.

**Session Fixation.** An attacker who intercepts a Payment Session can attempt to execute it against a different counterparty. Mitigation: the Session MUST bind to the `counterparty_did` and the `offer_ref`. Execution requests against a Session where the presenting agent's DID does not match `agent_did` MUST be rejected.

**Double Spend on Lightning.** An attacker who intercepts the preimage before the Wallet has confirmed settlement may attempt to double-claim. Mitigation: the Wallet must mark a Session as `executing` before contacting the Lightning node and must not issue a second Settlement Confirmation for the same payment hash.

**FX Oracle Manipulation.** Where the Mandate is denominated in a different currency from the instrument, the FX rate is applied at Session creation per the Currency Settlement protocol of RFC 0014 Appendix A. The FX rate applied is recorded in the Settlement Confirmation and is immutable after Session creation. An attacker cannot manipulate the rate after the Session has been authorized.

## 6. Privacy Considerations

Payment data is among the most sensitive personal data under GDPR Recital 75. Wallet operators MUST classify all Mandate, Session, and Settlement Confirmation data as special category personal data and MUST apply the most restrictive retention periods in the principal's Scope policy. Wallet operators MUST NOT share individual transaction data with third parties except where required by FATF Travel Rule or court order. Spending Reports MUST be served only to the principal's authenticated DID and MUST NOT be included in the agent's standard performance metrics.

## 7. References

- RFC 0013, Commerce Models for the Agent Economy.
- RFC 0014, Commerce Primitives, A Generalized Commercial Layer.
- RFC 0016, User Sovereignty Charter.
- RFC 0017, Irreversibility and Cooling Off Protocol.
- RFC 0011, Sybil Resistance and Sub Agent Anti Abuse.
- RFC 0009, Reputation and Performance Records.
- RFC 0026, OAP Registry Protocol.
- ISO 20022 (2024). Universal Financial Industry Message Scheme. ISO Technical Committee 68.
- SEPA Credit Transfer Rulebook v1.2 (2024). European Payments Council.
- SEPA Instant Credit Transfer Rulebook v1.2 (2024). European Payments Council.
- Poon, J., and Dryja, T. (2016). The Bitcoin Lightning Network: Scalable Off-Chain Instant Payments. Technical Report. The canonical specification on which BOLT11 and BOLT12 are based.
- Nakamoto, S. (2008). Bitcoin: A Peer-to-Peer Electronic Cash System. Self-published white paper.
- Stark, B., et al. (2016). BOLT: Basis of Lightning Technology. Lightning Network specification series.
- European Commission (2015). PSD2: Directive (EU) 2015/2366 on Payment Services in the Internal Market.
- European Banking Authority (2024). Guidelines on the use of artificial intelligence in payment initiation. EBA/GL/2024.
- European Union (2024). EU AI Act: Regulation (EU) 2024/1689 on Artificial Intelligence, Articles 13 and 86.
- FATF (2019). Recommendation 16: Wire Transfers. Financial Action Task Force.
- BIS (2022). Improving cross-border payments: from talk to action. BIS Annual Economic Report 2022, Chapter III.
- Coinbase Developer Platform (2025). x402: The HTTP Payment Protocol. Technical specification.
- Google (2025). Agent Payment Protocol (AP2): Mandate-based authorization for autonomous agent payments. Google Developer documentation.
- Stripe, Tempo (2025). Machine Payment Protocol (MPP). Technical specification.
- OpenAI, Stripe (2025). Agentic Commerce Protocol (ACP). Technical specification.

## Appendix A: Payment Error Taxonomy

| Error Code | Meaning | Retry Permissible |
|---|---|---|
| `mandate_expired` | The Mandate's `not_after` has passed. | No. New Mandate required. |
| `mandate_revoked` | The principal has revoked the Mandate. | No. |
| `session_expired` | The Session's `expires_at` has passed. | Yes, new Session. |
| `insufficient_funds` | Wallet balance or instrument limit insufficient. | Yes, after top-up. |
| `mandate_limit_exceeded_daily` | Daily spend cap reached. | Yes, next day. |
| `mandate_limit_exceeded_single` | Single payment exceeds `max_single_payment`. | No for this amount. |
| `counterparty_blocked` | Counterparty DID is in `blocked_counterparty_dids`. | No. |
| `instrument_unavailable` | The declared instrument is temporarily unavailable. | Yes, after `retry_after`. |
| `principal_confirmation_required` | Amount exceeds `require_confirmation_above` and no confirmation has been received. | Yes, after confirmation. |
| `sybil_flag` | RFC 0011 Coordinated Behavior Score exceeds threshold. | No without review. |
| `kyc_required` | Wallet operator requires KYA verification before accepting Mandate. | No without verification. |
| `jurisdiction_blocked` | Counterparty's jurisdiction is not in `allowed_jurisdictions`. | No. |
| `instrument_execution_failed` | Instrument returned a fatal error (e.g., invalid IBAN, rejected invoice). | Depends on instrument. |
