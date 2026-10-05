---
evidence_id: EVD-20261004-S3-RELIABLE-PREVIEW-CANCEL-FIX
work_package_id: WP-S3-RELIABLE-PREVIEW-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 3d6e40553f888484e4b7be58da018e8c0ef4af793b81ff94be376b6d396829ff
capability_ids: [CAP-S3-RELIABLE-PREVIEW-001]
acceptance_ids: [ACC-S3-RELIABLE-PREVIEW-001]
result: blocked
---

# 取消竞态修改及用户实看交接

用户明确授权本轮先不验证检测，修改后直接重建容器，由本人看，再继续任务。该指令优先于本包工程先验流程；本轮未运行全量、专项、typecheck、architecture、contracts、docs:check或实际播放检查，也不把前一版本70+14通过继承给新代码。结果blocked只表示新代码尚待用户实际播放结论。

沿唯一当前链路修改两个文件：Renderer source-player立即停止旧声音并释放引用，新prepare等待全部旧release，等待期间的新选择让过期prepare直接退出，不派发旧选择。Worker client在取消/超时发生时标记pending producer为cancelling，新派发等待该producer的终态及进程排空；等待后重新选择当前generation。正常任务仍并发，保留2秒取消宽限、真正超时的生产者终止、终止不确定的poisoned保护和根因，不增加脚本、旧别名、回退或另一套播放器。终止完成或失败后finally释放等待，防止新请求进入将被旧取消终止的进程。

构建成功，cancel-fix-build-attempt01.log保留实际输出，唯一输入d65b2e11bc38aaedb1e46239b705e3a0690811cea673a4182e80b1c621ddca85。仅原Compose与GPU override的desktop/whisper执行up -d --no-build；先向旧desktop发送SIGTERM，其自行退出143，没有强制丢弃保存。cancel-fix-container-update.log记录两服务Recreated/Started，前后容器清单位于cancel-fix-containers-{before,after}.json。新镜像desktop sha256:8866f47f011422181adebfa422e9f3982da24a7b0bb6a55702761cfb719a8608；whisper sha256:85e76f721ea6217bed0983f78de617058110bc7b9f11fc2a1324465d7c59a341。未执行down、prune、卷删除或其他项目容器操作，原Compose继续挂载原数据。构建和启动不等于视频播放通过。

用户实看：刷新既有页面，播放原两段视频，确认画面/声音/拖动，并快速切换图片与视频检查无串音、无WORKER_CRASH。以真实反馈登记通过/失败；尚未反馈时不完成P2、不推进依赖包。后续顺序是P3持久错误/任务与恢复、P4缩略图和整体UI、P5最终真实流程，前述既有范围不缩减。
