# Project Storage

Project Host 独占写入 `project.sqlite`。`project-format-v2.sql` 是唯一当前数据库基线；新项目在一个事务内初始化，非 v2 manifest 或数据库在任何正常写入前直接拒绝，不执行迁移、转换、备份恢复或旧数据回填。大对象写入 Object Store 后才写入数据库指针。存储 smoke test 验证 v2 身份、WAL、原子对象写入和 integrity check。
