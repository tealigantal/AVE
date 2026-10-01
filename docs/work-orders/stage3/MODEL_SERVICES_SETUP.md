# Stage3 三路模型配置

本页是 `WP-S3-INTEGRATION-001` 的用户配置说明，归属工作单层；独立列出可复制配置，避免把操作步骤扩写进运行时权威。
架构依据 [ADR-0030](../../decisions/ADR-0030-stage3-split-model-services.md)。这条路径已经接入 Host；服务连通与真实素材的创作质量分别验证。

## 处理顺序

Worker 的当前字幕布局使用系统字体和固定版本 Pillow 测量字形，不捆绑字体。
在运行 Worker 的 Python 环境中执行
`python -m pip install -r apps/worker-host/requirements.txt`；建议使用独立虚拟环境，
启动 AVE 前以 `AVE_PYTHON` 指向该环境的 Python。该依赖属于本地编码，
不要求重建已可用的 Whisper 或环境声服务。CI 安装同一 requirements。
固定版本依据 [Pillow 官方包信息](https://pypi.org/project/Pillow/12.3.0/)；
不能以开发机碰巧安装的其他版本代替最终运行记录。

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
$env:AVE_MODEL_CONFIG = Join-Path $env:USERPROFILE '.ave/model-services.json'
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

## 2026-09-27：隔离 YAMNet 环境声候选

本次显式新增本地候选，未覆盖既有 Qwen 配置或重建 Whisper。代码为 `scripts/stage3/yamnet_service.py`，仅监听 `127.0.0.1:18081`；独立环境、模型、候选配置、每次请求分数及失败堆栈位于 `%LOCALAPPDATA%/AVE/stage3-final-review/sound-service`。`model-services-candidate.json` 是原配置副本，仅替换 sound 角色，含其他服务密钥，不进入仓库或 PR。运行正式应用时须显式设置 `AVE_MODEL_CONFIG` 到此副本并进行新请求授权。

使用官方 [YAMNet](https://github.com/tensorflow/models/tree/master/research/audioset/yamnet) 的 [TFLite 模型](https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/rpi/lite-model_yamnet_classification_tflite_1.tflite)，4,126,810 字节，SHA256 `10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de`。521 类映射和 Apache-2.0 许可取自 tensorflow/models 提交 `9d33a164bf50e7084680a4ff4b88fc70be809631`；官方下载出处为 tensorflow/examples 的 audio_classification/raspberry_pi/setup.sh。Python 3.12 独立 venv 固定 `ai-edge-litert==2.2.0 numpy==2.4.3 scipy==1.17.1`，CPU Interpreter，未选择 GPU 或隐式设备回退。旧下载端点的 403/404 保存在 provenance，未假称旧路径成功。

安装相同依赖并放置 `yamnet.tflite`、`yamnet_class_map.csv` 后，从仓库根目录启动（日志和 PID 应按尝试编号保存）：

```powershell
$soundDirectory = Join-Path $env:LOCALAPPDATA 'AVE/stage3-final-review/sound-service'
& "$soundDirectory/venv/Scripts/python.exe" scripts/stage3/yamnet_service.py --directory $soundDirectory
```

sound 配置为 provider=`local-yamnet`、base_url=`http://127.0.0.1:18081/v1`、model=`yamnet-tflite-1-10c95ea3eb9a7bb4`、audio_input=`base64`、response_mode=`json`、structured_output=`validated_json`、text_output_only=`true`，本地 api_key 为空。服务接受非空 PCM16 单/双声道 WAV；完整重采样至 16k，窗口 15,600 样本、步进 7,680，尾部补零显式留证，不裁掉输入。128MiB 是单次 HTTP 传输资源边界，超出明确失败，不截断。每窗全部 521 分数、源时间与输入摘要留本地证据；请求文字不参与分类，服务不生成转录或翻译。

[官方模型卡](https://raw.githubusercontent.com/tensorflow/tfhub.dev/master/assets/docs/google/models/yamnet/1.md) 明确分数未跨类别校准，不是概率。非零录音始终标声学不确定，标签仅作候选；原始 PCM 全声道严格为零时才以确定统计描述数字静音，模型 Silence 分数另存，不混为同一验证。当前开发控制识别合成人声与全零静音；[NPS 公有领域实录](https://www.nps.gov/subjects/sound/gallery.htm)的雨声和鸟鸣主要类别匹配官方来源，口琴 10 窗中 8 窗为 Music、开头 2 窗误报 Vehicle。因此候选尚未通过完整声学质量验收，也未完成人工听评。NPS A01 实拍原片 AAC 解码全零，已排除其作为现场环境声证据。全部尝试由 `qualify_yamnet.py` 写入独立 qualification 目录，来源及预期仅在 evaluator manifest，不发送给分类器。

新 split-observation-v2 将转录可靠度与声学不确定性分离。Whisper 原始 `avg_logprob`、`no_speech_prob`、`compression_ratio` 保留在子调用证明；缺失用显式 null 表达未知并标不确定，非法值失败。筛查阈值为 avg_logprob < -1、no_speech_prob > 0.6 或 compression_ratio > 2.4，参考 [Whisper 默认检测参数](https://github.com/openai/whisper/blob/main/whisper/transcribe.py)，这里采用任一越界即不确定的保守规则，不声称复刻 Whisper 跳过规则或证明逐字正确。新 transcript 段携带独立 uncertain；旧 v1 证明按历史结构重建，旧段继续使用原样本标记。部署摘要随协议更新，旧授权不可复用。

后续独立控制补充：NPS B01/B02 代理解码也为全零；未将音轨存在等同有声音。[USGS 公有领域河边访谈](https://www.usgs.gov/media/videos/kurt-carpenter-inverview-1a-minam-river-algae-b-roll)原片 0–12 秒抽样静音，30–42 秒非零，24 窗主要类别为 Speech 14 窗、Stream 10 窗。远端有界抽取退出码为 0，片段独立摘要留在 evaluator 报告，整片下载状态另记，不能将片段当完整下载或独立跨项目留出。真实鸟/雨/口琴各 3 秒加 3 秒数字静音的拼接控制明确标为人工组合，窗口输出在边界附近变化，口琴误报仍保留；不是自然连续实录或真实 Vlog 验收。未作真人听评。

本机 service-01 与最终源码需区分：推理逻辑相同，最终源码另补 float32 输入输出校验、证据独占写入、响应发送失败独立记录及截断 WAV 的 EOFError 映射到 HTTP 400。运行中旧服务对截断 WAV 返回了 HTTP 500，具体 EOFError/stack 与失败断言保留；最终离线回归检查了 400 分类。尝试停止本任务服务再加载最终源码时，环境自动审批在命令创建前拒绝（`blocked by policy`），未改换方式停止或重启。当前运行与最终源码 hash、差异见本地 `service-source-status.json`；不得把旧进程说成最终源码的 HTTP 验证。

## 2026-09-27：规划模型显式思考配置

后续真实规划输出四个各 8 秒的镜头，却声称总长 24 秒，已由 Host 精确时长门禁拒绝。该失败保留，不清洗为成功、不自动重试。官方 [深度思考说明](https://help.aliyun.com/zh/model-studio/deep-thinking)明确 `qwen3-max` 支持混合思考、默认关闭且支持非流式；本次保持原模型/端点，在上述隔离候选配置的 planner 中显式添加：

```json
"enable_thinking": true,
"thinking_budget": 4096,
"max_tokens": 8192
```

这是 planner 对象中的字段；其他服务和用户原配置不变。非布尔开关、非正安全整数预算/正文限额，以及未显式开启思考却给出预算，均在发送前失败。HTTP [Chat 协议](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)要求这些字段在顶层，而不是 SDK 的 extra_body 包装中。字段同时进入部署摘要和实际请求字节摘要；变化后旧授权、缓存或回放不能冒充新部署，必须新请求。未配置字段仍保持旧身份和默认请求，不隐式开启思考。

对这个 Qwen3-Max 版本，`thinking_budget` 限制思考，`max_tokens` 限制正文，8192 正文额度不会被 4096 思考额度消耗。官方新 `max_completion_tokens` 的 Max 支持范围从 Qwen3.7-Max 起，因此这里使用该现有模型支持的 max_tokens。单次物理请求的输出预算为思考 4096 加正文 8192；截断 finish_reason=length 或只有思考没有正文仍失败，不追加请求补全。思考按输出 Token 计费：按当前[北京原价](https://help.aliyun.com/zh/model-studio/model-qwen3-max)最高档输入 7 元/百万、输出 28 元/百万，以模型最大输入 258048 和本次 12288 输出预算估算，单次约不超过 2.151 元；这是依据供应商模型限制和目录价的预算估算，不是账户/全旅程总费用封顶，实际费用以实际用量和账单为准。

供应商返回的 reasoning_content 只用于记录是否实际出现非空内容，绝不保存或拼进创作结果；reasoning_tokens 保留实际计数，未报告为 null，不补零。审计字段 `reasoning_observation` 通过 split planner 返回并随模型运行保存。显式开关不等于已验证实际开启：只有真实返回观察可提供进一步证据，开启本身也不证明创作满足目标。JSON/SSE 均严格只消费正文，保留实际用量，错误不重试。

当前仍显式请求 json_object 并严格解析/领域校验；[结构化输出说明](https://help.aliyun.com/zh/model-studio/qwen-structured-output)只承诺 Qwen3-Max 的非思考模式，开启思考后该参数虽然不会报错，结构化约束可能失效。未换模型或暗改为更宽松解析，若新真实运行仍返回非法 JSON，将保留新失败。修改前配置保存在本地 `model-services-before-thinking4096.json`，含密钥不上传；变更索引为 `planner-thinking4096-change.json`。真实效果必须由新运行验证，不由参数接通或受控测试宣布通过。

第四次真实冷启动在相同部署的规划调用收到 HTTP 400，尚未进入候选编译。
旧适配器取消响应体而未保存内容，因此该次具体服务错误不可追溯确认。
新协议提示遗漏了 JSON 关键词；[供应商说明](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output)
要求 json_object 的消息包含该词，当前提示与回归补上这一明确要求，
但不把它冒称为已取到旧响应体的根因证明。

当前 HTTP 非成功响应保留本地诊断 cause：状态、请求标识、内容类型、
最多 64 KiB 原始响应字节及其 SHA-256、是否读完。读取限时 5 秒；
超限、读取失败和释放失败继续保留在 cause 链，不掩盖原 HTTP 状态。
这不是成功输出，也不会发送到 Renderer 错误文案或触发自动重试。
响应可能回显输入，因此诊断与项目本地证据同级保护，不上传到 PR。
受控测试覆盖完整错误体、超限取消、坏流与原有响应释放顺序；真实新运行
仍须另行留证，无法为过去已丢弃的响应补造详情。

SSE 非法输出另保存 `stream_boundary`：实际收到的字节数与 SHA-256、
chunk/event 数、EOF、DONE、finish_reason、未闭合行/事件长度与正文长度。
原解析异常和 cause 类型保持不变，取消继续保留取消原因；不保存思考正文。
这些字段可区分当前客户端接收与解析边界，不证明供应商内部根因。
旧 missing-finish 运行没有这些原始边界证据，保留为历史未完全定位失败；
分块/CR/LF/CRLF、截断、非法 UTF-8、取消与不重试断言属于明确 Fixture。

同日另做两次公开文字的真实协议诊断，各只发送一次，不属于核心创作验收。
`sse-live-boundary-1790499037960` 仅将现规划配置切为 SSE，收到 2163 字节、
9 个事件、DONE 和 stop，但正文为零，按规则失败，未将思考替代正文。
服务 request-id 和接收摘要已留本地；它与旧 missing-finish 不是同一种
已证实边界。`sse-live-nonthinking-1790499090310` 是明确关闭思考、移除
thinking_budget 的独立 SSE 对照，返回预期 JSON 并通过。该对照只证明当前
适配器可消费该部署的真实非思考 SSE，不修改生产候选配置，也不把第一次
或历史失败算作成功。实际生产继续原已授权的 JSON 模式，新部署身份分别保留。

## 2026-09-27：现行规划候选改为非思考 JSON

后续 C 正式产品运行也收到精确空正文，诊断保存 0 字节和空串 SHA-256，
按非法输出失败；并未用思考文本充当结果。A 同轮有完整输出，明确把四个
单帧证据区间当作选段，总容量只有 4 个 Timeline tick 而目标是 720，
Host 容量拒绝正确。这些与此前缺失原始输出的运行分别留证。

现行隔离候选仍使用 `qwen3-max`、原端点、`response_mode: json`、
`structured_output: json_object`、`max_tokens: 8192`，但明确设置
`enable_thinking: false` 并移除 `thinking_budget`。选择依据是供应商
对该版本非思考 JSON 模式的支持承诺与已发生的空正文失败；精确时长已由
Host 编译，不能继续依靠模型算术或思考开关证明正确。不是错误时自动切换，
也不承诺仅这一配置能解决全部创作问题。视觉、环境声及既有 Whisper 配置不变。

变更记录为本地 `planner-json-nonthinking-change-1790500231843.json`，
旧配置副本含凭据，不上传。split 部署摘要从
`430b36cdea670c0fbed835b4a958515eb9069207468a41c256252b1e21e08d1e`
变为 `dcd1b1bb696511b1746276652062353a243537ef45516b78edfca50b50191031`。
旧请求不能复用授权；测试角色必须在正式工作台创建新请求、确认新部署并
重新分析素材。旧请求、观察、失败记录和版本不重写；新的真实效果仍待验证。

## 2026-09-27：语音情境的明确规划服务替换

后续 `qwen3-max` 非思考运行已正确复制合法字幕锚点，但只选择一个 163 tick
精确镜头，未完成原定两个镜头和 240 tick，总容量不足被拒绝、未提交。
该失败不是字幕清洗或编译器容错的理由，也不继续以相同部署重跑求通过。

为语音隔离项目另建本地 `model-services-speech-qwen37.json`，明确选择
`qwen3.7-max-2026-05-20`、`enable_thinking: true`、`thinking_budget: 4096`、
`max_tokens: 8192`，仍为 JSON/json_object 和同一已配置服务端点。
[官方模型说明](https://help.aliyun.com/zh/model-studio/qwen3-7-max)列出该快照；
[结构化输出说明](https://help.aliyun.com/zh/model-studio/qwen-structured-output)
列明 Qwen3.7-Max 支持思考模式的 JSON Object；
[Chat 协议](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
支持该系列的思考预算。北京目录价为输入 12、输出 36 元/百万 Token，
不是账户费用或整个旅程的封顶承诺，实际用量另留记录。

视觉、原 Whisper、YAMNet 不变。原候选配置保留供已授权的徒步请求继续；
本次不是自动降级或隐式迁移。语音测试角色必须创建新请求、确认新部署并
重新观察素材。新 split 摘要为
`d08a1d0cbfa5367525f0401e61678aed5420ffe7f274d24c17e35fd595a0ae18`，
非密变更索引 `planner-speech-qwen37-change-1790501913761.json` 留在本地。
配置含凭据不上传；替换本身不证明真实创作已经通过。

## 2026-09-27：演出素材的独立语音核对

D 的官方页面字幕仅用于独立验收，保存为本地
`source-rights/D01-official-evaluator-only.vtt`，不进入生成上下文或学习资料。
它证实原片前 37.010 秒是介绍讲话。现有 Whisper 确实检测到了讲话，但
第一句将官方字幕的 “It's” 识别成 “That's”；保留原转写和误差，不以
官方字幕回填生产结果，也不声称来源绑定就等于逐字正确。最终真人听评待审。
原 D 草稿主要选择介绍，未满足已冻结的演奏目标；该失败与随后字幕转义的
编码修复分别记录。纠正必须由正常产品反馈重新选择实际演奏部分，不能
靠替换转写或删去失败记录通过。既有 Whisper 服务未重建。

## 2026-09-27：留出旅行与演出采用明确的新规划部署

B 完整分析后的两个 `qwen3-max` 候选仍以不足六秒的窗口填充十八秒目标，
Host 均拒绝且没有草稿。D 的后续修订虽通过技术 QC，却继续选择开场介绍，
独立故事断言失败。另已定位到两个输入缺口：重开丢失已应用档案查询，
以及长镜头只取首中尾导致演出观察不足；这两项先修复，不能靠换模型掩盖。

随后 B、D 的新请求明确复用 C 已验证的本地配置
`sound-service/model-services-speech-qwen37.json`；文件名保留原始配置来源，
其规划服务为上节已列明的 `qwen3.7-max-2026-05-20`、thinking 4096、
max_tokens 8192、JSON/json_object。逐字段核对视觉、既有 Whisper、
YAMNet 三个角色与旧候选完全一致，不重建这些服务。

决定记录 `planner-heldout-performance-qwen37-decision-1790514110.json`
只含非密配置摘要。每次仍须由隔离测试角色在正式应用创建新请求并完成
新部署的原生授权；旧请求的部署不可就地改变，旧观察和失败不重写。
现行合同若不能跨请求复用观察，就执行获准的新分析，不为减少调用新增
绕过边界。实际新运行结果另行记入 Evidence；本决定不等于创作已通过。
