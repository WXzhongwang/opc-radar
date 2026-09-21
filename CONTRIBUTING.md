# 贡献指南 · OPC 情报站

这个仓库有三件事可以参与，**都不需要会写代码**。

| 我想做的事 | 去哪里 |
| --- | --- |
| 登记我的 OPC（一人公司） | [提登记表单](https://github.com/WXzhongwang/opc-radar/issues/new?template=opc-register.yml) |
| 报告社区地址/坐标有误 | [提社区纠错](https://github.com/WXzhongwang/opc-radar/issues/new?template=community-fix.yml) |
| 投递一条情报线索 | [提情报线索 Issue](https://github.com/WXzhongwang/opc-radar/issues/new?labels=情报线索)（贴链接 + 一句话说明） |

---

## 一、OPC 登记（`people.json`）

登记后你会出现在 [找人](https://wxzhongwang.github.io/opc-radar/people.html) 页面。

### 方式 A：提 Issue（推荐，最快）

打开 [`opc-register.yml` 表单](https://github.com/WXzhongwang/opc-radar/issues/new?template=opc-register.yml)，逐项填写提交即可。
维护者核实后会把内容同步进 `people.json`。

### 方式 B：直接提 Pull Request

编辑 [`people.json`](https://github.com/WXzhongwang/opc-radar/edit/main/people.json)，
在 `items` 数组**末尾**追加一个对象：

```json
{
  "id": "",
  "name": "你的昵称 / 品牌名",
  "intro": "40-120 字：你做什么、为谁解决什么问题、做到什么程度。",
  "track": "内容创作",
  "city": "杭州",
  "stage": "已营收",
  "contact": "https://your-site.example",
  "tags": ["AI 写作", "独立开发"],
  "consent": true,
  "addedAt": "2026-09-21"
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 否 | **留空即可**，合并时由维护者按现有最大序号 +1 分配（`p-001`、`p-002` …） |
| `name` | 是 | 昵称 / 品牌名 / 团队名，可化名 |
| `intro` | 是 | 40–120 字简介，说清「做什么、给谁、做到什么程度」 |
| `track` | 是 | 赛道，如 内容创作 / 电商出海 / 垂直智能体 / 设计服务 / 开发者工具 |
| `city` | 是 | 所在城市，**只写到市级** |
| `stage` | 是 | `想法期` / `已上线` / `已营收` / `已盈利` |
| `contact` | 是 | 联系方式**或**站点，至少一项。优先留公开站点 |
| `tags` | 否 | 3–6 个关键词 |
| `consent` | 是 | 必须为 `true`，表示同意公开 |
| `addedAt` | 是 | 登记日期 `YYYY-MM-DD` |

### 重要提醒

- **登记 = 公开**：本仓库与 Issue 都是公开的，内容会保留在 Git 历史里。
- **不要填敏感信息**：手机号、身份证号、详细住址、客户名单一律不要写。
- **完全免费**：本站不收费、不背书、不参与交易撮合。凡以「付费入册」「保证对接订单」为名收费的均与本站无关。
- **可以撤回**：提 Issue 说明，维护者会删除对应条目；但请理解历史记录可能仍可被检索。

---

## 二、社区纠错与补充（`communities.json`）

[找社区](https://wxzhongwang.github.io/opc-radar/community.html) 的数据来自
[`communities.json`](https://github.com/WXzhongwang/opc-radar/blob/main/communities.json)。

**铁律：只收录有公开来源的社区，不编造地址与坐标。**

通过 PR 新增一条时，请遵守：

```json
{
  "id": "c-031",
  "name": "社区名称",
  "type": "社区",
  "province": "省",
  "city": "市",
  "district": "区县",
  "address": "能核实到什么程度就写什么程度",
  "lat": 30.2741,
  "lng": 120.1551,
  "precision": "district",
  "note": "一句话补充说明",
  "source": "来源媒体 / 机构",
  "sourceUrl": "https://原文链接",
  "date": "2026-09-21"
}
```

- `type`：`社区` / `基地` / `专区` / `平台`
- `precision`：必须诚实标注坐标精度
  - `building` 楼栋级（来源明确写出楼栋/楼层）
  - `park` 园区级（来源明确给出园区或载体名）
  - `district` 区县级中心点近似
  - `city` 城市级中心点近似
- `lat` / `lng`：行政区或园区中心点近似值，**不是门牌坐标**。门店级坐标请勿凭猜测填写。
- `sourceUrl`：必须是公开可访问的政府网站 / 党媒 / 地方媒体报道链接。

---

## 三、情报条目（`data.json`）

新条目通过脚本入库，会自动完成去重、追加、同步 `index.html` 内嵌数据、推送与读回校验：

```bash
# new_items.json 为数组，字段见下
python opc_push.py new_items.json
```

单条字段：`title` / `category` / `date` / `source` / `region` / `heat`(0-100) / `tags` / `summary`(40-70字) / `content`(用 `\n· ` 分隔) / `url`。
`category` 必须是九分类之一：政策动向、社区落地、创业案例、生态工具、研究报告、赛事活动、风险观察、全球视野、趋势观察。

**内容必须真实可溯源，不得编造链接或数据；抓不到可靠来源就少抓，宁缺毋滥。**

---

## 四、页面与部署

- 页面为**零依赖静态页**：`index.html`（资讯流 + 地图统计）、`community.html`（找社区）、`people.html`（找人），共享 `geo.js`。
- 地图统一使用**腾讯位置服务 GL JS**（境内合规底图）。为保证合规，仓库内**不内置任何地图 Key**：
  站点维护者在页面中设置 `window.OPCGEO_TMAP_KEY` 后方可启用公网底图；未配置时页面会自动降级为清单模式。
- **新增页面或数据文件后，必须同步更新 [`.github/workflows/deploy.yml`](https://github.com/WXzhongwang/opc-radar/blob/main/.github/workflows/deploy.yml)**
  的 `_site` 拷贝清单，否则文件不会被部署到 GitHub Pages。

## 五、行为准则

- 不做人身攻击、不发布广告与拉群引流。
- 不提交他人信息，不提交未经同意的联系方式。
- 涉及资金、投资、合作的内容请自行尽调，本站不对任何登记主体作担保。
