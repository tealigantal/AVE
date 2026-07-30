# Project Storage

Project Host 独占写入 `project.sqlite`。迁移按版本顺序执行；大对象写入 Object Store 后才写入数据库指针。当前 WO-003 smoke test 验证 WAL、迁移、原子对象写入和 integrity check。
