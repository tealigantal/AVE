# ADR-0053 — Exact Skill observation identities

Date: 2026-11-08. Status: implementation and validation in progress.

## Context

A real planning response cited an observation prefix instead of one of its complete observation evidence IDs. Host correctly rejected it; the prefix did not identify a unique evidence object. The previous measurement response schema allowed arbitrary nonempty strings and the prompt did not explicitly identify the required suffix.

## Decision

New planning roots carry `skill_evidence_projection: observation-ids-v1`. Each Skill measurement response schema enumerates exactly the observation evidence IDs available in that root, and the instruction asks the model to copy a complete ID including any suffix. If no observations exist, the evidence ID array must be empty. The existing Host membership, permission, Skill and effect checks remain authoritative. Neither prefixes nor unknown IDs are expanded, selected, substituted or accepted.

The projection changes model input only for newly created roots. Historical roots and continuation of their persisted measurements reconstruct their original wire input unchanged. Invalid responses retain their failure and call audit; this change does not introduce automatic retry, additional physical calls, budget changes or permission expansion. A new versioned root is necessary to validate the new projection in a real workflow.

## Consequences and verification

The enum and instruction make valid identifiers explicit but cannot guarantee that a model obeys them or that it cites semantically relevant evidence. Controlled tests cover complete and partial IDs, empty evidence, historical projection, actual gateway input, and failure without a second send. Host integration, real-model compliance and current-build workflow acceptance require separate evidence.
