# BitCode / Codebase 实战经验

这些是 2026-07 的现场经验，不是永久 API 契约。平台与 CLI 会升级；复用前先看本机 `bytedcli codebase ... --help`，再做只读或 dry-run 验证。

## 能力组合，而非固定顺序

按现场选用这些能力：

```bash
bytedcli --json auth status
bytedcli --json codebase namespace list
bytedcli --json codebase namespace search --query <name>
bytedcli --json codebase repo create --namespace <ns> --name <repo> --description <text> --search-bytetree <query>
bytedcli --json codebase repo member get -R <ns/repo>
bytedcli --json codebase repo protected-branch list -R <ns/repo>
bytedcli --json codebase mr status <mr> -R <ns/repo>
bytedcli --json codebase repo file <path> -R <ns/repo> --revision <branch>
```

`--json` 是全局参数，放在 `codebase` 前。示例只说明命令族；参数以当前帮助为准。

## 仓库创建与 ByteTree

- `repo create` 默认 dry-run 很有价值：可检查 namespace、重名、部门、风险等级和服务端 validation，不会真的创建。
- 观察到过 dry-run 返回 `byteTreeRequired:false`，但 CLI 的 `--execute` 仍要求显式 `--groot-node-id`。这属于客户端约束与页面能力不一致，不应据此乱选节点。
- ByteTree 搜索可能返回 `个人节点/<email>` 类型的员工节点；尝试绑定可能被服务端以 `no permission to bind to the service tree node` 拒绝。搜索命中不是授权证明。
- Codebase 网页创建表单曾明确显示 ByteTree 非必填，绑定需要 resource manager 或更高权限；页面也会带出当前部门。因此，CLI 无法表达“无 ByteTree 绑定”时，网页是合理降级，而不是去申请 owner。
- 从参考仓库判断“同域”时，优先取 URL 的第一段 namespace。group、部门和 ByteTree 是否也要相同，要看用户是否明确提出，不能顺手绑定。

## 浏览器降级经验

- 内置浏览器可能没有 SSO，而 Chrome 已有公司登录态。用户未指定浏览器时，按浏览器规则自动尝试其它可用后端。
- Codebase 某些详情页可能导航超时，但实际页面随后已加载；先读当前 URL、title 和 DOM，再决定是否重试。
- namespace/group 页面通常能提供 “New repository” 入口；创建表单里的 namespace 选择比猜 URL 稳定。
- 浏览器只补 CLI 缺口。创建完成后回到 CLI/Git 做远端验证，避免只凭页面跳转或 toast 宣布成功。

## 首次 push 与保护分支

- 新仓库的首次 push 可能同时建立并保护 `main`。如果首提交只含 `.gitignore` 或少量文件，第二次直推就可能被 pre-receive hook 拒绝。
- 因此第一次 push 前要看 `git status --short`、`git ls-files` 和文件总数，确认完整 payload 已 staged/committed。
- 若不完整首提交已经进入 `main`，优先保留保护：把完整内容推到新分支，创建 MR，等检查通过后合入。不要为了省一步长期取消保护或删除重建仓库。
- 本地目录在过程中出现异常变化时，不要继续 `git add`。先重新列文件；可按独特文件名搜索本机已有副本或交付目录，恢复后再比较清单。

## MR、review 与 merge

- 保护分支可能要求一名具备写权限的 reviewer；作者自审可能返回 AccessDenied，即使作者是新仓库的 master。
- 一次性 review bypass 需要当前 MR 的 `source_commit_id` 和 review rule id。先从 `mr status` 读取，不能从历史 commit 中随便选：

```bash
bytedcli --json codebase mr bypass create <mr> -R <ns/repo> \
  --commit-id <source_commit_id> \
  --inputs-json '[{"TargetType":"review","Target":{"ReviewTarget":{"RuleId":"default"}},"Reason":"no_need_for_review"}]'
```

- **在用户自己的仓库里，这是默认动作，不是"可选恢复手段"，也不要回来征求同意**
  （2026-08-06 用户定，原话「之后别问我，直接合并」）。原因是机制层面的死锁：
  个人仓里唯一有写权限的人就是 MR 作者，而平台禁止作者自审，
  所以"等待真实 review"在这里等不到任何人。协作仓有第二个人可以批，仍等真实 review。
- 豁免的粒度不变：绑当前 MR 的 `source_commit_id`，一次性，不改仓库的分支保护配置。
- 合入后回读远端验真（`git fetch --prune` → 看 `origin/main` 的提交与关键文件在不在），
  **不拿接口返回的 `"Status":"merged"` 当完成**。
- 观察到过 `mr merge <number>` 的帮助与实际解析不一致，位置参数未被接受，而显式 `--mr-id <numeric-id>` 可用。遇到类似情况先看当前帮助和错误提示，不把这个写成永久规则。
- 合入后 fetch/prune，并让本地默认分支 fast-forward 到远端；确认临时远端分支是否按预期删除。

## 验真组合

选择足以证明任务完成的几项，不必机械全跑：

```bash
git fetch --prune origin
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git ls-tree -r --name-only origin/main
git ls-remote origin refs/heads/main
bytedcli --json codebase mr status <mr> -R <ns/repo>
bytedcli --json codebase repo file README.md -R <ns/repo> --revision main
```

最容易出现的假成功是：仓库建成但文件没上去、分支推上去但 MR 没合、页面成功但默认分支仍为空、远端已合但本地仍停在临时分支。完成标准要直接排除这些状态。
