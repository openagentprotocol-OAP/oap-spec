import { CCC, OutgoingPayload } from './types';

export class PolicyGate {
  /**
   * Pre-Action Confidentiality Gate (IFC Taint Evaluation)
   * Ensures that data does not leak to unauthorized DIDs.
   */
  public static evaluateInformationFlow(
    payload: OutgoingPayload,
    destinationCCC: CCC
  ): { allowed: boolean; reason?: string } {
    const destinationClearance = new Set(destinationCCC.security_clearance || []);

    // RFC 0034: Check every field's taint against the destination's clearance.
    // L(field) must be a subset of L(destination)
    for (const [fieldName, field] of Object.entries(payload.fields)) {
      for (const taintLabel of field.taint) {
        if (!destinationClearance.has(taintLabel)) {
          return {
            allowed: false,
            reason: `HTTP 451: Information Flow Control block. Field '${fieldName}' has taint '${taintLabel}' which is not in the destination's security clearance.`,
          };
        }
      }
    }

    return { allowed: true };
  }
}
