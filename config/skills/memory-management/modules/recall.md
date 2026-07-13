# recall — 全局记忆定向检索（BM 工具链）

规范权威 = `memory-management` skill。参数:`[主题/项目名/问题] [--deep]`。
**读域**:hub 三库 + bytedance 域库；只读不写。

## 流程

1. **入口**:读 hub 索引 `MEMORY.md`（经 runtime 软链或 `<repo>/hub/MEMORY.md`；含模式行 + 三库索引）。
2. **按问题类型路由**:
   - 「X 项目在哪/什么状态」→ `--project hub` 定位卡（project-index.md）；细节去工作区 MEMORY.md。
   - 「X 月做了什么/何时定的」→ hub `TIMELINE.md`。
   - 「关于 X 我知道什么」(通用) → `bin/bm tool search-notes --project hub "…"`（或索引+Read）。
   - 字节广告/平台/实验/召回等**工作知识** → `bin/bm tool search-notes --project bytedance "…"`（带实体名；核 quote 时效）。
   `--deep` 时二跳展开工作区 / timeline-records / bytedance 命中全文。
3. **新鲜度**:`updated` vs 现状；可疑标「可能过期」。
4. **输出**:命中摘要 + 指针（path/token/project）；未命中如实说。
