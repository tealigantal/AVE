# Trend Intelligence System

The canonical `TrendSignal -> TrendPattern -> TrendPack` data model,
expiration and compatibility semantics are defined in
[Trend Knowledge Model](TREND_KNOWLEDGE_MODEL.md). This document retains the
advisory system boundary.

## Optional advisory architecture

```text
Trend Sources -> normalized signals -> pattern extraction -> Trend Pack
             -> compatibility check -> optional creative recommendation
```

Sources may include platform APIs, licensed datasets, creator-provided
references and manually curated observations. Adapters record source, fetched
time, region/platform, license, sampling bias and raw signal identity.

## Trend Pack

A Trend Pack contains pattern, observed window, audience/platform, confidence,
expiration, evidence, authenticity risk, compatible content types and known
counterexamples. It never changes a Creative Contract or automatically applies
an edit. The compatibility check must consider platform, audience, creator
identity, material availability and whether the suggestion would feel fake.

Expired, weak, incompatible or unlicensed signals are withheld or labeled as
uncertain. Private material is not uploaded for trend comparison by default.
