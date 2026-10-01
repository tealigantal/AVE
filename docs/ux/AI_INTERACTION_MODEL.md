# AI Interaction Model

AVE communicates through intent capture, evidence cards, candidate direction
cards, beat/story views, edit explanations, review comparisons and blocker
choices. The assistant distinguishes facts, inferences, recommendations and
requests for approval. It asks a question only when the answer changes the
result materially; otherwise it proposes a reversible default.

Every answer can expose “why”, “show evidence”, “compare alternative” and
“undo”. Confidence describes uncertainty, never user consent.

Stage3 默认直接做一版完整初稿；候选卡和解释是可选查看，不是必经步骤。用户感受经上下文转为具体剪法，默认出可撤回草稿。制作中输入始终可用，收起对话仍保留输入；“已收到”“正在调整”“已进入当前可观看版本”必须对应 Host 真实状态。新要求只替换冲突项，最新视频必须绑定相同请求修订，旧画面不冒充已修改。具体交互及原型证据边界见 [Workspace Design](WORKSPACE_DESIGN.md)。
