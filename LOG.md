# LOG — dsh-whale-widget 变更日志

> 只追加，不改写历史条目。轻量索引见 `LOG-INDEX.md`。
> 检索方式：先读 `LOG-INDEX.md` 定位，再按 HASH / 行号精准读本文件的对应段落。

---

## 2026-09-30 — 修复 0.2.0 客户端入口格式，导致 DSH 启动崩溃

**现象**
- 官方版 DSH `0.2.0-rc.2`（安装于 `D:\DSH`，desktop profile）重启后弹窗：
  ```
  web boot: 1 entry did not activate
  dsh-whale-widget: import failed (see console for the import error)
  ```
- 渲染进程控制台报：`Uncaught SyntaxError: Unexpected token 'export'`
  （`dsh-app://app/plugins/??dsh-whale-widget/client.js&rev=…:22`）
- 用户点了「禁用第三方插件、备份 profile patch 并重启」，结果**所有**插件配置被清空。

**根因**
- 为适配 0.2.0 新写的 `client.js` 用了 ESM 语法（`export const inject = []`、
  `export function apply()`）。但 DSH 的客户端插件**不是 ESM**，而是交给
  `window.__ModuleLoader__.load({ id, factory })` 的工厂函数（参见
  `dsh-approval-gate/client.js` 同款外壳）。
- 各插件的 `client.js` 会被并进同一个 plugins 聚合包统一解析，因此这一个文件
  解析失败会连累**全部**客户端插件不加载 —— 这才是"插件好像全被禁用"的直接原因。

**改动**
- `client.js`：改写为 `window.__ModuleLoader__.load({ id: 'dsh-whale-widget', factory })`，
  在 `exports.default / exports.apply / exports.inject` 上导出插件对象；
  原有的 `/dsh-whale/widget.js` 注入逻辑逐字保留（`inject: []`、`apply` 即注入）。
- `$DSH_HOME\profiles\desktop\cordis.patch.yml`：用崩溃前的备份
  `cordis.patch.yml.bak-1790770881339`（内容最后修改于 19:10）整份恢复，
  找回模型 provider（commandcode / packapi）、默认模型、权限预设、
  mcp-manager 插入项、notify-win / image-gen / mimo-adapter / media-bridge /
  better-sidebar / session-title 等全部配置。

**验证**
- `node --check client.js` ✅、`node --check lib/index.js` ✅
- 重启 DSH：5 个进程稳定运行，`%APPDATA%\@deepseek-ai\dsh-desktop\logs\`
  **无新增 crash 日志**（仅剩 20:21 那份旧记录）。
- 恢复后的 patch 内容与备份经 `git diff --no-index` 比对**零内容差异**（仅行尾 CRLF/LF）。

**涉及文件**
- `E:\WorkSpace\dsh-whale-widget\client.js`（本次改写）
- `E:\WorkSpace\dsh-whale-widget\package.json`（0.2.0 适配：新增 `exports["./client"]`
  与 `dsh.client`，同一批改动，本次未再动）
- `E:\WorkSpace\dsh-whale-widget\lib\index.js`（widget.js 注入去掉 `defer`、加
  `?v=5` 版本参数，同一批改动，本次未再动）
- `C:\Users\Vanem\.dsh\profiles\desktop\cordis.patch.yml`（DSH 侧配置，不在本仓库内）

---

## 2026-10-10 — 修复气泡文字溢出（"鲸鱼娘"用量气泡折行撑破椭圆）

**现象**
- 点鲸鱼弹出气泡、再点一下切到随机台词里的用量段
  （`当前时间段为:` / `空闲时段 · 距高峰 1d9h` / `已用 29.0% · 剩 71.0%`）时，
  第三行整个掉到白色气泡下沿以外、第一行顶到气泡上方 —— 用户截图可复现。

**根因（两条叠加，只调字号治不好）**
1. `.dshwv-text` 是绝对定位（`left:44.25%`）却没给宽度，**可用宽度被压成
   `容器宽 - left ≈ 0.5575 × base`**，`.dshwv-wrap` 上写的 `max-width:560u` 实际只剩
   ~188px，长倒计时被逐字折成 3 行、提示行折成 2 行。实测文本块高 189px，
   而气泡椭圆内可用高只有 147px。
2. 字号与位置全是固定几何（气泡背景是固定 viewBox 1026×700 的 SVG），
   内容行数一浮动就必然越界；文本块中心还比椭圆中心低 19/700 单位。

**改动（`lib/index.js`，仅动注入脚本 `WIDGET_JS`，宿主侧逻辑未碰）**
- `.dshwv-text`：显式 `width:740u`；锚点改到椭圆中心（`left:44.25%` / `top:35.2857%`）；
  transform 追加 `scale(var(--dshwv-fit,1))`（左侧翻转分支同步追加）。
- 三行子元素 `width:fit-content` + `margin:auto` 水平居中：换行宽度可预测，
  同时能测到"内容自然宽"。行宽上限取 **620u** —— 实测折中值：
  椭圆四角约束下越宽越吃亏，700u 会**更早**触发缩放（同一段文案 fit 0.726 → 0.775），
  560u 及以下则把倒计时逼成 3 行。
- 新增 `fitBubbleText()`：实测三行内容宽高，按椭圆几何
  （`cx454 cy247 rx373 ry232`，描边 18 两侧各占 9）反算缩放系数，
  要求矩形四角落在椭圆内并留 6% 余量，只缩不放（写 `--dshwv-fit`）。
  调用点：`applyBubbleLines` / `setHint` / `showCostBubble` / `animateAmount`（数字滚动逐帧）/ `setScale`。

**验证**
- 诊断脚手架 `.agent_tmp/whale-diag/build-test.mjs`：从本文件提取 `WIDGET_JS`，
  注入探针生成离线复现页（`file://`），直接用 DOM 实测三行子元素并集矩形的四角
  是否落在椭圆内（测量前临时关掉 transform 过渡，避免读到过渡中间值）。
- 修复前：cc 用量段 `maxEllipseValue = 2.475`（严重越界）；修复后：`0.884`（`< 1`，余量 6%）。
- 回归矩阵：12 类内容 × 8 档缩放（0.6–2.5）= 96 组，消耗泡泡 5 类 × 5 档 = 25 组，
  **0 组越界**，最小 `fit = 0.656`（最坏情况字号缩到约 2/3，仍清晰可读）。
  另验证对字体族变化免疫（fit 基于实测尺寸，字体变了会自动重算）。
- `node --check lib/index.js` 通过。

**生效方式**
- 插件以 `link:E:/WorkSpace/dsh-whale-widget` 挂在 desktop profile；
  `WIDGET_JS` 是宿主模块加载时读进内存的常量 —— **改完必须重启 DSH**，刷新页面无效。

**涉及文件**
- `E:\WorkSpace\dsh-whale-widget\lib\index.js`（本次全部改动）
- `E:\WorkSpace\.agent_tmp\whale-diag\build-test.mjs`（本次新增的诊断脚手架，`.agent_tmp` 已 gitignore；
  以后改气泡排版可 `node build-test.mjs` 重建复现页再量）
