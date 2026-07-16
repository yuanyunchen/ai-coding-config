# 飞书云盘托管 — 上传 / 保 link 覆盖 / 新文件绕过 / 权限 / 踩坑

飞书云盘只渲染**单个自包含 HTML**(文件 Preview);多文件应用相对引用会 404,别上飞书。上传 **HTML 文件本体**,别 import 成 docx(降级丢图)。文件 URL 常是 `.us.larkoffice.com/file/<token>`,文件夹 `.larkoffice.com/drive/folder/<token>`,都可用。执行层细节走 `lark-drive` skill。

## 1. 两条上传路

### A. lark-cli(首选,批量快)
```bash
lark-cli drive +create-folder --as user --name "<夹名>"        # 拿 folder_token
( cd "<文件所在目录>" && lark-cli drive +upload --as user \
    --file "./<相对名>" --folder-token "<t>" --name "<飞书文件名>" )
```
- 在用户 Drive 建/传须 `--as user`(tenant 撞 1255002)。
- `--file` **只认相对路径** → 用子 shell `( cd 目录 && ... )`(裸 `cd` 后 PATH 可能丢,必要时用 lark-cli 绝对路径 `/Users/<u>/.local/node/bin/lark-cli`)。
- 覆盖已有文件:`--file-token <token>`(原地替换,不改权限)。
- **坑 — keychain 被沙箱锁**:报「keychain access blocked」(沙箱内外、`dangerouslyDisableSandbox` 都不行)。**需用户在交互式终端跑一次** `lark-cli config keychain-downgrade`(把密钥落本地文件;代价:同机同用户进程可读该文件)。锁着时只能走网页版(B)。

### B. 网页版(keychain 锁时)
- 文件夹「Upload → **Upload Files**」= **showOpenFilePicker 原生选择器**,注入不了;拖拽走 **webkitGetAsEntry**,合成 DataTransfer 也喂不进。→ **网页版没法直接传新文件**。
- **能注入的只有单文件「⋯ → Upload New Version」**(经典 `<input type=file>`,拦截器可捕获)。
- **新文件绕过 = Make-a-Copy 技法**(纯网页,无需 CLI):
  1. 对任一现有文件「⋯ / 右键 → **Make a Copy**」→ 复制对话框里**设目标文件名** + 选目标文件夹 → Confirm。
  2. 打开这个副本(toast「View now」)。
  3. 副本「⋯ → **Upload New Version**」→ 注入真实内容(自动改名为上传文件名)。
  副本内容随即被真实内容替换,得到一个新 token 的新文件。

## 2. 保 link 覆盖(飞书原地更新)

文件「**⋯ → Upload New Version**」注入新文件:
- **同 token / URL 不变**;旧版进 **Edit History**(Ver.N,可回溯),**评论保留**。
- **自动改名为上传文件的文件名**(要保原名就传同名文件;要改名就把注入的 `File` 名设成目标名——一步到位)。
- 覆盖不改权限。

注入 Upload New Version 的经典配方(菜单开着时一个 JS 连贯做完,避开大文件页卡顿导致的 input 失效):
```js
window.__captured=null; const oc=HTMLInputElement.prototype.click;
HTMLInputElement.prototype.click=function(){if(this.type==='file'){window.__captured=this;return;}return oc.apply(this,arguments);};
// 点开 ⋯ 菜单后:
const mi=[...document.querySelectorAll('[role="menuitem"],li,div,span')].filter(e=>e.textContent.trim()==='Upload New Version'&&e.offsetParent).sort((a,b)=>a.textContent.length-b.textContent.length)[0];
mi.click(); let inp=null; for(let i=0;i<40;i++){if(window.__captured){inp=window.__captured;break;}await new Promise(r=>setTimeout(r,50));}
const blob=await (await fetch("http://127.0.0.1:8731/x.html")).blob();
const dt=new DataTransfer(); dt.items.add(new File([blob],"<目标文件名>.html",{type:"text/html"}));
inp.files=dt.files; inp.dispatchEvent(new Event("change",{bubbles:true}));
```

## 2b. 重命名(独立,不换内容)

三种入口,按场景选:
- **随覆盖一步改**(最省):Upload New Version 时把注入的 `File` 名设成目标名 → 内容+名字一次到位(见上)。
- **只改名**:文件「**⋯ → Rename**」;或**从文件夹列表**该文件行的「⋯ → Rename」——**文件页很重(大 HTML)时 ⋯ 菜单/输入框读不稳,优先从轻量的文件夹列表页改名**。
- 改完列表可能不刷新,`location.reload(true)` 后用 `find`/DOM 读该行名确认。
- 改名**不动 token/URL/内容/权限**;只有 Upload New Version 才换内容。

## 2c. 大小限制(飞书云盘)

- **没有 Goofy 那种 50MB 死限**:`lark-cli drive +upload` 对 **>20MB 自动走分片上传**,单文件报告(实测 8.8MB)乃至更大都行——所以**单文件大报告优先飞书云盘**,不必为体积发愁。
- 但飞书 Preview **只渲单文件**;多文件应用仍只能上 Goofy(受 50MB 限,见 shrink-oversized-site.md)。
- 网页版 Upload New Version 注入大文件同样会让页面卡顿几分钟(同 Goofy 大文件冻结),耐心等、轻量 JS 探 readyState。

## 3. Make-a-Copy / Move 踩坑

- **复制/移动对话框里单击文件夹选中常不生效**(会落到 My Folders 根),要**双击进入或确认整行高亮**再 Confirm;落错了用「⋯ → **Move To**」归位(有二次确认弹窗,提示会继承目标夹权限,点 Move)。
- **列表缓存**:新建/移动后文件夹列表不刷新,需 `location.reload(true)` 才显示。

## 4. 权限(用户自理,agent 不代改)

- **改分享/访问权限是用户的动作**(全局安全红线:agent 禁改访问控制)。agent 只上传,保持飞书默认(仅协作者可访问)。
- 用户用文件/文件夹的 **Share** 按钮管 ACL(按人/部门、链接范围、可否复制下载)。
- 云盘文件才有真 ACL;这是选飞书云盘而非 Goofy 的核心理由(Goofy 无按人权限)。

## 5. 其它踩坑

- **飞书 Preview 默认空白**,点顶部 **Preview** 才渲染(大文件多等两三秒);默认视图可能是 Code。
- **大 HTML 文件页很重**:Edit History 面板读不稳、截图/JS 超时。**改用文件夹列表的 Modified 时间戳**核验是否更新到位(比在文件页读版本可靠)。
- 上传成功后 file url 用 `.us.larkoffice.com`,folder url 用 `.larkoffice.com`,不影响使用。
- 实测:飞书 Preview 能渲 8.8MB 单文件报告(带 SVG 图表);抽验最大/最小两端即可。
