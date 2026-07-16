# Goofy 快速预览 — 完整流程 + 踩坑

入口:`deploy.bytedance.net/web/quick-preview/{create, list, redeploy/<name>}`。产物 `<prefix>.gf-preview.bytedance.net`。全程走 claude-in-chrome 插件。

## 1. 新建(Create preview)

1. build 自包含产物;打 zip:
   - 单文件 landing 拼多页 → `references/build_site_zip.sh`(扁平 `zip -j -X`)。
   - **多文件应用保结构** → `zip -rX index.html data.js assets`(**不能 `-j` 拍平**,assets 子目录必须在);排除 `.DS_Store`:`-x '.*' '**/.*'`。
   - 压缩等级:文本(index/data.js)`-9`;assets(JPG)`-1`(`-0` 存储反而更大——JPG 有可挤 padding;`-9` 对 JPG 无用还慢)。
2. 起本地 CORS server(`references/inject_file.md`),插件开 `.../quick-preview/create`。
3. 注入 zip 到上传框(见 §4 注入)。**若 >50MB 会被静默拒**(见 §5 坑1)。
4. 等 deploy.yml 自动生成(`version:1 / web{dir:. runtime:worker} / routes[src:/** → web]`,静态站,index.html 默认页)。
5. 填字段:**Validity period**(最大 30,填 180/365 被夹到 30)、**Description**、**Preview domain** 前缀(= 最终子域名)、Region 默认 China North。
6. 点 **Create preview** → 轮询真实完成信号(§5 坑2)→ 产物 `<prefix>.gf-preview.bytedance.net`。

## 2. 覆盖更新(保 link 不变)

`deploy.bytedance.net/web/quick-preview/redeploy/<preview-name>` → 装拦截器/点上传区 → 注入新 zip → (Validity 重设 30)→ Create preview。**域名/URL 不变**,有效期重置。域名前缀输入框此时锁定为原名。

## 3. 表单字段用 React 兼容方式设(截图卡顿时用 JS)

直接 `el.value=` 不触发 React onChange,必须原型 setter + input/change:
```js
function setReact(el,val){const s=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; s.call(el,val); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}
const inputs=[...document.querySelectorAll('input')];
setReact(inputs.find(i=>i.type==='text'&&/^\d+$/.test(i.value)),'30');           // Validity(值为数字的 text)
setReact(inputs.find(i=>/description/i.test(i.placeholder||'')),'<desc>');
setReact(inputs.find(i=>/prefi/i.test(i.placeholder||'')),'<prefix>');            // Preview domain
```
点按钮同理走 JS:`[...document.querySelectorAll('button')].find(b=>/^Create preview$/i.test(b.textContent.trim())&&b.offsetParent).click()`(先查 `!b.disabled`)。

## 4. 注入(上传框)

上传控件是 antd Upload。两种注入:
- **小文件**:`document.querySelector('input[type=file]')` 直接赋值 + change(见 inject_file.md)即可。
- **更稳(尤其大文件)**:装 `HTMLInputElement.prototype.click` 拦截器 → 点上传区(约屏幕中央 "+" 区)→ 组件创建的 input 被 `window.__captured` 捕获 → 注入到它。

## 5. 三大坑(最贵)

**坑1 — 50MB 死限,不是界面写的 200MB。** beforeUpload 校验拒超限,**静默清空 `input.files`**,只弹一闪即逝的 antd toast「The file size cannot exceed 50 MB.」。排查:注入后轮询 `.ant-message` 文本 3 秒抓 toast:
```js
let msgs=new Set(); for(let i=0;i<16;i++){document.querySelectorAll('.ant-message,[class*="message"]').forEach(e=>{const t=(e.textContent||'').trim(); if(t&&/MB|exceed/i.test(t))msgs.add(t);}); await new Promise(r=>setTimeout(r,150));}
```
**单位歧义**:50MB/30天 不确定是 MiB 还是十进制 MB。稳妥按**十进制(更严)**留余量——实测 47.4MB 收;压到 <50,000,000 字节最安全。超限只能瘦身(`shrink-oversized-site.md`)。

**坑2 — 误判成功。** 左侧步骤条**恒有** "Deploying / Deployment complete / View preview" 静态标签,匹配到就误判。**真信号** = 出现实际文案「deployment was successful」+ **可见的**(offsetParent≠null)View preview 按钮;或去 `list` 页确认 preview 出现。`Time elapsed` 计数在涨才是真在跑。**47MB / 2259 文件真实部署 ~3 分钟**,别急着判失败。产物 URL 不在成功页 DOM 里,直接拼 `<prefix>.gf-preview.bytedance.net`(部署完成前该域名 404,完成后转正)。

**坑3 — 大文件(40MB+)注入使页面冻结数分钟。** antd 读文件+上传时 screenshot/JS 全超时(CDP timeout)。对策:耐心 `wait`,用**最轻**的 JS 查 `document.readyState`,别频繁截图;冻结是上传在进行,不是死了。

## 6. 验证

导航 `<prefix>.gf-preview.bytedance.net` → 截图看主视图 → 点交互元素(如商品卡)确认 → 页面内 `fetch(url,{method:'HEAD'})` 批量查子路径 200。覆盖更新用「新版唯一片段是否出现在服务端返回 + 该 preview 的 Modified/版本」双验。

## 7. 权限现实

Goofy 快速预览**无按人 ACL**:开着 = 全内网 SSO 可见(凭链接可开),或详情页 `Disabled` 整体关停。要真按人权限 → 走飞书云盘(见 feishu-drive.md)。有效期最大 30 天,临期在 list 页 Redeploy 续(URL 不变)。
