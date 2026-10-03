# Contracts

`contracts/schemas/` 是跨语言协议唯一来源。`tools/contract-codegen/generate.mjs` 生成 TypeScript interface、Python TypedDict 和 manifest；生成文件位于 `contracts/generated/`，不可手工修改。`contracts/examples/valid/<domain>/` 和 `contracts/examples/invalid/<domain>/` 按相同路径绑定 Schema，覆盖全部当前 Schema。

仓库开发期的单一当前版本规则见 [`CURRENT_VERSION_POLICY.md`](CURRENT_VERSION_POLICY.md)：非当前 AVE-owned identity 在写入或执行前失败，不迁移、不转换、不双读。

### Authored caption retention

`CreationPlanV1` / the current planning exchange accept an existing `manual_editorial` caption with its exact persisted author provenance. This can be an empty list when the author caption crosses picture boundaries; ordinary `editorial` / `verbatim` captions still require source evidence. For example, a retained two-second author caption has this shape (the IDs and start must match the current Host Timeline):

```json
{"caption_id":"existing-author-caption","shot_id":"existing-first-picture","offset":{"schema_version":1,"value":0,"timescale":30},"duration":{"schema_version":1,"value":60,"timescale":30},"text":"Public source study","kind":"manual_editorial","evidence_ids":[],"audio_anchor":null}
```

Schema validity does not authorize creating this object. Host requires the same existing caption ID, text, absolute time, duration, null anchor and exact `semantic_sidecar.evidence_refs`; it returns the persisted style and identity. An invented author caption or changed provenance is rejected. New planning guidance is versioned as `mixed-media-v4` (with per-selected-source color availability); earlier stored planning roots retain their original task and schema.
