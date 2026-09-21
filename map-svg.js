/* =========================================================
   OPC 情报站 · 简版示意图渲染器（纯 SVG，零外部依赖）
   ---------------------------------------------------------
   设计目标：
   1) 不做「精确底图」，只做「分布示意」——因此不需要任何地图瓦片服务、
      不需要 Key、不消耗任何调用配额，断网与内网同样可用。
   2) 边界数据来自 chinamap.js（含台湾省、香港、澳门、南海诸岛九段线），
      符合国家版图完整性要求。
   3) 交互只用本地 DOM 事件，不发起任何网络请求。
   ========================================================= */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var CN = global.OPCCHINA;

  /* 省份着色梯度：越靠后代表情报越密集 */
  var STEPS = [
    'rgba(96,165,250,.10)',
    'rgba(96,165,250,.20)',
    'rgba(45,212,191,.34)',
    'rgba(34,211,238,.52)',
    'rgba(167,139,250,.70)'
  ];

  var CSS = [
    '.cnmap{width:100%;height:100%;display:block;font-family:var(--sans,sans-serif)}',
    '.cnmap .cn-land{stroke:rgba(96,165,250,.34);stroke-width:.8;vector-effect:non-scaling-stroke;transition:fill .2s,stroke .2s}',
    '.cnmap .cn-land:hover{stroke:var(--cyan,#22d3ee);stroke-width:1.6}',
    '.cnmap .cn-bub{cursor:pointer}',
    '.cnmap .cn-bub circle{fill:rgba(34,211,238,.20);stroke:var(--cyan,#22d3ee);stroke-width:1.2;transition:.18s}',
    '.cnmap .cn-bub:hover circle{fill:rgba(34,211,238,.42)}',
    '.cnmap .cn-bub.on circle{fill:rgba(251,191,36,.34);stroke:var(--amber,#fbbf24);stroke-width:2}',
    '.cnmap .cn-bub text{fill:#04060d;font-size:11px;font-weight:800;text-anchor:middle;pointer-events:none;font-family:var(--mono,monospace)}',
    '.cnmap .cn-cap{fill:var(--text-2,#b6c4dd);font-size:11.5px;text-anchor:middle;pointer-events:none}',
    '.cnmap .cn-bub.on .cn-cap{fill:var(--amber,#fbbf24)}',
    '.cnmap .cn-me circle{fill:rgba(52,211,153,.28);stroke:var(--green,#34d399);stroke-width:1.6}',
    '.cnmap .cn-me text{fill:var(--green,#34d399);font-size:11.5px;font-weight:700;text-anchor:middle}',
    '.cnmap .cn-me .halo{fill:none;stroke:rgba(52,211,153,.45);stroke-width:1.4}',
    '.cnmap .cn-inset rect{fill:rgba(8,13,24,.72);stroke:rgba(96,165,250,.30);stroke-width:1;rx:6}',
    '.cnmap .cn-inset .land{fill:rgba(96,165,250,.22);stroke:rgba(96,165,250,.42);stroke-width:.6}',
    '.cnmap .cn-inset .dash{fill:none;stroke:var(--cyan,#22d3ee);stroke-width:1.4;stroke-linecap:round;opacity:.9}',
    '.cnmap .cn-inset .lb{fill:var(--muted,#7d8fab);font-size:11px;text-anchor:middle}',
    '.cnmap .cn-grid line{stroke:rgba(96,165,250,.07);stroke-width:1}',
    '.cnmap .cn-hit{fill:transparent;stroke:none}'
  ].join('');

  var cssDone = false;
  function injectCSS() {
    if (cssDone || document.getElementById('cnmap-css')) { cssDone = true; return; }
    var s = document.createElement('style');
    s.id = 'cnmap-css';
    s.textContent = CSS;
    document.head.appendChild(s);
    cssDone = true;
  }

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* 数值 → 色阶（用对数压缩，避免个别大城市把其他省份压成一片暗色） */
  function pick(n, max) {
    if (!n || n <= 0 || !max) return STEPS[0];
    var t = Math.log(1 + n) / Math.log(1 + max);
    var i = Math.min(STEPS.length - 1, Math.max(1, Math.round(t * (STEPS.length - 1))));
    return STEPS[i];
  }

  /* 经纬度 → 主图坐标（与生成器保持一致：墨卡托 + 线性映射） */
  var MAIN = [73.0, 135.5, 17.4, 54.0];
  function mercY(lat) {
    return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI;
  }
  function project(lat, lng, vb) {
    var scale = vb[0] / (MAIN[1] - MAIN[0]);
    var ymax = mercY(MAIN[3]);
    return [(lng - MAIN[0]) * scale, (ymax - mercY(lat)) * scale];
  }

  /**
   * 渲染简版示意图
   * @param {HTMLElement} el 容器
   * @param {Object} o {values, points, me, maxBubble, labelFrom, onPick}
   */
  function render(el, o) {
    if (!el) return null;
    injectCSS();
    o = o || {};
    if (!CN || !CN.provinces) {
      el.innerHTML = '<div style="padding:20px;font-size:12.5px;color:var(--muted)">' +
        '示意图数据未加载（chinamap.js）。</div>';
      return null;
    }
    el.innerHTML = '';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    var vb = CN.vb;
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + vb[0] + ' ' + vb[1],
      preserveAspectRatio: 'xMidYMid meet',
      'class': 'cnmap',
      role: 'img',
      'aria-label': '全国分布示意图，含省级着色与城市气泡'
    });

    /* 底纹网格，纯装饰 */
    var grid = svgEl('g', { 'class': 'cn-grid' });
    for (var gx = 1; gx < 10; gx++) {
      grid.appendChild(svgEl('line', { x1: gx * vb[0] / 10, y1: 0, x2: gx * vb[0] / 10, y2: vb[1] }));
    }
    for (var gy = 1; gy < 8; gy++) {
      grid.appendChild(svgEl('line', { x1: 0, y1: gy * vb[1] / 8, x2: vb[0], y2: gy * vb[1] / 8 }));
    }
    svg.appendChild(grid);

    var values = o.values || {};
    var maxV = 0;
    for (var k in values) if (values[k] > maxV) maxV = values[k];

    /* ---- 省级色块 ---- */
    var gLand = svgEl('g', { 'class': 'cn-land-g' });
    CN.provinces.forEach(function (pv) {
      var name = pv[0], d = pv[1];
      var n = values[name] || 0;
      var p = svgEl('path', {
        d: d, 'class': 'cn-land',
        fill: pick(n, maxV),
        'fill-rule': 'evenodd'
      });
      var t = svgEl('title');
      t.textContent = name + '：' + (n ? n + ' 条情报' : '暂无收录');
      p.appendChild(t);
      gLand.appendChild(p);
    });
    svg.appendChild(gLand);

    /* ---- 城市气泡 ---- */
    var pts = (o.points || []).filter(function (x) { return x && (x.lat || x.lng); });
    var maxB = o.maxBubble || 0;
    if (!maxB) pts.forEach(function (x) { if ((x.n || 0) > maxB) maxB = x.n || 0; });
    var gBub = svgEl('g', { 'class': 'cn-bub-g' });
    var byId = {};
    var labelFrom = o.labelFrom == null ? 3 : o.labelFrom;

    /* 标签防重叠：按数值从大到小排队，与已有标签或气泡相撞就只留气泡 */
    var placed = [], bubBoxes = [];
    function crowded(x0, y0, x1, y1) {
      for (var i = 0; i < placed.length; i++) {
        var b = placed[i];
        if (x0 < b[0] + b[2] && x1 > b[0] && y0 < b[1] + 15 && y1 > b[1]) return true;
      }
      for (var j = 0; j < bubBoxes.length; j++) {
        var c = bubBoxes[j];
        if (x0 < c[0] + c[2] && x1 > c[0] && y0 < c[1] + c[3] && y1 > c[1]) return true;
      }
      return false;
    }

    var order = pts.slice().sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
    var maxB = o.maxBubble || 0;
    if (!maxB) order.forEach(function (x) { if ((x.n || 0) > maxB) maxB = x.n || 0; });
    var bubR = o.bubble || [3.2, 6.6];   /* [最小半径, 随数值增长的幅度] */

    var maxLabels = o.maxLabels == null ? 10 : o.maxLabels;
    var labeled = 0;
    order.forEach(function (x) {
      var xy = project(x.lat, x.lng, vb);
      var r = bubR[0] + bubR[1] * Math.sqrt(maxB ? Math.min(1, (x.n || 1) / maxB) : 1);
      var g = svgEl('g', {
        'class': 'cn-bub', 'data-id': x.id,
        transform: 'translate(' + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1) + ')'
      });
      g.appendChild(svgEl('circle', { r: r.toFixed(1) }));
      bubBoxes.push([xy[0] - r, xy[1] - r, r * 2, r * 2]);
      if ((x.n || 0) > 0 && r >= 7) {
        var num = svgEl('text', { y: '4.4', 'font-size': '13' });
        num.textContent = x.n;
        g.appendChild(num);
      }
      if (x.city && (x.n || 0) >= labelFrom && labeled < maxLabels) {
        var label = x.city + (x.n >= 10 ? '' : ' ' + x.n);
        var w = label.length * 11.5 + 8;
        var lx = xy[0] - w / 2, ly = xy[1] + r + 3.5;
        if (!crowded(lx, ly, lx + w, ly + 15)) {
          placed.push([lx, ly, w]);
          labeled++;
          var cap = svgEl('text', { 'class': 'cn-cap', y: (r + 14).toFixed(1) });
          cap.textContent = label;
          g.appendChild(cap);
        }
      }
      var t2 = svgEl('title');
      t2.textContent = (x.city || x.name || '') + (x.n ? '：' + x.n + ' 条' : '');
      g.appendChild(t2);
      gBub.appendChild(g);
      byId[x.id] = { g: g, pt: x, xy: xy };
      if (o.onPick) g.addEventListener('click', function () { o.onPick(x); });
    });
    svg.appendChild(gBub);

    /* ---- 图例（仅在传入省级数值时才有意义） ---- */
    var hasVals = false;
    for (var vk in values) if (values[vk] > 0) { hasVals = true; break; }
    if (hasVals) {
      var gLg = svgEl('g', { transform: 'translate(20 ' + (vb[1] - 34) + ')' });
      var lgT = svgEl('text', { 'class': 'cn-cap', x: 0, y: -9, 'text-anchor': 'start' });
      lgT.textContent = '情报密度';
      lgT.style.fontSize = '11.5px';
      gLg.appendChild(lgT);
      STEPS.forEach(function (c, i) {
        gLg.appendChild(svgEl('rect', {
          x: i * 26, y: 0, width: 22, height: 11, rx: 2,
          fill: c, stroke: 'rgba(96,165,250,.35)', 'stroke-width': .6
        }));
      });
      svg.appendChild(gLg);
    }

    /* ---- 南海诸岛小图（版图完整性的必要件，不可省略） ---- */
    if (CN.nanhai && CN.nanhai.vb) {
      var nv = CN.nanhai.vb;
      var gIn = svgEl('g', {
        'class': 'cn-inset',
        transform: 'translate(' + (vb[0] - nv[0] - 16) + ' ' + (vb[1] - nv[1] - 26) + ')'
      });
      gIn.appendChild(svgEl('rect', { x: 0, y: 0, width: nv[0], height: nv[1], rx: 6 }));
      if (CN.nanhai.land) {
        gIn.appendChild(svgEl('path', { 'class': 'land', d: CN.nanhai.land, 'fill-rule': 'evenodd' }));
      }
      if (CN.nanhai.line) {
        gIn.appendChild(svgEl('path', { 'class': 'dash', d: CN.nanhai.line }));
      }
      var lb = svgEl('text', { 'class': 'lb', x: nv[0] / 2, y: nv[1] + 14 });
      lb.textContent = '南海诸岛';
      gIn.appendChild(lb);
      svg.appendChild(gIn);
    }

    /* ---- 用户定位 ---- */
    if (o.me && o.me.lat) {
      var my = project(o.me.lat, o.me.lng, vb);
      var gm = svgEl('g', { 'class': 'cn-me', transform: 'translate(' + my[0].toFixed(1) + ' ' + my[1].toFixed(1) + ')' });
      gm.appendChild(svgEl('circle', { 'class': 'halo', r: '11' }));
      gm.appendChild(svgEl('circle', { r: '4.6' }));
      var mt = svgEl('text', { y: '-15' });
      mt.textContent = o.me.label || '我的位置';
      gm.appendChild(mt);
      svg.appendChild(gm);
    }

    el.appendChild(svg);
    return {
      svg: svg,
      focus: function (id) {
        for (var key in byId) byId[key].g.classList.remove('on');
        var hit = byId[id];
        if (hit) hit.g.classList.add('on');
        return hit ? hit.xy : null;
      },
      clear: function () {
        for (var key in byId) byId[key].g.classList.remove('on');
      }
    };
  }

  global.OPCMAP = {
    render: render,
    project: project,
    ready: function () { return !!(CN && CN.provinces); },
    MAIN: MAIN
  };
})(window);
