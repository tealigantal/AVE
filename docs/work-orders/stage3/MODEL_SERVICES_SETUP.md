# Stage3 三路模型配置

本页是 `WP-S3-INTEGRATION-001` 的用户配置说明，归属工作单层；独立列出可复制配置，避免把操作步骤扩写进运行时权威。
架构依据 [ADR-0030](../../decisions/ADR-0030-stage3-split-model-services.md)。这条路径已经接入 Host；服务连通与真实素材的创作质量分别验证。

## 处理顺序

1. Host 校验获准素材，按实际画面变化提取带源时间的 PNG/WAV。
2. `vision` 只接收实际画面；`transcription` 接收 WAV，返回 Whisper 原话及分段时间。
3. `sound` 另接收原始 WAV，判断环境声、音乐、掌声等；不能用转录文本代替听音。
4. 按样本 ID 和精确源时间融合结果。`planner` 使用这些依据、当前要求及获准档案生成可编辑计划，仍经 Host 检查和提交。省略 `planner` 时复用 `vision` 的文本能力。

按样本顺序调用，不要求三路同时推理。API 模式不要求本机加载模型；本地模式仍取决于所选权重、量化、服务端内存管理和硬件，串行请求不等于自动卸载服务端权重。

## 填写配置

Main 启动时读取 Electron `app.getPath("userData")` 下的 `model-services.json`；不存在且没有显式旧单模型环境配置时，会创建 `enabled:false` 的模板。
也可以把下面 JSON 存到仓库外的任意位置，启动 AVE 前设置 `AVE_MODEL_CONFIG` 为该文件的绝对路径。文件名不要求固定；密钥只留在本机配置中。

```json
{
  "version": 1,
  "enabled": true,
  "vision": {
    "provider": "qwen",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen3-vl-plus",
    "api_key": "填写此接收端的密钥",
    "response_mode": "json",
    "structured_output": "validated_json"
  },
  "transcription": {
    "provider": "local-whisper",
    "base_url": "http://127.0.0.1:18080/v1",
    "model": "Systran/faster-whisper-small",
    "api_key": ""
  },
  "sound": {
    "provider": "qwen-audio",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen3-omni-flash",
    "api_key": "填写此接收端的密钥",
    "audio_input": "data-url",
    "response_mode": "sse",
    "structured_output": "validated_json",
    "text_output_only": true
  },
  "planner": {
    "provider": "qwen",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen3-max",
    "api_key": "填写此接收端的密钥",
    "response_mode": "json",
    "structured_output": "json_object"
  }
}
```

以上是云端 Qwen 与本地 Whisper 的混合配置示例，不证明账号已开通这些模型。若视觉和听音在同一百炼账号/地域，可在两处填同一有效密钥；本机回环地址上的 Whisper 不需要 API key，但须先安装权重并启动兼容服务。使用远程 Whisper 时才填写其地址、模型与密钥。密钥须匹配供应商控制台的地域及工作空间 `base_url`，必要时替换预填地址和精确模型 ID。保存后重启应用；工作台自动采用已配置服务，不用填写内部编排名称。更换模型/接收端后应新建请求，旧请求授权不会被静默改绑。

PowerShell 示例（只指定路径，不在命令历史里输入密钥）：

```powershell
$env:AVE_MODEL_CONFIG = 'C:\Users\your-name\.ave\model-services.json'
```

## 本地或混合运行

每路可独立替换：视觉用提供 OpenAI-compatible 图像接口的 Qwen 服务；转录用本地 Whisper 服务；环境声用实际支持原始音频理解的服务。也可以只把 Whisper 放本地，其余走 API。不会自动下载模型、启动服务或切换供应商。

例如已部署的 Speaches 转录服务可使用：

```json
"transcription": {
  "provider": "local-whisper",
  "base_url": "http://127.0.0.1:18080/v1",
  "model": "Systran/faster-whisper-small",
  "api_key": ""
}
```

协议要求：视觉/听音/规划为 `/chat/completions`；Whisper 为 `/audio/transcriptions`，支持 multipart WAV、`verbose_json`、`timestamp_granularities[]=segment`。转录必须有真实分段时间，不能仅返回一句文本。可选 `language` 指定转录语言。不认识的非语音不生成字幕。

听音请求支持 `audio_input:base64`（例如兼容的 vLLM 服务）或 `data-url`（本例百炼）；响应选 `json` 或 `sse`。`structured_output:validated_json` 表示请求不强加供应商 JSON-mode，但返回仍必须通过本地 JSON/领域校验。可另设同格式的 `planner`；它只接收文字依据，不接收原始 PNG/WAV。没有品牌级或所有模型兼容承诺。

回环地址可不填密钥；其他接收端要求显式认证。输入时长、文件大小、上下文及速率仍受部署本身限制；当前适配器不会截断输入冒充完整理解。失败保留原因和已发生调用，停止后续调用，不提交半份观察或隐藏切换模型。没有应用累计数据/费用上限；每次物理发送仍记录目标、请求字节摘要、实际用量，未报告费用保持未知。

协议参考：[百炼 Qwen-Omni](https://help.aliyun.com/en/model-studio/qwen-omni)、[百炼流式输出](https://help.aliyun.com/en/model-studio/stream)、[Speaches 转录](https://github.com/speaches-ai/speaches/blob/master/docs/usage/speech-to-text.md)。这些资料说明服务端协议，不替代 AVE 的真实调用及作品验收。

## 本机安装验证（2026-09-25）

本次已在仓库外安装 Speaches 与多语言 `Systran/faster-whisper-small`，服务地址为 `http://127.0.0.1:18080/v1`。本机使用 CUDA `int8_float16`；另外在独立 Python 环境验证了 CPU `int8` 的语音检测批量推理。约 5.6 秒的中英文测试语音均识别出正确原话，最终采用模式的分段时间均在音频范围内。这是本机的合成语音测试，不代表所有电脑的性能或真实素材的识别质量。

安装、Compose 配置和验证结果位于 `%LOCALAPPDATA%\AVE\whisper`。Compose 固定镜像摘要，模型放在独立 `ave-whisper-models` 数据卷中，Whisper 使用已校验的本地缓存离线加载。Docker 运行时可以使用以下命令管理这一服务：

```powershell
docker compose -f "$env:LOCALAPPDATA\AVE\whisper\compose.json" up -d
docker compose -f "$env:LOCALAPPDATA\AVE\whisper\compose.json" stop
```

本机当前 Electron userData 配置已填写并启用，应用下次启动读取。三路真实接口与源时间融合通过，但环境声模型在这次语音样本上返回了翻译，未完成声音特征描述；该项语义质量失败仍待修复，不能据此宣称首条真实创作闭环完成。安装过程、原失败及验证边界见 [EVD-20260925-S3-LOCAL-WHISPER](../../evidence/runs/EVD-20260925-S3-LOCAL-WHISPER.md)。

后续听音修复使用固定、带版本的系统任务和直接用户指令，只传原始 WAV，不传 Whisper 原话、画面描述或文件名语义。完整提示参与部署、缓存和授权身份；修改提示后旧授权不能继续发送，但历史观察仍可重开。当前 `description/uncertain` 校验只保证结构，不能识别所有语义幻觉。

同一提示、八项开发对照的真实比较中，`qwen3-omni-flash` 和 `qwen3.8-omni-flash` 均未通过：全零静音被描述为人声或点击声，纯音转静音的变化被遗漏。原始结果与 PCM 核对保留在 `%LOCALAPPDATA%\AVE\acoustic-repair-20260925`。未切换本机模型、未把输出清洗成通过、未开启留出验收；不能将接口可用当成听音质量可用。

## 词级对齐与音频末尾

转录请求同时要求 segment 和 word 时间戳，服务必须在每个非空 segment 中返回 words；缺少或非法对齐明确失败，不退回粗略时间。融合使用首尾词的对齐边界，原始片段和词时间保留在调用证明中。仅最后一段的结束时间允许限制到上传音频的准确末尾；整词在范围外、非末段越界及乱序仍拒绝。历史片段级证明仍可读取。部署身份随请求协议更新，旧授权必须重新确认。

本机 RTX 5070 Laptop 的现有容器在 int8_float16 词级对齐阶段报 cuBLAS NOT_SUPPORTED；已以相同权重测试 CUDA float32，获得真实词级返回。本机独立 Whisper Compose 配置改为 float32；模型权重及千问配置不变。此精度选择针对本机实测，不作为所有电脑的默认硬件要求。

Word alignment may contain start=end point anchors. Preserve their exact times and text without inventing a word duration; the composed transcript segment must still have positive duration. Negative durations and unordered alignment remain errors.

For the verified Qwen3-VL-Plus non-thinking planner deployment, select planner.structured_output=json_object to request server-side JSON mode. validated_json performs only client-side parsing and cannot guarantee that the model emits valid JSON. The real integration preserved a malformed-JSON failure before enabling this setting; schema/semantic validation remains required after JSON mode. See https://www.alibabacloud.com/help/tc/model-studio/qwen-structured-output . This is a deployment setting, not an implicit fallback or model switch.

2026-09-25 的后续真实联调明确将文字规划配置为 `qwen3-max`，不再复用视觉模型；三路素材分析不变。这是显式配置变更并使用新授权，不是错误时自动切换。首个实际初稿为 668/30 秒、三个不等长镜头，Preview/Master QC 与保存重开通过。模型文字总结的时长仍有误，实际时长以 Host 时间线为准。工作台修改和独立留出项目尚待验收。

生成前的范围、原则 ID 和可执行逐字字幕由 Host 从当前证据、档案与时间基投影。当前默认时间线为 1/30 秒刻度；所选持续时间和相对于可听源锚点的字幕偏移须能精确表示，源绝对起点不必对齐时间线原点。例如源 1.01–2.01 秒可以精确映射为时间线 0–1 秒。不能精确映射的转录仍作为证据保留，不通过四舍五入制造逐字字幕，也不静默改写模型结果。
