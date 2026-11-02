# update — 更新全局记忆（BM 工具链）

规范权威 = `memory-management`（写入纪律 = `references/update-rules.md`）。
参数:`[工作区路径|默认当前] [--scope 全部|本任务] [--deep]`。
**写域**:hub（可写）+ 必要时 bytedance 工作知识；**工作区只读**。

## 流程

1. **采集**:读目标工作区 AGENTS.md「关键决策」+ `.agents/memory/`（v3：`.agent/MEMORY.md` 关键决策 + `.agent/memory/note/`），对照三库找该记未记。
2. **落位(无痕)**:
   - 定位卡 / 时间条目 / hub 主题 → `--project hub`（`write-note`/`edit-note` 或改 md）。
     落到 `hub/ns/<域>/<slug>.md`；域不确定时按主归属选一个，多归属靠 `topics` 多值表达。
     **P5 收口前 `hub/ns/` 还没建，卡片平铺在 `hub/`**——此期间就写在 `hub/<slug>.md`，
     别自己造 `ns/` 目录（目录迁移由主控在 P5 单独 commit 做）。
   - 字节工作知识新事实 → `--project bytedance`（一事一文件 + frontmatter 纪律见 bytedance PLAN）。
   - 行为约束 → 只列清单，转 harness-management（不代落）。
   - **frontmatter 顶层必须有** `type` / `status` / `updated` / `topics`（多值；枚举与受控词表 = `references/knowledge.md` §一）。
     嵌进 `metadata:` 会让 `--type`/`--status`/`--meta` 全部返回 0——这不是风格问题，是功能开关。
   - **`MEMORY.md` 与 `ns/*/INDEX.md` 不手写**，由 `bin/build-index.py` 从 frontmatter 派生。
3. **体积门禁(必做，写完立刻跑)**:

   ```
   <repo>/bin/lint.py --path <本轮改过的每个文件>      # 无 --path 则全库；退出码非 0 即失败
   ```

   门禁不过就地修完再往下走，不留给"以后巡检"——事后巡检这条路已经被证伪过一次。
   `lint.py` 不在时用这一行顶上（数正文字符，不含 frontmatter）：

   ```
   python3 -c "import sys,re;t=open(sys.argv[1],encoding='utf-8').read();print(len(re.sub(r'^---.*?\n---\n','',t,count=1,flags=re.S)))" <file>
   ```

   **必须带 `encoding='utf-8'` 且必须用 `len()` 数字符**。`wc -c` / `wc -m` / `stat` 一律禁用：
   中文 UTF-8 一字三字节，用字节数判 6,000 门槛会把 2,000 字的卡误判成超限。

   **正文 >6,000 字符 → 必须切片**，不能"等下次再说"：
   - 6,000 是 BM 全文索引的硬上限（`MAX_CONTENT_STEMS_SIZE`），超出部分既不进 FTS
     也不进向量 chunk = 写了等于没写。实测一张 25,681 字符的卡，可检索比例 8.7%。
   - 切法：按 `## ` 段落切到 `_detail/<slug>/<段>.md`，每片单独一个文件、单独进索引；
     卡片正文只留结论摘要 + 一行 `- 细节：\`_detail/<slug>/\``，**原文一字不删**。
   - 追加内容让卡逼近上限时，先切片再追加，不要先超了再说。
4. **收口**:`bin/build-index.py` 重建索引，再在 **global-memory 仓库根**
   `git add <本轮改过的文件> && git commit -m "memory-update: <一句>"`。
   **不用 `git add -A`**——仓里常有别的 in-flight 改动，一把全提会把它们裹进来、并断掉回滚路径。

   **本轮写入不会自动进检索**：`bm sync` 这个子命令不存在，唯一入库路径是 `bm reindex`；
   而 L2（`bin/maintain.sh`）**目前只有 plist、尚未 bootstrap**，别把入库指望在它身上。
   本例程里**不要自己跑 `bm reindex`**（无并发保护；迁移期工作树是脏的，会把中间态入库）。
   正确做法：写完后在回话里说明"卡已落盘，`search-notes` 要等下一次 reindex 才查得到"，
   需要立刻可检索时交给用户/主控串行跑（前置：`pgrep -fa 'basic-memory mcp'` 为空 + 工作树干净 + detached）。
5. **冲突检查(必做)**:仲裁序 = 工作区 task.md 上层原话（v3：requirement/）> 工作区实物 > 全局记忆；事实性直接修；
   语义矛盾列用户；不静默删。回简短清单。

## 只增不减的解法

红线是"不静默**删除**记忆"，不是"不许压缩"。切片、把过期结论改写成一行现状、
把同一项目的重复卡合并——这些都不删内容，属于本例程的正常动作，不需要审批。
真要删（整卡废弃、内容判定为错）才走建议清单给用户。
