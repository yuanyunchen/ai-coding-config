# update — 更新全局记忆（BM 工具链）

规范权威 = `memory-management`（写入纪律 = `references/update-rules.md`）。
参数:`[工作区路径|默认当前] [--scope 全部|本任务] [--deep]`。
**写域**:hub（可写）+ 必要时 bytedance 工作知识；**工作区只读**。

## 流程

1. **采集**:读目标工作区 MEMORY.md 关键决策 + `.agent/memory/note/`，对照 hub 三库找该记未记。
2. **落位(无痕)**:
   - 定位卡 / TIMELINE / hub 主题 → `--project hub`（`write-note`/`edit-note` 或改 md）。
   - 字节工作知识新事实 → `--project bytedance`（一事一文件 + frontmatter 纪律见 bytedance PLAN）。
   - 行为约束 → 只列清单，转 harness-management（不代落）。
3. **收口**:在 **global-memory 仓库根** `git add -A && git commit -m "memory-update: <一句>"`（整仓含 hub+bytedance）。
4. **冲突检查(必做)**:仲裁序 = requirement > 工作区实物 > 全局记忆；事实性直接修；语义矛盾列用户；不静默删。回简短清单。
