# RFC 0008: Workflow Composition

**Status:** Draft
**Author(s):** OAP Working Group on Marketplace and Discovery
**Created:** 2026-05-03
**Working Group:** Marketplace and Discovery
**Targets:** 1.1

## 1. Summary

This RFC introduces Workflows, a normative mechanism for declaring and discovering multi step compositions of Actions. A Workflow describes an ordered or branching sequence of Action invocations, the data dependencies between them, the policy decisions that gate each step, and the expected outcome. Workflows are first class objects in the Discovery Plane: an Agent searching by intent finds entire workflows rather than only individual Actions.

## 2. Motivation

Most useful agent operations are sequences of Actions, not single Action invocations. "Book a meeting with Alice" expands into find user, retrieve availability, propose time, await confirmation, create calendar event, send invitation. "Onboard a new employee" expands into create contact, assign equipment ticket, schedule orientation, grant accounts, send welcome email.

Today these compositions are reinvented inside every Agent and inside every Tool that exposes a "macro". The cost is duplication; the risk is inconsistency. A normative Workflow primitive lets Tools and Marketplaces publish vetted compositions that Agents can discover, inspect, and execute as a single semantic unit while preserving per step audit.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Workflow | A named, versioned, declarative composition of Action invocations. |
| Step | A single Action invocation within a Workflow. |
| Step Dependency | A reference from one Step to the output of an earlier Step. |
| Workflow Instance | A specific execution of a Workflow with concrete inputs. |
| Branch | A conditional Step that selects one of several next Steps based on intermediate results. |
| Compensating Step | A Step that reverses the effect of an earlier Step on failure. |

### 3.2 Workflow Definition Schema

```json
{
  "workflow_id": "oap.workflow.book_meeting.v1",
  "name": "Book a meeting with a counterparty",
  "version": "1.0.0",
  "publisher_did": "did:web:assistant-net.vercel.app",
  "intent": "schedule a meeting with a known person",
  "intent_keywords": ["book meeting", "schedule call", "set up a meeting"],
  "expected_duration_seconds": 120,
  "estimated_cost_eur": "0.020",
  "risk_class": "minimal",
  "inputs": {
    "counterparty_query": { "type": "string", "required": true },
    "time_window": { "type": "object", "required": true },
    "duration_minutes": { "type": "integer", "default": 30 }
  },
  "steps": [
    {
      "step_id": "find_user",
      "action": "oap.entity.contact.search",
      "tool": "did:web:assistant-net.vercel.app",
      "input": { "query": "${input.counterparty_query}" },
      "output": "match"
    },
    {
      "step_id": "check_availability",
      "action": "oap.entity.calendar_event.search",
      "tool": "${steps.find_user.match.preferred_tool}",
      "input": {
        "owner_did": "${steps.find_user.match.did}",
        "between": "${input.time_window}",
        "transparency": "busy"
      },
      "output": "free_slots"
    },
    {
      "step_id": "negotiate_slot",
      "action": "oap.negotiation.open",
      "tool": "${steps.find_user.match.preferred_tool}",
      "input": {
        "category": "scheduling",
        "proposals": "${steps.check_availability.free_slots}"
      },
      "output": "agreement",
      "compensating_step": "withdraw_proposal"
    },
    {
      "step_id": "create_event",
      "action": "oap.entity.calendar_event.create",
      "tool": "${input.preferred_tool}",
      "input": {
        "start": "${steps.negotiate_slot.agreement.terms.start}",
        "end": "${steps.negotiate_slot.agreement.terms.end}",
        "participant_dids": ["${input.principal_did}", "${steps.find_user.match.did}"]
      }
    }
  ]
}
```

### 3.3 Workflow Discovery

The Discovery Plane is extended with a Workflow query mode:

```http
POST /oap/discover
Content-Type: application/oap+json

{
  "intent": "schedule a meeting with Alice next week",
  "include": ["actions", "workflows"],
  "max_results": 10
}
```

The Discovery service returns Actions and Workflows ranked by intent match score. Workflows MUST disclose their estimated cost, duration, and required Tool count so the requesting Agent can choose between a single Action and a Workflow that achieves the same end.

### 3.4 Workflow Instance Receipts

Each Step produces an ordinary Receipt. The Workflow Instance also produces a single Workflow Receipt that lists all Step Receipt identifiers, the resolved variable bindings, and the final outcome:

```json
{
  "workflow_instance_id": "wfi_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "workflow_id": "oap.workflow.book_meeting.v1",
  "started_at": "2026-05-03T10:00:00Z",
  "completed_at": "2026-05-03T10:01:45Z",
  "step_receipts": ["rec_001", "rec_002", "rec_003", "rec_004"],
  "outcome": "completed",
  "total_cost_eur": "0.018",
  "outcome_data_hash": "sha256-..."
}
```

### 3.5 Failure and Compensation

A Step that fails MUST trigger Compensating Steps in reverse order for any prior Steps that declared one. Compensating Steps are themselves Actions and produce ordinary Receipts. The Workflow Receipt MUST record the failure, the compensation chain, and the final consistent state.

### 3.6 Manifest Declaration

A Tool that publishes Workflows MUST declare them in its Manifest:

```json
{
  "workflows": {
    "supported": true,
    "registry_url": "https://example.com/.well-known/oap-workflows.json",
    "workflows_published": [
      "oap.workflow.book_meeting.v1",
      "oap.workflow.onboard_contact.v1"
    ]
  }
}
```

The registry document at `oap-workflows.json` lists the full Workflow definitions.

### 3.7 Vetting and Publisher Reputation

Marketplaces MAY rank Workflows by publisher reputation, success rate, and historical cost variance. Marketplaces MUST disclose ranking factors per OAP-CORE-1.0 Section 14 transparency requirements.

## 4. Backward Compatibility

Tools that do not declare `workflows.supported = true` are unaffected. Agents that do not query Workflows continue to receive Action only Discovery results.

## 5. Security Considerations

1. **Workflow Hijacking.** A Workflow definition MUST be signed by its publisher. Agents MUST verify the signature before execution.
2. **Variable Injection.** Workflow input variables MUST be type checked against declared schemas at every Step boundary.
3. **Privilege Aggregation.** A Workflow that combines low risk Actions into a high risk outcome MUST inherit the maximum risk class of its Steps.

## 6. Privacy Considerations

Workflow Receipts disclose execution structure. Workflows that handle personal data MUST honor Receipt minimization rules from OAP-CORE-1.0 Section 19.

## 7. Conformance Impact

Workflow support is OPTIONAL at all Conformance Levels. The OAP community will operate a Workflow Registry as a OAP community Service.

## 8. Implementation Experience

AssistNet operates a Workflow Engine in production with named compositions for booking, onboarding, weekly review, and document publication. The schema defined in this RFC is a normative generalization of the AssistNet implementation.

## 9. Alternatives Considered

1. **DAGs in agent code only.** Rejected because it removes Marketplace discoverability and per Step audit.
2. **BPMN 2.0.** Rejected as too heavy for typical agent compositions; OAP Workflows are intentionally simpler.

## 10. References

1. OAP-CORE-1.0, Section 14 (Capabilities Discovery).
2. RFC 0001 (Coordination Sessions), RFC 0002 (Negotiation Protocol).

## Appendix A: Joint Intention Semantics for OAP Workflows

This appendix is normative for the joint-intention claims it makes and informative for the supporting commentary. It provides the formal semantics of cooperation that determines, for every Workflow whose Steps are executed by two or more Agents, what each participating Agent is committed to do, what each is entitled to expect of the others, and under what conditions the joint enterprise may be unilaterally dissolved. The treatment follows the joint intentions theory of Cohen and Levesque (1990, 1991), the SharedPlans framework of Grosz and Sidner (1990) and Grosz and Kraus (1996), the team-formation analysis of Tambe (1997) STEAM, and the textbook treatment of Wooldridge (2009, chapter 9) and Shoham and Leyton-Brown (2009, chapters 8-9). The epistemic substrate is supplied by Appendix A of RFC 0010.

### A.1 Workflows as Multi-Agent Plans

A Workflow $W = \langle S, D, \rho, \mu \rangle$ consists of:

- $S = \{s_1, \ldots, s_n\}$, the set of Steps,
- $D \subseteq S \times S$, the directed Step-Dependency relation (acyclic by section 3.2),
- $\rho: S \to \mathcal{A}$, the role assignment from Steps to Agent DIDs (drawn from the Step's `tool` field after variable resolution),
- $\mu: S \to S^{\le 1}$, the partial Compensating-Step map of section 3.5.

A **Workflow Instance** $I$ is an execution of $W$ with concrete inputs at a specific time, producing a sequence of Step Receipts. The set of Agents participating in $I$ is $\mathcal{A}_W = \mathrm{range}(\rho)$, the **team**.

### A.2 Individual and Joint Commitment

Following Cohen and Levesque (1990), an Agent $a$ has an **individual commitment** to bring about $\varphi$ when:

$$
\mathrm{ICom}(a, \varphi) \;\equiv\; \mathrm{Goal}(a, \varphi) \,\land\, \mathrm{Bel}(a, \neg \varphi) \,\land\, \mathrm{Until}\big(\varphi \,\lor\, \mathrm{Bel}(a, \Box \neg \varphi) \,\lor\, \mathrm{Bel}(a, \mathrm{Irrelevant}(\varphi)),\, \mathrm{Goal}(a, \varphi)\big)
$$

read as "$a$ persists in pursuing $\varphi$ until $\varphi$ holds, until $a$ believes $\varphi$ is unattainable, or until $a$ believes $\varphi$ is no longer relevant". $\mathrm{Bel}$ and $\mathrm{Goal}$ are the standard KD45 modal operators of Appendix A.2 of RFC 0010, and $\mathrm{Until}$ is the temporal operator of linear temporal logic.

A team $\mathcal{A}_W$ has a **joint commitment** to $\varphi$ (the Workflow outcome) when:

$$
\mathrm{JCom}(\mathcal{A}_W, \varphi) \;\equiv\; C^B_{\mathcal{A}_W}\big(\mathrm{ICom}(a, \varphi) \text{ for every } a \in \mathcal{A}_W\big) \,\land\, \mathrm{JPersist}(\mathcal{A}_W, \varphi),
$$

where $C^B_{\mathcal{A}_W}$ is common belief among the team (Appendix A.4 of RFC 0010), and $\mathrm{JPersist}$ is the joint-persistence requirement that no team member may unilaterally drop the goal until the team has common belief that one of the three exit conditions of $\mathrm{ICom}$ holds.

### A.3 The Workflow Receipt as Common-Belief Anchor

The Workflow Receipt of section 3.4 is the protocol mechanism by which $C^B_{\mathcal{A}_W}$ is mechanically established. The Receipt is a single document signed by the Workflow Engine, listing all Step Receipt identifiers and the resolved variable bindings. Each team member that observes the Workflow Receipt acquires belief that:

1. Every other team member's Step Receipts are present (verifiable by signature),
2. Every other team member's commitments under the Workflow definition were operationally executed (verifiable by Step Receipt outcome fields),
3. The Workflow definition itself was signed by its publisher (section 5.1).

Common belief follows by induction on the depth of the BFS over team members observing the Workflow Receipt, exactly as in the dynamic epistemic logic update of Appendix A.5 of RFC 0010.

### A.4 Theorem 1 (Soundness of Joint Commitment under OAP Workflows)

**Statement.** Let $W$ be a Workflow with team $\mathcal{A}_W$, signed by its publisher and accepted by every team member through the Manifest declaration of section 3.6. Let $\varphi_W$ be the post-condition of $W$ as defined by the `outcome_data_hash` field of the Workflow Receipt. If every team member has signed an individual Step Receipt for its assigned Steps, then at the moment the Workflow Receipt is issued:

$$
\mathrm{JCom}(\mathcal{A}_W, \varphi_W).
$$

**Proof.** Each team member's Step Receipt is evidence of $\mathrm{ICom}(a, \varphi_a)$, where $\varphi_a$ is the conjunction of $a$'s assigned Step post-conditions. By the dependency relation $D$, $\bigwedge_{a \in \mathcal{A}_W} \varphi_a \implies \varphi_W$ (the Steps compose to the Workflow outcome). The Workflow Receipt anchors common belief of $\bigwedge_{a \in \mathcal{A}_W} \mathrm{ICom}(a, \varphi_a)$ by Theorem 1 of RFC 0010 Appendix A applied iteratively over the team. Joint persistence is enforced operationally: a team member that withdraws before completion triggers the compensating-step chain of section 3.5, which the protocol treats as a publicly signed retraction. Hence no unilateral drop is silent. $\blacksquare$

### A.5 Theorem 2 (Compensating Steps Implement Joint-Persistence Exit)

**Statement.** Let $a \in \mathcal{A}_W$ believe $\Box \neg \varphi_a$ (the assigned post-condition is unattainable) at some intermediate Step. Then the Workflow Engine, on receiving $a$'s failure Receipt, MUST execute the Compensating Steps of all prior Steps in reverse dependency order.

**Proof.** Section 3.5 makes this normative. The compensating chain is exactly the joint-persistence exit condition of $\mathrm{JCom}$: it produces a publicly signed acknowledgement that the team has reached the second exit condition of $\mathrm{ICom}$, hence common belief that the goal is no longer pursued. Without this mechanism, $a$'s unilateral failure would leave the rest of the team in ungrounded commitment, which is the Cohen-Levesque (1991) failure mode known as "intention zombification". $\blacksquare$

**Corollary A.5.1 (Atomicity).** A Workflow that completes its Compensating chain restores the system to the pre-Workflow state on every Step that declared a Compensating Step. Workflows that omit Compensating Steps for non-idempotent Steps fail Soundness Theorem 1 on the joint-persistence clause and MUST be flagged by the Workflow Registry of section 3.6.

### A.6 SharedPlans, Recipes, and the Workflow Definition

The Workflow Definition of section 3.2 is a **recipe** in the sense of Grosz and Kraus (1996): a publicly known procedure that the team has accepted as the means to achieve the joint goal. Acceptance is recorded by:

1. The Manifest declaration of section 3.6 (each team member published `workflows.supported = true` and listed the Workflow ID in `workflows_published`).
2. The signature on each Step's input arguments at execution time (each team member ratifies the Step's parameters as part of its individual commitment).

Grosz and Kraus showed that recipe sharing is necessary but not sufficient for joint action; the additional ingredient is mutual belief in the recipe and in each team member's intent to execute its assigned role. The Workflow Receipt of section 3.4 supplies exactly this mutual belief by recording all Step Receipts in a single signed document that all team members can observe.

### A.7 Theorem 3 (STEAM-Style Reactive Replanning)

**Statement.** Let $W$ be a Workflow with a Branch Step (section 3.1) whose conditional output causes the team to re-evaluate the recipe. Then the OAP protocol attains the reactive-replanning property of Tambe (1997) STEAM: the team reaches common belief of the new recipe within a number of message rounds bounded by the depth of the dependency tree below the Branch.

**Proof sketch.** The Branch Step emits a Step Receipt that contains the selected branch. By section 3.5 the Workflow Engine routes subsequent execution along the selected branch only, and the Step Receipts that follow refer to that branch by identifier. Common belief of the new recipe is acquired in the same way as the original recipe acceptance: each team member observes the chain of Step Receipts containing the branch identifier and updates its accessibility relation accordingly (Appendix A.5 of RFC 0010). The bound on rounds follows from the BFS depth over the post-Branch dependency subtree. $\blacksquare$

### A.8 Joint Commitment Versus Mere Choreography

It is important to distinguish OAP Workflows from a mere choreography of independent calls. A choreography requires only that each Agent execute its assigned action when the predecessor signals readiness; it imposes no joint commitment to the outcome. An OAP Workflow, by contrast, imposes the persistence requirement of Cohen-Levesque: a team member that abandons mid-execution without invoking the compensating chain is operationally non-conformant and triggers the Performance Record slashing of RFC 0009 Appendix A. The distinction matters for the regulatory composition described in `papers/safety-and-policy-stack.md` section 6: Multi-Party Review-bearing Workflows MUST be implemented as joint commitments, not as choreographies, to satisfy the human-oversight obligations of the EU AI Act Article 14.

### A.9 Composition with the Policy Stack

Every Step in a Workflow is gated by the four-layer Policy Stack of `papers/safety-and-policy-stack.md`. Joint commitment composes with the Policy Stack as follows: a team member whose individual commitment is voided by a Policy Stack refusal at any Step transitions the entire team to the joint-persistence exit condition (Theorem 2). The Workflow Engine MUST execute the compensating chain in this case, exactly as for the unattainability exit. Common belief that "Agent $a$'s Policy Stack refused Step $s$" is anchored by the Decision Record attached to $a$'s failure Receipt under section 3 of the Safety and Policy Stack paper.

### A.10 Implications for Downstream RFCs

1. **RFC 0001 (Sessions).** Coordination Sessions are the substrate over which Workflow Step Receipts are exchanged. Idempotency of the session ensures that the joint-commitment Soundness Theorem 1 is not undermined by message replay.
2. **RFC 0002 (Negotiation).** The `negotiate_slot` Step in the worked example of section 3.2 instantiates a Negotiation under RFC 0002 as a Workflow Step. The SPE existence of RFC 0002 Appendix A Theorem 1 holds within the Step.
3. **RFC 0009 (Reputation).** A team member that abandons commitment without compensation is recorded in its Performance Record per RFC 0009 Appendix A; the manipulation-resistance analysis of that appendix bounds the influence of false abandonment claims.
4. **RFC 0019 (Conformance).** The conformance probe `behavior/workflow-joint-commitment.test.js` mechanically verifies Theorems 1 and 2 by executing a synthetic Workflow with a deliberately failing intermediate Step and asserting that the compensating chain runs.

### A.11 References to Prior Treatments

- Cohen, P. R., and Levesque, H. J. (1990). Intention is Choice with Commitment. *Artificial Intelligence* 42(2-3).
- Cohen, P. R., and Levesque, H. J. (1991). Teamwork. *Nous* 25(4).
- Grosz, B. J., and Sidner, C. L. (1990). Plans for Discourse. In P. R. Cohen, J. Morgan, and M. E. Pollack (eds.), *Intentions in Communication.* MIT Press.
- Grosz, B. J., and Kraus, S. (1996). Collaborative Plans for Complex Group Action. *Artificial Intelligence* 86(2).
- Tambe, M. (1997). Towards Flexible Teamwork. *Journal of Artificial Intelligence Research* 7.
- Wooldridge, M. (2009). *An Introduction to MultiAgent Systems,* 2nd ed. Wiley, chapter 9.
- Shoham, Y., and Leyton-Brown, K. (2009). *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations.* Cambridge University Press, chapters 8-9.
