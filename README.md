# OPC 情报站 · OPC Radar

> 全平台追踪「一人公司」（One Person Company, OPC）热门资讯的静态情报聚合站点。

一个零依赖、单文件的科技感数据看板：所有情报沉淀在 `data.json`，页面在浏览器端读取并渲染。推送 `main` 分支后由 GitHub Actions 自动发布到 GitHub Pages。

线上地址：https://wxzhongwang.github.io/opc-radar/

---

## 项目定位

OPC（One Person Company，一人公司）指 AI 时代以「一人 + 智能体」为核心组织形态的轻量化创业范式。
本站围绕这一主题，从政策动向、社区落地、创业案例、生态工具、研究报告、赛事活动、风险观察、全球视野、趋势观察九个维度做持续聚合。

## 目录结构

```
opc-radar/
├── index.html                     # 站点页面（单文件，零外部依赖）
├── data.json                      # 情报数据（唯一数据源）
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml             # push main 自动部署 GitHub Pages
```

## 设计要点

- **零外部依赖**：不引用任何 CDN、字体或 JS 库，断网与内网环境同样可用。
- **数据与页面分离**：`data.json` 是唯一数据源；`index.html` 内嵌同一份数据副本以满足 `file://` 直接打开，同时启动后会尝试 `fetch("data.json")` 刷新为最新版本。
- **科技感视觉**：深色霓虹主题、Canvas 粒子网络背景、扫描线动效、KPI 数字滚动、卡片 / 时间线双视图、详情抽屉与 Markdown 一键复制。

## 数据结构

`data.json`：

```jsonc
{
  "meta": {
    "title": "OPC 情报站 · OPC Radar",
    "subtitle": "全平台追踪「一人公司」热门资讯",
    "updated": "2026-09-10",
    "description": "……",
    "sourceCount": 40,
    "categories": ["政策动向", "社区落地", "创业案例", "生态工具", "研究报告", "赛事活动", "风险观察", "全球视野", "趋势观察"]
  },
  "items": [
    {
      "id": "opc-001",
      "title": "北京发布《支持人工智能 OPC 创新发展行动方案（试行）》",
      "category": "政策动向",
      "date": "2026-07-02",
      "source": "央视网 / 北京市经济和信息化局",
      "region": "北京",
      "heat": 97,
      "tags": ["OPC贷", "开办服务专区", "Token增信", "算力券"],
      "summary": "一句话摘要。",
      "content": "· 要点一\n· 要点二",
      "url": "https://…"
    }
  ]
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 唯一标识，格式 `opc-NNN` |
| `category` | 必须命中 `meta.categories` 之一，决定卡片配色与筛选归属 |
| `date` | `YYYY-MM-DD`，用于排序与月度时间轴 |
| `region` | 地区 / 国家，用于覆盖地区统计 |
| `heat` | 0–100 热度值，用于默认排序与 TOP 10 排行 |
| `summary` | 卡片摘要，建议 40–70 字 |
| `content` | 详情正文，以 `\n· ` 分隔的要点列表 |
| `url` | 原文链接 |

## 更新流程

1. 编辑 `data.json`，按上表追加条目（`id` 不重复、`category` 在分类白名单内）。
2. 若新增条目需要离线可用，把 `data.json` 内容重新内嵌回 `index.html` 的 `var EMBEDDED = …`（可选；线上环境会自动 `fetch` 最新数据）。
3. 提交并推送到 `main`，GitHub Actions 自动构建并发布。

```bash
git add -A
git commit -m "chore(data): 新增 N 条 OPC 情报"
git push origin main
```

## 本地预览

直接双击 `index.html` 即可（内嵌数据模式）。若要验证 `fetch` 刷新链路，需起一个静态服务：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 部署

`deploy.yml` 在 `push main` 或手动 `workflow_dispatch` 时触发：

1. `actions/configure-pages@v5` 初始化 Pages；
2. 组装 `_site/`（`index.html` + `data.json` + `.nojekyll`）；
3. `actions/upload-pages-artifact@v3` 打包；
4. `actions/deploy-pages@v4` 发布到 GitHub Pages。

仓库 Settings → Pages 的 Source 需为 **GitHub Actions**。

---

数据整理自公开渠道，仅作信息聚合与研究参考，不构成任何投资或政策建议。
