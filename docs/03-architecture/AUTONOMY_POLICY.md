# Autonomy Policy

## Principle

Autonomy is granted by action risk, reversibility, evidence, and policy—not by
model confidence alone. Authority remains with the user and Project Host.

## Action levels

| Level | Examples | Default handling |
| --- | --- | --- |
| A0 Observe | probe, analyze, summarize, compare | automatic within privacy scope; label uncertainty |
| A1 Propose | Direction Card, Story candidate, local patch, Preview option | automatic proposal; no authoritative mutation |
| A2 Reversible project action | create candidate artifact, apply approved low-risk edit policy | Host validation, exact scope, version, undo, audit |
| A3 Consequential action | sensitive representation, identity change, destructive edit, rights exception, Master approval | explicit human confirmation bound to exact version |
| A4 External/irreversible | upload outside policy, publish, purchase, delete retained data, security change | explicit purpose-specific authority; often separate workflow |

## Low-risk automatic execution

An A2 action is eligible only when the user has approved the policy and scope,
all inputs and capabilities are current, the change is bounded and reversible,
failure is atomic, and a clear review/undo path exists. Otherwise it degrades to
A1 proposal.

## Mandatory human gates

Human approval is required for creator identity, factual disputes, protected or
sensitive subjects, broad/regenerative changes, rights/license exceptions,
accepting a subjective final cut, and publication.

## Revocation and audit

Consent is scoped, versioned, expiring when appropriate, and revocable. A past
approval is not indefinite future consent. Every autonomous action records
actor, policy, inputs, decision, result, and rollback identity.
