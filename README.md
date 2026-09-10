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
- **全端响应式**：覆盖 1080 / 900 / 640 / 400px 四档断点与横屏矮屏、触屏、超小屏场景；无横向滚动（16 档视口 × 常规/抽屉两种状态实测零溢出）。

## 响应式设计

| 断点 | 布局行为 |
| --- | --- |
| `> 1080px` | 桌面全量布局：统计区双列、卡片多列网格 |
| `≤ 1080px` | 卡片轨道下限收窄到 300px，环形图间距收紧 |
| `≤ 900px` | 统计区改单列；顶部导航变为**可横向滑动的紧凑条**（不再整体隐藏） |
| `≤ 640px` | 单列卡片；KPI 双列；搜索独占一行、分类条横向滚动（粘性控制台高度压缩）；搜索框 16px 防 iOS 聚焦缩放；时间线日期换行到标题上方；抽屉全屏 |
| `≤ 400px` | KPI 改单行紧凑式；抽屉按钮纵向堆叠；隐藏时间线分类角标 |
| 横屏矮屏 | `max-height ≤ 520px` 时取消控制台粘性定位，避免占满可视区 |

工程细节：

- **防撑宽**：所有 `white-space:nowrap` 的 flex 子项（卡片来源、TOP10 标题等）显式声明 `min-width:0`，grid 轨道一律用 `minmax(0,1fr)` 而非裸 `1fr`，杜绝内容把容器撑出横向滚动。
- **刘海屏安全区**：`viewport-fit=cover` + `env(safe-area-inset-*)`，横屏时内容不会被挖孔遮挡。
- **触屏优化**：`@media(hover:none)` 加大点击热区、取消 hover 位移；`-webkit-tap-highlight-color` 去除点击高亮。
- **无障碍**：`@media(prefers-reduced-motion:reduce)` 关闭粒子背景与全部动画。

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

## 流量统计

站点内置**可插拔的统计接入层**（见 `index.html` 底部的 `window.ANALYTICS`）。所有脚本异步注入，任一服务加载失败都会静默降级，不影响页面任何功能。

### 默认开启：不蒜子（零注册）

页脚实时显示「总访问 / 独立访客 / 本页浏览」，无需注册任何账号，部署完即有数据。

### 可接入的服务

| 服务 | 免费额度 | 能力 | 需注册 | 配置字段 |
| --- | --- | --- | --- | --- |
| 不蒜子 Busuanzi | 免费无上限 | PV / UV 计数 | 否（默认开启） | `busuanzi.enabled` |
| Microsoft Clarity | **免费无上限** | 热图、会话录制、点击分析 | 是 | `clarity.id` |
| Cloudflare Web Analytics | **免费无上限** | 流量 / 来源 / 地区，无 cookie | 是 | `cloudflare.token` |
| Umami Cloud | 免费层 3 站点 / 10 万事件每月 | 隐私友好、轻量看板 | 是 | `umami.id` |
| GoatCounter | 免费托管（非商业） | 极轻量 PV 与来源 | 是 | `goatcounter.code` |
| Google Analytics 4 | 免费 | 全量流量分析与转化 | 是 | `ga4.id` |

### 启用方式

只改 `index.html` 底部这一处，无需改动其它代码：

```js
window.ANALYTICS.clarity    = { enabled: true, id: "你的项目 ID" };
window.ANALYTICS.cloudflare = { enabled: true, token: "你的 beacon token" };
window.ANALYTICS.ga4        = { enabled: true, id: "G-XXXXXXXXXX" };
```

推荐组合：**不蒜子（页脚即时可见）+ Microsoft Clarity（免费的会话录制与热图，无流量上限）**。

### 关闭统计

```js
window.ANALYTICS.busuanzi.enabled = false;
```

### 隐私说明

统计脚本由访客浏览器直接向对应服务商发起请求，本站无中间服务器、不采集任何表单数据。若面向欧盟用户或有合规要求，建议只启用无 cookie 的方案（不蒜子 / Cloudflare / Umami / GoatCounter）并相应调整隐私声明。

## 部署

当前使用 **Deploy from a branch**：Pages 源为 `main` 分支的 `/` 根目录，推送即发布，无需构建步骤（纯静态、无外部依赖，Jekyll 不会改动任何文件）。

仓库 Settings → Pages → Source 需为 `Deploy from a branch` / `main` / `/ (root)`。

### 可选：升级为 GitHub Actions 发布

若希望走显式构建流程（组装 `_site/`、写入 `.nojekyll`、可控 artifact），可将 `.github/workflows/deploy.yml` 加入仓库，并把 Pages 的 Source 切到 **GitHub Actions**。

该工作流在 `push main` 或手动 `workflow_dispatch` 时触发：

1. `actions/configure-pages@v5` 初始化 Pages；
2. 组装 `_site/`（`index.html` + `data.json` + `.nojekyll`）；
3. `actions/upload-pages-artifact@v3` 打包；
4. `actions/deploy-pages@v4` 发布到 GitHub Pages。

> 注意：推送 `.github/workflows/**` 需要所用 Token 具备 **Workflows: Read and write** 权限（classic token 对应 `workflow` scope），否则 GitHub 会拒绝该文件的推送。

---

数据整理自公开渠道，仅作信息聚合与研究参考，不构成任何投资或政策建议。
