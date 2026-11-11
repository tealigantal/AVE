# ADR-0051 — Bounded Skill feasibility remeasurement

Date: 2026-11-08. Status: implementation and validation in progress.

## Context

ADR-0035 restricts Skill-enabled planning to one measurement and one final call. A real mixed-media request selected windows providing 181 ticks for a 300-tick target and failed before the model could use the Host's capacity measurement. The user had not fixed the duration; the result proves that this particular selection was infeasible, not that all authorized material was insufficient.

## Decision

For new `effect-bindings-v3` Skill roots only, retain the first full-rule measurement. If it is infeasible, allow one further measurement, transmitting the complete selected Skill rules and the verified first measurement so the model can revise its own selection. Both measurements require their own valid Skill evaluations. The final call is allowed only for a feasible measurement and binds its source choices, timing, receipt, evaluations and effects to that exact measurement. The Host continues to verify every boundary; no source, duration, effect or final decision is silently repaired.

The existing maximum is two measurements and three physical calls. No automatic full production retry, provider fallback, permission expansion, or bypass of the cumulative request budget is authorized. Invalid output and a second infeasible measurement still fail with their cause preserved. Existing roots without this version reconstruct their historical projections and prior two-call limit unchanged.

## Consequences and verification

The extra call occurs only after an infeasible first measurement and may consume additional authorized budget. Regression coverage must exercise corrected and still-infeasible selections, full Skill evaluation and effect bindings, strict physical call limits, historical reconstruction and Host persistence. Actual media generation on the repaired Docker build remains separate evidence.
