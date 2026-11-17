# 当前品牌位图

2026-11-18，当前配色「莓紫春芽＋深色小幅提亮」，原版字形保持；[分尺寸接入](../../plans/2026-11-17-brand-size-adoption.zh.md)采用 D2/D1/C0/原版。

- `mark-light/dark/mono-{size}.png`：透明鱼形；16/17 为 D2，20/24 为 D1，28 为 C0，32 及以上为原版。统一正方形槽位，图形等比放入，不拉伸。
- `icon-light/dark-{size}.png`：固定莓紫底圆角方块；浅深文件名兼容保留，两者使用同款配色。
- `brand-light/dark-{size}.png`：完整品牌，256／512／1024／2048 px，中英文字为路径。
- `window-d1-{size}.png`：专供标题栏/任务栏/浏览器的固定 D1 彩底图标，16/24/32/48/64/128/256 px；文件分辨率不改变图形。
- 共 75 张，不进入插件安装包；包内为 SVG、favicon 和 180 px 应用图标。通用图形包含 16/17/20/24/28/32/48/64/128/180/256/512 px。

先运行 `npx tsx scripts/generate-brand.ts`，再运行 `node scripts/render-brand.mjs`。后者需要已可用的 Playwright 和 Chrome；若 Playwright 安装在外部工具目录，用 `--playwright-module <绝对模块路径>` 指定，不要求为产品安装依赖。

SVG 是维护源；旧 `../png/`、概念图和评审截图保留历史，不作为现行下载。

2026-11-18 按获选「莓紫春芽＋深色小幅提亮」重新生成；应用方块浅深文件现采用同一固定配色。窗口 ICO 新增 20、24、40、96 px 原生帧。
