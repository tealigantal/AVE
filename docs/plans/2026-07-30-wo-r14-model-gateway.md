# WO-R14 Model Gateway

## 目标

建立真实但可替换的模型调用边界，业务代码只依赖 Provider Interface，不直接依赖模型 SDK 或供应商协议。

## 必须实现

Provider Interface、Qwen Provider、DeepSeek Provider、Structured Output、Retry Policy、Budget Policy、Privacy Policy、Cache Key、Replay、Prompt Registry 和 Prompt Version。

## 每次调用记录

provider、model、model snapshot、prompt version、input hash、output hash、token usage，并保持调用结果可审计、可重放。

## 边界

本工作单只建立 Model Gateway 和结构化调用审计；业务 Feature、复杂 Agent 和生产部署留给后续工作单。

## 验证命令

R14 专用 Provider/Policy/Replay 测试、`npm run typecheck`、`npm run architecture` 和完整 `npm run check`。

## Outcome

2026-07-30 已完成。统一 Provider Interface、Qwen/DeepSeek OpenAI-compatible adapters、Structured Output、Retry/Budget/Privacy、cache/replay key、Prompt Registry/Version 和完整调用审计已实现；非法 JSON 记录 `MODEL_OUTPUT_INVALID` 且不进入业务状态。完整 `npm run check` 通过，架构扫描 165 个源码文件。
