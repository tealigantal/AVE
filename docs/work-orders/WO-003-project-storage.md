# WO-003：Project Layout 与 SQLite 单写入

## 用户结果

创建的项目拥有稳定的 `project.json`、SQLite、对象目录和可恢复的迁移状态。

## 不变量

Project Host 是唯一数据库写入者；迁移失败不得继续打开；重要对象不得只存在于 temp。

## 必跑测试

`npm run storage:check`、`npm run check`。

## Definition of Done

迁移、WAL、项目事件、manifest、项目锁竞争、关闭重开、Object Store 临时写入后原子 rename、integrity check 均有实际验证。
