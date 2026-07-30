# WO-001：Monorepo 与架构检查

## 用户结果

后续工作单拥有可安装、可检查且边界清晰的工程基座。

## 允许修改

根配置、最小 contracts、core/platform 公共入口、Worker 协议入口、架构检查和验证文档。

## 禁止修改

业务 Feature、桌面 UI、数据库迁移、复杂 Worker 任务和真实渲染。

## 不变量

Project Host 单写入、RationalTime 单时间基准、Worker 不访问 SQLite、Core 不依赖基础设施。

## 必跑测试

`npm install`；`npm run check`。

## Definition of Done

首批文件真实存在；类型检查和架构检查通过；文档记录已验证与未验证边界。
