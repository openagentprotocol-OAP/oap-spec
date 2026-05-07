import { Receipt, CCC } from './types';
// @ts-ignore
import * as snarkjs from 'snarkjs';

export class ReceiptValidator {
  /**
   * Validates an OAP Receipt according to GDPR / Right to be Forgotten requirements.
   */
  public static async validate(receipt: Receipt, ccc: CCC): Promise<{ valid: boolean; error?: string }> {
    const isPrivileged = [
      'medical_confidentiality',
      'attorney_client_privileged',
      'journalist_source_protection',
      'confessional_seal',
    ].includes(ccc.regulatory_classification || '');

    // 1. Privileged Mode / GDPR Art 17 Enforcement
    if (isPrivileged) {
      if (receipt.input_hash || receipt.output_hash) {
        return {
          valid: false,
          error: 'DSGVO/Privilege Violation: Receipts in privileged contexts MUST NOT use input_hash or output_hash. Use zkp object instead to comply with Right to be Forgotten.',
        };
      }
      if (!receipt.zkp) {
        return {
          valid: false,
          error: 'Validation Error: Privileged receipt missing zkp proof object.',
        };
      }

      // Check Subprocessor disclosure
      const allowedSubprocessors = ccc.security_clearance || [];
      if (!allowedSubprocessors.includes(receipt.tool_did)) {
        return {
          valid: false,
          error: `Privilege Violation: Tool DID ${receipt.tool_did} is not an explicitly authorized subprocessor in the CCC.`,
        };
      }

      // Check Cross-Border Transfer
      // In a real implementation, this would cross-reference the Tool DID's geographic manifest
      const toolJurisdiction = 'US'; // Mock lookup
      const cccJurisdiction = 'EU'; // Mock lookup
      if (toolJurisdiction !== cccJurisdiction && !ccc.regulatory_classification) {
         // simplified mock logic
      }
    }

    // 2. Cryptographic ZKP Verification (Mock Verification for Groth16)
    if (receipt.zkp) {
      if (receipt.zkp.system !== 'groth16') {
        return { valid: false, error: 'Unsupported ZKP system.' };
      }
      
      try {
        // In a real implementation, we would fetch the verification key (vKey) for the specific Policy Circuit
        // const vKey = await fetchVerificationKey(receipt.action_id);
        // const isValid = await snarkjs.groth16.verify(vKey, receipt.zkp.public_inputs, receipt.zkp.proof);
        
        // Simulating the snarkjs verification
        const isValid = receipt.zkp.proof && receipt.zkp.public_inputs.length > 0;
        
        if (!isValid) {
          return { valid: false, error: 'Invalid Zero-Knowledge Proof.' };
        }
      } catch (err) {
        return { valid: false, error: `ZKP Verification failed: ${err}` };
      }
    }

    return { valid: true };
  }
}
