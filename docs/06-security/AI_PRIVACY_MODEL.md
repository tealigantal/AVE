# AI Privacy Model

## Principles

AVE is local-first, purpose-limited, consent-driven, inspectable, and
deletable. Local-first is a default architecture preference, not a claim that
every future capability is already offline.

## Data classes

| Data | Default | External use gate |
| --- | --- | --- |
| original media and audio | remain local | explicit provider, purpose, selection, retention, and rights approval |
| proxy/derived media | project-local and content-linked | same as original; smaller size does not remove sensitivity |
| transcript/observations/evidence | project scope | disclose content, recipient, and retention |
| prompts/creative intent | minimum necessary retention | warn that intent may contain personal or confidential data |
| creator preferences/memory | opt-in scoped reuse | separate consent for cross-project or shared use |
| telemetry/outcomes | off or minimal by policy | explicit categories, purpose, aggregation, and opt-out |

## Upload and processing

Before external processing, show which data leaves the device, why, the
provider/model, region when known, retention/training policy, estimated scope,
and a local or reduced-data alternative. Consent is bound to purpose and version
and can be revoked for future processing.

## Learning permission

Project use, cross-project personalization, product analytics, and shared model
training are four separate permissions. Acceptance, modification, publication,
or silence does not imply any of them. Private media and feedback are never
background training data by default.

## Retention and deletion

Users can inspect retained project artifacts and reusable profile/knowledge
records, delete future-retrieval state, and request removal of externally held
data when supported. Deletion reports what was removed, what immutable audit
minimum remains and why, external propagation status, and backup expiry.

## Security boundaries

Renderer sees only white-listed Project APIs. Project Host validates paths,
content identity, consent, rights, and provider scope. Worker receives minimum
task inputs and no SQLite write authority. Logs and portable Evidence exclude
secrets, private media, raw prompts when unnecessary, and local absolute paths.

Project-owned immutable Original snapshots have the same sensitivity,
retention and deletion policy as the creator's Original. They remain inside the
project, are excluded from Renderer media projection, logs and portable
Evidence, and do not create upload, learning or reuse permission. POSIX `0400`
or Windows read-only write-bit hardening reduces accidental mutation; it is not
an ACL sandbox and never substitutes for consent, rights or the project
directory's access policy. A non-cooperating process running as the same OS
user remains outside this local project-lock boundary, so Host revalidates full
identity and fails closed instead of claiming absolute tamper prevention.

## Failure behavior

Missing consent, unavailable local alternative, uncertain rights, provider
policy drift, or deletion failure blocks the external or learning action. It
must not silently downgrade privacy to complete a creative request.

## Future implementation gate

Any cloud sync, shared catalog, cross-device Creator Model, remote generation,
new privacy store, or background telemetry requires a promoted Work Order,
threat/privacy review, deletion/revocation tests, and an ADR when ownership or
topology changes.
