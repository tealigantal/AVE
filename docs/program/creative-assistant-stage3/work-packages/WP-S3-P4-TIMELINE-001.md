# WP-S3-P4-TIMELINE-001 — 精确时间线与可执行效果

本包承接 DOC-007 的 P4.1、P4.3 与受支持的 P4.4 子集，依赖正式关闭的
`WP-S3-RELIABLE-JOURNEY-001`。操作对象始终是 Host 当前作品、请求和草稿版本；
`demos/p4-workbench/` 只作交互蓝图，不是产品实现或验收证据。

## 用户结果与实现边界

- 用时间线执行已有 Host 能验证的主视频插入/重排、边缘修剪、显式分割、帧定位、
  吸附、撤销和重做。落点必须唯一；普通拖放不隐式分割、裁短、覆盖或替换。
- 多轨视图由当前 Host Timeline 建立；常规位置选择与时间线操作只对当前可编辑版本开放，
  浏览旧预览时明确只读。播放头点击按项目时基帧对齐，编辑交给同一共享 `project.creation.manual`
  Host 路径。
- 新镜头插入前/后时保留各片段源范围与原时长，并通过同一原子命令批次顺延受影响片段；
  非连续、锁定、保护或不能完整定位的轨道状态须拒绝并说明原因。
- 使用 `project.creation.manual` 的类型化 `TimelineCommand` 提交，Host 仍执行来源/授权、
  精确版本、EditIR、模拟、CommitPlan、Preview/Master 预检、幂等及资源释放检查。界面坐标
  只参与命中测试，所有落点经项目 RationalTime/帧率转换；不能把浮点秒持久化。
- 首批只显示 Registry 已登记且 Preview/Master 真正可执行的效果。一个目标片段一次只有一个
  活跃效果；重复应用以一次可撤销替换，不能累积隐藏效果。转场附着于相邻片段剪辑点；只有
  Host、Timeline 和两种渲染计划均能验证的种类、重叠和两侧源余量才允许提交，其他情况关闭失败。
- 保持现有 Apple 浅色、中文可读尺寸与系统字体；不据此改变广义 Timeline/Composition/
  Transition 能力矩阵状态，不实现任意多轨合成、PiP、效果参数库或泛化转场。

## 验收与退出

自动化验证两个不同长度镜头的前后插入、连续重排、首次插入后移动、吸附开关、非法轨道、
边缘修剪、显式分割、撤销/重做、重复效果替换、有效转场与缺少余量/不支持语义的拒绝；
检查精确帧、时长、来源区间、命令原子性、幂等重试，以及相同语义清单下独立 Preview/Master
执行计划。失败不得部分写入。

按 manifest 完成 `stage3:p4-timeline:test`、`timeline-render:test`、
`renderer:workbench:test`、`typecheck`、`contracts:check`、`architecture` 与 `docs:check`。
证据明确区分合成 Host 验证、真实媒体渲染和用户 Windows 操作；本包不签署整体验收、
Stage Exit 或 Release。

## 实现记录

- 渲染器时间线现在从当前 Host Timeline 构建可访问的多轨编辑区，提供项目帧播放头、
  可选吸附、相邻片段前后重排、获准视频源插入、显式边缘修剪与分割、登记效果替换、
  支持的交叉溶解、撤销/重做，以及修改后制作并观看当前版本。浏览旧版仍为只读。
- 所有变更通过 `project.creation.manual` 与类型化 `TimelineCommand` 提交。编译器限定单一
  连续主视频轨及可精确映射源帧；涉及锁定、歧义字幕或其他未支持语义的命令明确拒绝。
  精确时间转换和原子轨道顺延由纯命令编译器覆盖，Host 仍是最终授权和版本校验边界。
- `stage3:p4-timeline:test`、`timeline-render:test` 和 `renderer:workbench:test` 已通过。
  时间线 Host 集成测试使用仓库生成的合成媒体与本地模型夹具；渲染测试实际产出并检查
  Preview/Master；这不是用户 Windows 操作或整体验收。
- 其余强制检查结果和全局 `docs:check` 诊断记在本包对应 Evidence。全局历史 Evidence
  适用性或人工接受指纹诊断不会被本包改写；P4 整体人工交互仍由依赖包单独处理。

