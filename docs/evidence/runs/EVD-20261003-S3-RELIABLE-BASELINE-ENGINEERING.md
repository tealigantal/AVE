---
evidence_id: EVD-20261003-S3-RELIABLE-BASELINE-ENGINEERING
work_package_id: WP-S3-RELIABLE-BASELINE-001
date: 2026-10-03
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: e76a842531fb7c1b22af56ddd85a1f152150915f9aba65fddce34b97ef92c5fd
scope_fingerprint: d13205e7c0ac96cc2bdcf1bb5e687292dfec31aff326b5dc9b7e9bf98ad6ceb5
capability_ids: [CAP-S3-RELIABLE-BASELINE-001]
acceptance_ids: [ACC-S3-RELIABLE-BASELINE-001]
result: passed
---

# P0 工具工程完成；产品实操未运行

唯一活动P0的交付为构建/运行身份、真实记录拒绝门槛及其回归。
本记录不证明导入、播放、云模型、导出、Windows十步、用户主观接受、Stage Exit或Release。
此前DOC-007历史Evidence与首次docs:check失败保持不变。

实际实现：完整Docker COPY/依赖/资源/启动脚本/锁/构建工具清单；两服务实际运行文件、
配置映射、Python/Node/FFmpeg身份、YAMNet原始及实际使用模型、Whisper blobs/refs/snapshots。
build-reliable为两服务镜像写完整输入label，并检查构建期间输入未变；build-desktop产生
编译source/output provenance。旧镜像缺label/来源记录时产品完成明确拒绝。

产品完成强制live：实际文件摘要、逐步墙钟/视频区间、来源与Host状态/对象/QC/导出绑定、
声音证据、失败正确状态/恢复、独立复核、P5连续十步与独立人评。拒绝保持programme和
generated文件零写入。本机产生不可覆盖的脱敏receipt，CI只验证当前内容与记录/收据及
运行摘要链；相同内容提交导致的HEAD/diff布局变化保留出处，不冒充源码变化。
CI/JSON/hash不能证明实际动作或听评。Fixture明确是验证器边界，不是AVE真实验收。

| 实际检查 | 结果与证据 |
| --- | --- |
| interaction-acceptance:test | exit 0，缺/重复/失败/未运行、过期/伪录屏、对象和来源不绑定、权限路径、duplicate header、live拒绝与零写入、私有receipt的CI离线路径、真实临时Git dirty→相同字节提交 |
| build-identity:test | exit 0，资源变化、私有/缺失输入拒绝、Range无关；两服务身份、源码/运行输出漂移、构建label、构建中输入变化、ignored缓存/日志增删不改变身份 |
| docs:architecture:test | exit 0，programme拓扑、文档结构、治理转换和拒绝零写入 |
| docs:fingerprint:test | exit 0，fail-closed fingerprint、状态/debt、impact scope、interface drift |
| 实际新目录desktop编译 | exit 0，818个source inputs、681个outputs；独立程序比对真实provenance与当前COPY输入筛选完全一致，非手写fixture |
| docs:sync | exit 0，工具产生current/index/state，不手改生成文件 |
| docs:check | exit 1，历史及受影响Evidence适用性/旧latest fingerprint失败继续保留，见日志；不以同步恢复通过 |
| git diff --check | exit 0；Git行尾提示不当作检查成功的替代证据 |
| 独立只读复核 | readonly_map最后确认无剩余P0阻塞；限源码/门槛，不代表镜像或Windows接受 |

首次新增interaction测试失败是临时fixture未创建generated目录，导致ENOENT；修复后重新检查。
独立复核先后发现墙钟覆盖、运行配置遗漏、旧镜像拼接、static完成API绕过、runtime摘要链、
Host来源重复、ignored目录参与输入摘要；逐项修复后执行对应回归。没有删除首次失败，
也没有把重复重跑当修复。现有完整仓库/产品旅程留给后续受影响实现及P5，不伪称全绿。

本次完整输入摘要`6e4a1baf73250ee3f0e12f1467325dbf2907a20b3625bc49c9af010ab604ef17`。
两服务仍是旧desktop `sha256:27ae7d4714354f86e469177e07ee3df513e324206edba05a46cceab10207daf7`、
whisper `sha256:03ef0528e1fdc25fdb89d5d6ac9a57fa3b47e11fa43a5448937315f26e388f09`，
均未重建/重启且build-input label为null。不是最终镜像，不能和本次源码拼接为产品通过。

受保护四文件SHA256与DOC-007基线完全一致；configuration/profile/projects/uploads/
whisper-models五个AVE命名卷仍存在，没有清理项目、原片、缓存或私有配置。未提交、推送、
合并或发布，未调用云模型。当前问题照片和两MP4来源路径仍待提供，相关真实步骤not-run。
专用Windows工具已真实枚举Edge的AVE窗口；选择器、下载文件打开和有声录屏仍须实操。

资产在[reliable-baseline](../assets/reliable-baseline/current-build-runtime.json)，摘要如下：

| 文件 | SHA256 |
| --- | --- |
| current-build-runtime.json | f6fabd94285e6dc8232669fe573fc2b9150bed4263a7bdbe1a4b33894302f9c9 |
| compiled-provenance.json | ea7cacd789c45998fd0baf3cd9a7920498033dec503f245c7127771449e27100 |
| interaction.log | a5550558bfeb68485b3e2a2e41e76ecd084893f5122d2445c3f1799467be832d |
| build-identity.log | c3dc8f4d86386941cf1b8108d4adc3877b9b5bcf0b68e3dffeaa3e75b497b22e |
| docs-architecture.log | de97609c29c29ad34de1997ee71a1f7a47f6e9f1b5bbac23bb6918cdc940e9f8 |
| docs-fingerprint.log | 4562721a1dfdc8c8aff680c75a09b0089f5d960aa206aff7d645c91088e57dc8 |
| docs-check.log | 3badc3d9cb7ec1eb0f0e3ddd3a5c604e016ef5cdf8a7e00d53556bed0f89b5e0 |

接续P1可信导入；本包工程工具tested不提高任何现有产品的实操状态。
