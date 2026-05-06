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

## 3.13 Multi-Instrument Selection Policy

A Payment Mandate in section 3.3 carries a static `allowed_instruments` list. For principals with multiple instruments this is insufficient: the agent must select the optimal instrument per transaction based on merchant category, currency, fee structure, cashback rates, balance availability, and loyalty program compatibility.

### 3.13.1 Instrument Profile

The Wallet operator MUST expose an Instrument Profile for each registered instrument at the `instruments_endpoint` declared in `wallet.json`. An Instrument Profile is a signed document conforming to `oap-instrument-profile.schema.json`:

```json
{
  "instrument_id": "amex-4242",
  "rail": "card_network",
  "network": "amex",
  "currency": "EUR",
  "current_balance": null,
  "credit_limit": "15000.00",
  "available_credit": "12340.00",
  "cashback_rate": "0.015",
  "annual_fee": "150.00",
  "preferred_categories": ["travel", "hotels", "airlines"],
  "blocked_categories": ["gambling", "adult_content"],
  "loyalty_program": {
    "program_id": "amex-membership-rewards",
    "points_per_eur": 1.5,
    "redemption_value_per_point_eur": "0.007"
  },
  "fx_surcharge_bps": 200,
  "foreign_transaction_fee_bps": 0,
  "last_updated": "2026-05-06T10:00:00Z"
}
```

The `current_balance` field is `null` for credit instruments and a decimal string for debit and prepaid instruments. The Wallet operator MUST refresh Instrument Profiles from the underlying payment network before each Session creation request and MUST cache profiles for no longer than 60 seconds.

### 3.13.2 Instrument Selection Policy Object

The Mandate carries an optional `instrument_selection_policy` object that the agent uses to rank instruments at Session creation time. The policy is evaluated as an ordered rule list: the first matching rule determines the instrument. If no rule matches, the Mandate's `allowed_instruments` list order is used as a fallback.

```json
{
  "instrument_selection_policy": {
    "optimize_for": "lowest_total_cost",
    "include_fx_spread_in_cost": true,
    "include_loyalty_value_in_cost": true,
    "rules": [
      {
        "rule_id": "travel-rule",
        "condition": {
          "merchant_categories": ["travel", "hotels", "airlines", "car_rental"],
          "settlement_currency": ["EUR", "USD", "GBP"]
        },
        "use_instrument": "amex-4242",
        "rationale": "Highest cashback rate and travel insurance for travel merchants"
      },
      {
        "rule_id": "crypto-rule",
        "condition": {
          "rail": ["lightning_network", "evm_stablecoin"]
        },
        "use_instrument": "usdc-base",
        "rationale": "Native stablecoin for all crypto rails"
      },
      {
        "rule_id": "high-value-eu",
        "condition": {
          "amount_gte": "500.00",
          "settlement_currency": ["EUR"],
          "counterparty_jurisdiction": ["EU", "CH", "NO"]
        },
        "use_instrument": "sepa-instant",
        "rationale": "Zero-fee SEPA Instant for high-value EU payments"
      }
    ],
    "fallback_order": ["sepa-instant", "sepa-ct", "usdc-base", "amex-4242"]
  }
}
```

The `optimize_for` field takes one of `lowest_total_cost`, `highest_loyalty_return`, `fastest_settlement`, or `principal_preference`. When set to `lowest_total_cost`, the Wallet operator computes the effective cost for each eligible instrument as: `amount * (1 + fx_surcharge_bps/10000) + foreign_transaction_fee_bps/10000 - cashback_rate * amount - (loyalty_points_earned * redemption_value_per_point)`. The instrument with the lowest effective cost is selected, subject to balance availability.

### 3.13.3 Balance-Aware Session Creation

Before returning `status: authorized` for a Session, the Wallet operator MUST verify that the selected instrument has sufficient available balance or credit. If the instrument has insufficient funds, the Wallet operator MUST attempt the next instrument in the rule fallback order before returning `status: insufficient_funds`. The Session response MUST declare the `selected_instrument_id` field so the agent can record which instrument was used.

---

## 3.14 Wallet Operator Licensing Requirements

### 3.14.1 Regulatory Classification

A Wallet operator that holds principal funds between the time of Mandate registration and the time of Settlement Confirmation is conducting an electronic money issuance activity under the EU Electronic Money Directive 2 (EMD2, Directive 2009/110/EC) as amended by PSD2. Such an operator MUST hold an Electronic Money Institution (EMI) authorization from a competent authority in a jurisdiction where it operates. The minimum initial capital requirement is EUR 350,000 under EMD2 Article 4. The operator must maintain own funds proportional to the volume of e-money outstanding per EMD2 Article 5 Method D: maximum of 2 percent of the outstanding e-money.

A Wallet operator that does not hold funds between sessions, but only routes payment instructions to licensed payment service providers, is a Payment Initiation Service Provider (PISP) under PSD2 Article 4(18). A PISP Wallet operator MUST hold a Payment Institution authorization but is not subject to the EMD2 capital requirements.

The key distinction is safeguarding: an EMI Wallet operator MUST either segregate client funds in dedicated accounts at credit institutions, or obtain an insurance policy or comparable guarantee covering the outstanding e-money per EMD2 Article 7.

### 3.14.2 Regulatory Declarations in wallet.json

A conforming Wallet operator MUST include a `regulatory_license` block in `wallet.json`:

```json
{
  "regulatory_license": {
    "classification": "EMI",
    "license_number": "DE-BaFin-EMI-123456",
    "competent_authority": "BaFin",
    "jurisdiction": "DE",
    "passporting_jurisdictions": ["EU", "EEA"],
    "supervisory_register_uri": "https://www.bafin.de/register/EMI-123456",
    "safeguarding_method": "segregated_accounts",
    "safeguarding_institution_did": "did:web:deutsche-bank.example",
    "mica_compliance": true,
    "psd3_ready": true
  }
}
```

The `classification` field takes one of `EMI`, `PISP`, `credit_institution`, or `sandbox`. The `sandbox` classification is permitted only for Wallet operators that hold no real funds and that include a `sandbox: true` flag in their `wallet.json`. A Wallet operator declared as `sandbox` MUST be rejected by agents operating under a non-sandbox Mandate.

### 3.14.3 KYA Conformance Gate

Before accepting a Mandate, the Wallet operator MUST verify that the agent's OAP Registry conformance receipt declares at least conformance level L2 Verified. This is the normative Know Your Agent (KYA) requirement. The Wallet operator MUST record the conformance receipt hash in the Mandate acceptance record. The Wallet operator MUST re-verify the conformance receipt once every 90 days and MUST suspend the Mandate if verification fails.

---

## 3.15 In-Flight Revocation Protocol

This section resolves edge case EC-001 from the OAP Payment Readiness Audit. The revocation of a Mandate while a Payment Session is in an executing state creates a finality conflict: the agent has committed to a payment but the principal has withdrawn authority.

### 3.15.1 Session Finality States

Sessions pass through three finality states with distinct revocation handling:

**State 1: authorized.** The Session has been created but `execute` has not been called. A Mandate revocation received in this state causes the Wallet to immediately mark the Session as `revoked` and return `mandate_revoked` to any subsequent execute request. No funds have moved.

**State 2: executing.** The `execute` call has been received and the Wallet has dispatched the instruction to the payment instrument but has not yet received a Settlement Reference. Revocation behavior depends on the instrument rail:

- SEPA Instant: The EPC SEPA Instant Credit Transfer Rulebook does not permit recall of a payment once the Creditor PSP has confirmed receipt. However, the Debtor PSP has a 10-second window after initiation to recall the transaction using the ISO 20022 `camt.056` recall message. The Wallet operator MUST attempt a `camt.056` recall immediately upon receiving a Mandate revocation during this window. If the recall is rejected or the window has passed, the Wallet operator MUST open an automatic dispute via section 3.9 and issue a Reputation Slash against itself for executing a payment after a revocation was pending.
- Lightning Network: A Lightning HTLC that has not yet been claimed can be cancelled by expiring the HTLC. If the `payment_hash` has already been claimed (preimage released), the payment is irrevocable.
- EVM Stablecoin: A transaction that has been broadcast to the mempool but not yet mined can be replaced using EIP-1559 replace-by-fee with a zero-value transaction to the same nonce. If the block has been finalized, the payment is irrevocable.
- Card Network: The Wallet operator can issue a void (pre-settlement reversal) if the authorization has not yet been captured. After capture, a standard refund must be initiated.

**State 3: settled.** The Settlement Confirmation has been issued. A Mandate revocation in this state has no effect on the settled transaction. The principal MUST pursue refund through the dispute mechanism of section 3.9 if they believe the settled transaction was unauthorized.

### 3.15.2 Revocation Receipt

When a Mandate revocation is processed, the Wallet operator MUST issue a signed Revocation Receipt conforming to `oap-receipt.schema.json` with `type: mandate_revoked`. The Revocation Receipt MUST list all Sessions that were affected by the revocation and their final states. The Revocation Receipt is chained to the principal's Receipt chain.

---

## 3.16 Recurring Payment and Subscription Lifecycle

This section covers subscriptions, dunning management, price change events, and subscription termination.

### 3.16.1 Subscription Agreement

A Subscription Agreement is a separate signed document derived from an Offer and a Mandate. It governs the recurring billing relationship. The agent creates a Subscription Agreement after accepting a subscription Offer:

```json
{
  "subscription_id": "urn:oap:subscription:alice.example:saas-tool-2026-05-06",
  "principal_did": "did:web:alice.example",
  "agent_did": "did:web:alice-agent.example",
  "provider_did": "did:web:saas-tool.example",
  "mandate_id": "urn:oap:mandate:alice.example:2026-05-06-001",
  "commerce_primitive": { "preset": "subscription" },
  "billing_amount": { "value": "29.00", "currency": "EUR" },
  "billing_instrument_id": "sepa-instant",
  "billing_interval": "monthly",
  "billing_anchor_day": 6,
  "trial_end": null,
  "started_at": "2026-05-06T00:00:00Z",
  "next_billing_at": "2026-06-06T00:00:00Z",
  "price_change_consent_threshold": { "value": "5.00", "currency": "EUR" },
  "signatures": [
    { "by": "did:web:alice-agent.example", "alg": "EdDSA", "value": "..." },
    { "by": "did:web:saas-tool.example", "alg": "EdDSA", "value": "..." }
  ]
}
```

The `price_change_consent_threshold` field declares the maximum price increase that the agent may accept autonomously. Price increases above the threshold require principal confirmation.

### 3.16.2 Price Change Event

When a provider changes their subscription price, they MUST send a signed `PriceChangeNotice` to the agent's notification endpoint declared in the Mandate. The notice must be received at least 30 days before the new price takes effect, consistent with EU Consumer Rights Directive Article 11.

```json
{
  "notice_id": "urn:oap:notice:saas-tool.example:2026-05-06-price-change",
  "subscription_id": "urn:oap:subscription:alice.example:saas-tool-2026-05-06",
  "current_amount": { "value": "29.00", "currency": "EUR" },
  "new_amount": { "value": "34.00", "currency": "EUR" },
  "effective_from": "2026-07-06T00:00:00Z",
  "reason": "Infrastructure cost increase",
  "signature": { "by": "did:web:saas-tool.example", "alg": "EdDSA", "value": "..." }
}
```

The agent evaluates the price change against the `price_change_consent_threshold`. An increase of EUR 5.00 exactly equals the threshold in the example above. The agent MUST inform the principal and request explicit consent before accepting any increase at or above the threshold. If the principal does not respond within 14 days, the agent MUST cancel the subscription.

### 3.16.3 Dunning Protocol

When a recurring payment fails, the Wallet operator MUST NOT automatically retry without agent instruction. The agent is responsible for the dunning schedule. The normative schedule is:

1. Immediate retry once if the failure code is `instrument_unavailable`.
2. Retry after 24 hours if the failure code is `insufficient_funds`.
3. Retry after 72 hours for a second attempt.
4. After two failed retries, the agent MUST notify the principal through the `spending_report_webhook`.
5. After seven days of failed retries, the agent MUST suspend the subscription and notify the provider.

The provider MUST NOT mark the subscription as cancelled before the seven-day window expires. A provider that cancels the subscription without waiting for the dunning window MUST accept a Reputation Slash under RFC 0009.

---

## 3.17 IBAN-DID Binding Verification

This section resolves the IBAN-CEO-fraud vector identified in the OAP Payment Readiness Audit.

### 3.17.1 The Problem

An agent that verifies a counterparty's DID but does not verify that the IBAN in the payment instruction belongs to that DID is vulnerable to a class of attack analogous to CEO fraud: a malicious actor that compromises a provider's DID key, or that creates a DID with a similar domain, can substitute their own IBAN in a payment instruction.

### 3.17.2 Bank Account Verifiable Credential

Providers MUST publish a bank account Verifiable Credential (VC) in their DID Document under the `bankAccountCredential` service type. The VC is issued by the provider's bank, signed with the bank's DID key, and contains the IBAN in a selective-disclosure format using the W3C Verifiable Credentials Data Model v2.0 with BBS+ signatures. The credential binds the IBAN to the provider's DID cryptographically.

The DID Document entry:
```json
{
  "id": "did:web:saas-tool.example#bank-account",
  "type": "bankAccountCredential",
  "serviceEndpoint": "https://saas-tool.example/.well-known/oap/bank-account-vc.json"
}
```

The VC at that endpoint:
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "BankAccountCredential"],
  "issuer": "did:web:deutsche-bank.example",
  "credentialSubject": {
    "id": "did:web:saas-tool.example",
    "iban": "DE89370400440532013000",
    "bic": "COBADEFFXXX",
    "account_holder": "SaaS Tool GmbH",
    "currency": "EUR",
    "verified_at": "2026-01-15T00:00:00Z"
  },
  "proof": { "type": "BbsBlsSignature2020", "verificationMethod": "did:web:deutsche-bank.example#key-1", "proofValue": "..." }
}
```

### 3.17.3 Wallet Operator Verification Obligation

Before routing any SEPA payment to an IBAN, the Wallet operator MUST:

1. Resolve the counterparty's DID Document.
2. Retrieve the `bankAccountCredential` VC.
3. Verify the VC signature against the issuing bank's DID key.
4. Verify that the IBAN in the payment instruction matches the IBAN in the VC.
5. Verify that the VC `verified_at` timestamp is within the last 365 days.

If any verification step fails, the Wallet operator MUST reject the Session with error code `iban_did_mismatch`. The agent MUST NOT override this verification gate.

For Lightning Network and EVM stablecoin rails, the analogous requirement applies: the counterparty's DID Document MUST contain a `lightningNodeCredential` or `blockchainAccountCredential` that binds the node public key or on-chain address to the DID, issued by a registered credential issuer.

---

## 3.18 Payment Tool Delegation Profile

When a principal's agent invokes a third-party tool that internally initiates a payment (for example a booking platform tool that charges the principal at invocation time), the standard Mandate and Session flow does not apply because the tool is the payment initiator, not the Wallet operator. This creates an audit gap.

A conforming Payment Tool that initiates payments on behalf of the invoking agent MUST:

1. Declare `payment_tool: true` in its OAP Manifest.
2. Declare the maximum amount it may charge per invocation under `payment_tool_max_per_invocation`.
3. Obtain a Payment Tool Sub-Mandate from the invoking agent before the first payment. The Sub-Mandate is derived from the principal's Mandate: the invoking agent signs a scoped subset of its own Mandate constraints and presents it to the Payment Tool.
4. Return a Settlement Confirmation conforming to `oap-settlement-confirmation.schema.json` as the action output, with `intent_id` referencing the AQL Intent that triggered the invocation.
5. Chain the Settlement Confirmation into the invoking agent's Receipt chain by returning the agent's current `receipt_chain_tip` in the output body so the agent can extend the chain.

A Payment Tool that charges the principal without presenting a Sub-Mandate to the agent MUST be flagged as non-conformant in the OAP Registry under RFC 0026. The agent MUST record a Reputation Slash against such a tool under RFC 0009.

---

## 3.19 Agent Commerce Identifier

### 3.19.1 Motivation

Card network fraud detection models are trained on human transaction behavior: geographic clustering, merchant category consistency, typical transaction size distributions, and inter-transaction timing. Autonomous agents exhibit radically different patterns: high-frequency micropayments, global merchant diversity, and highly regular timing intervals. These patterns trigger false-positive fraud flags at rates that make card-network settlement impractical without an identifier that signals to the network that the transaction is agent-initiated.

Mastercard's Transaction Link Identifier (TLID) and Visa's Intelligent Authorization infrastructure are evolving to accommodate machine-initiated transactions, but require a machine-participant identifier to apply agent-appropriate risk models.

### 3.19.2 The oap-aci Field

A conforming Wallet operator that routes card-network payments MUST include the OAP Agent Commerce Identifier (ACI) in the card authorization message. The ACI is a structured field composed of:

- `oap_version`: The OAP protocol version (e.g., `1.2`).
- `agent_conformance_level`: The RFC 0026 conformance level of the agent (e.g., `L2`).
- `mandate_hash`: The first 8 bytes of the SHA-256 hash of the Mandate ID, providing a pseudonymous linkage to the authorization chain without revealing the full Mandate.
- `transaction_type`: One of `autonomous` (no human present), `supervised` (human notified in real time), or `confirmed` (human explicitly confirmed this transaction).

The ACI is encoded in the card authorization's `private use` data field or, for ISO 20022 messages, in the `RemittanceInformation.Unstructured` field with the prefix `OAP-ACI:` followed by a compact JSON encoding.

This identifier enables card networks to apply agent-appropriate fraud models, reducing false positive rates. It also provides regulatory traceability under the EBA Guidelines on AI in payment initiation (EBA/GL/2024).

---

## 3.20 Corporate Principal and Multi-Signatory Mandates

### 3.20.1 Legal Entity Principals

A principal may be a legal entity (company, trust, government body) rather than a natural person. Legal entity principals are identified by a DID that resolves to an organization DID Document, compatible with the W3C DID Specification for legal entities and with the eIDAS 2.0 European Digital Identity Wallet for organizations (implementing Regulation EU 2024/1183).

The `principal_did` in a Mandate issued by a legal entity MUST resolve to a DID Document that contains a `legalEntityCredential` issued by an EU member state trust service or an equivalent accredited body, containing the legal entity's registered name, jurisdiction, and registration number.

### 3.20.2 Multi-Signatory Mandates

Corporate treasuries typically require multiple authorized signatories for payments above a threshold. OAP supports multi-signatory Mandates through a threshold signature scheme. The Mandate carries a `multi_sig` block:

```json
{
  "multi_sig": {
    "scheme": "FROST",
    "threshold": 2,
    "total_signatories": 3,
    "signatory_dids": [
      "did:web:alice.corp.example",
      "did:web:bob.corp.example",
      "did:web:carol.corp.example"
    ],
    "threshold_applies_above": { "amount": "10000.00", "currency": "EUR" }
  }
}
```

The `scheme` field declares the threshold signature protocol. The normative scheme is FROST (Flexible Round-Optimized Schnorr Threshold signatures, as specified in IETF draft-irtf-cfrg-frost) because it produces a single aggregated signature that is verification-compatible with standard Ed25519, requiring no changes to the signature verification logic of conformant Wallet operators. The Wallet operator verifies the aggregated signature against the combined public key derived from the signatory public keys under the FROST protocol.

For Mandates with a `multi_sig` block, Payment Sessions above the `threshold_applies_above` amount MUST carry a threshold-signed authorization from the minimum required number of signatories. Sessions below the threshold MAY be authorized by any single signatory.

### 3.20.3 Spending Categories for Corporate Mandates

Corporate Mandates SHOULD include a `cost_center_id` field and a `gl_account_code` field in the Mandate's `constraints` block. These fields are propagated into the Settlement Confirmation and Wallet Statement, enabling direct import into accounting systems (SAP, Oracle Financials, Xero) without manual reconciliation.

---

## 3.21 Edge Case Resolution Register

This section provides the normative resolution for edge cases EC-001 through EC-010 identified in the OAP Payment Readiness Audit.

**EC-001 (Mandate revoked mid-Session).** Resolved by section 3.15. The resolution depends on finality state at the time of revocation.

**EC-002 (Wallet operator insolvency).** Resolved by section 3.14.1. A conforming Wallet operator must hold an EMI license with EMD2-mandated fund safeguarding. Client funds held in segregated accounts at credit institutions are outside the insolvency estate of the Wallet operator under EMD2 Article 7(2). Sessions in `authorized` or `executing` state at time of insolvency are governed by the applicable insolvency law of the Wallet operator's jurisdiction.

**EC-003 (FX Oracle DID deactivated post-Session).** A Session carries a `fx_quote_hash` that commits to the rate at creation time. The rate is valid for the duration of the Session regardless of the oracle's subsequent DID status, because the commitment was made against a valid DID at creation time. The Wallet operator stores the full signed FX Quote at Session creation, so verification does not require re-resolving the oracle's DID. The Settlement Confirmation includes the signed FX Quote body, not merely a reference, enabling offline verification.

**EC-004 (Dual-Wallet duplicate Sessions).** An agent that uses two Wallet operators with the same `idempotency_key` will produce two authorized Sessions for the same payment. The Wallet operators cannot coordinate across boundaries. Resolution: Agents MUST use a globally unique idempotency key derived as SHA-256 of the concatenation of `intent_id`, `offer_ref`, and `agent_did`. This key is stable per payment intention regardless of which Wallet operator is used. When the agent detects a successful Settlement Confirmation from one Wallet, it MUST immediately send a cancellation request to any other Wallet operator holding an authorized Session for the same idempotency key.

**EC-005 (IBAN in non-SEPA country).** IBAN validation under ISO 13616 is performed by the Wallet operator before Session creation. The Wallet operator MUST validate the IBAN checksum and country code against the SWIFT IBAN registry. If the IBAN country code is not in the SEPA zone and the selected instrument is SEPA, the Wallet operator MUST reject the Session with error code `instrument_rail_mismatch` before any funds are moved.

**EC-006 (Lightning routing timeout with expired FX Quote).** Resolved by RFC 0014 Appendix B.8. The agent MUST set the BOLT11 invoice expiry to match the FX Quote `valid_until`. If routing takes longer than the quote validity, the HTLC expires, the agent requests a new FX Quote, and creates a new Session. The Wallet operator records the timeout in the Session audit log.

**EC-007 (Stale Reputation in Mandate).** The Wallet operator MUST query the RFC 0009 Performance Record API for the counterparty DID at Session creation time, not at Mandate creation time. If the live Reputation Score has fallen below the `quality_floor.provider_reputation` declared in the AQL Intent that originated the payment, the Wallet operator MUST return `status: pending_principal_confirmation` rather than `status: authorized`, even if the counterparty is not in `blocked_counterparty_dids`. The agent propagates this status to the principal.

**EC-008 (Corporate principal).** Resolved by section 3.20.

**EC-009 (Minor principal).** Age verification is not currently delegatable to the OAP protocol layer because age is a claim about a natural person that requires a government-issued credential. A conforming Wallet operator that accepts Mandates from natural persons MUST require an eIDAS 2.0 verifiable credential or equivalent establishing the holder's age of majority before activating any Mandate that includes `gambling`, `adult_content`, `tobacco`, or `alcohol` in the `allowed_commerce_primitives` or that does not explicitly list those categories in `blocked_categories`. This requirement is normative under the EU Digital Services Act Article 28 obligations for platforms.

**EC-010 (Non-ISO 4217 currency).** A community currency or custom token symbol may appear in an Offer. An agent MUST NOT initiate a Payment Session denominated in a currency symbol that is not either an ISO 4217 code or a symbol registered in the OAP Currency Registry, published at `https://registry.openagentprotocol.eu/currencies`. The OAP Currency Registry accepts registration of crypto-asset symbols that are either MiCA-authorized or are the native asset of a public blockchain with a market capitalization above EUR 100 million. A Wallet operator MUST reject Session creation for unregistered currency symbols.

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

## Appendix B: Parametric Long-Validity Session (Auction and Tender Support)

This appendix is normative. It defines the Parametric Long-Validity Session (PLVS), which extends the standard Payment Session of section 3.4 to support scenarios where the payment amount is not known at Session creation time and where the authorization window must extend beyond the standard 60-minute Session lifetime. The canonical use cases are auction participation (English, Dutch, Vickrey, and combinatorial), tender processes, and reverse-auction procurement.

### B.1 Motivation

The standard Payment Session of section 3.4 is amount-fixed: the agent declares a specific amount at creation time, and the Wallet authorizes exactly that amount. This design satisfies the vast majority of commerce scenarios but cannot express:

1. An auction bid-up-to authorization: the agent is authorized to bid up to EUR 2,000 but the winning bid may be any amount from EUR 1 to EUR 2,000.
2. A time-extended authorization: a 48-hour auction requires the authorization to remain valid for the auction duration, not 60 minutes.
3. A conditional amount: a tender process requires the agent to commit to a price that depends on the outcome of other bidders.

The PLVS resolves all three by introducing a `parametric_amount` object that replaces the fixed `amount` field, and by extending the `expires_at` field to a maximum of 168 hours (7 days) for PLVS sessions.

### B.2 Parametric Amount Object

The `parametric_amount` object in a PLVS Session creation request contains:

```json
{
  "parametric_amount": {
    "max_amount": { "value": "2000.00", "currency": "EUR" },
    "min_amount": { "value": "1.00", "currency": "EUR" },
    "increment": { "value": "10.00", "currency": "EUR" },
    "strategy": "bid_up_to_max",
    "sealed_bid_commitment": null
  }
}
```

The `strategy` field takes one of:

- `bid_up_to_max`: The agent may submit bids up to `max_amount` at any increment. Each bid invocation consumes a portion of the authorization up to the bid amount. The Wallet holds a temporary fund reservation of `max_amount` for the duration of the Session.
- `sealed_bid`: The agent commits to a single bid using a cryptographic commitment scheme per section B.4. The `sealed_bid_commitment` field carries the commitment.
- `tender_response`: The agent submits a price in response to a reverse auction. The amount is constrained to be at least `min_amount`.

### B.3 Fund Reservation

For `bid_up_to_max` sessions, the Wallet operator MUST place a fund reservation of `max_amount` against the selected instrument at Session creation time. This reservation reduces the instrument's `available_credit` or `available_balance` by `max_amount` for the duration of the Session. If the auction ends without the agent winning, the Wallet operator MUST release the reservation and record a zero-value Settlement Confirmation with status `reservation_released`. If the agent wins with a bid of `winning_amount`, the Wallet operator settles exactly `winning_amount` and releases the difference.

The fund reservation mechanism on card networks uses the standard `pre-authorization` (auth-only capture) flow. On SEPA, there is no native pre-authorization; the Wallet operator holds the funds in a segregated sub-account. On Lightning, the full `max_amount` HTLC is constructed but not sent; only the `winning_amount` HTLC is dispatched.

### B.4 Sealed Bid Commitment Scheme

For `sealed_bid` sessions, the agent commits to its bid using a standard hash commitment. The commitment is computed as:

`commitment = SHA-256(bid_amount_string || nonce_32_bytes)`

where `bid_amount_string` is the decimal string representation of the bid amount (e.g., `"1250.00"`) and `nonce_32_bytes` is a cryptographically random 32-byte value held by the agent. The `sealed_bid_commitment` field carries the hex-encoded commitment hash. At reveal time, the agent calls a `/reveal` endpoint with the plaintext amount and nonce, and the Wallet operator verifies the commitment before executing the payment.

This scheme is an instance of the Pedersen commitment construction in its simplest hash-based form, as analyzed by Pedersen (1991) and applied to sealed-bid auctions by Naor, Pinkas, and Sumner (1999). It provides hiding (the auctioneer learns nothing about the bid from the commitment) and binding (the agent cannot change its bid after committing) under standard collision-resistance assumptions for SHA-256.

The sealed bid protocol is DSIC for second-price (Vickrey) auctions as proven in RFC 0002 Appendix A, Theorem 3, case 3. It is not DSIC for first-price auctions.

### B.5 Long-Validity Session Extension

A PLVS Session carries a `session_type: parametric_long_validity` field. The Wallet operator MUST accept `expires_at` values up to 168 hours (7 days) from Session creation for PLVS Sessions. Standard Sessions remain capped at 60 minutes.

The extended validity window creates an extended Mandate revocation risk. Section 3.15 in-flight revocation rules apply with the following addition: for PLVS Sessions in `authorized` state, the Wallet operator MUST check for Mandate revocations once every 60 minutes and MUST immediately release the fund reservation and mark the Session `revoked` if a revocation is received.

### B.6 Auction Participation as a Negotiation Profile

Section B.2 to B.5 define the payment authorization side of auction participation. The negotiation-side protocol (the sequence of bids, the auctioneer's state machine, the declaration of the winner) is governed by RFC 0002 (Negotiation Protocol), specifically using the `pricing_function: auction` Commerce Primitive of RFC 0014. The relationship is:

- RFC 0002: governs the Proposal sequence (bids), the state machine (OPEN, PROPOSED, ACCEPTED, EXPIRED), and the Vickrey/VCG incentive analysis.
- RFC 0014: provides the Commerce Primitive encoding (auction as `pricing_function` value).
- RFC 0032 Appendix B: governs the payment authorization that backs each bid.

An auctioneer's Manifest MUST declare `negotiation.supported: true` and `negotiation.categories: ["pricing"]` per RFC 0002 section 3.6. The auctioneer MUST additionally declare `auction_format` in its Manifest under `commerce.auction_format` as one of `english_ascending`, `dutch_descending`, `sealed_bid_second_price`, `sealed_bid_first_price`, or `combinatorial_vcg`. This declaration enables bidding agents to apply the correct incentive-compatible strategy from RFC 0002 Theorem 3.

### B.7 References

- Vickrey, W. (1961). Counterspeculation, Auctions, and Competitive Sealed Tenders. Journal of Finance 16(1).
- Pedersen, T. (1991). Non-Interactive and Information-Theoretic Secure Verifiable Secret Sharing. Proceedings of CRYPTO 1991. The commitment scheme used in section B.4.
- Naor, M., Pinkas, B., and Sumner, R. (1999). Privacy Preserving Auctions and Mechanism Design. Proceedings of ACM EC 1999. The application of hash commitments to sealed-bid auctions.
- Milgrom, P. (2004). Putting Auction Theory to Work. Cambridge University Press. The definitive treatment of the auction formats declared in section B.6.
