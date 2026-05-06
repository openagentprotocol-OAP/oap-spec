# RFC 0018: The Right to a Human Path

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Privacy and Governance
**Created:** 2026-05-03
**Working Group:** Privacy and Governance
**Targets:** 1.2

## 1. Summary

This document defines a normative requirement that every Provider whose Actions affect the legal, financial, medical, familial, or otherwise consequential status of a person MUST expose a standardized Action through which the User, or the User's Agent acting on the User's behalf, can reach a competent human being employed or contracted by the Provider. The intent is to recognize that even in a world in which most interaction is mediated by autonomous Agents, certain situations require human judgment, human empathy, or human accountability that no Agent can supply, and that the right of access to a human being in those situations is a precondition for the moral acceptability of an otherwise fully agentic ecosystem.

The normative architecture of this RFC aligns with the **Human-Agent Collectives** paradigm of Jennings, Moreau, Nicholson, Ramchurn, Roberts, Rodden, and Rogers (2014) and the ORCHID research programme, which holds that the appropriate frame for advanced agentic systems is not full autonomy but rather a flexible collective of humans and agents in which authority, initiative, and explanation flow in both directions as the situation requires. Where Jennings et al. articulate the scientific and societal case for HAC at the level of system design, this RFC supplies the protocol-level mechanism through which an OAP-conformant Provider operationalizes the human-in-the-loop dimension of that collective. The Escalation Action defined below is therefore not a fallback for failure of automation but a first-class element of the human-agent collective architecture.

For the narrow class of Actions that fall under the Lethal Autonomous Weapon Systems prohibition of OAP-CORE §20.2, the Escalation Action is not a User-invoked right but a System-mandated routing requirement. Any Action whose execution would constitute selection or engagement of a human target by an autonomous system MUST route through `escalate_to_human` before execution, the Human Operator's decision MUST be recorded in the Decision Record with full attribution, and the action MUST NOT execute on the basis of agent inference alone. This implements the doctrine of meaningful human control in the sense of Article 36 of the UN Convention on Certain Conventional Weapons, the open letters organized by Walsh and others (2015, 2017), and Principle 18 of the Asilomar AI Principles (Future of Life Institute, 2017).

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Consequential Provider** is any Provider whose published Actions can affect any of the following on behalf of a User: legal status, ownership of property, financial position above a defined threshold, medical or psychiatric condition, family relationships, employment, immigration status, access to housing, access to insurance, access to credit, criminal record, or political participation.

The **Escalation Action** is the standardized Action `escalate_to_human` that every Consequential Provider MUST expose under this RFC.

A **Human Operator** is a natural person, identifiable by name and role within the Provider organization, who responds to the Escalation Action.

A **Service Level** for the Escalation Action is the publicly declared maximum response time and the channel of response through which the Provider commits to engage the User after invocation.

## 3. Scope

A Provider is a Consequential Provider, and therefore subject to the requirements of this RFC, whenever any one of its declared Actions falls into any category described in section 2 above. A Provider whose Actions are entirely informational or recreational in nature is not required to expose the Escalation Action, but MAY do so voluntarily and SHOULD if the Provider's Actions could plausibly become consequential under unusual circumstances.

A Provider MUST self assess its Consequential Provider status and MUST declare it through the `consequential_provider` boolean field in the manifest. A Provider that fails to declare correctly forfeits conformance and may be subject to the enforcement procedures of RFC 0016 section 7.

## 4. The Escalation Action

### 4.1 Identifier and Shape

The Escalation Action MUST be exposed under the canonical Action identifier `escalate_to_human`. Its input schema MUST accept at minimum a free text `subject` field, an optional `urgency` field with values among `low`, `normal`, `high`, and `critical`, an optional `preferred_channel` field with values among `voice`, `video`, `text_chat`, `email`, and `physical`, and an optional `context_receipt_ids` array referencing prior Receipts that establish the context of the escalation.

The output schema of the Escalation Action MUST return a `case_id`, a `confirmed_response_channel`, a `service_level_seconds` value, and an `operator_identifier` that becomes available once a Human Operator has been assigned.

### 4.2 Cost

The Escalation Action MUST NOT be priced under any commerce model that would make it inaccessible to a User on the basis of inability or unwillingness to pay, when the underlying Provider relationship is itself active. A Provider MAY decline to provide the Escalation Action gratuitously to non customers, but MUST provide it without additional charge to any active User of any of its other Actions. The cost of the Escalation Action MUST be declared as `free` in the Action manifest under those circumstances.

### 4.3 Service Level Disclosure

The Provider MUST publish a Service Level for the Escalation Action through the `escalation_service_level` block in the manifest. The block specifies the maximum response time per urgency level, the channels through which response is committed, the working hours during which the Service Level applies, and the fallback channel during outside hours. The Provider MUST report performance against the Service Level monthly through a published metric and MUST anchor the report to the Reconciliation Log per RFC 0013 section 3.10.

### 4.4 Identifiability of the Human Operator

The response to an invocation of the Escalation Action MUST be attributable to a specific Human Operator by name and role. Pseudonymous responses are permitted only where the operator's safety would be threatened by full identification, in which case the Provider MUST disclose the use of pseudonyms and MUST maintain an internal record linking the pseudonym to the actual operator for audit purposes.

### 4.5 Continuity

If the Human Operator handling a case becomes unavailable before resolution, the Provider MUST transfer the case to another Human Operator with full context and MUST notify the User of the transfer. The case_id MUST persist across transfers and the audit trail MUST capture every operator who has interacted with the case.

## 5. Forbidden Practices

A Provider MUST NOT route invocations of the Escalation Action through additional Agents or chatbots in a way that delays or substitutes for the access to a Human Operator that the Action promises. A Provider MAY use Agent assistance to triage urgency or to gather initial context, but the User MUST always retain the option to bypass that triage with a direct request, and the Service Level deadline MUST measure from the original invocation, not from the moment the triage releases the case.

A Provider MUST NOT make the Escalation Action conditional on agreement to additional terms not previously consented to as part of the underlying Provider relationship.

A Provider MUST NOT punish, deprioritize, or otherwise disadvantage a User who has invoked the Escalation Action, in any subsequent interaction.

A Provider MUST NOT offer financial inducement to a User to withdraw an Escalation invocation in exchange for accepting an automated outcome the User had previously declined.

## 6. Schema Integration

### 6.1 Manifest Extension

The Tool Manifest schema gains a `consequential_provider` boolean field and an optional `escalation_service_level` block. When `consequential_provider` is true, the manifest MUST declare an Action with identifier `escalate_to_human` and MUST populate the `escalation_service_level` block.

### 6.2 Action Schema

No structural change to the Action schema is required. The Escalation Action is a normal Action that MUST follow the canonical input and output shape described in section 4.1.

### 6.3 Receipt Schema

The Receipt type enum gains a new value `escalation_response` to mark Receipts that record interactions of a Human Operator with a User in the context of an open escalation case. The Receipt schema gains an optional `escalation` block recording the case_id, the operator_identifier, the channel used, the duration, and a hash of the conversation transcript where the User has consented to its retention.

## 7. Conformance

A Provider claiming conformance to this RFC MUST correctly self assess as a Consequential Provider, MUST expose the Escalation Action with the prescribed input and output shape, MUST publish a Service Level and report performance against it, MUST identify Human Operators in responses, MUST avoid the practices forbidden in section 5, and MUST emit `escalation_response` Receipts. An Agent Host claiming conformance MUST present the Escalation Action prominently to the User whenever the User expresses dissatisfaction with an automated outcome and MUST NOT obscure or deprioritize it in user interface presentations.

## 8. Security Considerations

The Escalation Action creates a denial of service surface in which an attacker could flood Providers with frivolous escalations. Providers MAY apply per User rate limits for the Escalation Action, MUST publish those limits in the manifest, and MUST set them at levels that do not in practice block legitimate use. Providers SHOULD use the Reputation system of RFC 0009 and the Sybil resistance signals of RFC 0011 to apply heavier rate limits to actors with poor standing.

A second consideration is that Human Operators handling Escalation cases may themselves be impersonated. The Receipt for an Escalation interaction MUST be signed by both the Provider and the Operator, and the Operator's identity SHOULD be backed by a Verifiable Credential issued by the Provider.

## 9. References

- Open Agent Protocol Core 1.0
- RFC 0009 Reputation and Performance Records
- RFC 0011 Sybil Resistance and Sub Agent Anti Abuse
- RFC 0013 Commerce Models for the Agent Economy
- RFC 0016 User Sovereignty Charter
- RFC 0017 Irreversibility and Cooling Off Periods
- RFC 0028 Model Risk and Symbiotic Autonomy, which extends the human path of this RFC with the proactive Symbiotic Escalation mechanism of section 3.5 (Rosenthal, Biswas, and Veloso 2010): the Agent recognizes the boundary of its own competence and escalates before acting, rather than after failure or User complaint. The reactive escalation of the present RFC and the proactive escalation of RFC 0028 are complementary; both deliver to the same Human Path interface.
- Jennings, N. R., Moreau, L., Nicholson, D., Ramchurn, S., Roberts, S., Rodden, T., and Rogers, A. (2014). Human-Agent Collectives. *Communications of the ACM* 57(12).
- Ramchurn, S. D., Wu, F., Jiang, W., Fischer, J. E., Reece, S., Roberts, S., Rodden, T., Greenhalgh, C., and Jennings, N. R. (2016). Human-Agent Collaboration for Disaster Response. *Autonomous Agents and Multi-Agent Systems* 30(1).
- Walsh, T. et al. (2015). Autonomous Weapons: an Open Letter from AI and Robotics Researchers. Future of Life Institute.
- Walsh, T. et al. (2017). An Open Letter to the United Nations Convention on Certain Conventional Weapons. Future of Life Institute.
- Walsh, T. (2022). *Machines Behaving Badly: The Morality of AI*. La Trobe University Press. The book-length argument that meaningful human control is the operational doctrine through which the moral acceptability of autonomous systems is preserved.
- Future of Life Institute (2017). Asilomar AI Principles. Principle 18 (AI Arms Race): "An arms race in lethal autonomous weapons should be avoided."
- United Nations Convention on Certain Conventional Weapons, Article 36, on the legal review of new weapons, means and methods of warfare.

## 10. Acknowledgments

This RFC operationalizes Guarantee Four of the User Sovereignty Charter by defining the precise mechanism through which the right to reach a human being is preserved in an ecosystem that is otherwise increasingly mediated by autonomous Agents, and by ensuring that the right is concrete, measurable, and enforceable rather than aspirational.
