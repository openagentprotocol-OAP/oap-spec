# RFC 0034: Information Flow Control and Zero-Knowledge Receipts

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Confidentiality and Compliance
**Created:** 2026-05-07

## 1. Summary

This RFC transitions the Open Agent Protocol's privacy mechanisms from abstract assertions to concrete, verifiable data models. It introduces the precise JSON Schema structures for Zero-Knowledge Proofs (ZKPs) within Receipts to satisfy GDPR Article 17 (Right to be Forgotten) without breaking the Transparency Log. Furthermore, it defines the runtime execution model for Information Flow Control (IFC) to mitigate "Confused Deputy" attacks via LLM Taint Tracking.

## 2. Motivation and Threat Models

The Confidentiality and Compliance Context (CCC) provides a theoretical mapping of legal obligations (NDAs, Mandates) into machine-readable JSON. However, legal obligations are often ambiguous. Translating them to a binary `allow`/`deny` outcome requires robust technical mechanisms that hold up against two specific threat models:

### Threat Model 1: The Confused Deputy (Context Leakage)
Agent A acts under a strict CCC (e.g., medical confidentiality). Agent A calls a specialized Agent B to summarize text. The OAP protocol correctly blocks direct data sharing if Agent B's Tool DID is not authorized. However, Agent A uses an LLM to generate the prompt for Agent B, inadvertently injecting protected facts into the natural language prompt.
*Vulnerability:* The policy engine only checks the *Tool*, not the *Information Flow* inside the LLM generation step.

### Threat Model 2: Immutable Logs vs. Erasure Rights
OAP guarantees tamper-evidence by enforcing that every Receipt $R_n$ contains the SHA-256 hash of $R_{n-1}$ and the hash of the payload ($H(\text{input})$). If the input contains PII, the hash itself may be classified as pseudonymous data under GDPR. If the Principal exercises their right to erasure, the Agent must delete the PII. But a subsequent audit can no longer verify $H(\text{input})$, breaking the chain of trust.
*Vulnerability:* Tension between immutable tamper-evidence and mandatory data deletion. ZKPs do not entirely "solve" the erasure problem against malicious actors storing data out-of-band, but they significantly *reduce* the Audit-vs-Erasure conflict at the protocol level.

## 3. Specification: Zero-Knowledge Receipts

To resolve Threat Model 2, OAP Receipts MAY substitute `input_hash` and `output_hash` with a `zkp` (Zero-Knowledge Proof) object.

### 3.1 ZKP Data Model

The `oap-receipt.schema.json` is extended to support the following property:

```json
{
  "zkp": {
    "system": "groth16",
    "curve": "bn254",
    "public_inputs": [
      "did:plc:abc123",
      "did:web:weatherpro.example",
      "pol_3a7b...",
      "2026-05-07T10:00:00Z"
    ],
    "proof": {
      "a": ["0x123...", "0x456..."],
      "b": [["0x789...", "0xabc..."], ["0xdef...", "0x012..."]],
      "c": ["0x345...", "0x678..."]
    }
  }
}
```

### 3.2 Verification Flow

1. The Substrate or Agent generates a zk-SNARK proving:
   - "I evaluated the CCC rules."
   - "The rule evaluation resulted in TRUE."
   - "The timestamp and DIDs match the public inputs."
2. The Receipt is anchored in the Transparency Log containing only the `zkp` object, omitting `input_hash`.
3. The Principal deletes the local plaintext data (the *witness*).
4. Any third-party auditor can run `Verify(proving_key, public_inputs, proof)` in constant time and confirm the rule was followed, satisfying both auditability and GDPR Art. 17.

## 4. Specification: Information Flow Control (IFC)

To resolve Threat Model 1, OAP introduces *Taint Tracking* as a normative requirement for the Pre Action Confidentiality Gate.

### 4.1 Security Labels (Taints)

Every data object held in Agent memory must be associated with a Security Label $L$, defined as a set of provenance tags (e.g., `{"nda:nda_2026_clientA", "medical_confidential"}`). To be computationally realistic, Taint is tracked at the **message, field, document, or memory-chunk level**, rather than on individual generated words.

When an LLM consumes inputs $I_1, I_2, \dots, I_n$ to generate output field $O$, the runtime MUST assign $O$ the union of all input labels:
$L(O) = \bigcup_{i=1}^n L(I_i)$

### 4.2 The Pre Action IFC Gate

Before executing a network request, the Agent's runtime evaluates the outgoing HTTP payload against the Pre Action Confidentiality Gate.

For every field in the JSON payload, the runtime inspects the Taint $L(field)$. If $L(field)$ is non-empty, the Gate evaluates the destination Tool DID against the CCC. If the CCC does not explicitly `allow` the transfer of *all* tags in $L(field)$ to the destination DID, the request MUST be blocked with HTTP 451.

### 4.3 CCC Schema Extension

The `oap-ccc.schema.json` is implicitly used to evaluate the Taint. The `covered_categories` in an NDA map directly to the Taint labels.

## 5. Security Considerations

Generating ZKPs on consumer hardware introduces latency. Agents MUST cache proving keys and MAY delegate proof generation to a trusted enclave (e.g., AWS Nitro) if local computation exceeds the SLA budget. Furthermore, ZKPs and IFC only guarantee compliance within honest or verified protocol bounds. A malicious tool can always copy data out of band.

## 6. End-to-End Reference Implementation

To prove implementability, the OAP specification includes a normative TypeScript reference implementation in `reference/validator/`. It includes a hard end-to-end use case (`e2e-medical-scenario.ts`) demonstrating:
1. An Agent analyzing a patient file under a `medical_confidentiality` context.
2. Field-level taint tracking (`medical_confidential`) applied to the output JSON summary.
3. The Pre-Action Gate successfully blocking (HTTP 451) an unauthorized request to a public API.
4. The generation and successful validation of a Groth16 zk-SNARK Receipt, demonstrating PII omission.

```typescript
import { PolicyGate, ReceiptValidator, CCC, OutgoingPayload, Receipt } from '@oap/validator';

// 1. Context Load
const patientCCC: CCC = {
  scope_id: 'dr_miller_patient_file',
  regulatory_classification: 'medical_confidentiality',
  security_clearance: ['medical_confidential', 'did:web:certified-neurologist.com'],
};

// 2. Field-level Taint Tracking
const payloadToSend: OutgoingPayload = {
  destination_did: 'did:web:public-summarizer.com',
  fields: {
    summary: {
      value: "Patient shows symptoms of Parkinson's.",
      taint: ['medical_confidential'], 
    },
  },
};

// 3. Pre-Action Gate (Blocks Public API)
const blockedResult = PolicyGate.evaluateInformationFlow(payloadToSend, { security_clearance: [] });
// -> [BLOCKED] HTTP 451: Information Flow Control block.

// 4. Pre-Action Gate (Allows Certified API)
payloadToSend.destination_did = 'did:web:certified-neurologist.com';
const allowedResult = PolicyGate.evaluateInformationFlow(payloadToSend, patientCCC);
// -> [ALLOWED] Payload securely transmitted.

// 5. Privileged Mode ZKP Validation
const receipt: Receipt = {
  type: 'invocation',
  zkp: { system: 'groth16', curve: 'bn254', public_inputs: ['...'], proof: { /*...*/ } }
};
const validation = await ReceiptValidator.validate(receipt, patientCCC);
// -> [VALIDATED] Receipt verified. PII deleted. ZKP anchored.
```

## 7. References

1. OAP-CORE-1.0 Section 18.4 (Information Flow Control) and 19.1 (ZKP Receipts).
2. GDPR Article 17 (Right to Erasure).
