# recall — 全局记忆定向检索(子模块;手动 = 对话指令或 /project-recall 分发,full 模式新 session/新任务接入时 agent 自调)

规范权威 = `~/.claude/skills/memory-management/`(MM)。参数:`[主题/项目名/问题] [--deep]`。
**读域**:全局枢纽三库 + 域 store;只读不写(要写走 update 例程)。

## 流程

1. **入口**:读枢纽 `~/.claude/projects/-Users-yuanyunchen/memory/MEMORY.md`(含模式行 + 三库索引,一屏)。
2. **按问题类型路由三库**(单层索引,只跳点名的,防吃 context):
   - 「X 项目在哪/什么状态」→ 项目定位卡(project-index.md 规范);命中后细节去工作区 MEMORY.md,枢纽不展开。
   - 「X 月做了什么/何时定的」→ TIMELINE(当月周块细、历史月压缩)。
   - 「关于 X 我知道什么」→ 知识库主题文件(索引 + grep);飞书/广告算法等域问题另查域语义库(feishu-memory,bm 检索)。
   `--deep` 时沿二跳展开(工作区 MEMORY.md / timeline-records 月档 / 域 store 全文)。
3. **新鲜度核查**:条目 updated 字段 vs 现状;可疑陈旧显式标注「此信息可能过期」,不当真相引用。
4. **定向输出**:向用户回简短摘要——命中了什么 / 关键事实 / 指针(path/token);未命中如实说,不编造。
