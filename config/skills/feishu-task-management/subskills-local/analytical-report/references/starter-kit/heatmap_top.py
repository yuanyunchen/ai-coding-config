#!/usr/bin/env python3
"""Render a top-N main-city co-occurrence heatmap (search-main-city x pixel-main-city
among dual-covered users). Unified top-N city set on both axes so the diagonal =
same main city. log10 color shows dispersion (94% disagree -> faint diagonal, spread).
Usage: python3 heatmap_top.py [csv] [N] [out.png]
"""
import csv, sys, math, pathlib, unicodedata
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
src = sys.argv[1] if len(sys.argv) > 1 else str(HERE/"csv_2w"/"qD4_heatmap.csv")
N = int(sys.argv[2]) if len(sys.argv) > 2 else 100
out = sys.argv[3] if len(sys.argv) > 3 else str(ROOT/"charts_2w"/"c_D4_heatmap_top100.png")

# CJK font (best effort)
for fp in ["/System/Library/Fonts/PingFang.ttc","/System/Library/Fonts/Hiragino Sans GB.ttc",
           "/System/Library/Fonts/STHeiti Medium.ttc"]:
    if pathlib.Path(fp).exists():
        fm.fontManager.addfont(fp); plt.rcParams["font.family"]=fm.FontProperties(fname=fp).get_name(); break
plt.rcParams["axes.unicode_minus"]=False

names={}
with open(HERE/"geoname_city_names.csv") as f:
    for r in csv.DictReader(f): names[r["id"]]=r["name"]
def cn(c): return names.get(str(c), str(c))
# ASCII-fold 刻度标签:NFKD 分解后丢弃组合附加符号(category Mn),避免字体缺字方块
# 例 "Seleuș"→"Seleus";CJK 无组合符,原样通过(由 CJK 字体渲染)。
def asciify(s):
    return "".join(ch for ch in unicodedata.normalize("NFKD", str(s))
                   if unicodedata.category(ch) != "Mn")

pairs=[]; tot=defaultdict(float)
with open(src) as f:
    for r in csv.DictReader(f):
        u=float(r["users"]); cs,cp=r["city_s"],r["city_p"]
        pairs.append((cs,cp,u)); tot[cs]+=u; tot[cp]+=u
cell={(cs,cp):u for cs,cp,u in pairs}
top=[c for c,_ in sorted(tot.items(),key=lambda x:-x[1])[:N]]
idx={c:i for i,c in enumerate(top)}
mat=np.zeros((N,N))
mass_in=0.0; mass_all=sum(u for _,_,u in pairs); nz=0; diag=0; offdiag=0
for cs,cp,u in pairs:
    if cs in idx and cp in idx:
        mat[idx[cs],idx[cp]]+=u; mass_in+=u; nz+=1
        if cs==cp: diag+=u
        else: offdiag+=u
print(f"src={pathlib.Path(src).name} N={N} pairs={len(pairs)} cells_filled={nz}/{N*N} "
      f"({nz/(N*N)*100:.1f}%) mass_in_grid={mass_in/mass_all*100:.1f}% "
      f"diag={diag/mass_in*100:.1f}% offdiag={offdiag/mass_in*100:.1f}%")

fig,ax=plt.subplots(figsize=(9,8))
im=ax.imshow(np.log10(mat+1),cmap="YlOrBr",aspect="auto")
# sparse ticks: label every Nth city to avoid clutter
step=max(1,N//20)
ticks=list(range(0,N,step))
ax.set_xticks(ticks); ax.set_xticklabels([asciify(cn(top[i])) for i in ticks],rotation=70,ha="right",fontsize=6)
ax.set_yticks(ticks); ax.set_yticklabels([asciify(cn(top[i])) for i in ticks],fontsize=6)
ax.set_xlabel("pixel 主城  (按重合用户量降序 top%d)"%N); ax.set_ylabel("search 主城  (top%d)"%N)
cb=plt.colorbar(im,label="log10(用户数+1)");
ax.set_title("重合用户主城共现热力图 top%d — 对角=两源同城,散布=不一致"%N,loc="left",fontsize=11,weight="bold")
fig.tight_layout(); fig.savefig(out,dpi=170); plt.close()
print("saved",out)
