# 变更说明

<!-- 一句话说清这个 PR 做了什么 -->

## 变更类型

- [ ] OPC 登记（修改 `people.json`）
- [ ] 社区信息纠错 / 补充（修改 `communities.json`）
- [ ] 情报条目（修改 `data.json` / 通过 `opc_push.py` 推送）
- [ ] 页面与样式（`index.html` / `community.html` / `people.html` / `geo.js`）
- [ ] 文档（README / CONTRIBUTING）

## 自检清单

- [ ] 我提交的内容**有可核实的公开来源**，并在下方贴了链接（不可核实的不要提交）
- [ ] 如果改了 `people.json`：`consent` 为 `true`，且**没有**手机号、身份证号、详细住址等敏感信息
- [ ] 如果改了 `communities.json`：坐标是行政区/园区中心点近似值，`precision` 字段标注正确
- [ ] 如果改了 `data.json` 或 `index.html` 的内嵌数据：两者条数与内容一致
- [ ] 如果新增了页面或数据文件：已同步更新 `.github/workflows/deploy.yml` 的 `_site` 拷贝清单
- [ ] JSON 文件语法合法（无多余逗号、无注释、UTF-8 编码）

## 来源链接

<!-- 每条改动对应的公开来源，方便核实 -->

1.

## 备注

<!-- 其他需要说明的事情 -->
