import { PolicyGate } from '../PolicyGate';
import { ReceiptValidator } from '../ReceiptValidator';
import { CCC, Receipt, OutgoingPayload } from '../types';

describe('OAP RFC 0034 Top Tier Mechanisms', () => {

  describe('Information Flow Control (Taint Tracking)', () => {
    it('MUST block payload if destination CCC lacks required security clearance', () => {
      const payload: OutgoingPayload = {
        destination_did: 'did:web:summarizer.example',
        fields: {
          patient_summary: {
            value: 'The patient has a rare genetic disorder.',
            taint: ['medical_confidential'],
          },
        },
      };

      const publicToolCCC: CCC = {
        ccc_version: '1.0',
        scope_id: 'public_summarizer',
        security_clearance: [], // Lacks 'medical_confidential'
      };

      const result = PolicyGate.evaluateInformationFlow(payload, publicToolCCC);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('HTTP 451');
    });

    it('MUST allow payload if destination CCC has matching security clearance', () => {
      const payload: OutgoingPayload = {
        destination_did: 'did:web:specialist.example',
        fields: {
          patient_summary: {
            value: 'The patient has a rare genetic disorder.',
            taint: ['medical_confidential'],
          },
        },
      };

      const authorizedToolCCC: CCC = {
        ccc_version: '1.0',
        scope_id: 'specialized_medical_model',
        security_clearance: ['medical_confidential'],
      };

      const result = PolicyGate.evaluateInformationFlow(payload, authorizedToolCCC);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Zero-Knowledge Receipts (GDPR Art. 17)', () => {
    const medicalCCC: CCC = {
      ccc_version: '1.0',
      scope_id: 'doctor_visit',
      regulatory_classification: 'medical_confidentiality',
      security_clearance: ['did:web:tool1'],
    };

    it('MUST reject Receipts containing input_hash in Privileged Mode', async () => {
      const badReceipt: Receipt = {
        receipt_id: 'urn:oap:receipt:123',
        type: 'invocation',
        timestamp: '2026-05-07T10:00:00Z',
        principal_did: 'did:plc:patient',
        agent_did: 'did:assistnet:agent1',
        tool_did: 'did:web:tool1',
        action_id: 'diagnose',
        action_version: '1.0',
        input_hash: 'sha256:abcd1234abcd1234', // VIOLATION!
        policy_decisions: [],
        previous_receipt_hash: 'genesis',
        signatures: [],
      };

      const result = await ReceiptValidator.validate(badReceipt, medicalCCC);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('DSGVO/Privilege Violation');
    });

    it('MUST accept Receipts using valid ZKP instead of input_hash', async () => {
      const goodReceipt: Receipt = {
        receipt_id: 'urn:oap:receipt:124',
        type: 'invocation',
        timestamp: '2026-05-07T10:00:00Z',
        principal_did: 'did:plc:patient',
        agent_did: 'did:assistnet:agent1',
        tool_did: 'did:web:tool1',
        action_id: 'diagnose',
        action_version: '1.0',
        zkp: {
          system: 'groth16',
          curve: 'bn254',
          public_inputs: ['did:plc:patient'],
          proof: { a: ['0x1'], b: [['0x2']], c: ['0x3'] },
        },
        policy_decisions: [],
        previous_receipt_hash: 'genesis',
        signatures: [],
      };

      const result = await ReceiptValidator.validate(goodReceipt, medicalCCC);
      expect(result.valid).toBe(true);
    });
  });
});
