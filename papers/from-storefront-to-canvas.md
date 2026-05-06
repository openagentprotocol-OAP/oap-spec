# From Storefront to Canvas

**A Whitepaper of the Open Agent Protocol**
**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** T. Fengler (Editor)
**Working Groups:** Web Integration WG and Core Protocol WG

## Abstract

The companion paper [From Storefront to Manifest](/papers/from-storefront-to-manifest) describes what happens to the commercial web when the buyer is an Agent. The storefront becomes the Manifest. The catalog becomes the Verifiable Index. The checkout becomes the Procurement Intent. Every layer reorganizes itself around machine readable structure. That paper deliberately set aside the question of what happens when the Principal who delegated to the Agent wants to see, hear, or interact with something. This paper takes up that question.

The contemporary user interface is a static artifact. A designer arranges pixels for a median visitor on a median device. The arrangement is compiled into HTML, CSS, and JavaScript, deployed as a bundle, and served identically to every visitor regardless of context. Personalization, where it exists, is a thin layer of conditional rendering on top of the static artifact. The interface does not know its user. It knows a session.

When the visitor's Agent mediates the interaction, every assumption of that model is structurally wrong. The Agent knows the Principal's preferences, capabilities, accessibility requirements, locale, expertise level, screen class, and policy constraints. The Agent retrieves structured data from Knowledge Nodes and Modality Assets defined in [RFC 0012](/rfcs/0012). The Agent evaluates the data against the Principal's standing constraints through the [Agent Query Language of RFC 0020](/rfcs/0020). The missing step is the step between the structured data the Agent has retrieved and the sensory experience the Principal receives. This paper calls that step the Canvas.

## 1. The Interface and What Replaces It

The contemporary interface is a hand authored presentation of data for a hypothetical average visitor. It is compiled once, deployed once, and consumed many times. The economics of this model depend on the assumption that a single presentation serves all visitors well enough that the cost of personalizing it exceeds the revenue gained from doing so.

When an Agent mediates the interaction, that assumption inverts. The Agent possesses the Principal's context in full. The cost of generating a personalized presentation from structured data is bounded by the cost of a template instantiation, not by the cost of a design team. The revenue gained from personalization is the difference between a presentation that matches the Principal's mental model and one that does not, which in a competitive Agent economy is the difference between a transaction and a departure. The economics of the contemporary model therefore collapse once the Agent buyer reaches a sufficient fraction of traffic.

The artifact that replaces the static interface is the Canvas. A Canvas is not a page. It is a presentation intent: a structured declaration of what the Agent wants to show the Principal, in what arrangement, under what constraints, and with what interactive capabilities. The Canvas is evaluated by a Renderer, which is the client application through which the Principal perceives the world. The Renderer may be a chat interface, a browser, an augmented reality headset, a voice assistant, a smartwatch, or a screen reader. The Canvas is agnostic to the Renderer. The Renderer is responsible for translating the Canvas into the sensory modality and interaction pattern appropriate to its platform.

## 2. The Presentation Intent

A Presentation Intent is a JSON document conforming to the `oap-presentation-intent.schema.json` schema. It is the Agent's declaration to the Renderer of what should be shown. A Presentation Intent contains four blocks.

The first block is the **layout**. The layout declares the structural arrangement the Agent requests. The layout is expressed as a named layout class drawn from a closed vocabulary: `single_item`, `comparison_grid`, `ranked_list`, `detail_view`, `gallery`, `map_view`, `timeline`, `conversation_card`, and `dashboard`. The layout class is a semantic declaration, not a pixel specification. The Renderer interprets the layout class according to its platform conventions. A `comparison_grid` on a desktop browser is a multi column table. A `comparison_grid` on a voice assistant is a sequential enumeration with comparative annotations. A `comparison_grid` on a smartwatch is a swipeable card stack. The layout class carries optional parameters such as the number of columns, the sort axis, and the grouping key.

The second block is the **items**. The items block is an array of references to Knowledge Nodes or inline data objects that the Renderer should present. Each item reference carries a stable URI, a type, and an optional projection that limits which fields of the Knowledge Node are included. The items block also references Modality Assets by URI and descriptor, so that the Renderer can present images, audio, and video alongside structured data.

The third block is the **personalization**. The personalization block declares the Principal's context as known to the Agent. It includes the locale, the accessibility profile (referencing WCAG conformance levels), the expertise level (consumer, professional, expert), the screen class (mobile, tablet, desktop, wearable, voice, immersive), and the sensory modality preferences (visual, auditory, haptic). The Renderer uses the personalization block to adapt the presentation. A Renderer that cannot satisfy a declared accessibility requirement MUST declare the limitation in its response.

The fourth block is the **interaction**. The interaction block declares what interactive capabilities the Agent requests the Renderer to expose. The capabilities are drawn from a closed vocabulary: `sort_by_field`, `filter_by_field`, `expand_detail`, `collapse_detail`, `add_to_shortlist`, `remove_from_shortlist`, `trigger_action`, `navigate_to`, `play_media`, `pause_media`, `seek_media`, `annotate`, and `compare_selected`. Each capability binds to a callback URI or an inline action that the Renderer invokes when the Principal exercises the capability. The callback URI is an OAP action endpoint governed by the same Policy Stack that governs every other action in the protocol.

## 3. The Renderer Contract

A Renderer is any client application that accepts Presentation Intents and produces a sensory experience for the Principal. The Renderer is not a dumb terminal. It is an active participant in the protocol with its own DID, its own Manifest, and its own conformance level.

A Renderer that claims conformance under this paper MUST satisfy three obligations. First, it MUST faithfully represent the items referenced in the Presentation Intent without injecting, suppressing, reordering, or altering items unless the Principal's standing policy explicitly permits such alterations. Second, it MUST honor the accessibility profile declared in the personalization block to the extent its platform supports. A Renderer that cannot satisfy a declared WCAG level MUST inform the Agent so that the Agent can select an alternative Renderer or degrade gracefully. Third, it MUST execute interaction callbacks only through the OAP action invocation path, which subjects every callback to the Policy Stack, produces a Decision Record, and anchors the invocation in the Receipt chain.

The Renderer contract ensures that the presentation layer is not an escape hatch from the accountability infrastructure. A Renderer that injects sponsored items into a Presentation Intent without declaring the injection in a Decision Record violates the Renderer contract in the same way that a Match Broker that suppresses candidates violates the Verifiable Index contract of [RFC 0021](/rfcs/0021).

## 4. The Relationship to MCP Apps

The Model Context Protocol's SEP-1865 extension, informally called MCP Apps, addresses a similar surface. MCP Apps allow Tools to return interactive UI as inline HTML, remote URIs, or Remote DOM structures that the host application renders in a sandboxed iframe. The approach is pragmatic and has seen rapid adoption in chat based interfaces.

OAP's Presentation Intent differs from MCP Apps in three structural ways. First, the Presentation Intent is semantic, not presentational. The Agent declares a `comparison_grid` with five items sorted by price, not an HTML table with five rows. The semantic declaration allows the Renderer to adapt the presentation to its platform without the Agent needing to know the platform. Second, the Presentation Intent is policy governed. Every interactive capability maps to an OAP action endpoint subject to the Policy Stack. MCP Apps execute interactions through JSON RPC messages that are loggable but not policy governed in the OAP sense. Third, the Presentation Intent carries an explicit personalization block with accessibility, locale, and expertise declarations that the Renderer is contractually obligated to honor. MCP Apps leave personalization to the host application.

The two approaches are not mutually exclusive. A Renderer that supports both MCP Apps and OAP Presentation Intents MAY accept Presentation Intents from OAP Agents and MAY accept MCP UI Resources from MCP Tools. The Renderer that does both operates at the intersection and can serve Principals whose Agents operate under either protocol. The Compatibility Profile of [RFC 0024](/rfcs/0024) defines how dual protocol support is declared in a Manifest.

## 5. Dynamic Interfaces and the End of Static Design

The contemporary design process produces a static artifact. A team of designers and engineers spends weeks or months constructing an interface that is then deployed to all visitors. The artifact is versioned through a release cycle. Changes require the team to repeat the cycle. The cost of a change is the cost of the team's time, which is large enough that most interfaces change slowly.

When the Renderer constructs the presentation from a Presentation Intent, the design process inverts. The Agent generates the Intent from the Principal's context and the data it has retrieved. The Renderer interprets the Intent according to its platform. Neither the Agent nor the Renderer is constrained by a static artifact. The presentation is generated on every interaction, from the current data, under the current context, for the current Principal. Two Principals who query the same Provider at the same moment receive different presentations, because their contexts differ, their accessibility profiles differ, their expertise levels differ, and their interaction histories differ.

The role of the designer in this model shifts from authoring artifacts to authoring rendering rules. The designer defines how a `comparison_grid` is rendered on a mobile screen at WCAG AA. The designer defines how a `gallery` is rendered on a voice assistant. The designer defines how a `detail_view` is rendered on an augmented reality headset. The designer authors a Renderer, not a page. The Renderer is a long lived artifact that interprets an open ended set of Presentation Intents. The design investment amortizes across every Intent the Renderer ever processes, not across the visitors to a single page.

## 6. Modality and the Multi Sensory Agent

The contemporary interface is overwhelmingly visual. The few exceptions, such as screen readers and voice assistants, are afterthoughts grafted onto a visual artifact. The structural assumption of the contemporary stack is that the visitor has a screen and a pointing device.

The Presentation Intent makes no such assumption. The personalization block declares the Principal's modality preferences and the Renderer's capabilities. An Agent whose Principal prefers auditory interaction generates a Presentation Intent with `modality_preferences: ["auditory", "haptic"]` and the Renderer produces a spoken summary with haptic confirmations. An Agent whose Principal uses an augmented reality headset generates a Presentation Intent with `screen_class: "immersive"` and the Renderer produces a spatial arrangement. The same structured data, the same Knowledge Nodes, the same Modality Assets, produces a different sensory experience in each case.

The Modality Asset Descriptor defined in [RFC 0012](/rfcs/0012) section 3.5 is the mechanism that enables this. Every image, audio file, and video stream carries a descriptor that includes semantic annotations, provenance, license, and a content digest. A Renderer that produces a voice interface reads the semantic annotations of an image and generates a spoken description. A Renderer that produces a visual interface displays the image directly. A Renderer that produces a haptic interface may use the semantic annotations to generate a tactile representation. The Modality Asset Descriptor is the bridge between the data layer and the multi sensory presentation layer.

## 7. Security and Privacy

A Presentation Intent may contain or reference personal data about the Principal. The personalization block declares the Principal's accessibility profile, expertise level, locale, and modality preferences, all of which are personally identifying. The Renderer MUST treat the personalization block as personal data under applicable law, MUST NOT log it beyond the duration required by its declared retention policy, and MUST honor deletion requests by issuing a Deletion Receipt as defined in OAP Core 1.0.

A Renderer that injects tracking mechanisms (cookies, fingerprinting scripts, pixel beacons) into the rendered presentation without declaring the tracking in its Manifest violates the Renderer contract. The conformance probe for Renderers includes a tracking detection test that scans the rendered output for known tracking patterns and reports any undeclared tracker as a conformance failure.

The interaction callbacks declared in a Presentation Intent are OAP action endpoints. The Policy Stack applies. The Principal's standing policy may prohibit certain interaction types, such as purchase confirmations above a threshold, and the Renderer MUST respect those prohibitions by disabling the corresponding interactive capabilities in the rendered presentation.

## 8. The Relationship to AQL

The Agent Query Language of [RFC 0020](/rfcs/0020) and the Presentation Intent are complementary surfaces of the same interaction. AQL expresses what the Agent wants to retrieve. The Presentation Intent expresses how the Agent wants to show the retrieval to the Principal. Both share the constraint tree syntax, the projection syntax, and the policy reference syntax. A Presentation Intent MAY reference an AQL Intent by URI in its `items_source` field, in which case the items are the candidates returned by the AQL resolution. The two documents together form a complete interaction: retrieval, selection, and presentation.

## 9. Cross References

| OAP Component | Role in the Presentation Layer |
|--------------|-------------------------------|
| [RFC 0006](/rfcs/0006) Persona and Scope | Determines which Principal context the Agent uses to generate the Presentation Intent |
| [RFC 0007](/rfcs/0007) Privacy Projections | Determines which fields of a Knowledge Node the Renderer may display |
| [RFC 0012](/rfcs/0012) Agent Native Web | Defines Knowledge Nodes and Modality Assets that the Presentation Intent references |
| [RFC 0016](/rfcs/0016) User Sovereignty Charter | Guarantees the Principal's right to control their presentation experience |
| [RFC 0020](/rfcs/0020) Agent Query Language | Provides the retrieval layer whose results the Presentation Intent renders |
| [RFC 0024](/rfcs/0024) Schema Negotiation | Governs version compatibility between Agent, Renderer, and Presentation Intent schema |
| [RFC 0028](/rfcs/0028) Decision Records | Provides `explanation_for_principal`, an existing presentation primitive |
| Policy Stack Layers 2 through 5 | Constrain presentation (regulatory accessibility mandates, organizational branding, personal preferences) |

## 10. References

* [OAP-CORE-1.0](/spec), the normative Open Agent Protocol Core Specification.
* [RFC 0006](/rfcs/0006), Persona and Scope Layer.
* [RFC 0007](/rfcs/0007), Privacy Preserving Projections.
* [RFC 0012](/rfcs/0012), The Agent Native Web.
* [RFC 0016](/rfcs/0016), User Sovereignty Charter.
* [RFC 0020](/rfcs/0020), Agent Query Language.
* [RFC 0021](/rfcs/0021), Verifiable Indexes and Match Broker Conformance.
* [RFC 0024](/rfcs/0024), Schema Negotiation and Versioning.
* [RFC 0028](/rfcs/0028), Model Risk and Symbiotic Autonomy.
* [From Storefront to Manifest](/papers/from-storefront-to-manifest), what the commercial web becomes when buyers are agents.
* [The Agent Web](/papers/agent-web-whitepaper), the Agent Native Web whitepaper.
* W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2. W3C Recommendation.
* Anthropic, OpenAI, et al. (2026). SEP-1865: MCP Apps. Model Context Protocol Specification Extensions.
* Vaithilingam, P., et al. (2024). DynaVis: Dynamically Synthesized UI Widgets for Visualization Editing. CHI 2024.
