# 当前品牌位图

2026-11-16，主色统一 `#3F5A4E`，原鱼形、字形和微型 A 保持。

- `mark-light/dark/mono-{size}.png`：透明鱼形；16–32 为正方形槽中的 A，48 及以上为标准稿，宽高按 800:560。
- `icon-light/dark-{size}.png`：浅底/提亮绿底圆角方块；正式应用使用 `icon-dark`，两种底色资源均保留。
- `brand-light/dark-{size}.png`：完整品牌，256／512／1024／2048 px，中英文字为路径。
- 共 58 张，不进入插件安装包；包内为 SVG、favicon 和 180 px 应用图标。

先运行 `npx tsx scripts/generate-brand.ts`，再运行 `node scripts/render-brand.mjs`。后者需要已可用的 Playwright 和 Chrome；若 Playwright 安装在外部工具目录，用 `--playwright-module <绝对模块路径>` 指定，不要求为产品安装依赖。

SVG 是维护源；旧 `../png/`、概念图和评审截图保留历史，不作为现行下载。
