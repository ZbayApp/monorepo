# Security Policy

Quiet is an experimental, peer-to-peer, end-to-end encrypted, and serverless team chat application built on Tor & IPFS. While we aim to improve user autonomy and privacy beyond what centralized messengers can offer, **Quiet is not audited** and **should not be relied upon in high-risk scenarios requiring proven, thoroughly vetted security guarantees**.

## Supported Versions and Maintenance

Only the latest release of Quiet is officially supported with security fixes and updates. We do not maintain long-term support (LTS) branches. When security issues are discovered, we will provide timely patches and point releases for the most recent version.

| Version | Supported          |
|---------|--------------------|
| Latest  | ✔ Active support (timely patches & point releases) |
| Older   | ❌ No formal support|

## Threat Model and Metadata Exposure

We have published a [Threat Model](https://github.com/TryQuiet/quiet/wiki/Threat-Model) detailing our assumptions, adversaries, desired security invariants, and known weaknesses. Since Quiet is under active development, some security features (e.g., deletion, user removal, direct messages, private channels) are still evolving.

### iOS Push Notifications

If enabled, iOS push notifications rely on a centralized Apple service. While message content remains encrypted, push notifications may reveal timing metadata to Apple’s servers. This could potentially allow a sophisticated adversary to learn when a user is active or receiving messages.

- **Optional Notifications:** Users who prioritize privacy may opt out of push notifications. Disabling notifications prevents this timing metadata from being exposed, at the cost of not receiving immediate alerts for new messages.

We will provide more detailed descriptions of metadata exposure in updated threat model documentation.

## High-Risk Scenarios

Quiet has not been audited and may contain unknown vulnerabilities. **If you operate in a high-risk environment or face capable adversaries (e.g., investigative journalists working with sensitive sources, activists under surveillance), do not rely on Quiet for critical or highly sensitive communications.**

While we plan to improve security over time, the current state of Quiet does not meet the stringent requirements needed for scenarios where absolute confidentiality is paramount. Instead, consider using well-established, audited secure messaging tools.

## Reporting a Vulnerability

If you discover a security vulnerability in Quiet, please report it to us privately before public disclosure:

- Email: [h@quiet.chat](mailto:h@quiet.chat)  
  Subject: **"Security Vulnerability Report"**

**Include in Your Report:**
- A clear description of the vulnerability and its potential impact.
- Steps to reproduce (code snippets, screenshots, logs if applicable).
- Any suggested mitigation or remediation strategies.
- Your contact information for follow-up (PGP key welcome).

## Response Process

- **Acknowledgment:** Within 5 business days of receiving your report.
- **Initial Assessment:** We will provide an initial analysis within 2 weeks.
- **Fix & Disclosure:** Once a fix or mitigation is ready, we will release it promptly. We aim to coordinate public disclosure with you. Credit will be given in the release notes unless requested otherwise.

## Security Updates and Communication

We will note significant security fixes and improvements in our [CHANGELOG.md](./CHANGELOG.md). Periodically, we may also discuss security changes in GitHub Issues or Discussions. We strive for transparency and will communicate notable security events to the community as promptly as possible.

## Disclaimer

Quiet is experimental software. While we issue timely patches and continuously work to improve its security, we cannot guarantee that Quiet meets the needs of users who face serious, well-funded adversaries or operate in highly sensitive contexts. For those use cases, please rely on mature, audited tools.
