import { PolicyGate } from './PolicyGate';
import { ReceiptValidator } from './ReceiptValidator';
import type { CCC, OutgoingPayload, Receipt } from './types';

async function runEndToEndScenario() {
  console.log("==================================================");
  console.log(" OAP End-to-End Use Case: Medical Confidentiality ");
  console.log("==================================================\n");

  // Step 1: Define the Legal Context (CCC) for the Principal (Patient/Doctor)
  const patientCCC: CCC = {
    ccc_version: '1.0',
    scope_id: 'dr_miller_patient_file',
    regulatory_classification: 'medical_confidentiality',
    security_clearance: ['medical_confidential', 'did:web:certified-neurologist.com'],
  };

  console.log("[1] Agent Context Loaded.");
  console.log(`    Regulatory Classification: ${patientCCC.regulatory_classification}`);

  // Step 2: The Agent summarizes the medical record.
  // As criticized, Taint is tracked at the *Field* level, not the word level.
  const generatedSummary = "Patient shows symptoms of early-stage Parkinson's. Recommend specialist consultation.";
  const payloadToSend: OutgoingPayload = {
    destination_did: '', // Will be set dynamically
    fields: {
      summary: {
        value: generatedSummary,
        taint: ['medical_confidential'], // Field-level taint tracking
      },
    },
  };

  console.log("\n[2] Agent generates summary. Field-level Taint applied:");
  console.log(`    Content: "${payloadToSend.fields.summary!.value}"`);
  console.log(`    Taint:   [${payloadToSend.fields.summary!.taint.join(', ')}]`);

  // Step 3: Attempt 1 - Sending to an untrusted public tool
  const publicToolCCC: CCC = {
    ccc_version: '1.0',
    scope_id: 'public_summarizer_v2',
    security_clearance: [], // Untrusted, no medical clearance
  };
  payloadToSend.destination_did = 'did:web:public-summarizer.com';

  console.log(`\n[3] Attempting to send Payload to untrusted tool (${payloadToSend.destination_did})...`);
  const blockedResult = PolicyGate.evaluateInformationFlow(payloadToSend, publicToolCCC);
  if (!blockedResult.allowed) {
    console.log(`    [BLOCKED] 🔴 ${blockedResult.reason}`);
  }

  // Step 4: Attempt 2 - Sending to a certified specialist tool
  const specialistToolCCC: CCC = {
    ccc_version: '1.0',
    scope_id: 'certified_neurology_analyzer',
    security_clearance: ['medical_confidential'], // Trusted
  };
  payloadToSend.destination_did = 'did:web:certified-neurologist.com';

  console.log(`\n[4] Attempting to send Payload to certified tool (${payloadToSend.destination_did})...`);
  const allowedResult = PolicyGate.evaluateInformationFlow(payloadToSend, specialistToolCCC);
  if (allowedResult.allowed) {
    console.log(`    [ALLOWED] 🟢 Payload securely transmitted.`);
  }

  // Step 5: Generating and Validating the Receipt (Privileged Mode)
  console.log("\n[5] Generating OAP Receipt for the interaction...");
  
  const receipt: Receipt = {
    receipt_id: 'urn:oap:receipt:med-001',
    type: 'invocation',
    timestamp: new Date().toISOString(),
    principal_did: 'did:plc:patient_123',
    agent_did: 'did:assistnet:medical_agent',
    tool_did: payloadToSend.destination_did,
    action_id: 'analyze_summary',
    action_version: '1.0',
    // We intentionally OMIT input_hash to comply with GDPR Art 17
    zkp: {
      system: 'groth16',
      curve: 'bn254',
      public_inputs: ['did:plc:patient_123', payloadToSend.destination_did],
      proof: { a: ['0x1'], b: [['0x2']], c: ['0x3'] },
    },
    policy_decisions: [{ id: 'pd-1', outcome: 'allow', rules: ['IFC_Taint_Match'] }],
    previous_receipt_hash: 'genesis',
    signatures: [{ by: 'did:assistnet:medical_agent', alg: 'EdDSA', value: 'sig_xyz' }],
  };

  const validation = await ReceiptValidator.validate(receipt, patientCCC);
  if (validation.valid) {
    console.log("    [VALIDATED] 🟢 Receipt verified. PII deleted. ZKP anchored.");
  } else {
    console.log(`    [INVALID] 🔴 ${validation.error}`);
  }

  console.log("\n==================================================");
  console.log(" End-to-End Scenario Completed Successfully.");
  console.log("==================================================\n");
}

runEndToEndScenario().catch(console.error);
