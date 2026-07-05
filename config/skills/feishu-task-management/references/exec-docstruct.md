# exec-docstruct:lark-cli 文档结构同步坑(重排 / 移块 / 嵌附件)

> 来源:原 `memory.md` §12(2026-06-23 实测:docx 重排 / 移块 / 嵌附件)。逐字保真搬运。2026-07-01 追补原 §12 后续新增的 3 条(2026-06-24 实测:blockquote 静默 no-op / CLI 进度行假失败 / cite 卡 title 过时缓存),同为逐字搬运。
> 取用场景:用 lark-cli 改飞书 docx 的**结构**(重排章节、跨节移图、嵌 HTML 附件、批量改块)。与 `exec-blocks.md` 区分:exec-blocks=建内容,本文=改/重排既有结构。
> 边界:命令名以本文为准——`docx +fetch`(docx 作文档类型/block 路径,正确)、`lark-cli docs +media-insert`(docs 作 CLI 命令,正确),勿混改;完整 CLI 语法见同目录 `cli.md`。

情境:用 lark-cli 改飞书 docx 的**结构**——重排章节、跨节移图、嵌 HTML 附件、批量改块。

- **`block_move` 大块移动 = OT 合并冲突、静默失败**:一次移多块(>~15)、或同一 shell 内连续快速 move,会触发 OT(operational-transform)合并冲突,部分 move 不落地却**不报错**。重排章节 / 跨节移图**别用 `block_move`**;改用 **create(在目标位重建)+ delete(删原块)**,一步一条 CLI、之间 re-fetch;图随块走时**重传**(image token 变无所谓)。
- **改完取真值用 raw-dump,别信单 agent 的「已完成」解读**:本会话一个验证子智能体误报某 docx 仍是旧结构(声称有 A1/B1 字母标号,实则只有 图N)→ 差点据误报做无谓重建。结构有争议 → 拉 `docx +fetch` / rawContent / block list 看**原始 block 序**验真,别拿单个 agent 的总结当事实。
- **HTML 作附件嵌进 docx**:`lark-cli docs +media-insert --type file --file-view card`(以该 doc 为 parent 上传文件 → 插 file block,block_type 23 包在 33 容器里)。本会话用它把交互 HTML 报告嵌进核心/完整两 docx。
- **权限 / 分享不自动改**:改文件分享范围、链接权限(`link_share_entity` 等)是敏感操作 —— **报告现状、让用户自己点**(全局安全规则:不替用户改 access control)。
- **`block_replace` 对 `<blockquote>` 静默 no-op(2026-06-24 实测)**:`docs +update --command block_replace` 改 blockquote 块返回 `ok:true` 但内容/块 id 不变、不报错(假成功);对 `<p>`/`<li>`/table cell 正常。**改 blockquote 内文改用 `str_replace`** 行内精确替换兜底。
- **CLI 在 JSON 前打进度行 → 裸 `json.load` 假失败、勿盲目重试(2026-06-24,media-insert 实测连坑 2 个子智能体)**:`docs +media-insert`(及 `drive +apply-permission`、`drive files list --page-all` 等)会先打 `Requesting…` / `[page N] fetching…` 等进度行再输出 JSON,脚本 `json.load(sys.stdin)` 从首行即抛 JSONDecodeError → **误判失败**。后端其实已成功 → **盲目重试 = 重复操作**(media-insert 重试 → 图被插两次,需事后 `block_delete` 去重)。规则:解析前先用 `re.search(r'\{.*\}', text, re.S)` 抠 JSON;**任何写操作重试前先 re-fetch 确认后端是否已落地**,不据「解析失败」判定失败。
- **`<cite>` 卡片 title 是创建时的过时快照,留空回填不刷新缓存(2026-06-24 实测)**:`<cite doc-id="X" type="doc">` **锚文本留空**时飞书回填 title,但回填走**缓存快照**——目标文档标题刚改过(如加 📖)、或目标刚建好时,回填会拿到**旧标题 / 「未命名文档」**;且**重新 block_replace 留空再回填仍中旧缓存、不刷新**(实测 Method A 失败)。规则:要刷新 cite 卡显示,**显式写死当前真实标题** `<cite doc-id="X" file-type="docx" title="&lt;当前真实标题&gt;" type="doc"></cite>`(Method B,实测可靠;`docs +update str_replace`/`block_replace` 均可)。例:本会话给 8 篇学习文档标题加回 📖 后,各篇开头「相关文档」里指向兄弟篇的 cite 卡仍显旧标题(无 📖)/「未命名文档」,留空重解析不刷新,改显式写死当前 📖 标题才正(17 个 cite 这么刷好)。
