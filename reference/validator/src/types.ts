export interface CCC {
  ccc_version: string;
  scope_id: string;
  security_clearance?: string[];
  regulatory_classification?: string;
}

export interface ZKP {
  system: "groth16" | "plonk" | "stark";
  curve: string;
  public_inputs: string[];
  proof: Record<string, any>;
}

export interface Receipt {
  receipt_id: string;
  type: string;
  timestamp: string;
  principal_did: string;
  agent_did: string;
  tool_did: string;
  action_id: string;
  action_version: string;
  input_hash?: string;
  output_hash?: string;
  zkp?: ZKP;
  policy_decisions: Array<{ id: string; outcome: string; rules: string[] }>;
  provenance_tags_in?: string[];
  provenance_tags_out?: string[];
  previous_receipt_hash: string;
  signatures: Array<{ by: string; alg: string; value: string }>;
}

export interface PayloadField {
  value: any;
  taint: string[]; // Set of security labels attached to this field
}

export interface OutgoingPayload {
  destination_did: string;
  fields: Record<string, PayloadField>;
}
