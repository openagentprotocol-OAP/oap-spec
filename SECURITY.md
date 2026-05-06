# Security Policy

## Reporting a vulnerability

Responsible disclosure is essential to the integrity of the Open Agent Protocol ecosystem. The Open Agent Protocol is a community driven specification with no foundation, association, or other legal entity behind it (see OAP-CORE-1.0 Section 32). Vulnerability reports are handled by the Maintainers of the affected repository.

If you discover a vulnerability in the specification, in the reference implementations, in the SDKs, in the OAP Registry, or in any open source service shipped from this organization, please report it through one of the following channels.

1. **GitHub Security Advisory (preferred).** Open a private advisory at `https://github.com/openagentprotocol-OAP/oap-spec/security/advisories/new` (or the equivalent URL for the affected repository under the `openagentprotocol-OAP` GitHub organization). This routes the report to the Maintainers of that repository and keeps the discussion confidential until a fix is published.
2. **GitHub Security Advisories.** Please use the "Report a vulnerability" feature on the GitHub repository's Security tab. The report is monitored by the Maintainers listed in `MAINTAINERS.md`.

Do not file a public Issue or Pull Request that describes an unpatched vulnerability.

## What to include

1. A description of the vulnerability and its impact.
2. Steps to reproduce, with the exact commit hash, schema version, or specification version affected.
3. Affected versions of the specification, the reference implementation, the SDK, or the Registry repository.
4. Any proof of concept code, screenshots, or logs.
5. Your preferred attribution, or your wish to remain anonymous.

## Process

1. Acknowledgment within seventy two hours by a Maintainer of the affected repository.
2. Initial triage and severity assessment within seven days.
3. A coordinated disclosure timeline is agreed with the reporter, typically within ninety days, shorter if the vulnerability is being actively exploited.
4. The fix is released through the canonical channels for the affected repository (a tagged release for code, an RFC errata or a Public Working Draft revision for the specification, an append only entry for the OAP Registry).
5. A public advisory is published in the affected repository's GitHub Security Advisories.
6. The reporter is credited in the advisory unless they have requested otherwise.

There is no central security team and no Board. Each repository's Maintainers are responsible for the security of that repository, and Maintainers are listed in `MAINTAINERS.md` of each repository.

## Out of scope

1. Vulnerabilities in third party Tools, Marketplaces, Wallets, or Verifiers operated by other parties. Report these directly to their operator. If the issue indicates that an operator is misrepresenting their Conformance Receipt, file a counter receipt or a revocation in the OAP Registry per RFC 0026.
2. Theoretical attacks without a practical proof of concept.
3. Attacks requiring physical access to a target device.
4. Vulnerabilities that exist only in a fork that has diverged from this organization.

## Coordinated disclosure for the OAP Registry

Vulnerabilities affecting the OAP Registry validation pipeline (the workflows in `.github/workflows/validate.yml` of `openagentprotocol-OAP/oap-registry`) are particularly sensitive because a bypass would allow a non conformant implementation to be merged into the canonical history. These reports are routed to the Registry Working Group Coordinator named in the Registry repository, with a parallel notice to the Security and Privacy Working Group Coordinator listed in `oap-spec/governance/WORKING-GROUPS.md`.

## Public security questions

Questions that do not concern an unpatched vulnerability (general threat model questions, hardening recommendations for implementers, comparisons between OAP and other protocols) belong in the public Security and Privacy Working Group Discussion category in `openagentprotocol-OAP/oap-spec/discussions`.
