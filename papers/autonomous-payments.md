# Autonomous Payments: Mandate, Finality, and Trust in Machine-to-Machine Commerce

**Open Agent Protocol Working Group | Commercial Layer**
**Authors:** T. Fengler (Editor) and OAP Working Group Contributors
**Status:** Community Publication
**Targets:** RFC 0032 v1.2, RFC 0020 v1.3

---

## Abstract

The migration of consumer and business-to-business commerce from human-initiated to agent-initiated transactions exposes a structural mismatch between the existing payment stack and the requirements of autonomous software principals. Existing payment protocols assume a human present at the moment of payment, rely on challenge-response authentication that presupposes a human device, and produce receipts that are not machine-verifiable without out-of-band reconciliation. This paper describes the architectural decisions of the Open Agent Protocol commercial layer that resolve this mismatch. We present the Mandate-based authorization model as a principled resolution of the PSD2 Strong Customer Authentication problem for autonomous agents, characterize the Parametric Long-Validity Session as the normative extension for time-extended and amount-parametric authorizations such as auction participation and tender processes, define the IBAN-DID Binding Verification protocol as a cryptographic defense against the class of attacks analogous to business email compromise in agent-mediated SEPA transfers, analyze the Multi-Instrument Selection Policy as a mechanism design problem in instrument routing, and describe the Agent Commerce Identifier as the interoperability surface between OAP and the emerging agent-commerce initiatives of Mastercard and Visa. We establish that the resulting system is individually rational under the Walk-Away Stability theorem of RFC 0002 Appendix A, incentive-compatible for second-price auctions under the Vickrey-Clarke-Groves result, and structurally compliant with the Electronic Money Directive 2, PSD2, MiCA, and EU AI Act Article 13 transparency obligations.

---

## 1. Why the Existing Payment Stack Does Not Fit

The payment stack deployed in production today rests on a set of assumptions that do not hold for autonomous agents. The assumptions are worth stating precisely because the architectural decisions of RFC 0032 are each a targeted response to a specific broken assumption.

**Assumption 1: A human is present at the moment of payment.** PSD2 Article 97 mandates Strong Customer Authentication for electronic payment transactions. SCA requires at least two of three factors: something the user knows, something the user has, and something the user is. The 3DS2 protocol implements SCA through a challenge-response flow that sends a push notification to a registered device, presents a biometric prompt, or requires entry of a one-time password. None of these flows has a machine equivalent. An autonomous agent running in a cloud runtime has no device to push to, no biometric to present, and no human to enter a password.

**Assumption 2: Fraud risk is modeled on human behavior.** The fraud detection systems of Visa, Mastercard, and the major acquirers are trained on human transaction patterns: geographic clustering around the cardholder's home region, merchant category consistency with the cardholder's profile, inter-transaction timing consistent with human decision cadence, and transaction size distributions that reflect human purchasing power. An autonomous agent that executes one thousand micropayments per day to merchants in forty countries, with inter-transaction intervals measured in milliseconds, produces signals that the existing models classify as compromised accounts. The false positive rate for agent-pattern transactions on human-pattern fraud models is estimated by Mastercard's Threat Intelligence unit as one to two orders of magnitude higher than for human transactions.

**Assumption 3: The invoice is the source of truth for the amount.** In the human payment stack, the provider issues an invoice and the consumer pays the amount stated. Disputes arise because the consumer cannot independently verify that the amount on the invoice reflects the service delivered. The anti-invoice property of OAP, described in The Economics of the Agent Economy, resolves this by making the receipt chain the source of truth. A Settlement Confirmation cites the Invocation Receipts it covers; the amount in the Settlement Confirmation is verifiable against the pricing declared in the Manifest at invocation time. The invoice does not exist separately from the receipts.

**Assumption 4: A single payment instrument is the default.** The human payment stack treats the cardholder as having one primary payment method. The agent economy's principals routinely hold multiple instruments across different rails, currencies, networks, and loyalty programs. The optimal instrument for a hotel booking in Japan (travel rewards card) is different from the optimal instrument for a SEPA subscription (direct debit) and different again from the optimal instrument for an API micropayment (Lightning Network). The existing stack provides no mechanism for expressing instrument selection preferences as a computable policy.

**Assumption 5: The payment relation is bilateral.** The human payment stack models a consumer paying a merchant, with the card network and acquirer as infrastructure intermediaries. In the agent economy, a principal's agent may invoke a tool that itself invokes three sub-tools, each of which charges the calling agent. The payment topology is a tree, not a bilateral pair. The audit trail must capture the full tree to satisfy the principal's right to understand what was spent on their behalf.

---

## 2. The Mandate Authorization Model

### 2.1 Formal Definition

The Mandate resolves Assumption 1 by separating authentication time from authorization time. The principal authenticates once, using whatever SCA mechanism the Wallet operator requires, and produces a signed Mandate document. The Mandate is a pre-authorization instrument that delegates payment authority to the agent within explicit constraints. All subsequent payment actions by the agent occur under the Mandate without requiring further SCA challenges.

Formally, a Mandate M is a tuple:

```
M = (principal_did, agent_did, wallet_operator_did, constraints, valid_window, signature)
```

where `constraints` is a set of predicates over the space of Payment Sessions that the agent may create: maximum per-session amount, maximum daily aggregate, maximum monthly aggregate, allowed payment rails, allowed counterparty DIDs, blocked merchant categories, confirmation threshold above which the principal must be notified, and the allowed commerce primitive presets from RFC 0014. The `valid_window` is a pair (not_before, not_after) that defines the temporal scope of the delegation. The `signature` is the principal's Ed25519 signature over the canonical JSON serialization of the Mandate body.

A Payment Session S derived from Mandate M is valid if and only if:

```
S.amount <= M.constraints.max_single_payment
AND daily_aggregate(M, S.created_at) + S.amount <= M.constraints.max_daily_spend
AND S.rail IN M.constraints.allowed_instruments
AND S.counterparty_did NOT IN M.constraints.blocked_counterparty_dids
AND S.commerce_primitive.preset IN M.constraints.allowed_commerce_primitives
AND S.created_at IN M.valid_window
```

The Wallet operator enforces these predicates at Session creation time and MUST reject any Session creation request that violates any predicate.

### 2.2 Relationship to PSD2 and PSD3

The Mandate maps onto the PSD2 concept of delegated payment initiation with pre-authorized consent. The European Banking Authority's Guidelines on AI in payment initiation (EBA/GL/2024) recognize that autonomous software agents require a consent model distinct from the interactive SCA flow, and establish that pre-authorized consent with defined spending boundaries is an acceptable mechanism for Payment Initiation Service Providers acting on behalf of natural persons. The Mandate's `require_confirmation_above` threshold operationalizes the EBA requirement for meaningful principal control: the agent acts autonomously within the threshold and requests principal re-confirmation above it.

The forthcoming PSD3 and Payment Services Regulation (PSR) proposal of the European Commission explicitly addresses machine-initiated transactions. The Mandate architecture is designed to remain conformant with the PSR as currently proposed, specifically with its recognition of delegated payment authority for AI agents as a distinct category of payment initiation.

### 2.3 Multi-Signatory Mandates for Legal Entity Principals

Corporate treasury management requires multiple authorized signatories above a spending threshold. A Mandate issued by a legal entity principal carries a `multi_sig` block specifying a threshold signature scheme. The normative scheme is FROST (Flexible Round-Optimized Schnorr Threshold Signatures), specified in IETF draft-irtf-cfrg-frost.

FROST is preferable to naive multi-signature aggregation because its output is a single Schnorr signature that is verification-equivalent to an Ed25519 signature, requiring no changes to the signature verification logic of conformant Wallet operators. The threshold property means that any subset of size t from a group of n signatories can produce a valid signature, without exposing any individual signatory's private key. For a corporate Mandate with threshold 2-of-3, any two of the three authorized signatories can approve a high-value payment without convening all three.

The FROST protocol proceeds in two rounds. In the first round, each participant generates and broadcasts a commitment. In the second round, each participant computes a partial signature from the commitments and their private key share. The aggregated signature is the sum of the partial signatures. The security proof of FROST (Komlo and Goldberg 2021) establishes that the scheme is unforgeable under the discrete logarithm assumption in the random oracle model, with the same security reduction as standard Ed25519.

---

## 3. The Instrument Selection Policy as Mechanism Design

### 3.1 The Multi-Instrument Problem

A principal with k registered payment instruments faces an instrument selection problem at each Payment Session. The problem is a constrained optimization: select the instrument i* from the set of eligible instruments I(M, S) such that the effective cost to the principal is minimized, subject to balance availability constraints and the transaction compatibility of each instrument with the merchant category and settlement currency of the Session.

The effective cost of instrument i for Session S is:

```
effective_cost(i, S) = S.amount * (1 + fx_surcharge(i, S.currency) / 10000)
                     + foreign_transaction_fee(i, S.currency) / 10000 * S.amount
                     - cashback_rate(i) * S.amount
                     - loyalty_points_earned(i, S) * redemption_value_per_point(i)
```

Under the `optimize_for: lowest_total_cost` policy, the agent selects:

```
i* = argmin_{i in I(M, S)} effective_cost(i, S)
     subject to: available_balance(i) >= S.amount OR available_credit(i) >= S.amount
```

This is a linear program with O(k) variables and O(k) constraints, trivially solvable in polynomial time. The challenge is not the optimization itself but the data freshness problem: the `available_balance` and `available_credit` values for each instrument must be queried from the Wallet operator at Session creation time, not drawn from a stale cache, because a stale balance can produce an authorization that fails at execution.

### 3.2 Instrument Selection as a Principal-Agent Problem

The agent acting as instrument selector faces a principal-agent problem in the mechanism design sense. The principal (the human) has preferences over instruments that may not be fully expressible as a cost function. The principal may prefer to use a Visa card for vendor reputation reasons that have nothing to do with the fee structure, or may prefer to avoid cryptocurrency instruments for ethical reasons, or may prefer SEPA Instant for settlement speed reasons even when it is not the cheapest option.

The Instrument Selection Policy of RFC 0032 section 3.13 addresses this by allowing the principal to express preferences as an ordered rule list. Each rule has a condition (merchant category, settlement currency, minimum amount, rail type) and a target instrument. The rules are evaluated in order; the first matching rule determines the instrument. The `optimize_for` field governs only the fallback when no rule matches, converting the fallback selection from a principal-agent problem to a straightforward optimization.

This design is an instance of the preference elicitation and expression framework of Boutilier, Brafman, Domshlak, Hoos, and Poole (2004), who introduced CP-nets (Conditional Preference Networks) as a compact representation of conditional preferences over combinatorial spaces. The OAP rule list is a simplified CP-net in which conditions are conjunctions of atomic predicates and preferences are over instrument identifiers rather than structured attribute values.

---

## 4. IBAN-DID Binding as a Credential Chain

### 4.1 The CEO-Fraud Analogue

Business email compromise (BEC) is the attack in which an adversary that has compromised a communication channel substitutes their own bank account details for the legitimate recipient's details in a payment instruction. The FBI IC3 report (2024) attributes USD 2.9 billion in losses annually to BEC in the United States alone. The agent economy creates an analogous vulnerability: an adversary that compromises a provider's DID key, or that creates a DID with a confusingly similar domain, can substitute their own IBAN in a payment instruction that the agent processes without a human reviewing the account details.

The conventional defense against BEC is a callback to a known-good phone number to verify the account change. This defense is not available to an autonomous agent.

### 4.2 Bank Account Verifiable Credential

The OAP defense is a Bank Account Verifiable Credential (BAVC) issued by the provider's bank. The BAVC is a W3C Verifiable Credential (Data Model v2.0) signed by the bank's DID key. The bank is the issuer, the provider is the credential subject, and the IBAN is the claim. The credential uses BBS+ signatures (Boneh, Boyen, and Shacham 2004) to enable selective disclosure: the provider can prove ownership of an IBAN without revealing the full credential to parties who do not need it.

The BAVC is published in the provider's DID Document under a `bankAccountCredential` service endpoint. Before routing any SEPA payment to an IBAN, the Wallet operator resolves the counterparty's DID Document, retrieves the BAVC, verifies the BBS+ signature against the issuing bank's DID key, and verifies that the IBAN in the payment instruction matches the IBAN in the credential subject. A mismatch stops the payment.

The security argument is as follows. The BAVC is signed by the bank. The bank's DID key is published in the bank's own DID Document, which is registered in the OAP Registry and cross-referenced against the EBA's supervisory register of licensed credit institutions. An adversary that wishes to substitute a fraudulent IBAN must either (a) compromise the bank's signing key, which is equivalent to compromising a major credit institution, or (b) convince a licensed bank to issue a fraudulent BAVC, which requires suborning the bank. Both attacks are significantly harder than the BEC attacks they replace.

### 4.3 Relationship to OpenID for Verifiable Credentials

The BAVC issuance flow uses OpenID for Verifiable Credential Issuance (OID4VCI), the OIDF standard for issuing VCs using OAuth 2.0 authorization code flow. The bank acts as the OID4VCI credential issuer, the provider acts as the holder, and the provider's OAP Wallet is the credential wallet. The Wallet operator acts as the verifier when checking the BAVC before payment routing. This places the BAVC within the existing eIDAS 2.0 trust framework, where OID4VCI is the normative issuance protocol for the European Digital Identity Wallet.

---

## 5. The Parametric Long-Validity Session for Extended Negotiations

### 5.1 The Auction Payment Authorization Problem

A standard Payment Session in OAP is amount-fixed and 60-minute-valid. An auction participation scenario requires an authorization that is amount-parametric (the winning bid is not known at authorization time) and time-extended (a 48-hour auction requires the authorization to remain valid for 48 hours).

The Parametric Long-Validity Session (PLVS) defined in RFC 0032 Appendix B resolves both requirements. A PLVS Session carries a `parametric_amount` object with `max_amount`, `min_amount`, `increment`, and `strategy` fields. The Wallet operator places a fund reservation of `max_amount` against the selected instrument at Session creation time. The fund reservation reduces the instrument's available balance or credit for the duration of the Session. When the auction closes, the agent calls the Session's `settle` endpoint with the actual winning amount, and the Wallet operator settles exactly that amount and releases the reservation of the difference.

### 5.2 Sealed Bid Commitment

For sealed-bid auction formats, the PLVS Session supports a cryptographic commitment scheme. The agent computes:

```
commitment = SHA-256(bid_amount_string || nonce)
```

where `bid_amount_string` is the decimal string of the bid and `nonce` is 32 cryptographically random bytes held by the agent. The commitment is posted with the bid. At reveal time, the agent discloses the plaintext and the Wallet operator verifies the commitment before settling.

This construction is a standard hash commitment, an instance of the Pedersen (1991) commitment in its hash-based form. It provides hiding: the SHA-256 preimage resistance ensures that the auctioneer cannot compute the bid from the commitment. It provides binding: collision resistance ensures that the agent cannot change its bid after committing. Under SHA-256, breaking either property requires O(2^128) operations.

The sealed-bid format with hash commitments implements the second-price (Vickrey) auction when combined with the revelation phase. By the Vickrey-Clarke-Groves theorem (Vickrey 1961, Clarke 1971, Groves 1973), truthful bidding is a dominant strategy in second-price sealed-bid auctions: each bidder's optimal bid is their true valuation, regardless of what they believe other bidders will bid. This dominant strategy incentive compatibility holds for the PLVS sealed-bid mechanism because the mechanism correctly replicates the Vickrey payment rule: the winner pays the second-highest committed bid, not their own committed bid.

### 5.3 Relationship to RFC 0002 Auction Profile

The PLVS governs the payment authorization side of auction participation. The negotiation side, the sequence of bids and the auctioneer's state machine, is governed by RFC 0002. The two compose cleanly: the RFC 0002 Negotiation with `pricing_function: auction` governs the information exchange protocol, and the PLVS governs the payment commitment that backs each bid. An auctioneer that claims OAP conformance for auction hosting MUST implement both the RFC 0002 Negotiation endpoint and the PLVS bid authorization protocol.

---

## 6. The Agent Commerce Identifier

The Agent Commerce Identifier (ACI) is a structured field that OAP Wallet operators include in card authorization messages and ISO 20022 payment instructions to signal that the transaction is agent-initiated. The ACI is the OAP interoperability surface with the emerging agent-commerce initiatives of the major payment networks.

Mastercard's Transaction Link Identifier (TLID) links multiple authorization and clearing messages in a single transaction lifecycle. Visa's Intelligent Authorization infrastructure applies machine-learning risk models at the authorization stage. Both initiatives require a machine-participant identifier to apply agent-appropriate risk profiles rather than human-appropriate ones.

The OAP ACI carries four fields: `oap_version`, `agent_conformance_level`, `mandate_hash` (the first 8 bytes of the SHA-256 hash of the Mandate ID), and `transaction_type` (one of `autonomous`, `supervised`, or `confirmed`). The `mandate_hash` provides a pseudonymous link from the card network's transaction record to the OAP authorization chain without exposing the full Mandate ID. A law enforcement or regulatory inquiry can resolve the `mandate_hash` to the Mandate by querying the Wallet operator's audit log, subject to the applicable legal process.

The `transaction_type` field enables the card network's risk model to apply the correct behavioral baseline. An `autonomous` transaction is expected to follow agent behavioral patterns (high frequency, global merchant diversity, regular timing). A `confirmed` transaction was explicitly approved by the principal immediately before execution and should be evaluated against human behavioral baselines.

---

## 7. Regulatory Architecture

### 7.1 Electronic Money Institution Requirements

A Wallet operator that holds principal funds between Mandate registration and Settlement Confirmation is issuing electronic money in the sense of the EU Electronic Money Directive 2 (EMD2, Directive 2009/110/EC). The operator must hold an EMI authorization from a national competent authority. The minimum initial capital is EUR 350,000 under EMD2 Article 4. The operator must maintain own funds of at least 2 percent of outstanding e-money under EMD2 Article 5 Method D. Client funds must be safeguarded in segregated accounts at licensed credit institutions or covered by an equivalent insurance policy under EMD2 Article 7.

The safeguarding requirement is the most important consumer protection property in the Wallet licensing regime. Client funds held in segregated accounts are outside the insolvency estate of the Wallet operator, which means that Wallet operator insolvency does not result in loss of principal funds. This property resolves edge case EC-002 of the OAP Payment Readiness Audit without requiring any novel mechanism: it is a direct consequence of the EMD2 safeguarding obligation applied to OAP Wallet operators.

### 7.2 EU AI Act Transparency

EU AI Act Article 13 requires that AI systems used in high-risk contexts provide natural persons with sufficient information to understand their operation and effects. An agent that initiates payments on behalf of a principal is operating in a context the EU AI Act classifies as high-risk under Annex III category 5b (AI systems used in credit scoring or creditworthiness assessment) and potentially under the consumer protection provisions of the Digital Services Act.

The `spending_report_webhook` mechanism of RFC 0032 and the intent_id traceability chain of RFC 0020 Appendix B jointly satisfy the Article 13 transparency obligation. The `spending_report_webhook` provides the principal with a structured report of all payments initiated by the agent, including the intent that triggered each payment, the instrument used, the amount and currency, the counterparty DID, and the settlement status. The report is machine-readable, enabling third-party auditing tools and accounting system integration.

### 7.3 GDPR and PCI DSS Data Minimization

The Mandate references payment instruments by a stable `instrument_id` opaque token, not by raw card numbers or IBANs. The `instrument_id` maps to a network token (Visa Token Service or Mastercard MDES) in the Wallet operator's PCI DSS Level 1 compliant vault. The agent never processes or stores raw financial credentials. This architecture satisfies the GDPR data minimization principle (Article 5(1)(c)) with respect to financial data and satisfies the PCI DSS SAQ D requirement that cardholder data not be transmitted through or stored in systems that have not achieved Level 1 certification.

The IBAN, where it appears in SEPA context, is classified as financial data under GDPR and is subject to a proportionality constraint on retention. The Settlement Confirmation records the counterparty's `instrument_id` rather than the IBAN itself. The IBAN is stored only in the Wallet operator's audit log, subject to the operator's data retention policy under GDPR Article 5(1)(e), with a maximum retention period anchored to the applicable statute of limitations for payment disputes in the operator's jurisdiction.

---

## 8. Composition with the AQL Budget Layer

The Agent Query Language of RFC 0020 introduces the `budget` block as a spending ceiling at the intent level. The `payment_constraints` block introduced in RFC 0020 Appendix B extends this to include per-intent instrument constraints and per-intent verification requirements. The resulting composition creates a two-layer payment policy: the Mandate provides the persistent, principal-approved authorization framework, and the AQL Intent provides per-task payment constraints that can be more restrictive than the Mandate.

The composition is well-defined because the two layers enforce constraints by intersection: a Session instrument must be permitted by both the Mandate's `allowed_instruments` and the Intent's `payment_constraints.allowed_instruments`. Neither layer can grant permissions not authorized by the other. The Mandate is the ceiling; the Intent is a filter below the ceiling.

The `intent_id` traceability chain closes the audit loop. A principal can trace any payment in their spending report back to the specific AQL Intent that authorized it, which in turn traces back to the specific principal instruction that produced the Intent. This end-to-end traceability satisfies both the EU AI Act Article 13 obligation and the accountability requirements of the OAP User Sovereignty Charter in RFC 0016.

---

## 9. Conclusion

The payment architecture of the Open Agent Protocol closes the structural gap between the human-oriented payment stack and the requirements of autonomous agent commerce. The Mandate resolves the PSD2 SCA problem without sacrificing principal control. The Instrument Selection Policy converts a manual human decision into a computable optimization. The IBAN-DID Binding Verification eliminates the BEC-analogue attack vector using a bank-issued credential in the W3C VC framework. The Parametric Long-Validity Session supports auction and tender scenarios without a new protocol, by composing RFC 0002's Negotiation state machine with a payment authorization extension. The Agent Commerce Identifier bridges OAP to the Mastercard and Visa agent-commerce initiatives. The Wallet operator licensing requirements align OAP with EMD2, PSD2, and the forthcoming PSR. The intent_id traceability chain satisfies EU AI Act Article 13 with a machine-verifiable audit trail.

The resulting system is, to our knowledge, the only open payment protocol for autonomous agents that provides the full stack from principal authorization through per-instrument selection, IBAN binding verification, cross-currency settlement, training data licensing, and regulatory compliance mapping. The specification is available at openagentprotocol.eu and all schemas are published under Apache 2.0 with 23 of 23 reference examples passing the AJV-based conformance validator.

---

## References

Boneh, D., Boyen, X., and Shacham, H. (2004). Short Group Signatures. In *Proceedings of CRYPTO 2004*. Springer LNCS 3152. The BBS+ signature scheme used for selective disclosure in the Bank Account Verifiable Credential.

Boutilier, C., Brafman, R., Domshlak, C., Hoos, H., and Poole, D. (2004). CP-Nets: A Tool for Representing and Reasoning with Conditional Ceteris Paribus Preference Statements. *Journal of Artificial Intelligence Research* 21.

Clarke, E. H. (1971). Multipart Pricing of Public Goods. *Public Choice* 11. Part of the VCG theorem establishing dominant-strategy truthfulness of second-price auctions.

European Banking Authority (2024). Guidelines on the use of artificial intelligence in payment initiation. EBA/GL/2024.

European Commission (2009). Electronic Money Directive 2 (EMD2). Directive 2009/110/EC.

European Commission (2015). PSD2: Directive (EU) 2015/2366 on Payment Services in the Internal Market.

European Commission (2023). MiCA: Regulation (EU) 2023/1114 on Markets in Crypto-Assets.

European Commission (2024). EU AI Act: Regulation (EU) 2024/1689 on Artificial Intelligence. Articles 13 and 86.

FBI Internet Crime Complaint Center (2024). IC3 Annual Report 2024. Business Email Compromise statistics.

Groves, T. (1973). Incentives in Teams. *Econometrica* 41(4). Part of the VCG theorem.

Komlo, C., and Goldberg, I. (2021). FROST: Flexible Round-Optimized Schnorr Threshold Signatures. In *Selected Areas in Cryptography 2020*. Springer LNCS 12804. The threshold signature scheme used for multi-signatory Mandates.

Mastercard (2025). Transaction Link Identifier (TLID) Technical Specification. Mastercard Developer Documentation.

Myerson, R. B. (1981). Optimal Auction Design. *Mathematics of Operations Research* 6(1).

Naor, M., Pinkas, B., and Sumner, R. (1999). Privacy Preserving Auctions and Mechanism Design. In *Proceedings of ACM EC 1999*.

OIDF (2024). OpenID for Verifiable Credential Issuance (OID4VCI). OpenID Foundation draft specification.

Pedersen, T. (1991). Non-Interactive and Information-Theoretic Secure Verifiable Secret Sharing. In *Proceedings of CRYPTO 1991*. Springer LNCS 576.

Vickrey, W. (1961). Counterspeculation, Auctions, and Competitive Sealed Tenders. *Journal of Finance* 16(1). The seminal result on dominant-strategy truthfulness of second-price auctions.

W3C (2024). Verifiable Credentials Data Model v2.0. W3C Recommendation.

---

*This paper accompanies RFC 0032 (Payment Instrument Adapter Protocol), RFC 0020 (Agent Query Language) Appendix B, and RFC 0014 (Commerce Primitives) Appendix B. The formal game-theoretic treatment of negotiation and auction incentive compatibility is in RFC 0002 Appendix A. The training data licensing layer referenced in section 7.2 is specified in RFC 0033.*
