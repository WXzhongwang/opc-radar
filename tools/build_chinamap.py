# -*- coding: utf-8 -*-
"""
构建「中国示意图」所需的边界与省市映射数据（输出 chinamap.js）。

=================  合规说明（务必先读）  =================
本脚本使用的省级边界数据来自阿里云 DataV 公开行政区划接口：
    https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json
该数据包含全部 34 个省级行政区（含台湾省、香港特别行政区、澳门特别行政区），
并带有一个独立的「南海诸岛 / 九段线」要素（adcode=100000_JD）。

严禁把数据源替换为来源不明、缺失台湾省 / 南海诸岛、或边界走向错误的
GeoJSON —— 那属于《地图管理条例》所指的「问题地图」。

本脚本产出的是「矢量示意图」（非瓦片底图），不含任何境外地图服务调用，
前端也不需要任何地图 Key。
========================================================

用法：
    python tools/build_chinamap.py            # 联网下载最新边界后生成
    python tools/build_chinamap.py --offline  # 用本地缓存生成（_mapwork/cn_prov.json）
"""

import argparse
import json
import math
import os
import re
import sys
import urllib.request

SRC_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(ROOT, "_mapwork", "cn_prov.json")
OUT = os.path.join(ROOT, "chinamap.js")

MAIN = (73.0, 135.5, 17.4, 54.0)
INSET = (105.5, 123.0, 3.0, 22.5)

MAIN_W = 1000
INSET_W = 132
# 抽稀容差以「度」为单位（1 度 ≈ 111km）。主图约 16px/度，小图约 7.5px/度，
# 下面取值约合 0.3~0.5 像素，示意图上肉眼无损，但能砍掉大部分冗余点。
TOL_MAIN = 0.020
TOL_INSET = 0.040
TOL_JD = 0.020

DROP_DIAG_MAIN = 0.06
DROP_DIAG_INSET = 0.15
ALWAYS_KEEP = ("台湾省", "海南省", "香港特别行政区", "澳门特别行政区")
DRAW_FIRST = ("北京市", "天津市", "上海市", "重庆市", "香港特别行政区", "澳门特别行政区")


def merc(lng, lat):
    """经纬度 -> 墨卡托平面坐标（x 用经度度数，y 用等价度数，保证等比例）。"""
    y = math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
    return lng, y


def perp(p, a, b):
    px, py = p
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(pts, tol):
    """Douglas-Peucker 抽稀。"""
    n = len(pts)
    if n < 4:
        return pts
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        dmax, idx = 0.0, -1
        for k in range(i + 1, j):
            d = perp(pts[k], pts[i], pts[j])
            if d > dmax:
                dmax, idx = d, k
        if dmax > tol and idx > 0:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [p for p, k in zip(pts, keep) if k]


def ring_diag(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return math.hypot(max(xs) - min(xs), max(ys) - min(ys))


def to_path(rings_proj, nd):
    """投影后的环 -> 一条 SVG path。

    利用 SVG 的隐式 lineto（M 之后的坐标对自动连线）压缩体积；
    前端对该 path 使用 fill-rule="evenodd"，使内环（飞地）自动挖空。
    """
    parts = []
    for ring in rings_proj:
        if len(ring) > 1 and ring[0] == ring[-1]:
            ring = ring[:-1]
        if len(ring) < 3:
            continue
        pairs = " ".join(("%.*f %.*f" % (nd, x, nd, y)) for x, y in ring)
        parts.append("M" + pairs + "Z")
    return "".join(parts)


class Box(object):
    def __init__(self, lng0, lng1, lat0, lat1, width):
        self.lng0, self.lng1, self.lat0, self.lat1 = lng0, lng1, lat0, lat1
        _, y0 = merc(lng0, lat0)
        _, y1 = merc(lng1, lat1)
        self.ymin, self.ymax = y0, y1
        self.width = width
        self.scale = width / (lng1 - lng0)
        self.height = int(round((self.ymax - self.ymin) * self.scale))

    def at(self, lng, lat):
        x, y = merc(lng, lat)
        return (
            round((x - self.lng0) * self.scale, 2),
            round((self.ymax - y) * self.scale, 2),
        )

    def project_ring(self, ring):
        return [self.at(x, y) for x, y in ring]


def load_geo(offline):
    if offline:
        with open(CACHE, encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(SRC_URL, headers={"User-Agent": "opc-radar-build"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return data


def all_rings(feature):
    g = feature.get("geometry")
    if not g:
        return []
    if g["type"] == "Polygon":
        return g["coordinates"]
    return [ring for poly in g["coordinates"] for ring in poly]


SHORT_TAIL = [
    ("维吾尔自治区", ""), ("壮族自治区", ""), ("回族自治区", ""),
    ("特别行政区", ""), ("自治区", ""), ("省", ""), ("市", ""),
]


def short_name(name):
    for tail, _ in SHORT_TAIL:
        if name.endswith(tail):
            return name[: -len(tail)]
    return name


def in_ring(pt, ring):
    """射线法。"""
    x, y = pt
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y):
            xint = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < xint:
                inside = not inside
        j = i
    return inside


def parse_cities():
    """从 geo.js 里抽出城市中心点表，用于反查所属省级行政区。"""
    txt = open(os.path.join(ROOT, "geo.js"), encoding="utf-8").read()
    body = txt[txt.index("var CITY_COORD"): txt.index("/* ---------- 行政区关键词")]
    out = {}
    for m in re.finditer(r"'([^']+)':\s*\[(-?[\d.]+),\s*(-?[\d.]+)\]", body):
        out[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    geo = load_geo(args.offline)
    feats = [f for f in geo["features"] if f.get("properties", {}).get("name")]
    jd = [f for f in geo["features"] if str(f["properties"].get("adcode")) == "100000_JD"]
    names = [f["properties"]["name"] for f in feats]
    assert "台湾省" in names, "边界数据缺失台湾省，禁止使用"
    assert jd, "边界数据缺失南海诸岛（九段线），禁止使用"
    print("边界数据自检通过：省级 %d 个（含台湾省/香港/澳门）+ 南海诸岛要素" % len(feats))

    box = Box(*MAIN, MAIN_W)
    ins = Box(*INSET, INSET_W)

    provinces, labels = [], {}
    ins_land_rings, ins_line_rings = [], []

    for f in feats:
        p = f["properties"]
        name = p["name"]
        raw = all_rings(f)

        kept = []
        for ring in raw:
            proj = [merc(x, y) for x, y in ring]
            diag = ring_diag(proj)
            if name not in ALWAYS_KEEP and diag < DROP_DIAG_MAIN:
                continue
            # 容差随环的尺度自适应：大省边界可以粗一些，小行政区保住形状
            tol = max(0.004, min(TOL_MAIN * 3, diag * 0.0025))
            kept.append(simplify(proj, tol))

        # 主图：只保留落在主范围内的环（南海诸岛的细碎岛礁留给小图）
        main_rings = []
        for ring in kept:
            lngs = [q[0] for q in ring]
            lats = [
                math.degrees(2 * math.atan(math.exp(math.radians(q[1]))) - math.pi / 2)
                for q in ring
            ]
            if max(lngs) < MAIN[0] or min(lngs) > MAIN[1]:
                continue
            if max(lats) < MAIN[2] or min(lats) > MAIN[3]:
                continue
            main_rings.append(ring)

        if main_rings:
            d = to_path([box.project_ring(r) for r in main_rings], 1)
            provinces.append((name, d))

        # 标注锚点：优先 centroid，退而求其次 center
        c = p.get("centroid") or p.get("center")
        if c:
            x, y = box.at(c[0], c[1])
            labels[name] = [x, y, short_name(name)]

        # 南海诸岛小图：落在小图范围内的环
        for ring in raw:
            proj = [merc(x, y) for x, y in ring]
            cx = sum(q[0] for q in proj) / len(proj)
            cy = sum(q[1] for q in proj) / len(proj)
            if not (INSET[0] <= cx <= INSET[1]):
                continue
            lat_c = math.degrees(2 * math.atan(math.exp(math.radians(cy))) - math.pi / 2)
            if not (INSET[2] <= lat_c <= INSET[3]):
                continue
            sp = simplify(proj, TOL_INSET)
            if ring_diag(sp) < DROP_DIAG_INSET:
                continue
            ins_land_rings.append(ins.project_ring(sp))

    for f in jd:
        for ring in all_rings(f):
            ins_line_rings.append(ins.project_ring(simplify([merc(x, y) for x, y in ring], TOL_JD)))

    # 直辖市 / 特别行政区 最后绘制；其余按面积从大到小，避免小省被覆盖
    order = {n: i for i, n in enumerate(DRAW_FIRST)}
    provinces.sort(key=lambda kv: (1 if kv[0] in order else 0, order.get(kv[0], 0), -len(kv[1])))

    # 城市 -> 省级（用未抽稀的原始环做点面判定，保证准确）
    raw_prov = [(f["properties"]["name"], all_rings(f)) for f in feats]
    city_prov = {}
    for city, (lat, lng) in parse_cities().items():
        hit = None
        for pname, rings in raw_prov:
            cnt = 0
            for ring in rings:
                if in_ring((lng, lat), ring):
                    cnt += 1
            if cnt % 2 == 1:
                hit = pname
                break
        if hit:
            city_prov[city] = hit
        else:
            print("  ! 未能定位城市:", city, lat, lng)

    by_short = {}
    for f in feats:
        by_short[short_name(f["properties"]["name"])] = f["properties"]["name"]

    land_d = to_path(ins_land_rings, 2)
    line_d = to_path(ins_line_rings, 2)

    payload = {
        "source": "阿里云 DataV 公开行政区划边界（含台湾省、香港、澳门、南海诸岛九段线）",
        "vb": [box.width, box.height],
        "provinces": provinces,
        "labels": labels,
        "nanhai": {"vb": [ins.width, ins.height], "land": land_d, "line": line_d},
        "cityProv": city_prov,
        "byShort": by_short,
    }

    js = (
        "/* 自动生成，请勿手改：由 tools/build_chinamap.py 生成。\n"
        "   边界数据来源：" + payload["source"] + "。\n"
        "   本文件为矢量示意图数据，不请求任何地图服务，前端无需 Key。 */\n"
        "window.OPCCHINA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)

    print("省级路径 %d 条（%d KB），标注 %d 个，城市映射 %d 条"
          % (len(provinces), sum(len(d) for _, d in provinces) // 1024, len(labels), len(city_prov)))
    print("九段线路径 %.1f KB，小图陆地 %.1f KB"
          % (len(line_d) / 1024.0, len(land_d) / 1024.0))
    print("九段线线段 %d，小图陆地环 %d" % (len(ins_line_rings), len(ins_land_rings)))
    print("viewBox %dx%d | 小图 %dx%d" % (box.width, box.height, ins.width, ins.height))
    print("已写出 %s  %.1f KB" % (OUT, os.path.getsize(OUT) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
