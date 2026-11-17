# 计划 — T01 工作区迁移

## 方法
先保存源仓 HEAD、工作树状态和逐文件哈希，再移动实体仓库；保留兼容软链，按 ws 生命周期创建任务与历史入口。

## 阶段与验收
| 阶段 | 范围 | 判定 | 实现 |
|---|---|---|---|
| 迁移基线 | 源仓所有版本化和未忽略文件、全部提交 | 文件哈希、旧 HEAD 与历史一致 | input/migration-before.json 与 git-history.txt |
| 工作区接入 | repo 工作区、迁移任务、升级待办 | ws check 无 error、生命周期正常 | ws init/req/task/log/index |
| 可见入口 | 实际配置、Git 记录、Q&A、归档任务 | README 及入口文件引用可到达 | README、AGENTS、memory 定位 |
| 路径兼容 | 原仓路径与相邻记忆仓 | help、memory status 与 dry-run 成功 | 兼容软链，保留原脚本 |
| 收口 | 验证、结果、需求状态 | 本轮与原改动分开，T01 可 done | 逐项核对、结果留档 |

## 拆分
T01 完成本轮迁移；T02 为后续独立的 Harness 基线审计与升级方案，保持 planned。

## 修订记录
- 2026-11-16：相邻 global-memory 路径为脚本依赖，使用指向原仓的软链保持兼容，不复制记忆数据。
