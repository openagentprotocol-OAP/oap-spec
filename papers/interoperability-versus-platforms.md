# Interoperability Versus Platforms

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** OAP Web Integration Working Group and OAP Implementation and Conformance Working Group

## Abstract

The agent ecosystem of the past two years has produced three distinct integration approaches that all describe themselves as standards. Vendor specific function calling treats integration as a feature of a particular foundation model and produces tools that interoperate only within the bounds of the issuing vendor's platform. The Model Context Protocol treats integration as a transport contract between a client and a tool server and produces a useful but narrow surface that does not address discovery, identity, payment, accountability, or policy. The Agent to Agent Protocol treats integration as a message format between agents and produces a useful but partial answer that does not address the substrates on which agents would actually transact at scale. None of these approaches is sufficient on its own to mediate the trust relationships, the commercial relationships, and the regulatory relationships of an agent economy. The Open Agent Protocol is the response to this gap. It is not a competitor to function calling, the Model Context Protocol, or the Agent to Agent Protocol. It is the substrate beneath them, providing the discovery, identity, accountability, commercial, and policy primitives without which none of them can scale to a global ecosystem. This whitepaper sets out the comparison, explains why each contemporary approach occupies the position it does, and describes the migration paths by which existing deployments can adopt the Open Agent Protocol incrementally without disrupting the integrations they depend on.

## 1. The Three Approaches in Their Own Terms

The three contemporary approaches address overlapping but distinct problems, and an honest comparison must begin by setting out what each of them was designed to solve.

Vendor specific function calling was designed to extend the capability of a particular foundation model with externally hosted functions whose behaviour the model could invoke at inference time. The design has been highly successful within its scope. The set of available functions, the schemas they accept, the way the model decides which function to call, and the way the function's output is reincorporated into the conversation are all defined by the vendor in ways that are convenient for the vendor's runtime. The cost of the convenience is that the integration is captive to the vendor. A function written for one vendor's runtime cannot be invoked by another vendor's runtime without rewriting the integration to a different schema, a different transport, a different authentication model, and a different return contract.

The Model Context Protocol was designed to standardize the transport between a client application and a tool server so that any client conforming to the protocol could invoke any tool server conforming to the protocol. The design has been adopted broadly and has succeeded in addressing the transport level fragmentation that plagued the early agent ecosystem. The protocol does not, however, address the layers above the transport. It does not provide a discovery surface beyond the local configuration that mounts a server into a client. It does not provide an identity model beyond the credentials that the client passes through. It does not provide an accountability model that crosses the boundary between client and server. It does not provide a commercial model. It does not provide a policy model. These omissions are deliberate in the sense that the protocol was scoped to the transport, but they leave the question of how an agent ecosystem composes at scale unanswered.

The Agent to Agent Protocol was designed to standardize the messages that one agent sends to another so that agents from different vendors could communicate without bespoke integration. The design addresses the message format problem and produces a useful primitive for inter agent dialogue. It does not, however, address the question of how agents discover one another, how they verify each other's identity, how they record and settle the cost of the work they perform on each other's behalf, how they propagate accountability through chains of delegation, or how they reconcile the policies of the principals on whose behalf they act. Agent to Agent is an envelope. It is not the postal system.

The Open Agent Protocol takes the position that the envelope, the transport, and the function calling format are all useful contributions and that none of them, individually or together, constitutes the substrate that an agent economy requires. The substrate must include discovery from the open web through the well known endpoints of [RFC 0012](/rfcs/0012), identity grounded in decentralized identifiers, accountability anchored in transparency logs as described in [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy), a commercial layer with a portable wallet abstraction defined in [RFC 0014](/rfcs/0014), a policy stack that composes with the obligations of regulated principals as set out in [The Safety and Policy Stack](/papers/safety-and-policy-stack), and a coordination layer that supports multi agent sessions and sub agent delegation trees through [RFC 0001](/rfcs/0001) and [RFC 0004](/rfcs/0004). The Open Agent Protocol provides each of these primitives normatively, and the contemporary approaches compose with it as integration tactics within the substrate rather than as competing substrates.

## 2. The Layering Argument

The cleanest way to see the relationship between the Open Agent Protocol and the contemporary approaches is to recognize that they occupy different layers of an integration stack that is logically separable.

At the lowest layer is the transport that carries bytes between two endpoints. The Model Context Protocol occupies this layer. So does HTTP, on which most function calling is implemented. The Open Agent Protocol does not impose a single transport. It declares which transports are normatively supported, including JSON over HTTPS for synchronous request and response, server sent events for streaming, and JSON RPC over WebSocket for long lived bidirectional sessions. An implementation that wishes to expose its tools both through the Model Context Protocol transport and through the Open Agent Protocol transports may do so without conflict.

At the layer above the transport is the message format that the transport carries. The Agent to Agent Protocol occupies this layer for inter agent dialogue. The Open Agent Protocol's Action invocation, Subscription event, and Coordination message formats occupy the same layer for the broader space of interactions that the protocol covers. The two formats can coexist within the same agent. An implementation that receives messages in either format can respond in the appropriate format, and the bridges between the formats are mechanical in the cases where the semantic overlap is exact.

At the layer above the message format is the function calling abstraction that maps natural language intent to invocations of declared capabilities. Vendor specific function calling occupies this layer. The Open Agent Protocol's Action declaration in the Manifest occupies the same layer for the broader purpose of declaring capabilities that any conformant agent may discover and invoke. The two abstractions are not in conflict. A tool whose Manifest declares its actions can be invoked by any conformant agent, including agents whose foundation model uses vendor specific function calling internally to decide which Action to invoke. The function calling abstraction operates within the agent. The Manifest operates between agents.

At the layer above the function calling abstraction sit the substrate primitives that no contemporary approach provides. These are the layers that the Open Agent Protocol contributes to the stack. They are the discovery surface that lets agents find tools across the open web rather than within a particular vendor's catalog, defined in [RFC 0012](/rfcs/0012). They are the identity surface that lets agents authenticate one another without depending on a shared platform, grounded in the canonical entity schemas of [RFC 0005](/rfcs/0005). They are the accountability surface that produces verifiable evidence of every interaction, anchored in the Receipt chain that [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy) describes in detail. They are the commercial surface that lets agents transact with one another at machine speed, specified in [RFC 0013](/rfcs/0013) and [RFC 0014](/rfcs/0014). They are the policy surface that lets agents respect the obligations of their principals, layered through the four levels described in [The Safety and Policy Stack](/papers/safety-and-policy-stack). They are the coordination surface that lets agents collaborate in multi party sessions with explicit cost and outcome accounting, defined in [RFC 0001](/rfcs/0001) and [RFC 0004](/rfcs/0004).

The layering shows that the Open Agent Protocol does not require any deployment to abandon its existing integrations. It requires only that the deployment add the substrate primitives that the existing integrations do not provide.

## 3. Migration from Vendor Specific Function Calling

A deployment built on vendor specific function calling can adopt the Open Agent Protocol incrementally by publishing a Manifest that declares the same actions in the protocol's Action format. The translation is mechanical in most cases. The function name maps to the Action identifier. The parameter schema maps to the Action input schema. The return contract maps to the Action output schema. The transport maps to one of the protocol's normative transports. The Manifest is published at a well known location at the operator's origin, and any conformant agent can immediately discover and invoke the actions through the protocol's discovery surface.

The deployment retains the option to continue invoking the actions through the vendor specific function calling path for the agents that depend on it. The Manifest does not preclude the function calling path. It adds a parallel path that is not captive to any particular vendor. Over time the deployment may find that the parallel path attracts more invocation volume than the captive path, and the captive path may be retired when the volume justifies the simplification. The choice is the deployment's, and the protocol does not force it.

The deployment may also choose to adopt the protocol's commercial layer for actions that warrant pricing, the protocol's policy stack for actions that warrant access control, and the protocol's accountability layer for actions whose evidence requirements justify the receipt overhead. Each adoption is independent. A deployment may publish a Manifest without adopting the commercial layer, may adopt the commercial layer without adopting the policy stack, and may adopt the policy stack without adopting the accountability layer. The protocol's modularity permits the deployment to add primitives at the rate that its operational maturity supports.

## 4. Migration from the Model Context Protocol

A deployment built on the Model Context Protocol can adopt the Open Agent Protocol by exposing its existing tool server through a parallel Open Agent Protocol endpoint. The protocol's reference server in the canonical repository includes a bridge module that wraps a Model Context Protocol tool server and exposes its tools as Open Agent Protocol Actions. The bridge translates the protocol's discovery, invocation, and response messages into the Model Context Protocol equivalents at the boundary, which means that the underlying tool server requires no modification.

The deployment can therefore continue to support clients that speak only the Model Context Protocol while simultaneously becoming discoverable to clients that speak the Open Agent Protocol. The latter clients gain the substrate primitives that the Model Context Protocol does not provide, including discovery from the open web, decentralized identity, accountability through Receipts, commercial settlement through the Wallet abstraction, and policy enforcement through the four layer stack. The former clients are unaffected.

A deployment that wishes to take fuller advantage of the substrate may eventually choose to deprecate the Model Context Protocol endpoint in favor of the protocol's native transports. The choice is again the deployment's, and the protocol does not force it.

## 5. Migration from the Agent to Agent Protocol

A deployment built on the Agent to Agent Protocol can adopt the Open Agent Protocol by adding the protocol's Coordination Plane endpoints to its existing agent. The Coordination Plane provides the multi agent session abstraction, the sub agent delegation tree abstraction, and the cost attribution machinery that the Agent to Agent Protocol does not provide. The deployment can continue to send and receive Agent to Agent messages for the inter agent dialogue that the Agent to Agent Protocol covers, and it can use the Coordination Plane endpoints for the session, delegation, and accounting functions that the Agent to Agent Protocol does not.

The bridge between the two formats is provided by the protocol's reference implementation. Inbound Agent to Agent messages are converted to the corresponding Coordination Plane messages where the semantics align, and outbound Coordination Plane messages are converted to Agent to Agent messages for delivery to peers that speak only that protocol. The bridge preserves the Receipt chain by attaching Receipts to the Agent to Agent messages as a structured envelope extension that conformant peers may verify and that non conformant peers may ignore.

The deployment that completes the migration gains the substrate primitives that the Agent to Agent Protocol does not provide, including the verifiable accountability that the Receipt chain offers, the commercial settlement that the Wallet abstraction enables, and the discovery from the open web that the Manifest publishes. The deployment that does not complete the migration retains the option to do so at any time, because the bridge is bidirectional and the protocol's modularity permits incremental adoption.

## 6. The Question of Standards Body Endorsement

A frequent question about the Open Agent Protocol is whether it has been endorsed by a recognized standards body. The protocol's posture on this question is that endorsement by a standards body is neither necessary nor sufficient for the protocol's usefulness, and that the protocol's authority derives from its conformance test suite, its reference implementation, and its installed base of independently developed implementations rather than from the imprimatur of any particular institution.

The protocol's specification is published in a format that any standards body could in principle ratify, and the protocol's stewards are open to engaging with standards bodies whose processes are compatible with the protocol's design. The protocol's stewards are also clear that the protocol will not modify its design to satisfy the procedural preferences of any particular standards body, because the design is the result of a deliberate set of choices that the protocol's installed base depends on. The choice between standards body endorsement and design integrity is resolved in favor of design integrity, and the protocol's adoption is a matter for the parties who choose to adopt it rather than for any institution that might choose to bless it.

## 7. Conclusion

The Open Agent Protocol does not compete with vendor specific function calling, with the Model Context Protocol, or with the Agent to Agent Protocol. It composes with each of them at the layer at which each of them operates, and it provides the substrate primitives at the layers above and beneath that none of them provides. A deployment that has invested in any of the contemporary approaches can adopt the Open Agent Protocol incrementally without abandoning the existing investment, and the bridge implementations in the protocol's reference repository make the adoption mechanical in most cases. The choice between the captive integration model of the present and the open substrate of the protocol is therefore not a binary migration. It is a gradient that any deployment may traverse at the rate its operational maturity permits, and the protocol's design is intended to make every step of the gradient pay for itself.

## References

[OAP-CORE-1.0](/spec). The Open Agent Protocol Core Specification.

[RFC 0001](/rfcs/0001): Coordination Sessions. Defines the multi-agent session abstraction that the Coordination Plane endpoints implement.

[RFC 0004](/rfcs/0004): Sub Agent Delegation. Defines the delegation tree whose cost attribution machinery the Agent to Agent Protocol does not provide.

[RFC 0005](/rfcs/0005): Canonical Entity Schemas. Defines the Manifest format that the Open Agent Protocol uses for discovery.

[RFC 0012](/rfcs/0012): The Agent Native Web. Defines the well-known endpoints by which Manifests are published at any origin.

[RFC 0019](/rfcs/0019): Conformance Testing and Implementability. Defines the conformance posture that bridge implementations must satisfy.

Related whitepapers: [From the Document Web to the Agent Web](/papers/agent-web-whitepaper), [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy), [The Economics of the Agent Economy](/papers/economics-of-the-agent-economy), [Verifiable Conformance](/papers/verifiable-conformance).

Model Context Protocol Specification, Anthropic, 2024.

Agent to Agent Protocol, version 0.x, Linux Foundation Joint Development Foundation Project.
