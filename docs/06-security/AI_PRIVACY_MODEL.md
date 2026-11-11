# AI Privacy Model

## Principles

AVE is purpose-limited, consent-driven, inspectable, and deletable. The target
uses cloud models and permits cloud rendering under [ADR-0059](../decisions/ADR-0059-cloud-editing-direction.md). Local deployment is deferred.
Processing location does not relax permission, rights, retention or deletion requirements.

## Data classes

| Data | Default | External use gate |
| --- | --- | --- |
| original media and audio | remain local | explicit provider, purpose, selection, retention, and rights approval |
| proxy/derived media | project-local and content-linked | same as original; smaller size does not remove sensitivity |
| transcript/observations/evidence | project scope | disclose content, recipient, and retention |
| prompts/creative intent | minimum necessary retention | warn that intent may contain personal or confidential data |
| creator preferences/memory | new profiles default to current-work feedback learning for 30 days, via the exact creation-authorized provider; users can opt out | source, data-type, provider and retention bounds; profile use in a creation remains explicit; history/manual edits/selections/shared use require separate authorization |
| telemetry/outcomes | off or minimal by policy | explicit categories, purpose, aggregation, and opt-out |

## Upload and processing

Before external processing, show which data leaves the device, why, the
provider/model, region when known, retention/training policy, estimated scope,
and available reduced-data or cancel options. Do not promise an unavailable local alternative. Consent is bound to purpose and version
and can be revoked for future processing.

## Learning permission

Project use, cross-project personalization, product analytics, and shared model
training are four separate permissions. Acceptance, modification, publication,
or silence does not imply any of them. The creation confirmation exposes a
separate feedback-learning checkbox, on by default for new profiles. When
selected, only later, explicitly submitted feedback for that work may be sent
through the same already-authorized creation provider to produce a local
profile hypothesis retained for 30 days. It does not authorize raw media,
history scanning, manual-diff/selection learning, analytics, or shared model
training. Users can disable learning in the profile controls; existing saved
disabled/narrower consent is not widened.

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

Missing feedback authorization, uncertain
rights, provider policy drift, expiry, revocation or deletion failure blocks
the learning action. A learning failure does not invalidate an already saved
creative result and must never be presented as a successful registration.

## Future implementation gate

Any cloud sync, shared catalog, cross-device Creator Model, remote generation,
new privacy store, or background telemetry requires a promoted Work Order,
threat/privacy review, deletion/revocation tests, and an ADR when ownership or
topology changes.
