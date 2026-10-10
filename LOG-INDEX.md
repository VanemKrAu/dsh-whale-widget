# LOG-INDEX — dsh-whale-widget

> 轻量索引。排查问题时先读本文件定位，再按行号 / HASH 精准读 `LOG.md` 的对应段落，
> **不要全量读 LOG.md**。

格式：`日期 | 变更行为 | 所在 LOG 行号 | HASH`

| 日期 | 变更行为 | LOG 行号 | HASH |
|------|----------|----------|------|
| 2026-09-30 | 修复 client.js 客户端入口格式（ESM → `window.__ModuleLoader__.load`），并整份恢复 desktop profile 的 `cordis.patch.yml` | LOG.md:7 | `ec9cdb` |
| 2026-10-10 | 修复用量气泡文字溢出：文本块改锚椭圆形中心 + 显式宽度，新增 `fitBubbleText()` 按实测尺寸自缩，四角永不越出椭圆 | LOG.md:54 | `wip-bubble-fit` |
