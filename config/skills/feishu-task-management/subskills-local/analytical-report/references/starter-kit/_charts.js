/* =========================================================================
   Search vs Pixel · 原生 SVG 图表引擎
   纯函数:输入紧凑数据序列(来自 chartdata.json),输出 SVG 字符串。
   无任何外部库。双色:search=#1f6f8b / pixel=#c8742a。
   每个 chart 函数返回完整 <svg>,直接 innerHTML 注入图表卡片。
   ========================================================================= */
(function (global) {
  "use strict";

  // ---- 主题色(与 CSS 变量同步)----
  var C = {
    search: "#1f6f8b", searchD: "#14525f", searchL: "#d3e6ea", searchBg: "#eef5f6",
    pixel: "#c8742a", pixelD: "#9c540f", pixelL: "#f1ddc4", pixelBg: "#faf1e5",
    product: "#b5aa92",
    ink: "#16202e", inkSoft: "#3a4656", inkFaint: "#6b7686",
    line: "#d8d3c6", lineSoft: "#e7e3d8", panel: "#fffefb", paper: "#f7f5f0",
    gold: "#b8862b", good: "#3f7a52"
  };
  var FS = "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB',sans-serif";
  var FM = "'SF Mono','DejaVu Sans Mono',Menlo,Consolas,monospace";

  // ---- 工具 ----
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function fmtInt(n){ return Math.round(n).toLocaleString("en-US"); }
  // 去尾零:只在小数点之后剥离,绝不删小数点前的有效数字
  // (旧 bug:/\.?0+$/ 让小数点可选,把整数末尾有效零也吃掉 → 2,199,840 误成 "22万")
  function stripZeros(s){ return s.indexOf(".") >= 0 ? s.replace(/\.?0+$/,"") : s; }
  // 大数 → 人类可读(中文单位:亿/万)
  function human(n){
    var a = Math.abs(n);
    if (a >= 1e8) return stripZeros((n/1e8).toFixed(a>=1e9?1:2)) + "亿";
    if (a >= 1e4) return stripZeros((n/1e4).toFixed(a>=1e6?0:(a>=1e5?1:2))) + "万";
    return fmtInt(n);
  }
  function humanM(n){ // 强制 百万(M)
    return stripZeros((n/1e6).toFixed(n>=1e7?1:2)) + "M";
  }
  function svgOpen(vbw, vbh, extra){
    return '<svg viewBox="0 0 '+vbw+' '+vbh+'" preserveAspectRatio="xMidYMid meet" '+
           'font-family="'+FS+'" '+(extra||"")+' xmlns="http://www.w3.org/2000/svg" role="img">';
  }
  function txt(x,y,s,o){
    o = o || {};
    var a = ['x="'+x+'"','y="'+y+'"'];
    a.push('font-size="'+(o.size||11)+'"');
    a.push('fill="'+(o.fill||C.inkSoft)+'"');
    if (o.weight) a.push('font-weight="'+o.weight+'"');
    if (o.anchor) a.push('text-anchor="'+o.anchor+'"');
    if (o.family) a.push('font-family="'+o.family+'"');
    if (o.ls) a.push('letter-spacing="'+o.ls+'"');
    if (o.opacity != null) a.push('opacity="'+o.opacity+'"');
    if (o.transform) a.push('transform="'+o.transform+'"');
    return '<text '+a.join(" ")+'>'+esc(s)+'</text>';
  }
  function line(x1,y1,x2,y2,stroke,w,dash){
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+(w||1)+'"'+
           (dash?' stroke-dasharray="'+dash+'"':'')+'/>';
  }
  function rect(x,y,w,h,fill,o){
    o = o||{};
    var a=['x="'+x+'"','y="'+y+'"','width="'+Math.max(0,w)+'"','height="'+Math.max(0,h)+'"','fill="'+fill+'"'];
    if (o.rx) a.push('rx="'+o.rx+'"');
    if (o.opacity!=null) a.push('opacity="'+o.opacity+'"');
    if (o.stroke) a.push('stroke="'+o.stroke+'" stroke-width="'+(o.sw||1)+'"');
    return '<rect '+a.join(" ")+'/>';
  }

  var Charts = {};

  /* ===================== 1) 覆盖分组柱 + 填充率折线 (A1) ===================== */
  Charts.coverage = function (cov, fill) {
    var W=720, H=360, mL=58, mR=58, mT=28, mB=58;
    var iw=W-mL-mR, ih=H-mT-mB;
    var levels=cov.levels;
    var maxUsers = Math.max.apply(null, cov.search.concat(cov.pixel));
    var yMax = Math.ceil(maxUsers/1e7)*1e7;
    var n=levels.length, gw=iw/n, bw=gw*0.30, gap=gw*0.06;
    function yU(v){ return mT+ih - (v/yMax)*ih; }
    function yF(p){ return mT+ih - (p/100)*ih; }
    var s='';
    s += svgOpen(W,H,'aria-label="各源各层级覆盖用户数与城市级填充率"');
    // y 轴网格(用户,百万)
    for (var g=0; g<=yMax; g+=2e7){
      var yy=yU(g);
      s+=line(mL,yy,W-mR,yy,C.lineSoft,1);
      s+=txt(mL-9,yy+4, (g/1e6)+"", {size:10.5,fill:C.inkFaint,anchor:"end",family:FM});
    }
    s+=txt(mL-9, mT-12, "百万用户", {size:10,fill:C.inkFaint,anchor:"end",weight:700});
    // 右轴(填充率 %)
    [0,25,50,75,100].forEach(function(p){
      var yy=yF(p);
      s+=txt(W-mR+9, yy+4, p+"%", {size:10.5,fill:C.pixelD,anchor:"start",family:FM});
    });
    s+=txt(W-mR+9, mT-12, "填充率", {size:10,fill:C.pixelD,anchor:"start",weight:700});
    // 柱 — 记录每簇柱内值标签占据的 y 区间(柱顶~柱顶+labelBand),供折线标签避让
    var labelBand = 12;                 // 柱内值标签上下半高
    var barTopY = [];                   // 每簇较高柱(此处恒为 search)柱顶 y
    for (var i=0;i<n;i++){
      var cx=mL+i*gw+gw/2;
      var x1=cx-bw-gap/2, x2=cx+gap/2;
      var sv=cov.search[i], pv=cov.pixel[i];
      s+=rect(x1, yU(sv), bw, mT+ih-yU(sv), C.search, {rx:2});
      s+=rect(x2, yU(pv), bw, mT+ih-yU(pv), C.pixel, {rx:2});
      barTopY[i] = Math.min(yU(sv), yU(pv));   // 该簇柱内标签带的最高边界
      // 值标:放在柱内顶部(白字),与上方填充率折线标签垂直分离
      s+=txt(x1+bw/2, yU(sv)+14, humanM(sv), {size:10,fill:"#fff",anchor:"middle",weight:700,family:FM});
      // pixel 柱矮时柱内放不下 → 放柱顶上方
      if (mT+ih-yU(pv) > 22){
        s+=txt(x2+bw/2, yU(pv)+14, humanM(pv), {size:10,fill:"#fff",anchor:"middle",weight:700,family:FM});
      } else {
        s+=txt(x2+bw/2, yU(pv)-6, humanM(pv), {size:10,fill:C.pixelD,anchor:"middle",weight:700,family:FM});
      }
      // x 标签
      s+=txt(cx, H-mB+18, levels[i], {size:11.5,fill:C.ink,anchor:"middle",weight:600});
      // L2 高亮底
      if (levels[i].indexOf("L2")>=0){
        s+=rect(cx-gw/2+4, H-mB+24, gw-8, 3, C.gold, {rx:1.5});
        s+=txt(cx, H-mB+40, "主粒度", {size:9.5,fill:C.gold,anchor:"middle",weight:700,ls:"0.05em"});
      }
    }
    // 填充率折线(labelDy<0 标在点上方,>0 在下方)。
    // 碰撞避让:点标签放下方时,若落入该簇柱内值标签带,则下移到带下沿之外。
    function poly(arr,color,labelDy){
      var pts=arr.map(function(p,i){ return (mL+i*gw+gw/2)+","+yF(p); }).join(" ");
      var d='<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.4" stroke-dasharray="1 5" stroke-linecap="round"/>';
      arr.forEach(function(p,i){
        var cx=mL+i*gw+gw/2, py=yF(p), ly=py+labelDy;
        if (labelDy>0){
          // 柱内值标签占据 [barTopY+14-labelBand, barTopY+14+labelBand];标签若在其中则避让
          var bandTop = barTopY[i]+14-labelBand, bandBot = barTopY[i]+14+labelBand;
          if (ly > bandTop-8 && ly < bandBot+4) ly = bandBot+11;   // 下移到柱内标签带之下
        }
        d+='<circle cx="'+cx+'" cy="'+py+'" r="3.6" fill="'+C.panel+'" stroke="'+color+'" stroke-width="2"/>';
        // 填充率标签带白描边底,确保压在柱上也清晰
        d+='<text x="'+cx+'" y="'+ly+'" font-size="10.5" font-family="'+FM+'" font-weight="700" text-anchor="middle" fill="#fff" stroke="#fff" stroke-width="3" paint-order="stroke">'+p.toFixed(1)+'%</text>';
        d+=txt(cx, ly, p.toFixed(1)+"%", {size:10.5,fill:color,anchor:"middle",weight:700,family:FM});
      });
      return d;
    }
    // pixel 填充率较低、线在中部 → 标签放下方;search 高 → 放上方
    s+=poly(fill.pixel, C.pixelD, 18);
    s+=poly(fill.search, C.searchD, -11);
    // 轴线
    s+=line(mL,mT,mL,mT+ih,C.line,1.2);
    s+=line(mL,mT+ih,W-mR,mT+ih,C.line,1.2);
    s+='</svg>';
    return s;
  };

  /* ===================== 2) 100% 堆叠分解条 (C2 decomp) — HERO ===================== */
  Charts.decomp = function (d) {
    var W=720, H=232, mL=20, mR=20, mT=58, barH=64;
    var iw=W-mL-mR;
    var total=d.total;
    var win=d.window||"本窗";    // 窗口标签由数据传入,避免硬编码
    var segs=[
      {k:"net_new", label:"net-new 全新", v:d.net_new, color:C.pixel, dark:C.pixelD,
       desc:"本窗("+win+")未观测到 pixel 地理(非绝对永久增量)"},
      {k:"refine", label:"refine 细化到城", v:d.refine, color:C.search, dark:C.searchD,
       desc:"pixel 已知该用户地理、search 补出城级"},
      {k:"both", label:"both 交集", v:d.both, color:C.product, dark:"#6f6750",
       desc:"两源都给出城级地理"}
    ];
    var s=svgOpen(W,H,'aria-label="search 有城用户增量分解:net-new / refine / both 100% 堆叠条"');
    // 顶部标尺
    s+=txt(mL, 22, "search 有城用户", {size:12,fill:C.inkFaint,weight:700});
    s+=txt(W-mR, 22, fmtInt(total)+" 人 · 100%", {size:12,fill:C.ink,anchor:"end",weight:700,family:FM});
    var x=mL, y=mT;
    var narrow=[]; // 收集窄段,统一在柱下方错开标注
    segs.forEach(function(g){
      var w=(g.v/total)*iw;
      s+=rect(x,y,w,barH,g.color,{});
      var pct=(g.v/total*100);
      if (w>70){
        s+=txt(x+w/2, y+barH/2-3, pct.toFixed(1)+"%", {size:18,fill:"#fff",anchor:"middle",weight:700,family:FS});
        s+=txt(x+w/2, y+barH/2+16, g.label, {size:11,fill:"#fff",anchor:"middle",weight:600,opacity:0.95});
      } else {
        narrow.push({cx:x+w/2, pct:pct, dark:g.dark, key:g.k, name:g.label.split(" ")[0]});
      }
      x+=w;
    });
    // 窄段标注下移到柱下方(柱上方右侧被总计标签占用),错开末端 x 防重叠
    // 末段(both,最靠右)标签右对齐贴右边距,防止溢出画布
    narrow.forEach(function(nb, idx){
      var last = idx === narrow.length-1;
      var drop = idx===0 ? 12 : 26;            // 交错深度(向下)
      var endX = last ? (W-mR) : (nb.cx - 22); // 末段右对齐到右边距,其余左偏
      var anchor = last ? "end" : "middle";
      s+=line(nb.cx, y+barH, nb.cx, y+barH+drop-6, nb.dark, 1);
      s+=line(nb.cx, y+barH+drop-6, last ? endX-4 : endX, y+barH+drop, nb.dark, 1);
      s+=txt(endX, y+barH+drop+11, nb.name+" "+nb.pct.toFixed(1)+"%", {size:10.5,fill:nb.dark,anchor:anchor,weight:700,family:FM});
    });
    // 段分隔白线
    var xx=mL;
    segs.forEach(function(g,i){ if(i>0){ s+=line(xx,y,xx,y+barH,"#fff",1.5);} xx+=(g.v/total)*iw; });
    // 图例(细)— 留出窄段下方标注空间
    var ly=y+barH+52, lx=mL;
    segs.forEach(function(g){
      s+=rect(lx, ly-9, 11, 11, g.color, {rx:2});
      var lab=g.label+" — "+humanM(g.v)+" · "+g.desc;
      s+=txt(lx+17, ly, lab, {size:11.5,fill:C.inkSoft});
      ly+=20;
    });
    s+='</svg>';
    return s;
  };

  /* ===================== 3) 控池配对双柱 (C3 copresence) — 最强证据 ===================== */
  Charts.copresence = function (cp) {
    var W=720, H=350, mL=70, mR=30, mT=64, mB=60;
    var iw=W-mL-mR, ih=H-mT-mB;
    var yMax=70;
    function yV(p){ return mT+ih-(p/yMax)*ih; }
    var s=svgOpen(W,H,'aria-label="两源共同出现用户上各自给出城市比例,search 远高于 pixel"');
    // 分母说明(独立顶部带,不与图形重叠);采样窗(2w/1m)无精确 users 计数,改述比率
    var hasN = cp.users!=null;
    var topTxt = hasN
      ? "同一批人 = 两源都出现过的 "+humanM(cp.users)+" 人 — 池子大小一样,差距就是真增量"
      : "同一批共同用户(两源都出现过)— 池子大小一样,差距就是真增量"+(cp.sampled?"(1/10 采样)":"");
    s+=txt(mL, 22, topTxt, {size:12,fill:C.inkSoft,weight:600});
    // 网格
    for (var g=0; g<=yMax; g+=10){
      var yy=yV(g);
      s+=line(mL,yy,W-mR,yy,C.lineSoft,1);
      s+=txt(mL-9,yy+4,g+"%",{size:10.5,fill:C.inkFaint,anchor:"end",family:FM});
    }
    // 两柱
    var bw=118;
    var cxS=mL+iw*0.30, cxP=mL+iw*0.70;
    s+=rect(cxS-bw/2, yV(cp.search_pct), bw, mT+ih-yV(cp.search_pct), C.search, {rx:3});
    s+=rect(cxP-bw/2, yV(cp.pixel_pct), bw, mT+ih-yV(cp.pixel_pct), C.pixel, {rx:3});
    // 柱顶值
    s+=txt(cxS, yV(cp.search_pct)-12, cp.search_pct+"%", {size:26,fill:C.searchD,anchor:"middle",weight:700,family:FS});
    s+=txt(cxP, yV(cp.pixel_pct)-12, cp.pixel_pct+"%", {size:26,fill:C.pixelD,anchor:"middle",weight:700,family:FS});
    // x 标签
    s+=txt(cxS, H-mB+20, "search 给出城市", {size:12.5,fill:C.ink,anchor:"middle",weight:600});
    s+=txt(cxP, H-mB+20, "pixel 给出城市", {size:12.5,fill:C.ink,anchor:"middle",weight:600});
    // 分子由 共同用户 × 给城率 推得(避免硬编码,随窗自适应);采样窗无计数时改述「同批人比率」
    if (hasN){
      s+=txt(cxS, H-mB+37, humanM(cp.users*cp.search_pct/100)+" / "+humanM(cp.users), {size:10.5,fill:C.inkFaint,anchor:"middle",family:FM});
      s+=txt(cxP, H-mB+37, humanM(cp.users*cp.pixel_pct/100)+" / "+humanM(cp.users), {size:10.5,fill:C.inkFaint,anchor:"middle",family:FM});
    } else {
      s+=txt(cxS, H-mB+37, "占同批人 "+cp.search_pct+"%", {size:10.5,fill:C.inkFaint,anchor:"middle",family:FM});
      s+=txt(cxP, H-mB+37, "占同批人 "+cp.pixel_pct+"%", {size:10.5,fill:C.inkFaint,anchor:"middle",family:FM});
    }
    // 12.6× 徽标:置于两柱之间空白(中高度),连线到两柱顶,远离顶部副标题
    var mx=(cxS+cxP)/2;
    var badgeY=yV(28); // 28% 高度处,介于 search 柱顶(60.6)与 pixel 柱顶(4.8)之间的空白
    // 从 search 柱顶引一条到徽标,再从徽标引到 pixel 柱顶
    s+='<path d="M'+cxS+' '+(yV(cp.search_pct)-30)+' Q '+(mx-30)+' '+(badgeY-30)+' '+mx+' '+(badgeY-16)+'" fill="none" stroke="'+C.gold+'" stroke-width="1.4" stroke-dasharray="4 3"/>';
    s+='<path d="M'+mx+' '+(badgeY+16)+' Q '+(mx+40)+' '+(badgeY+40)+' '+cxP+' '+(yV(cp.pixel_pct)-30)+'" fill="none" stroke="'+C.gold+'" stroke-width="1.4" stroke-dasharray="4 3"/>';
    s+=rect(mx-46, badgeY-17, 92, 33, C.ink, {rx:7});
    s+=txt(mx, badgeY+1, cp.multiple+"×", {size:20,fill:"#fff",anchor:"middle",weight:700,family:FS});
    s+=txt(mx, badgeY+13, "倍", {size:9,fill:"#9fb0bd",anchor:"middle",weight:600});
    s+=line(mL,mT+ih,W-mR,mT+ih,C.line,1.2);
    s+='</svg>';
    return s;
  };

  /* ===================== 3b) 控池倍数 4 窗(C3 配图)=====================
     控池倍数量级 5–13×,与覆盖图 0–4× 右轴不共尺,故单独成图。
     4 窗柱:3d 12.6 / 1w 10.2 / 2w 7.4 / 1m 5.5;2 周(主窗)高亮。
     2w / 1m 为 1/10 采样估计 → 柱顶打 ≈ 标 + 底部脚注。 */
  Charts.controlTrend = function (TREND) {
    var wins = TREND.windows, ser = TREND.series;
    var W=720, H=320, mL=52, mR=24, mT=58, mB=72;
    var iw=W-mL-mR, ih=H-mT-mB;
    var mult = wins.map(function(w){ return ser.common_multiple[w.k]; });
    var sp   = wins.map(function(w){ return ser.common_search_city_pct[w.k]; });
    var px   = wins.map(function(w){ return ser.common_pixel_city_pct[w.k]; });
    var sampSet = {"2w":1,"1m":1};
    var yMax = 14;
    function yV(v){ return mT+ih - (v/yMax)*ih; }
    var n=wins.length, gw=iw/n, bw=Math.min(64, gw*0.42);
    var s=svgOpen(W,H,'aria-label="控池倍数随观测窗:3天12.6倍/1周10.2倍/2周7.4倍/1月5.5倍,同一批人 search 给城远高于 pixel"');
    s+=txt(mL, 20, "同一批共同用户身上 · search 给城率 ÷ pixel 给城率(池子大小已对齐)", {size:12,fill:C.inkSoft,weight:600});
    // y 网格 + ×刻度
    [0,2,4,6,8,10,12,14].forEach(function(m){
      var yy=yV(m);
      s+=line(mL,yy,W-mR,yy,C.lineSoft,1);
      s+=txt(mL-9,yy+4,m+"×",{size:10.5,fill:C.inkFaint,anchor:"end",family:FM});
    });
    s+=txt(mL-9, mT-12, "控池倍数", {size:10,fill:C.inkFaint,anchor:"end",weight:700});
    // parity 1× 参考
    s+=line(mL,yV(1),W-mR,yV(1),C.pixelL,1.4,"4 4");
    wins.forEach(function(w,i){
      var cx=mL+gw*(i+0.5), isMain=w.k==="2w";
      var v=mult[i], top=yV(v);
      // 柱
      s+=rect(cx-bw/2, top, bw, mT+ih-top, isMain?C.gold:C.search, {rx:4, opacity:isMain?1:0.9});
      if (isMain) s+=rect(cx-bw/2, top, bw, mT+ih-top, "none", {rx:4, stroke:C.ink, sw:1.6});
      // 柱顶值 + 采样标
      var samp = sampSet[w.k] ? '<tspan font-size="11" baseline-shift="super" fill="'+C.pixelD+'">≈</tspan>' : '';
      s+='<text x="'+cx+'" y="'+(top-10)+'" font-size="22" font-family="'+FS+'" font-weight="700" text-anchor="middle" fill="'+(isMain?C.pixelD:C.searchD)+'">'+v.toFixed(1)+'×'+samp+'</text>';
      // 给城率小注(search% vs pixel%)
      s+=txt(cx, top+18, sp[i].toFixed(0)+"% : "+px[i].toFixed(0)+"%", {size:10.5,fill:isMain?"#fff":C.panel,anchor:"middle",weight:700,family:FM});
      // x 标签
      s+=txt(cx, H-mB+20, w.zh, {size:12.5,fill:isMain?C.pixelD:C.ink,anchor:"middle",weight:isMain?700:600});
      s+=txt(cx, H-mB+35, w.days+" 天", {size:9.5,fill:C.inkFaint,anchor:"middle",family:FM});
      if (isMain){
        s+=rect(cx-20, H-mB+40, 40, 3, C.gold, {rx:1.5});
        s+=txt(cx, H-mB+53, "主窗 7.4×", {size:9.5,fill:C.gold,anchor:"middle",weight:700,ls:"0.04em"});
      }
    });
    // 图例:柱内小注含义
    s+=txt(W-mR, mT-12, "柱内 = search% : pixel%", {size:9.5,fill:C.inkFaint,anchor:"end",family:FM});
    s+=line(mL,mT,mL,mT+ih,C.line,1.2);
    s+=line(mL,mT+ih,W-mR,mT+ih,C.line,1.2);
    s+='</svg>';
    return s;
  };

  /* ===================== 4) 比例维恩(面积∝用户) ===================== */
  Charts.venn = function (v, opt) {
    opt=opt||{};
    var W=opt.W||520, H=opt.H||330;
    var so=v.search_only, po=v.pixel_only, both=v.both;
    var total=so+po+both;
    // 面积比 → 半径比;先定最大半径,再缩放
    var areaS=so+both, areaP=po+both;
    var maxArea=Math.max(areaS,areaP);
    var rMax=Math.min(W*0.27, H*0.40);
    function rOf(a){ return rMax*Math.sqrt(a/maxArea); }
    var rS=rOf(areaS), rP=rOf(areaP);
    // 交集很小 → 圆心距按一定重叠呈现(示意交集,标注真实数字)
    var cy=H*0.46;
    var overlap = both/total; // 极小
    // 让两圆稍重叠以示意 both,但比例上 both 极小,故重叠面积小
    var d = (rS+rP) * (0.78 - Math.min(overlap*6, 0.2));
    var cxS=W/2 - d/2*(rP/(rS+rP))*1.6;
    var cxP=W/2 + d/2*(rS/(rS+rP))*1.6;
    // 简化:对称放置,圆心距固定
    cxS = W*0.40; cxP = W*0.60;
    var s=svgOpen(W,H,'aria-label="比例维恩:search_only / both / pixel_only"');
    s+='<defs><clipPath id="cp'+opt.id+'"><circle cx="'+cxP+'" cy="'+cy+'" r="'+rP+'"/></clipPath></defs>';
    // search 圆
    s+='<circle cx="'+cxS+'" cy="'+cy+'" r="'+rS+'" fill="'+C.search+'" opacity="0.30"/>';
    s+='<circle cx="'+cxS+'" cy="'+cy+'" r="'+rS+'" fill="none" stroke="'+C.search+'" stroke-width="2"/>';
    // pixel 圆
    s+='<circle cx="'+cxP+'" cy="'+cy+'" r="'+rP+'" fill="'+C.pixel+'" opacity="0.30"/>';
    s+='<circle cx="'+cxP+'" cy="'+cy+'" r="'+rP+'" fill="none" stroke="'+C.pixel+'" stroke-width="2"/>';
    // 交集区域加深
    s+='<g clip-path="url(#cp'+opt.id+')"><circle cx="'+cxS+'" cy="'+cy+'" r="'+rS+'" fill="'+C.ink+'" opacity="0.32"/></g>';
    // 标注(白描边 halo:贴近交集深色接缝时仍清晰,与趋势/覆盖图标签同处理)
    function vlab(x,y,str,size,fill){
      return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-family="'+FS+'" font-weight="700" '+
             'text-anchor="middle" fill="#fff" stroke="#fff" stroke-width="3.2" paint-order="stroke">'+esc(str)+'</text>'+
             txt(x, y, str, {size:size,fill:fill,anchor:"middle",weight:700,family:FS});
    }
    s+=vlab(cxS-rS*0.42, cy-rS*0.30, "search 独有", 12, C.searchD);
    s+=vlab(cxS-rS*0.42, cy-rS*0.30+18, humanM(so), 15, C.searchD);
    // pixel 独有标签右移至浅橙 only 区中心、远离与灰色交集的接缝,并加 halo 提升对比
    s+=vlab(cxP+rP*0.52, cy+rP*0.34, "pixel 独有", 12, C.pixelD);
    s+=vlab(cxP+rP*0.52, cy+rP*0.34+18, humanM(po), 15, C.pixelD);
    // both 引线(在中间)
    var bx=(cxS+cxP)/2;
    s+=line(bx, cy, bx, H-30, C.ink, 1, "3 2");
    s+=rect(bx-58, H-28, 116, 22, C.ink, {rx:5});
    s+=txt(bx, H-13, "both 交集 "+humanM(both), {size:12,fill:"#fff",anchor:"middle",weight:700,family:FS});
    // jaccard
    if (opt.jaccard!=null){
      s+=txt(W-12, 20, "Jaccard "+opt.jaccard+"%", {size:11.5,fill:C.inkFaint,anchor:"end",weight:700,family:FM});
    }
    if (opt.title){
      s+=txt(12, 20, opt.title, {size:12,fill:C.ink,weight:700});
    }
    s+='</svg>';
    return s;
  };

  /* ===================== 5) 独有/共享城市结构条 (exclusive_cities) ===================== */
  Charts.exclusiveCities = function (e) {
    var W=720, H=170, mL=20, mR=20, mT=52, barH=58;
    var iw=W-mL-mR;
    var total=e.search_only+e.shared+e.pixel_only;
    var segs=[
      {label:"search 独有", v:e.search_only, pct:e.search_only_pct, color:C.search, dark:C.searchD,
       note:humanM(e.search_only_users)+" 用户"},
      {label:"共享", v:e.shared, pct:(100-e.search_only_pct-e.pixel_only_pct), color:C.product, dark:"#6f6750", note:""},
      {label:"pixel 独有", v:e.pixel_only, pct:e.pixel_only_pct, color:C.pixel, dark:C.pixelD, note:""}
    ];
    var s=svgOpen(W,H,'aria-label="两源覆盖城市结构:search 独有 / 共享 / pixel 独有"');
    s+=txt(mL, 22, "两源覆盖的全部城市", {size:12,fill:C.inkFaint,weight:700});
    s+=txt(W-mR, 22, fmtInt(total)+" 个城市", {size:12,fill:C.ink,anchor:"end",weight:700,family:FM});
    var x=mL, y=mT;
    segs.forEach(function(g){
      var w=(g.v/total)*iw;
      s+=rect(x,y,w,barH,g.color,{});
      if (w>90){
        s+=txt(x+w/2, y+barH/2-4, fmtInt(g.v), {size:15,fill:"#fff",anchor:"middle",weight:700,family:FS});
        s+=txt(x+w/2, y+barH/2+14, g.label+" · "+g.pct.toFixed(1)+"%", {size:11,fill:"#fff",anchor:"middle",weight:600,opacity:0.95});
      } else {
        s+=line(x+w/2, y+barH, x+w/2, y+barH+14, g.dark,1);
        s+=txt(x+w/2, y+barH+27, g.label, {size:10.5,fill:g.dark,anchor:"middle",weight:700});
        s+=txt(x+w/2, y+barH+41, fmtInt(g.v)+" · "+g.pct.toFixed(1)+"%", {size:10,fill:g.dark,anchor:"middle",family:FM});
      }
      x+=w;
    });
    var xx=mL; segs.forEach(function(g,i){ if(i>0){s+=line(xx,y,xx,y+barH,"#fff",1.5);} xx+=(g.v/total)*iw; });
    // search 独有的用户量强调
    s+=rect(mL, y+barH+12, (e.search_only/total)*iw, 4, C.gold, {rx:2});
    s+=txt(mL, y+barH+30, "search 独有 "+fmtInt(e.search_only)+" 城含 "+humanM(e.search_only_users)+" 用户 — pixel 零覆盖", {size:11,fill:C.pixelD,weight:600});
    s+='</svg>';
    return s;
  };

  /* ===================== 6) 主城一致环形 (agreement.main) =====================
     全局规则:数据权重 = 视觉权重。主导段(94.1% 不同)给最实的色权(实心 pixel),
     次要段(5.9% 一致)给 teal 小弧;不再让主导段用最浅色(旧版视觉权重与数据相反)。 */
  Charts.ringMain = function (a, opt) {
    opt=opt||{};
    var W=opt.W||360, H=opt.H||300, cx=W/2, cy=H*0.46, r=92, sw=30;
    var same=a.main_same_pct, diff=a.main_diff_pct;
    var circ=2*Math.PI*r;
    var s=svgOpen(W,H,'aria-label="主城一致率环形:一致 '+same+'% / 不同 '+diff+'%"');
    // 主导环 = 不同(实心 pixel,最强色权):整圈铺底,杜绝接缝白缝
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+C.pixel+'" stroke-width="'+sw+'"/>';
    // 次要弧 = 一致(teal),覆盖在顶部一小段(5.9%);压在主导环上,无缝
    var lenSame=circ*(same/100);
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+C.search+'" stroke-width="'+sw+'" '+
       'stroke-dasharray="'+lenSame+' '+(circ-lenSame)+'" stroke-dashoffset="0" stroke-linecap="butt" '+
       'transform="rotate(-90 '+cx+' '+cy+')"/>';
    // 中心:大数 = 不同
    s+=txt(cx, cy-2, diff+"%", {size:38,fill:C.pixelD,anchor:"middle",weight:700,family:FS});
    s+=txt(cx, cy+20, "主城不同", {size:12.5,fill:C.inkSoft,anchor:"middle",weight:600});
    // 底部图例(主导项=实心 pixel,与弧一致)
    s+=rect(cx-90, H-26, 11,11, C.pixel,{rx:2});
    s+=txt(cx-74, H-17, "不同 "+diff+"%", {size:11.5,fill:C.pixelD,weight:600});
    s+=rect(cx+12, H-26, 11,11, C.search,{rx:2});
    s+=txt(cx+28, H-17, "一致 "+same+"%", {size:11.5,fill:C.searchD,weight:600});
    s+='</svg>';
    return s;
  };

  /* ===================== 7) 集合一致堆叠条 (agreement.set) ===================== */
  Charts.setAgreement = function (a) {
    var W=360, H=300, mL=20, mR=20, mT=58, barH=44;
    var iw=W-mL-mR;
    var common=a.set_common_pct, diff=a.set_diff_pct;
    var s=svgOpen(W,H,'aria-label="集合一致:有共同城 '+common+'% / 无共同城 '+diff+'%"');
    s+=txt(mL, 26, humanM(a.overlap_users)+" 双覆盖用户", {size:12,fill:C.inkFaint,weight:700});
    var y=mT;
    var wC=(common/100)*iw;
    s+=rect(mL,y,wC,barH,C.search,{});
    s+=rect(mL+wC,y,iw-wC,barH,C.pixelL,{});
    s+=line(mL+wC,y,mL+wC,y+barH,"#fff",1.5);
    // 大数
    s+=txt(mL+iw-8, y+barH/2+6, diff+"%", {size:24,fill:C.pixelD,anchor:"end",weight:700,family:FS});
    s+=txt(mL+8, y+barH/2+5, common+"%", {size:13,fill:"#fff",weight:700,family:FS});
    // 图例
    var ly=y+barH+30;
    s+=rect(mL, ly-10, 11,11, C.search,{rx:2});
    s+=txt(mL+17, ly, "有 ≥1 共同城(集合相交) "+common+"%", {size:11.5,fill:C.inkSoft});
    s+=rect(mL, ly+20, 11,11, C.pixelL,{rx:2});
    s+=txt(mL+17, ly+30, "无任何共同城 "+diff+"%", {size:11.5,fill:C.inkSoft});
    s+=txt(mL, ly+56, humanM(a.set_common_users)+" 有共同城 · "+humanM(a.set_diff_users)+" 无", {size:10.5,fill:C.inkFaint,family:FM});
    s+='</svg>';
    return s;
  };

  /* ===================== 8) 国家 diverging 条 (country) ===================== */
  Charts.country = function (rows, summary) {
    // 取前 N,按净差(so-po)排序
    var data = rows.map(function(r){
      var nm = r.name ? r.name : ("ID "+r.c);
      return {name:nm, so:r.so, po:r.po, net:r.so-r.po, pix:r.pix_dom};
    });
    data.sort(function(a,b){ return b.net-a.net; });
    var N = data.length;
    var rowH=26, mT=64, mL=120, mR=132, mB=18;
    var H = mT + N*rowH + mB;
    var W = 720;
    var iw=W-mL-mR;
    var maxV = Math.max.apply(null, data.map(function(d){ return Math.max(d.so, d.po); }));
    var cx = mL + iw*0.5;
    function wOf(v){ return (v/maxV)*(iw*0.5); }
    var s=svgOpen(W,H,'aria-label="各国 search_only vs pixel_only diverging 条形,高亮 pixel 主导国"');
    // 中轴
    s+=line(cx,mT-8,cx,H-mB,C.line,1.2);
    // 顶部标
    s+=txt(cx-10, mT-30, "← pixel_only 独占用户", {size:11.5,fill:C.pixelD,anchor:"end",weight:700});
    s+=txt(cx+10, mT-30, "search_only 独占用户 →", {size:11.5,fill:C.searchD,anchor:"start",weight:700});
    s+=txt(cx, mT-46, "按净差(search_only − pixel_only)排序 · 共 "+summary.total+" 国", {size:11,fill:C.inkFaint,anchor:"middle"});
    // 刻度参考
    [0.5,1].forEach(function(f){
      var dx=(iw*0.5)*f;
      s+=line(cx-dx,mT-4,cx-dx,H-mB,C.lineSoft,1,"2 4");
      s+=line(cx+dx,mT-4,cx+dx,H-mB,C.lineSoft,1,"2 4");
      s+=txt(cx-dx, mT-12, humanM(maxV*f), {size:9,fill:C.inkFaint,anchor:"middle",family:FM});
      s+=txt(cx+dx, mT-12, humanM(maxV*f), {size:9,fill:C.inkFaint,anchor:"middle",family:FM});
    });
    data.forEach(function(d,i){
      var y=mT + i*rowH;
      var yc=y+rowH/2;
      // search_only 右
      var wS=wOf(d.so), wP=wOf(d.po);
      s+=rect(cx, y+4, wS, rowH-9, C.search, {rx:2, opacity:d.pix?0.5:0.92});
      s+=rect(cx-wP, y+4, wP, rowH-9, C.pixel, {rx:2, opacity:d.pix?0.92:0.82});
      // 国名(中)
      var nmFill = d.pix ? C.pixelD : C.ink;
      var nmW = d.pix ? 700 : 600;
      s+=txt(mL-8, yc+4, d.name, {size:11.5,fill:nmFill,anchor:"end",weight:nmW});
      // pix 主导标记
      if (d.pix){
        s+=txt(mL-8, yc+4, d.name, {size:11.5,fill:C.pixelD,anchor:"end",weight:700});
        s+='<rect x="'+(mL-8 - d.name.length*7 - 30)+'" y="'+(y+5)+'" width="0" height="0"/>';
      }
      // 值标(端点外)
      s+=txt(cx+wS+5, yc+4, humanM(d.so), {size:9.5,fill:C.searchD,anchor:"start",family:FM, opacity:d.pix?0.7:1});
      s+=txt(cx-wP-5, yc+4, humanM(d.po), {size:9.5,fill:C.pixelD,anchor:"end",family:FM, weight:d.pix?700:400});
    });
    s+='</svg>';
    return s;
  };

  /* ===================== 9) 秩-频 log-log (rankfreq) ===================== */
  Charts.rankfreq = function (rf) {
    var W=720, H=380, mL=58, mR=24, mT=24, mB=50;
    var iw=W-mL-mR, ih=H-mT-mB;
    function lx(x){ return Math.log10(x); }
    function ly(y){ return Math.log10(y); }
    var all=rf.search.concat(rf.pixel);
    var xMin=0, xMax=lx(45000);
    var yMin=0, yMax=ly(2.3e6);
    function X(v){ return mL + (lx(v)-xMin)/(xMax-xMin)*iw; }
    function Y(v){ return mT+ih - (ly(v)-yMin)/(yMax-yMin)*ih; }
    var s=svgOpen(W,H,'aria-label="城市秩-频 log-log 曲线 search vs pixel"');
    // 网格(10 的幂)
    [1,10,100,1000,10000].forEach(function(t){
      var xx=X(t);
      s+=line(xx,mT,xx,mT+ih,C.lineSoft,1);
      s+=txt(xx, H-mB+16, t>=1000?(t/1000+"k"):(""+t), {size:10,fill:C.inkFaint,anchor:"middle",family:FM});
    });
    [1,10,100,1000,10000,100000,1000000].forEach(function(t){
      if (ly(t)>yMax) return;
      var yy=Y(t);
      s+=line(mL,yy,W-mR,yy,C.lineSoft,1);
      var lab = t>=1e6?"1M":(t>=1000?(t/1000+"k"):(""+t));
      s+=txt(mL-9, yy+4, lab, {size:10,fill:C.inkFaint,anchor:"end",family:FM});
    });
    s+=txt(mL-2, mT-10, "城市用户数 ↑", {size:10,fill:C.inkFaint,anchor:"start",weight:700});
    s+=txt(W-mR, H-mB+34, "城市排名(秩)→", {size:10,fill:C.inkFaint,anchor:"end",weight:700});
    function curve(arr,color){
      var pts=arr.map(function(p){ return X(p[0])+","+Y(p[1]); }).join(" ");
      return '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.2" stroke-linejoin="round"/>';
    }
    s+=curve(rf.pixel, C.pixel);
    s+=curve(rf.search, C.search);
    // 端点标(沿曲线放在 rank≈5 处,远离 y 轴标题)
    s+=txt(X(5)+4, Y(rf.search[4][1])-7, "search", {size:11,fill:C.searchD,weight:700,family:FM});
    s+=txt(X(5)+4, Y(rf.pixel[4][1])+14, "pixel", {size:11,fill:C.pixelD,weight:700,family:FM});
    s+=line(mL,mT,mL,mT+ih,C.line,1.2);
    s+=line(mL,mT+ih,W-mR,mT+ih,C.line,1.2);
    s+='</svg>';
    return s;
  };

  /* ===================== 10) Lorenz 曲线 (lorenz) ===================== */
  Charts.lorenz = function (lz) {
    var W=520, H=400, mL=52, mR=20, mT=22, mB=46;
    var iw=W-mL-mR, ih=H-mT-mB;
    function X(p){ return mL + p/100*iw; }
    function Y(p){ return mT+ih - p/100*ih; }
    var s=svgOpen(W,H,'aria-label="Lorenz 累计曲线 search vs pixel,对角线为完全均匀"');
    // 网格
    [0,25,50,75,100].forEach(function(t){
      s+=line(X(t),mT,X(t),mT+ih,C.lineSoft,1);
      s+=line(mL,Y(t),W-mR,Y(t),C.lineSoft,1);
      s+=txt(X(t), H-mB+16, t+"%", {size:10,fill:C.inkFaint,anchor:"middle",family:FM});
      s+=txt(mL-8, Y(t)+4, t+"%", {size:10,fill:C.inkFaint,anchor:"end",family:FM});
    });
    // y 轴标题:左对齐放在绘图区左上角,留 2px 左 padding,首字「累」不被裁
    s+=txt(2, mT-8, "累计用户%", {size:10,fill:C.inkFaint,anchor:"start",weight:700});
    s+=txt(W-mR, H-mB+32, "累计城市%(由大到小)", {size:10,fill:C.inkFaint,anchor:"end",weight:700});
    // 对角线
    s+=line(X(0),Y(0),X(100),Y(100),C.line,1.4,"4 3");
    s+=txt(X(70)+4, Y(70)-6, "完全均匀", {size:9.5,fill:C.inkFaint,transform:"rotate(-32 "+(X(70))+" "+(Y(70))+")"});
    function curve(arr,color,w){
      var pts=arr.map(function(p){ return X(p[0])+","+Y(p[1]); }).join(" ");
      return '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="'+(w||2.4)+'" stroke-linejoin="round"/>';
    }
    s+=curve(lz.pixel, C.pixel);
    s+=curve(lz.search, C.search);
    s+='</svg>';
    return s;
  };

  /* ===================== 11) 集中度 HHI + 头部占比柱 (concentration) ===================== */
  Charts.concentration = function (conc) {
    var rec={}; conc.forEach(function(r){ rec[r.source_type]=r; });
    var se=rec.search, px=rec.pixel;
    var W=720, H=300, mT=40, mB=40;
    // 三组指标:HHI(×1000) / top10% / top100%
    var groups=[
      {label:"HHI (×1000)", s:+se.hhi*1000, p:+px.hhi*1000, fmt:function(v){return v.toFixed(2);}, max:3},
      {label:"top10 城占比", s:+se.top10_share*100, p:+px.top10_share*100, fmt:function(v){return v.toFixed(1)+"%";}, max:12},
      {label:"top100 城占比", s:+se.top100_share*100, p:+px.top100_share*100, fmt:function(v){return v.toFixed(1)+"%";}, max:42}
    ];
    var mL=40, mR=40, iw=W-mL-mR, ih=H-mT-mB;
    var gw=iw/groups.length, bw=gw*0.20, gap=gw*0.06;
    var s=svgOpen(W,H,'aria-label="集中度对比:HHI / top10 / top100 占比"');
    s+=txt(mL, mT-22, "数值越低 = 分布越分散 · search 三项均低于 pixel", {size:11.5,fill:C.inkSoft,weight:600});
    s+=txt(mL, mT-7, "三组单位不同 · 只能组内 search↔pixel 比,不能跨组比", {size:10,fill:C.inkFaint,weight:600});
    groups.forEach(function(g,i){
      var cx=mL+i*gw+gw/2;
      function yV(v){ return mT+ih-(v/g.max)*ih; }
      var x1=cx-bw-gap/2, x2=cx+gap/2;
      s+=line(cx-gw/2+14, mT+ih, cx+gw/2-14, mT+ih, C.line,1);
      s+=rect(x1, yV(g.s), bw, mT+ih-yV(g.s), C.search,{rx:2});
      s+=rect(x2, yV(g.p), bw, mT+ih-yV(g.p), C.pixel,{rx:2});
      s+=txt(x1+bw/2, yV(g.s)-6, g.fmt(g.s), {size:11,fill:C.searchD,anchor:"middle",weight:700,family:FM});
      s+=txt(x2+bw/2, yV(g.p)-6, g.fmt(g.p), {size:11,fill:C.pixelD,anchor:"middle",weight:700,family:FM});
      s+=txt(cx, H-mB+18, g.label, {size:12,fill:C.ink,anchor:"middle",weight:600});
    });
    s+='</svg>';
    return s;
  };

  /* ===================== 12) 每源 top15 城市柱 (topcities) =====================
     标签现为城市名(chartdata 已做 id→名映射),较长 → 加宽左边距并按需缩字号,
     防止「Central Jakarta」「New York City」等被左缘裁切。 */
  Charts.topcities = function (tc, which) {
    var arr = tc[which];
    var color = which==="search" ? C.search : C.pixel;
    var colorD = which==="search" ? C.searchD : C.pixelD;
    var W=360, H=360, mT=24, mB=22, mL=118, mR=50;   // mL 78→118:容纳完整城市名(sans 字体)
    var n=arr.length, rowH=(H-mT-mB)/n;
    var maxV=arr[0][1];
    var iw=W-mL-mR;
    // 标签字号按最长名自适应(估算字宽,确保落在 mL-8 内不裁切)
    var maxNameLen = Math.max.apply(null, arr.map(function(p){ return String(p[0]).length; }));
    var nameSize = maxNameLen*6.6 > (mL-10) ? Math.max(8, ((mL-10)/maxNameLen/6.6)*9.5) : 9.5;
    var s=svgOpen(W,H,'aria-label="'+which+' top15 城市(按用户数)"');
    arr.forEach(function(p,i){
      var y=mT+i*rowH, yc=y+rowH/2;
      var w=(p[1]/maxV)*iw;
      s+=rect(mL, y+2, w, rowH-4, color, {rx:2, opacity:1-i*0.03});
      s+=txt(mL-7, yc+3.5, p[0], {size:nameSize,fill:C.ink,anchor:"end",weight:500});
      s+=txt(mL+w+5, yc+3.5, human(p[1]), {size:9.5,fill:colorD,anchor:"start",family:FM,weight:600});
    });
    s+=txt(mL-7, mT-10, "城市(按用户数)", {size:9,fill:C.inkFaint,anchor:"end",weight:700});
    s+='</svg>';
    return s;
  };

  /* ===================== 13) 散点 u_p(x) vs u_s(y) log-log (scatter) =====================
     数据每对为 [u_p, u_s](pixel, search)。轴:x = u_p(pixel)、y = u_s(search)。
     => 对角线上方(u_s>u_p)= search 主导;贴 X 轴(u_p≈0)= search 独有城。 */
  Charts.scatter = function (pts, opt) {
    opt = opt || {};
    var W=560, H=440, mL=58, mR=26, mT=24, mB=50;
    var iw=W-mL-mR, ih=H-mT-mB;
    function lg(v){ return Math.log10(v+1); }
    var maxL=lg(2.3e6);
    function X(v){ return mL + lg(v)/maxL*iw; }
    function Y(v){ return mT+ih - lg(v)/maxL*ih; }
    var s=svgOpen(W,H,'aria-label="每城 pixel 用户(x)vs search 用户(y)log-log 散点"');
    // 网格
    [1,10,100,1000,10000,100000,1000000].forEach(function(t){
      var xx=X(t), yy=Y(t);
      s+=line(xx,mT,xx,mT+ih,C.lineSoft,1);
      s+=line(mL,yy,W-mR,yy,C.lineSoft,1);
      var lab=t>=1e6?"1M":(t>=1000?(t/1000+"k"):(""+t));
      s+=txt(xx,H-mB+15,lab,{size:9,fill:C.inkFaint,anchor:"middle",family:FM});
      s+=txt(mL-7,yy+3,lab,{size:9,fill:C.inkFaint,anchor:"end",family:FM});
    });
    // 对角线 u_s = u_p
    s+=line(X(1),Y(1),X(2.3e6),Y(2.3e6),C.ink,1.4,"5 3");
    // 点:up=p[0](x)、us=p[1](y)。对角线上方(us>up)= search 主导 → 青;下方 → 琥珀。
    // search 独有城(up==0,贴 X 轴)用 search 色实心高亮,其余淡化。
    var nExcl=0;
    pts.forEach(function(p){
      var up=p[0], us=p[1];
      var excl = up===0;             // pixel 零覆盖 = search 独有城
      var above = us >= up;
      if (excl){ nExcl++; return; }  // 独有城后绘,确保压在普通点之上
      var col = above ? C.search : C.pixel;
      s+='<circle cx="'+X(up).toFixed(1)+'" cy="'+Y(us).toFixed(1)+'" r="2" fill="'+col+'" opacity="0.26"/>';
    });
    // search 独有城高亮(贴 X 轴左端竖带)
    pts.forEach(function(p){
      if (p[0]!==0) return;
      s+='<circle cx="'+X(0).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="2.4" fill="'+C.search+'" opacity="0.85"/>';
    });
    // 区域标注(与坐标轴自洽):上方 = search 主导;贴 X 轴 = search 独有城
    s+=txt(mL+6, mT+12, "对角线上方 = search 主导", {size:10.5,fill:C.searchD,weight:700});
    s+=txt(W-mR-6, mT+ih-8, "下方 = pixel 主导", {size:10.5,fill:C.pixelD,anchor:"end",weight:700});
    // X 轴左端"独有城"竖带注记(独有城数由数据传入)
    var nExclTxt = opt.exclCities != null ? opt.exclCities : nExcl;
    s+=txt(mL+2, mT+ih-2, "↑ "+fmtInt(nExclTxt)+" 个 search 独有城(u_p≈0)", {size:9.5,fill:C.searchD,anchor:"start",weight:700,family:FM});
    // 轴标题:x = u_p(pixel)、y = u_s(search)
    s+=txt(mL-2, mT-9, "↑ u_s (search)", {size:10,fill:C.searchD,anchor:"start",weight:700,family:FM});
    s+=txt(W-mR, H-mB+33, "u_p (pixel) →", {size:10,fill:C.pixelD,anchor:"end",weight:700,family:FM});
    s+=line(mL,mT,mL,mT+ih,C.line,1.2);
    s+=line(mL,mT+ih,W-mR,mT+ih,C.line,1.2);
    s+='</svg>';
    return s;
  };

  /* ===================== 14) 每用户城市数 (percity) ===================== */
  Charts.percity = function (pc) {
    var W=720, H=240, mL=80, mR=30, mT=40, mB=40;
    var iw=W-mL-mR, ih=H-mT-mB;
    var metrics=[
      {k:"avg_cities", label:"平均城市数", fmt:function(v){return (+v).toFixed(2);}},
      {k:"p90", label:"p90", fmt:function(v){return ""+v;}},
      {k:"max_cities", label:"最大", fmt:function(v){return fmtInt(+v);}}
    ];
    // avg/p90 同尺度小;max 极大 → 分两块。简单做:avg & p90 用左侧线性,max 单独标
    var s=svgOpen(W,H,'aria-label="每用户城市数 avg / p90 / max"');
    var rows=[
      {name:"search", color:C.search, colorD:C.searchD, d:pc.search},
      {name:"pixel", color:C.pixel, colorD:C.pixelD, d:pc.pixel}
    ];
    // 三列指标卡式
    var colW=iw/3;
    metrics.forEach(function(m,ci){
      var cx=mL+ci*colW+colW/2;
      s+=txt(cx, mT-14, m.label, {size:11.5,fill:C.inkFaint,anchor:"middle",weight:700});
      rows.forEach(function(r,ri){
        var y=mT+18+ri*((ih-18)/2);
        var val=m.fmt(r.d[m.k]);
        s+=txt(cx, y+20, val, {size:22,fill:r.colorD,anchor:"middle",weight:700,family:FS});
        s+=txt(cx, y+38, r.name, {size:10.5,fill:C.inkFaint,anchor:"middle",family:FM});
      });
      if (ci<2) s+=line(mL+(ci+1)*colW, mT-6, mL+(ci+1)*colW, mT+ih, C.lineSoft,1);
    });
    s+=txt(mL, H-mB+22, "p50(中位)两源均为 1 城 · 信号以单城为主,长尾少数用户城市极多", {size:10.5,fill:C.inkFaint});
    s+='</svg>';
    return s;
  };

  /* ===================== 15) pixel 垂类构成条 (pixel_vertical) =====================
     柱上只标用户数(不标占比):垂类间用户重叠,占比不可相加;唯一口径见 caption
     「Travel 占 pixel 有城用户(23.75M)的 83.9%」。 */
  Charts.pixelVertical = function (pv, travelPct) {
    var W=720, H=320, mT=30, mB=22, mL=210, mR=64;
    var n=pv.length, rowH=(H-mT-mB)/n;
    var maxV=pv[0].users;
    var iw=W-mL-mR;
    var nameMap={
      "Travel":"Travel 旅行","NULL":"NULL 无垂类标签","Auto":"Auto 汽车",
      "Local and Professional Services":"本地与专业服务","DTC":"DTC 品牌直营",
      "Entertainment & Media":"娱乐与媒体","App & Software":"App 与软件",
      "Telecommunication":"电信","Marketplace Retail":"市场零售"
    };
    var s=svgOpen(W,H,'aria-label="pixel city 信号垂类构成(用户数),Travel 占有城用户 '+(travelPct!=null?travelPct:79.5)+'%"');
    pv.forEach(function(p,i){
      var y=mT+i*rowH, yc=y+rowH/2;
      var w=(p.users/maxV)*iw;
      var isTravel = p.tag==="Travel";
      var col = isTravel ? C.pixel : (p.tag==="NULL" ? C.product : C.pixelL);
      var labCol = isTravel ? C.pixelD : C.inkSoft;
      s+=rect(mL, y+3, w, rowH-6, col, {rx:2});
      s+=txt(mL-8, yc+3.5, nameMap[p.tag]||p.tag, {size:11,fill:labCol,anchor:"end",weight:isTravel?700:500});
      // 柱上只标用户数。条端外标签若越右边界则改条内右对齐(白字)。
      var lab = humanM(p.users);
      var estW = lab.length*6.2 + 5;           // 估算标签宽
      if (mL+w+estW > W-2){
        s+=txt(mL+w-6, yc+3.5, lab, {size:9.5,fill:"#fff",anchor:"end",family:FM,weight:700});
      } else {
        s+=txt(mL+w+5, yc+3.5, lab, {size:9.5,fill:labCol,anchor:"start",family:FM,weight:isTravel?700:400});
      }
    });
    s+=txt(mL-8, mT-12, "按用户数", {size:9.5,fill:C.inkFaint,anchor:"end",weight:700});
    s+='</svg>';
    return s;
  };

  /* ===================== 16) 时间跨度趋势 多折线 (E · trend) =====================
     x 轴 = 窗口序(3天/1周/2周/1月,4 等距位置)。
     双 y 轴:左 = 百分比(net-new% / net-gain%,0–100);右 = 覆盖倍数 ×(0–4)。
     诚实缺口(M2 硬约束):每条线只连有值的点;某指标缺某窗 → 该窗位置不画点、
     线在最后有值窗处中断(不外延、不插值),并在缺口窗位置标「超时未取」。
     series spec: {key, label, color, axis:'pct'|'mult', vals:[v|null × 4], note}。 */
  Charts.trend = function (TREND, spec, opt) {
    opt = opt || {};
    var W=opt.W||720, H=opt.H||390, mL=52, mR=58, mT=opt.mT||40, mB=64;
    var iw=W-mL-mR, ih=H-mT-mB;
    var wins = TREND.windows;            // [{k,zh,days}×4]
    var n = wins.length;
    var pctMax = 100, multMax = 4;       // 左轴 0–100% / 右轴 0–4×
    function X(i){ return mL + (n===1?iw/2 : i*(iw/(n-1))); }
    function Ypct(v){ return mT+ih - (v/pctMax)*ih; }
    function Ymul(v){ return mT+ih - (v/multMax)*ih; }
    function Yof(s, v){ return s.axis==="mult" ? Ymul(v) : Ypct(v); }
    var s = svgOpen(W,H,'aria-label="时间跨度趋势:覆盖倍数与城市级净增/真新增随观测窗变化,缺口窗诚实断线"');

    // 网格(横,对齐左轴 %)+ 左轴刻度
    [0,25,50,75,100].forEach(function(p){
      var yy=Ypct(p);
      s+=line(mL,yy,W-mR,yy,C.lineSoft,1);
      s+=txt(mL-9, yy+4, p+"%", {size:10.5,fill:C.inkFaint,anchor:"end",family:FM});
    });
    s+=txt(mL-9, mT-14, "百分比", {size:10,fill:C.inkFaint,anchor:"end",weight:700});
    // 右轴刻度(× 倍数)
    [0,1,2,3,4].forEach(function(m){
      var yy=Ymul(m);
      s+=txt(W-mR+9, yy+4, m+"×", {size:10.5,fill:C.gold,anchor:"start",family:FM});
    });
    s+=txt(W-mR+9, mT-14, "覆盖倍数", {size:10,fill:C.gold,anchor:"start",weight:700});

    // x 轴窗口标签 + 竖向参考线;2 周(主)高亮
    wins.forEach(function(w,i){
      var xx=X(i), isMain = w.k==="2w";
      s+=line(xx, mT, xx, mT+ih, isMain?C.pixelL:C.lineSoft, isMain?1.4:1, isMain?null:"2 5");
      s+=txt(xx, H-mB+18, w.zh, {size:12,fill:isMain?C.pixelD:C.ink,anchor:"middle",weight:isMain?700:600});
      s+=txt(xx, H-mB+33, w.days+" 天", {size:9.5,fill:C.inkFaint,anchor:"middle",family:FM});
      if (isMain){
        s+=rect(xx-22, H-mB+38, 44, 3, C.gold, {rx:1.5});
        s+=txt(xx, H-mB+52, "主窗", {size:9,fill:C.gold,anchor:"middle",weight:700,ls:"0.08em"});
      }
    });

    // 缺口标注:收集每条线在哪些窗缺值,统一在底部一句话说明(避免图内拥挤)
    var gapNotes = [];
    // 数值标签先收集、后绘制:同列多条线标签做防重叠错开(dodge),避免 2 周列
    // 覆盖倍数 2.99× 与 net-new% 86.1% 叠死(两线在该列像素 y 接近 → 标签碰撞)。
    var labelsByCol = {};   // col index -> [{py, dy, side, text, color, anchorY}]

    // 逐条折线:只连有值点;缺口窗画空心断点标记
    spec.forEach(function(sp){
      // 收集有值的 (i, v)
      var pts = [];
      sp.vals.forEach(function(v,i){ if (v!=null) pts.push([i,v]); });
      // 折线:强结论线(覆盖倍数)加粗 3.4px、不透明;支撑线 2px、略淡 —— 减少视觉拥挤,主线一眼锁定。
      var lw = sp.strong ? 3.4 : 2.0;
      var op = sp.strong ? 1 : 0.78;
      if (pts.length>1){
        var poly = pts.map(function(p){ return X(p[0])+","+Yof(sp,p[1]).toFixed(1); }).join(" ");
        s+='<polyline points="'+poly+'" fill="none" stroke="'+sp.color+'" stroke-width="'+lw+'" opacity="'+op+'" stroke-linejoin="round" stroke-linecap="round"/>';
      }
      // 数据点(立即画)+ 值标签(先收集,稍后统一防重叠)
      pts.forEach(function(p,idx){
        var xx=X(p[0]), yy=Yof(sp,p[1]);
        var pr = sp.strong ? 4.5 : 3.4;
        s+='<circle cx="'+xx+'" cy="'+yy+'" r="'+pr+'" fill="'+C.panel+'" stroke="'+sp.color+'" stroke-width="'+(sp.strong?2.8:2.2)+'" opacity="'+op+'"/>';
        var lab = sp.axis==="mult" ? (p[1].toFixed(2)+"×") : (p[1].toFixed(1)+"%");
        // 标签 dy:按 series 给定偏移作为「初始偏好侧」;碰撞时在该侧基础上推开。
        var dy = sp.labelDy!=null ? sp.labelDy : -10;
        // 末列标签内移,避免与右轴「×」刻度叠字(net-new 现已到 1 月、贴右缘)。
        var lx = xx; if (p[0]===n-1) lx = xx-18; else if (p[0]===0) lx = xx+6;
        (labelsByCol[p[0]] = labelsByCol[p[0]] || []).push({
          x:lx, py:yy, dy:dy, text:lab, color:sp.colorD||sp.color, strong:!!sp.strong
        });
      });
      // 末点之后的缺口窗:画淡空心圈占位 + 记录说明
      var lastI = pts.length ? pts[pts.length-1][0] : -1;
      var missing = [];
      sp.vals.forEach(function(v,i){ if (v==null){ missing.push(wins[i].zh); } });
      if (missing.length){
        // 在末点与第一个缺口窗之间画断口标(短虚线 + ✕),示意「到此为止」
        if (lastI>=0 && lastI<n-1){
          var bx=X(lastI), by=Yof(sp,pts[pts.length-1][1]);
          var gx=X(lastI+1);
          s+=line(bx+6, by, (bx+gx)/2-6, by, sp.color, 1.4, "2 4");
          // ✕ 断口符号
          var mx=(bx+gx)/2, my=by;
          s+='<g stroke="'+(sp.colorD||sp.color)+'" stroke-width="1.6">'+
             '<line x1="'+(mx-4)+'" y1="'+(my-4)+'" x2="'+(mx+4)+'" y2="'+(my+4)+'"/>'+
             '<line x1="'+(mx-4)+'" y1="'+(my+4)+'" x2="'+(mx+4)+'" y2="'+(my-4)+'"/></g>';
        }
        gapNotes.push({label:sp.label, color:sp.colorD||sp.color, miss:missing});
      }
    });

    // ---- 同列标签防重叠:逐列把每个标签的目标 y 错开至 >= 行高,保持上/下偏好侧 ----
    var LINE_H = 13;                // 一行标签所需垂直间距(font 10.5 + 留白)
    function dodgeColumn(items){
      // 初始目标 y = 点 y + 偏好 dy;按目标 y 升序贪心下推,保证相邻间距 >= LINE_H
      items.forEach(function(it){ it.y = it.py + it.dy; });
      items.sort(function(a,b){ return a.y - b.y; });
      for (var k=1;k<items.length;k++){
        var need = items[k-1].y + LINE_H;
        if (items[k].y < need) items[k].y = need;
      }
      // 若整体被下推到越过 x 轴(绘图区底),则整体上移回弹,夹在绘图区内
      var floor = mT+ih - 4, last = items[items.length-1];
      if (last.y > floor){
        var shift = last.y - floor;
        items.forEach(function(it){ it.y -= shift; });
      }
    }
    Object.keys(labelsByCol).forEach(function(ci){
      var items = labelsByCol[ci];
      if (items.length>1) dodgeColumn(items);
      else items[0].y = items[0].py + items[0].dy;
      items.forEach(function(it){
        // 强结论线标签略大、加 halo;支撑线标签偏小,降低视觉权重 —— 主线值一眼可读。
        var fz = it.strong ? 12 : 10;
        s+='<text x="'+it.x+'" y="'+it.y+'" font-size="'+fz+'" font-family="'+FM+'" font-weight="700" text-anchor="middle" fill="#fff" stroke="#fff" stroke-width="3" paint-order="stroke">'+it.text+'</text>';
        s+=txt(it.x, it.y, it.text, {size:fz,fill:it.color,anchor:"middle",weight:700,family:FM});
      });
    });

    // 系列名不在图内重复标注 —— 由卡片顶部图例统一给出,避免与轴标/值标在左缘碰撞。
    // (仅末段有值点处的「覆盖倍数」可选地放一个轴侧名签;此处统一交给图例,保持画面干净。)

    // 底部诚实缺口说明带(本数据本图各序列均满 4 窗,故通常不渲染;留作防御)
    if (gapNotes.length){
      var gy = H-mB+62;
      var notes = gapNotes.map(function(g){ return g.label+"(缺 "+g.miss.join("/")+")"; });
      s+=txt(mL, gy, "⚠ 缺窗未取:", {size:10,fill:C.pixelD,anchor:"start",weight:700});
      s+=txt(mL+74, gy, notes.join(" · ")+" — 断线处不外延、不插值", {size:10,fill:C.inkFaint,anchor:"start"});
    }

    s+=line(mL,mT,mL,mT+ih,C.line,1.2);
    s+=line(mL,mT+ih,W-mR,mT+ih,C.line,1.2);
    s+='</svg>';
    return s;
  };

  // 行内迷你折线(sparkline):4 窗轨迹按本行 min-max 归一化,趋势一眼可见。
  // 缺值窗:断线、空心占位点(诚实,不插值)。主窗(2w)点加粗描色。
  function sparkline(vals, wins, color){
    var W=84, H=22, pl=4, pr=4, pt=4, pb=4;
    var iw=W-pl-pr, ih=H-pt-pb;
    var nums = vals.filter(function(v){ return v!=null; });
    if (nums.length<2) return '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"></svg>';
    var mn=Math.min.apply(null,nums), mx=Math.max.apply(null,nums), rng=(mx-mn)||1;
    var n=vals.length;
    function X(i){ return pl + (n===1?iw/2 : i*(iw/(n-1))); }
    function Y(v){ return pt+ih - ((v-mn)/rng)*ih; }
    var s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" style="display:block">';
    // 0 基线参考(归一最低位)淡线
    s+='<line x1="'+pl+'" y1="'+(pt+ih)+'" x2="'+(W-pr)+'" y2="'+(pt+ih)+'" stroke="'+C.lineSoft+'" stroke-width="1"/>';
    // 连续有值段折线
    var pts=[]; vals.forEach(function(v,i){ if(v!=null) pts.push([i,v]); });
    var poly=pts.map(function(p){ return X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1); }).join(' ');
    s+='<polyline points="'+poly+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>';
    // 断口:末点之后若有缺窗,画淡虚线 + 空心占位
    var lastI=pts.length?pts[pts.length-1][0]:-1;
    if (lastI>=0 && lastI<n-1){
      var bx=X(lastI), by=Y(pts[pts.length-1][1]);
      s+='<line x1="'+bx+'" y1="'+by.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+by.toFixed(1)+'" stroke="'+color+'" stroke-width="1" stroke-dasharray="2 2" opacity="0.45"/>';
    }
    // 数据点:主窗(2w)实心加大,其余小实心;缺窗位置画空心
    vals.forEach(function(v,i){
      var isMain = wins[i].k==="2w";
      if (v==null){
        if (i<=lastI) s+='<circle cx="'+X(i)+'" cy="'+(pt+ih)+'" r="1.6" fill="none" stroke="'+color+'" stroke-width="1" opacity="0.5"/>';
        return;
      }
      var r=isMain?2.6:1.8;
      s+='<circle cx="'+X(i)+'" cy="'+Y(v).toFixed(1)+'" r="'+r+'" fill="'+color+'"'+(isMain?' stroke="#fff" stroke-width="1"':'')+'/>';
    });
    s+='</svg>';
    return s;
  }

  // 趋势全指标表(HTML,非 SVG):分两组扫读 ——「增量(随窗收窄)」与「体量与机制」。
  // 每行:单位前置 + 4 窗值 + 行内迷你折线轨迹 + 走向。2w 列高亮;缺窗显式标。
  Charts.trendTable = function (TREND) {
    var wins = TREND.windows, ser = TREND.series;
    var SAMP='<sup class="samp-mark" title="1/10 取模采样(mod(user_id,10)=0)估计;3天/1周复现全量误差<1.5%">≈</sup>';
    // grp: 'incr' 增量类(随窗收窄,本节主角)/ 'mech' 体量与机制
    // sampWins: 该行哪些窗为采样估计(打 ≈ 标),与脚注呼应
    var rows = [
      {grp:"incr", zh:"覆盖倍数", u:"×", k:"l2_multiple", fmt:function(v){return v.toFixed(2);}, suf:"×", dir:"随窗收窄", spark:C.gold},
      {grp:"incr", zh:"城市级净增率", u:"%", k:"city_search_netgain_pct", fmt:function(v){return v.toFixed(1);}, suf:"%", dir:"随窗收窄", spark:C.search, sampWins:["1m"]},
      {grp:"incr", zh:"真新增量 net-new", u:"%", k:"net_new_pct", fmt:function(v){return v.toFixed(1);}, suf:"%", dir:"随窗收窄", spark:C.pixel, sampWins:["1m"]},
      {grp:"incr", zh:"控池倍数 control", u:"×", k:"common_multiple", fmt:function(v){return v.toFixed(1);}, suf:"×", dir:"随窗收窄", spark:C.ink, hot:true, sampWins:["2w","1m"]},
      {grp:"incr", zh:"城市广度 uplift", u:"%", k:"city_breadth_uplift_exact_pct", fmt:function(v){return "+"+v.toFixed(1);}, suf:"%", dir:"随窗收窄", spark:C.good},
      {grp:"mech", zh:"search 填充率", u:"%", k:"search_l2_fillrate", fmt:function(v){return v.toFixed(1);}, suf:"%", dir:"稳定 ~96%", spark:C.searchD},
      {grp:"mech", zh:"pixel 填充率", u:"%", k:"pixel_l2_fillrate", fmt:function(v){return v.toFixed(1);}, suf:"%", dir:"上升 ↑（追上）", spark:C.pixelD},
      {grp:"mech", zh:"pixel Travel 占比", u:"%", k:"pixel_l2_travel_users_pct", fmt:function(v){return v.toFixed(1);}, suf:"%", dir:"稳定 ~80%", spark:C.product},
      {grp:"mech", zh:"search L2 用户", u:"M", k:"search_l2_city_users", fmt:function(v){return humanM(v).replace("M","");}, suf:"M", dir:"单调 ↑", spark:C.search},
      {grp:"mech", zh:"pixel L2 用户", u:"M", k:"pixel_l2_city_users", fmt:function(v){return humanM(v).replace("M","");}, suf:"M", dir:"单调 ↑", spark:C.pixel}
    ];
    var h = '<table class="trend-table"><thead><tr><th class="rname-h">指标<span class="uhint">单位</span></th>';
    wins.forEach(function(w){ h += '<th class="'+(w.k==="2w"?"main":"")+'">'+w.zh+(w.k==="2w"?'<span class="mainflag">主窗</span>':'')+'</th>'; });
    h += '<th class="spark-h">4 窗轨迹</th><th class="dir-h">走向</th></tr></thead><tbody>';
    var groups = [
      {id:"incr", lab:"增量 · 随窗收窄", sub:"窗越短增量越大,4 窗恒为正"},
      {id:"mech", lab:"体量与机制", sub:"为什么收窄:pixel 慢慢补城"}
    ];
    groups.forEach(function(g){
      h += '<tr class="grouprow grp-'+g.id+'"><td colspan="'+(wins.length+3)+'"><span class="gtag">'+g.lab+'</span><span class="gsub">'+g.sub+'</span></td></tr>';
      rows.filter(function(r){ return r.grp===g.id; }).forEach(function(r){
        var vals = wins.map(function(w){ return ser[r.k] ? (ser[r.k][w.k]==null?null:ser[r.k][w.k]) : null; });
        h += '<tr'+(r.hot?' class="hot"':'')+'><td class="rname">'+r.zh+'<span class="urow">'+r.u+'</span></td>';
        wins.forEach(function(w,i){
          var v = vals[i];
          var cls = (w.k==="2w"?"main ":"")+"num";
          if (v==null){ h += '<td class="'+cls+' miss">超时</td>'; }
          else {
            var samp = (r.sampWins && r.sampWins.indexOf(w.k)>=0) ? SAMP : "";
            h += '<td class="'+cls+'">'+r.fmt(v)+'<span class="usuf">'+r.suf+'</span>'+samp+'</td>';
          }
        });
        h += '<td class="spark">'+sparkline(vals, wins, r.spark)+'</td>';
        h += '<td class="dir">'+r.dir+'</td></tr>';
      });
    });
    h += '</tbody></table>';
    return h;
  };

  // Jaccard = both / (search_only + pixel_only + both),由维恩数据现算(避免硬编码窗值)
  function jacc(o){ var d=o.search_only+o.pixel_only+o.both; return d>0 ? +(o.both/d*100).toFixed(2) : 0; }

  // 趋势 series 取值助手:按窗序展开成 [v|null × 4]
  function seq(TREND, key){ return TREND.windows.map(function(w){ var x=TREND.series[key]; return x?(x[w.k]==null?null:x[w.k]):null; }); }

  // 核心报告趋势:l2_multiple(满 4 点,右轴 ×)+ net-new%(3 点)+ net-gain%(3 点)
  function TREND_SPEC_CORE(TREND){
    return [
      {key:"l2_multiple", label:"覆盖倍数 ×", color:C.gold, colorD:"#8a6418", axis:"mult", strong:true,
       vals:seq(TREND,"l2_multiple"), labelDy:-13, nameAt:"last", nameDy:-2},
      {key:"city_search_netgain_pct", label:"城市级净增%", color:C.search, colorD:C.searchD, axis:"pct",
       vals:seq(TREND,"city_search_netgain_pct"), labelDy:-11, nameAt:"first", nameDy:-12},
      {key:"net_new_pct", label:"真新增量 net-new%", color:C.pixel, colorD:C.pixelD, axis:"pct",
       vals:seq(TREND,"net_new_pct"), labelDy:16, nameAt:"first", nameDy:16}
    ];
  }
  // 完整报告趋势:覆盖倍数(右轴 ×)+ 净增% / net-new% / pixel 填充率(左轴 %,机制证据)。
  // 控池倍数(5–13×)量级远超右轴 0–4×,不能与覆盖倍数共轴 → 不入本图,
  // 改由趋势表(4 窗,含采样)与 C3 控池图(copresence 双柱 + control_trend 4 窗)承载。
  function TREND_SPEC_FULL(TREND){
    return [
      {key:"l2_multiple", label:"覆盖倍数 ×", color:C.gold, colorD:"#8a6418", axis:"mult", strong:true,
       vals:seq(TREND,"l2_multiple"), labelDy:-13},
      {key:"city_search_netgain_pct", label:"城市级净增%", color:C.search, colorD:C.searchD, axis:"pct",
       vals:seq(TREND,"city_search_netgain_pct"), labelDy:-11},
      {key:"net_new_pct", label:"真新增量 net-new%", color:C.pixel, colorD:C.pixelD, axis:"pct",
       vals:seq(TREND,"net_new_pct"), labelDy:16},
      {key:"pixel_l2_fillrate", label:"pixel 填充率%", color:"#7a8a6f", colorD:"#566048", axis:"pct",
       vals:seq(TREND,"pixel_l2_fillrate"), labelDy:16}
    ];
  }

  /* ===================== 渲染调度 ===================== */
  // 给所有 [data-chart] 元素注入 SVG
  Charts.renderAll = function (DATA, TREND) {
    var nodes = document.querySelectorAll("[data-chart]");
    nodes.forEach(function (el) {
      var kind = el.getAttribute("data-chart");
      var arg = el.getAttribute("data-arg");
      var html = "";
      try {
        switch (kind) {
          case "coverage":   html = Charts.coverage(DATA.coverage, DATA.fillrate); break;
          case "decomp":
            // 注入主窗标签(主分析 = 2 周);decomp 用它生成 net-new 口径文案。
            var dd = Object.assign({}, DATA.decomp, {window: (DATA.HEADLINE && DATA.HEADLINE.main_window) || "2 周"});
            html = Charts.decomp(dd); break;
          case "copresence":
            // 主窗 = 2 周;控池 4 窗已补全(2w/1m 为 1/10 采样估计)。优先用 2w 主窗值;
            // 2w 无精确 users 计数(采样口径)→ 用比率+倍数渲染,count 标 null。缺则回退 1w/3d。
            var cp = null;
            if (TREND && TREND.series.common_multiple["2w"]!=null){
              cp = {
                users: TREND.series.common_users["2w"],   // 采样窗为 null → 图内改述比率
                search_pct: TREND.series.common_search_city_pct["2w"],
                pixel_pct: TREND.series.common_pixel_city_pct["2w"],
                multiple: TREND.series.common_multiple["2w"],
                sampled: true
              };
            } else if (DATA.copresence && DATA.copresence.users!=null){
              cp = DATA.copresence;
            } else if (TREND){
              var pickW = TREND.series.common_users["1w"]!=null ? "1w"
                        : (TREND.series.common_users["3d"]!=null ? "3d" : null);
              if (pickW){
                cp = {
                  users: TREND.series.common_users[pickW],
                  search_pct: TREND.series.common_search_city_pct[pickW],
                  pixel_pct: TREND.series.common_pixel_city_pct[pickW],
                  multiple: TREND.series.common_multiple[pickW]
                };
              }
            }
            html = cp ? Charts.copresence(cp) : '<div style="padding:20px;color:#9c540f">控池数据本窗超时未取</div>';
            break;
          case "venn_l2":    html = Charts.venn(DATA.overlap_l2, {id:"l2", jaccard:jacc(DATA.overlap_l2), title:"l2 口径(精确到城)"}); break;
          case "venn_any":   html = Charts.venn(DATA.overlap_any, {id:"any", jaccard:jacc(DATA.overlap_any), title:"any 口径(任意地理粒度)"}); break;
          case "exclusive":  html = Charts.exclusiveCities(DATA.exclusive_cities); break;
          case "ring_main":  html = Charts.ringMain(DATA.agreement); break;
          case "set_agree":  html = Charts.setAgreement(DATA.agreement); break;
          case "country":    html = Charts.country(DATA.country, DATA.country_summary); break;
          case "rankfreq":   html = Charts.rankfreq(DATA.rankfreq); break;
          case "lorenz":     html = Charts.lorenz(DATA.lorenz); break;
          case "concentration": html = Charts.concentration(DATA.concentration); break;
          case "topcities":  html = Charts.topcities(DATA.topcities, arg); break;
          case "scatter":    html = Charts.scatter(DATA.scatter, {exclCities: DATA.exclusive_cities ? DATA.exclusive_cities.search_only : null}); break;
          case "percity":    html = Charts.percity(DATA.percity); break;
          case "pixel_vertical": html = Charts.pixelVertical(DATA.pixel_vertical, DATA.pixel_vertical_travel_pct); break;
          case "trend_core": html = TREND ? Charts.trend(TREND, TREND_SPEC_CORE(TREND)) : ""; break;
          case "trend_full": html = TREND ? Charts.trend(TREND, TREND_SPEC_FULL(TREND), {H:420}) : ""; break;
          case "trend_table": html = TREND ? Charts.trendTable(TREND) : ""; break;
          case "control_trend": html = TREND ? Charts.controlTrend(TREND) : ""; break;
          default: html = '<div style="padding:20px;color:#9c540f">未知图表: '+kind+'</div>';
        }
      } catch (e) {
        html = '<div style="padding:20px;color:#9c540f">渲染出错: '+kind+' — '+e.message+'</div>';
      }
      el.innerHTML = html;
    });
  };

  global.PSQCharts = Charts;
})(window);
