---
evidence_id: EVD-20261004-S3-RELIABLE-PREVIEW-RUNTIME-HANDOFF
work_package_id: WP-S3-RELIABLE-PREVIEW-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: f7a992b62faa590b4c17ba90e538027ca2d7911bbbe21ca857eb97a434ca889d
scope_fingerprint: 434e94808a8fc379b66664eb31d4d4d7509ec7709c6161b6a3288f7027ff17e5
capability_ids: [CAP-S3-RELIABLE-PREVIEW-001]
acceptance_ids: [ACC-S3-RELIABLE-PREVIEW-001]
result: blocked
---

# P2运行更新与人工交接

用户本轮明确回复“已关闭”，仅表示工作台关闭，不是播放接受。P2由ready经docs:start恢复实施；只向旧desktop发送SIGTERM，容器自行退出，未强杀。旧shell退出码143保留；此前关闭过程中迟到的DESKTOP_INPUT_SAVE_STALE日志原样保留，不推断旧历史输入已恢复。

实际执行docker compose -f compose.yaml -f docker/compose.gpu.yaml up -d --no-build desktop whisper，exit0。只重建这两项运行容器，使用上轮已经验证的镜像，不重新改源码。desktop sha256:3941b4c7c6a8a42f5de0c557ddefcd5bbb1f407c19f009bbe9feeb8ca7ecaceb，whisper sha256:f5b5fbdb12a599505bac9835e26910c40565425ea2141c78e4193090255c577e。来源输入摘要0fa8b7bdfc5850c3d47d5cb779422a4d2aacf3e590f06d736b9787a4ebaa5b9b；运行摘要377e4b003b7eaceadafdf6efb1c989b6b3e6ab73cb7312c83a6b50a7aca31a99。

currentBuildIdentity和assertRuntimeBuildProvenance实际exit0，运行源输入、编译输出以及启动文件逐项核验，非只看healthy。实际GPU设备保留nvidia/count1，项目/上传/profile/configuration/whisper模型五个原数据卷及materials只读/exports写入绑定保留，更新前所有无关容器ID相同。见runtime-provenance-attempt01.log、current-build-runtime.json、runtime-preservation-audit.json。审计最初把模型目标误写成/models导致断言失败，读取实际Compose确认正确目标/home/ubuntu/.cache/huggingface/hub后针对实际声明核验通过；未更改挂载。

产品源码和指纹未变，既有70条完整回归、14条专项无需重复。运行更新不是WIN-01/03/08实际界面或听音通过。现已具备交接条件：http://127.0.0.1:6080，打开已有作品核对九项；图片方向/放大/恢复；两视频完整画面/声音/尾部跳转/全屏；独立音频及快速切换无串音；返回作品保留版本/观看位置并正常关闭重开。对应流程/最终构建/来源和工程日志绑定于p2-human-handoff.json，三个步骤均not-run，未造录屏、JSON反馈或确认身份。

P2仍blocked，唯一剩余边界为新运行构建的真实用户反馈；旧保存保护阻塞已解除。用户通过后再按真实确认记录和docs:complete协议完成，当前不推进P3。未提交/推送/合并/发布，无删除数据或操作无关服务。
