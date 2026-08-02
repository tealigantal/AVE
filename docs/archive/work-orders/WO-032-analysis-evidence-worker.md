<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-032：Analysis Evidence Worker 接入

## 用户结果

明确的 ASR/OCR/Scene 分析记录能够通过 Worker 结构化协议进入 Evidence Graph；缺失分析结果不会被伪造成成功。

## 范围

- 接受 `job.payload.analysis_type` 为 `asr`、`ocr` 或 `scene`。
- 只转发带 `asset_id`、有效 PTS 范围和非空内容/label 的显式记录。
- 对非法类型、空记录、缺少 Asset、非法范围返回失败诊断。
- 保持 Worker 不访问 SQLite，stdout 每行仍是结构化 JSON。

## 不做

本工作单不引入 ASR/OCR/Scene 模型 SDK，不从视频自行推断事实，不创建数据库写入路径。

## 验收

- `python apps/worker-host/tests/analysis_protocol_smoke.py`
- `npm run check`

## 进度

- 2026-07-30：建立工作单，准备实现显式分析记录边界。
