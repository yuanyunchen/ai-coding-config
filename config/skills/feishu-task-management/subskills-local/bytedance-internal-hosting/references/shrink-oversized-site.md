# 多文件站 > 50MB — 分层瘦身塞进 Goofy

Goofy 快速预览 ≤50MB(见 goofy.md 坑1)。多文件交互站(starmap 类:index.html + data.js + 大量图片 assets)常远超。**原目录不动,拷副本到 scratchpad 处理**。分层做:先无损,不够再有损,有损从最不重要的图开始。

## 先量:预算拆解

zip ≈ 主图(JPG 不可压)+ data.js(文本,-9 后约 1/4)+ 小头。
- `data.js` 越大(embedding 方法/坐标越多)留给图的越少:实测 12 方法版 data.js 压缩后 2.7MiB,主图要压到 344px;4 方法版 data.js 1.2MiB,主图 360px 就够。
- 目标 **< 50,000,000 字节**(按十进制留余量,见 goofy.md 单位歧义)。

## 分层策略(从无损到有损)

1. **无损**:`jpegtran -optimize -copy none`(去元数据 + 优化 Huffman,**像素不变**,省 ~2–5%);文本走 `zip -9`。**先做,零画质损失**。
2. **判非主图能否砍**:先量各类图占比。相册图 a*.jpg 往往**已是 320px 缩略图、每张 ~20KB,压不动**(重编码 q80 反而更大);落地页 lp.jpg 可缩(560→512 省 ~17%)。
3. **删非主图 + 同步改 data.js 引用**(避免破图):只留 main.jpg,把 data.js 里 `"lp":"assets/..."`→`"lp":""`、`"album":[...]`→`"album":[]`(正则)。渲染端本就有 `if(p.imgs.lp)` / album 数组守卫 + main 的 `onerror` 隐藏,置空后**自动不渲染、无破图/空位**——实测点开商品只剩主图,干净。
4. **缩主图**:main 560px → 360/344px(面积≈0.4×),点开看略软但可辨;星图主视图(星点,不含图)零影响。用 `sips -Z <边长>` 再 `jpegtran` 优化。

## 图片压缩现实(别白试)

- starmap 图**已高度压缩**:main/lp 560px ~80KB、album 320px ~20KB。
- **对已压过的图重编码降质(q80)反而更大**——只能 **resize(缩尺寸)**。
- 尺寸-体积近似平方:要减半体积 → 边长 ×0.71。

## 可复用脚本(拷副本 → 去 lp/相册 → 主图缩到 CAP → 打包量大小)

```python
import os, re, subprocess, shutil
from concurrent.futures import ThreadPoolExecutor
SRC="<原站目录>"; UP="<scratchpad/副本目录>"; CAP=360   # 不够就 344/336…
if os.path.exists(UP): shutil.rmtree(UP)
os.makedirs(UP)
shutil.copy2(f"{SRC}/index.html", f"{UP}/index.html")
# data.js 去 lp/album 引用(渲染守卫会自动跳过,不破图)
d=open(f"{SRC}/data.js",encoding="utf-8").read()
d=re.sub(r'"lp":"assets/[^"]*"','"lp":""',d)
d=re.sub(r'"album":\[[^\]]*\]','"album":[]',d)
open(f"{UP}/data.js","w",encoding="utf-8").write(d)
# 只留 main.jpg:resize CAP + jpegtran 无损
mains=[r for r,_,fs in os.walk(f"{SRC}/assets") if 'main.jpg' in fs]
def build(root):
    rel=os.path.relpath(root,f"{SRC}/assets"); od=os.path.join(UP,"assets",rel); os.makedirs(od,exist_ok=True)
    s=os.path.join(root,"main.jpg"); dst=os.path.join(od,"main.jpg")
    subprocess.run(["sips","-Z",str(CAP),s,"--out",dst],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(["jpegtran","-optimize","-copy","none",dst],stdout=open(dst+".t",'wb'),stderr=subprocess.DEVNULL)
    if os.path.getsize(dst+".t")<os.path.getsize(dst): os.replace(dst+".t",dst)
    else: os.remove(dst+".t")
with ThreadPoolExecutor(max_workers=8) as ex: list(ex.map(build,mains))
```
打包(文本 -9、assets -1、保结构):
```bash
( cd "$UP" && zip -9 -X out.zip index.html data.js >/dev/null && zip -1 -rX out.zip assets -x '.*' '**/.*' >/dev/null )
wc -c out.zip   # 目标 < 50000000;超了把 CAP 调小重跑
```

## 处理注意

- 只在 scratchpad 拷副本处理,**原交付目录不动**。
- 处理路径含空格(如 `7.15 交付/`)时循环用 `os.walk`/null 分隔,别用 `for f in $(find ...)`(会被空格拆断)。
- 删 lp/相册前先量 main/lp/album 各自占比(决定砍谁);相册图基本没压缩空间,别指望它救场。
- 保留完整版:这是**上传专用瘦身版**,原版另存;若飞书云盘要放,那是单文件报告的事,与此无关。
