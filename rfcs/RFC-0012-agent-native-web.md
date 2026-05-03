# RFC 0012: The Agent Native Web

**Status:** Draft
**Author(s):** OAP Working Group on Web Integration
**Created:** 2026-05-03
**Working Group:** Web Integration
**Targets:** 1.2

## 1. Summary

This RFC defines a normative layer that allows the existing World Wide Web to expose its
content, services, and commerce in a form that is directly consumable by autonomous agents,
agent organizations, and federated agent swarms operating under the Open Agent Protocol.

The current web was designed for human perception. Its canonical surfaces are HTML documents,
pixel rendered images, and time based video streams. Discovery is mediated by centralized
search engines that rank documents according to signals optimized for human attention.
Identity is anchored in cookies and password backed accounts. Payment is initiated by manual
user interface actions. None of these substrates scale to a population of agents that operates
at machine timescales, in parallel, across delegation trees, and under cryptographic
accountability.

The Agent Native Web does not replace the existing web. It defines a parallel canonical
representation, served from well known locations on the same origins, that allows any web
property to publish a machine first surface alongside its human first surface. A conforming
origin advertises its capabilities, schemas, pricing, reputation, and policy commitments in
documents that an agent can fetch, validate, and act on without scraping, without
hallucinating, and without relying on optical character recognition of rendered pages.

## 2. Motivation

Three problems make the present web hostile to agents. First, the structural information that
agents need is hidden inside presentation. A restaurant publishes its menu as a styled
HTML fragment with custom class names, a price column rendered in a divergent currency format,
and a reservation button that opens a third party widget. An agent that wants to compare
twenty restaurants must scrape twenty distinct presentations, each fragile to redesign.
Second, the discovery layer is centralized and optimized for advertising revenue. A query
returns ten ranked links intended for a human reader to click sequentially. An agent does not
need ranked links. It needs a list of capabilities, each with a quote, a service level
objective, a reputation record, and a callable endpoint. Third, the trust layer is implicit.
A human user trusts a brand by recognition. An agent has no recognition. It requires
cryptographic evidence of identity, capability, and accountability that can be verified
without out of band knowledge.

The Agent Native Web addresses these three problems by defining a small number of well known
documents that any web origin MAY publish, and by defining the semantics those documents MUST
carry when published.

## 3. Specification

### 3.1 Terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED,
NOT RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in
RFC 2119 and RFC 8174.

In this RFC the following terms are used.

An **Origin** is the tuple of scheme, host, and port as defined in RFC 6454.

A **Surface** is a published document at a well known location on an Origin that exposes
machine readable information about the Origin.

A **Capability Manifest** is the primary Surface of an Origin. It enumerates the actions,
data classes, and policies that the Origin makes available to agents.

A **Knowledge Node** is a typed, addressable record published by an Origin. Examples include
products, services, locations, articles, events, persons, and organizations. Each Knowledge
Node carries a stable identifier, a type drawn from a published vocabulary, and signed
provenance.

A **Modality Asset** is a binary resource such as an image, audio file, or video stream that
carries an associated Asset Descriptor describing its content, provenance, and license in a
form an agent can read without invoking a vision or audio model.

### 3.2 Well Known Locations

A conforming Origin MUST serve the following resources over HTTPS at the listed paths under
its `/.well-known/` namespace, as defined in RFC 8615.

| Path | Media Type | Purpose |
|------|------------|---------|
| `/.well-known/oap/manifest.json` | `application/oap-manifest+json` | Capability Manifest of the Origin |
| `/.well-known/oap/discovery.json` | `application/oap-discovery+json` | Index of Knowledge Nodes and sub Surfaces |
| `/.well-known/oap/policy.json` | `application/oap-policy+json` | Machine readable policy commitments and rate limits |
| `/.well-known/oap/reputation.json` | `application/oap-reputation+json` | Self issued and externally signed Reputation Records |
| `/.well-known/oap/wallet.json` | `application/oap-wallet+json` | Accepted payment instruments and pricing endpoints |
| `/.well-known/oap/agents.txt` | `text/plain` | Permission directives for agent traffic, analogous to `robots.txt` |

An Origin that does not serve `/.well-known/oap/manifest.json` is not a conforming Origin
under this RFC, regardless of any other content it publishes. An Origin that serves the
manifest but no other Surface is conforming at the minimum level defined in Section 6.

### 3.3 Capability Manifest

The Capability Manifest is the entry point for any agent that interacts with an Origin. It
MUST validate against the manifest schema defined in OAP Core 1.0, with the additional
requirement that the `origin` field MUST equal the Origin from which the document was
served. The manifest MUST list every callable action under the `actions` array, every
queryable data class under the `data_classes` array, and every supported negotiation channel
under the `negotiation` array. Each entry MUST reference the schema that governs its request
and response payloads, the conformance level under which it is offered, and the policy block
that governs its invocation.

An Origin MAY publish multiple manifests under versioned paths such as
`/.well-known/oap/manifest/v2.json` for forward compatibility. When multiple manifests are
present, the unversioned path MUST resolve to the manifest the Origin currently recommends
for new agent integrations.

### 3.4 Knowledge Nodes

A Knowledge Node is the canonical representation of a unit of information that an Origin
publishes. Examples include a product offered for sale, a physical location, an article, a
person, an event, or an organization. The Origin MUST serve each Knowledge Node as a JSON
document at a stable URL, MUST include a `@type` drawn from a published vocabulary such as
schema.org or an OAP entity vocabulary, MUST include an `id` that is a fully qualified URI,
and MUST include a `proof` block that signs the canonical serialization of the document under
a key listed in the Origin's manifest.

A Knowledge Node MAY include a `presentation` field that points to a human readable URL where
the same information is rendered for a browser. Where both a Knowledge Node and a human page
exist, the Knowledge Node is the canonical representation. Any disagreement between the two
SHALL be resolved in favor of the Knowledge Node, and Origins that serve both representations
MUST keep them consistent within the freshness window declared in their manifest.

### 3.5 Modality Assets

Every image, audio file, or video stream that an Origin publishes within its agent surface
MUST be accompanied by an Asset Descriptor served at a sibling URL with the suffix
`.descriptor.json`. The descriptor MUST include the asset's content type, byte length,
cryptographic digest, semantic annotations describing the depicted or contained subject
matter, provenance information following the C2PA Content Credentials specification where
available, and a license block describing how the asset may be used by agents and whether
its use incurs a charge.

An agent that retrieves a Modality Asset without first retrieving and validating its
descriptor SHOULD treat the asset as untrusted and SHOULD NOT incorporate its contents into
downstream decisions.

### 3.6 Discovery and Federation

An Origin MAY publish a Discovery document that lists its Knowledge Nodes and references the
manifests of other Origins it federates with. Federation under this RFC is voluntary,
transitive, and audited. An Origin that lists another Origin in its Discovery document
asserts only that the listed Origin's manifest existed at the time of listing and validated
against the canonical schema. It does not assert any reputation, trust, or commercial
relationship beyond what is explicitly captured in the federation entry.

Decentralized agent registries MAY index the Discovery documents of multiple Origins. A
registry that does so MUST sign each indexed entry with its own key and MUST publish the
methodology by which it selects, ranks, or filters entries. Agents that consume registry data
MUST treat registry rankings as advisory and MUST verify each underlying manifest
independently before invoking any action.

### 3.7 Identity and Authentication

An agent that interacts with an Origin under this RFC MUST authenticate using a Decentralized
Identifier as defined in W3C DID Core, accompanied by a proof of control over the
corresponding key material. The Origin MUST verify the proof and MUST evaluate any
delegation chain presented by the agent against the rules in RFC 0004. Sub Agent
authentication MUST be aggregated to the Sub Tree root for the purposes of rate limiting,
quota enforcement, and reputation accounting in accordance with RFC 0011.

The Origin's own identity MUST be expressed as a DID resolvable from the manifest's
`identity` field. Where the Origin operates under a legal entity, the manifest SHOULD include
a Verifiable Credential issued by a recognized authority that binds the DID to the legal
entity. Origins that omit such a credential are advertising themselves as pseudonymous and
SHOULD be treated accordingly by client policy.

### 3.8 Payment

An Origin that charges for any action MUST express prices in machine readable form within
the manifest, MUST accept at least one payment instrument enumerated in its
`/.well-known/oap/wallet.json`, and MUST issue a Receipt as defined in OAP Core 1.0 for every
completed paid invocation. Inline pricing MUST take the form of either a fixed amount per
invocation, a tiered schedule, a streaming rate denominated per unit of consumption, or a
quote endpoint that returns a signed offer.

User interface flows such as redirected checkout pages MAY remain available for human use,
but they MUST NOT be the only path to payment for any action listed in the manifest.

### 3.9 Replacement of Robots Directives

The `agents.txt` document defined in Section 3.2 supersedes the legacy `robots.txt` mechanism
for the purpose of regulating agent traffic. Its directives are addressed to autonomous
agents identified by their DIDs and to the registries that federate them. An Origin MAY
specify allow lists, deny lists, rate ceilings, schedule windows, and required conformance
levels per agent identity or per identity prefix. Directives SHALL be evaluated in the order
listed, with the first matching directive taking effect. A `default` directive at the end of
the document determines the treatment of agents that match none of the prior rules.

### 3.10 Compatibility With the Document Web

An Origin that publishes Agent Native Web Surfaces MAY continue to publish ordinary HTML
pages, sitemaps, structured data fragments embedded in HTML, and any other artefact intended
for the document web. Where such artefacts overlap in subject matter with a Knowledge Node,
the Knowledge Node is canonical and the HTML fragment is a derived projection. Where they
disagree, the Knowledge Node takes precedence and the Origin SHOULD reconcile the
discrepancy at the next publication cycle.

Search engines and other indexers MAY consume Agent Native Web Surfaces in addition to or
instead of the document web representations of the same Origin. Doing so does not constitute
acceptance of any commercial obligation beyond what is published in the Origin's manifest.

## 4. Security Considerations

The Agent Native Web exposes structured information about an Origin in a form that is easier
to enumerate than scattered HTML pages. Origins SHOULD treat their manifests as sensitive
operational documents and SHOULD apply the same change control to them as they apply to
production code. In particular, a manifest that lists an action without any policy block
SHALL be interpreted as offering that action without any restriction, which is almost never
the intended outcome.

The Modality Asset Descriptor mechanism creates a binding between a binary asset and a set
of semantic claims about it. Origins that publish dishonest descriptors are subject to the
incident reporting and reputation slashing procedures defined in RFC 0009. Agents that detect
a discrepancy between a descriptor and the asset it describes SHOULD file an Incident Record
naming both the asset URL and the descriptor URL.

The federation model in Section 3.6 is intentionally weak. Listing another Origin in a
Discovery document is not an endorsement. Stronger trust relationships MUST be expressed
through explicit Verifiable Credentials or signed Reputation Records and SHALL NOT be
inferred from the existence of a federation entry alone.

## 5. Privacy Considerations

Origins that publish Knowledge Nodes about persons MUST comply with the projection rules
defined in RFC 0007. A Knowledge Node about a person MUST NOT expose any field that the
person has not authorized for the requesting agent's scope, even if that field would be
visible in the Origin's human user interface. The reconciliation between the human surface
and the agent surface in such cases MUST favor the more restrictive disclosure.

Agent identifiers and delegation chains presented to an Origin are themselves personally
identifying when the root Principal of the chain is a natural person. Origins MUST treat
these identifiers as personal data under applicable law, MUST log them only for the duration
required by their declared retention policy, and MUST honor deletion requests by issuing a
Deletion Receipt as defined in OAP Core 1.0.

## 6. Conformance

Conforming Origins are classified into three conformance levels under this RFC, in addition
to the broader Conformance Levels defined in OAP Core 1.0.

Level **W1 Manifest** requires only that the Origin serve a valid Capability Manifest at
`/.well-known/oap/manifest.json` and that all actions listed therein be invocable by an
authenticated agent.

Level **W2 Surfaces** additionally requires Discovery, Policy, Wallet, and Reputation
documents at the locations defined in Section 3.2, and at least one published Knowledge Node
per data class listed in the manifest.

Level **W3 Federated** additionally requires that the Origin participate in at least one
public registry, that all Modality Assets carry valid descriptors, and that the Origin's
identity be bound to a Verifiable Credential issued by a recognized authority. Origins at
this level are eligible for inclusion in conformance directories maintained by the OAP
Stewards.

## 7. References

This RFC depends normatively on RFC 2119, RFC 6454, RFC 8174, RFC 8615, W3C DID Core,
W3C Verifiable Credentials Data Model 2.0, the C2PA Content Credentials specification,
OAP Core 1.0, RFC 0004, RFC 0007, RFC 0009, and RFC 0011.

## 8. Open Questions

The following questions remain open and are tracked as discussion items in the Working Group.

The first question is whether the Knowledge Node vocabulary should be a single canonical
graph maintained by the OAP Stewards, a federation of independent vocabularies, or a
direct adoption of schema.org with OAP specific extensions. The current draft permits all
three approaches.

The second question is whether the `agents.txt` directive language should be expressed in a
format compatible with existing `robots.txt` parsers for ease of migration, or whether a
clean break to a structured JSON format is preferable. The current draft selects a structured
format, but a transitional plain text profile is under consideration.

The third question is the appropriate caching and freshness model for Knowledge Nodes that
describe rapidly changing data such as inventory and pricing. The current draft defers this
to the Origin's manifest declaration, but a normative minimum freshness contract for certain
data classes may be warranted.
