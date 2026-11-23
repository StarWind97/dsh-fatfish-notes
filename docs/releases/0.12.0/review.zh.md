# 肥鱼笔记 0.12.0 双语候选验收

2026-11-23，0.12.0 同一候选通过隔离 Windows 桌面和 Web 的中英文复验。[实施规划与改号记录](../../plans/2026-11-22-bilingual-localization.zh.md#改号与新候选复验) · [中英文版本说明](release-notes.md)

## 候选与环境

- 安装包 `dist/i18n-0120/candidate/dsh-fatfish-notes.tgz`，18,233,740 字节，同目录附校验文件。SHA-256 为 `6a377ac04e4bd66ce148bf1bed11841abd2db2fb1831fc4cf12bfb62fef35ee9`。
- 两端用官方安装入口装入同一包，各 269 个文件逐一比对一致。与上一候选 0.11.1 对比，包内差异在版本清单和两份 README。
- 实测为官方 DSH 0.2.2-rc.5 Windows 桌面及同一发行包的 Web 模式。核对时官方 npm 的 `latest`、`next` 和 Windows 全量下发版本均为 rc.5。兼容声明沿用 `>=0.2.2-rc.3 <0.2.3-0`。[官方 npm 标签](https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags) · [Windows 更新源](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml)

## 验收范围

| 宿主 | 简体中文 | 英文 | 窄窗尺寸 |
| --- | --- | --- | --- |
| Windows 桌面 | 通过 | 通过 | 885 × 660 |
| Web | 通过 | 通过 | 720 × 770 |

- 四组都检查主界面、外观设置、随包手册、独立窗口、会话笔记侧栏和语言切换。来回切换时，已打开的会话笔记标签同步更新标题。
- 从宿主会话进入保存选项。在宽窗三栏与窄窗紧凑布局间切换后，标题内容保留，保存操作在窗口边界内。四组弹窗实测宽 1,280 像素、窄 556 像素；桌面英文确认原生窗口尺寸后，在隐藏窗口的 Electron 渲染视口核对窄布局。每组保存后读回正文及两张原图，并检查导出 ZIP 中的 Markdown 与两份附件。
- 双端验收使用隔离的离线演示资料。AI 建议通过模拟的无可用文本响应检查中英文提示；桌面导出自动化读取应用实际生成的 ZIP，系统保存对话框由自动化拦截。

## 回归与图文

- `npm run typecheck`、`npm run build` 通过。`npm test` 执行 436 项，首跑通过 435 项。切回旧库用例在测试直接重命名临时目录时收到 Windows `EPERM`。该用例在独立临时根及首跑使用的临时根各单独复跑一次，均通过。同步与跨设备合并由本地 Git 仓库的回归用例覆盖。
- 分别打开载入的中英文手册。直接用包内代码生成两份手册，核对每份三章、六处章节链接、封面及两份示例附件。
- 发布图沿用上一候选中已显示字数的四张图文笔记及深色代码原图，保留 0.12.0 的两张会话转存图和两张设置图。图解中的转存选项及英文标签目录也来自 0.12.0。核对成对场景的尺寸、界面、演示内容和图注语种，以及 111 处本地图文链接。发布图在安装包之外，候选摘要与双端验收记录一致。[中英文实拍](../../../assets/screenshots/0.12.0/README.md) · [中文图解](../../user-guide.zh.md) · [英文图解](../../user-guide.en.md)

## 本机证据

双端的 `result.json` 和截图在 `output/playwright/bilingual-0120/{desktop,web}/release-0120/`。对应官方安装收据及桌面启动入口 `Open-Candidate.cmd` 在 `.dsh-home/pure-001/bilingual-20261122/`。全量和复跑日志位于 `dist/i18n-0120/`。上一候选在 `dist/i18n-0111/final-v5/` 保留。

## 发布与市场

- 2026-11-23 00:51（北京时间）公开 `v0.12.0` 并设为最新版，标签指向 `4a507e0b0cd9d5b624d13abfd1297d1ca94fb99b`。发布前核对了 GitHub 记录的两个附件摘要。[GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.12.0)
- 两个公开下载入口分别取得 18,233,740 字节、269 个文件的安装包，包内版本均为 0.12.0。下载的校验文件及两个安装包的 SHA-256 均与已验收候选一致。[版本安装包](https://github.com/StarWind97/dsh-fatfish-notes/releases/download/v0.12.0/dsh-fatfish-notes.tgz) · [最新版入口](https://github.com/StarWind97/dsh-fatfish-notes/releases/latest/download/dsh-fatfish-notes.tgz) · [校验文件](https://github.com/StarWind97/dsh-fatfish-notes/releases/download/v0.12.0/dsh-fatfish-notes.tgz.sha256)
- GitHub 主分支的两份 README、截图清单和八张发布实拍已按源码提交逐文件核对。市场两种语言详情的安装命令都使用已验证的最新版下载入口。[中文 README](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/README.md) · [英文 README](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/README.en.md) · [市场条目](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/StarWind97__dsh-fatfish-notes.yml)
- 发布后的首次检查，两种语言的市场页仍显示 0.10.0 的正文及共用旧图，固定安装入口已取得新版。市场在 2026-11-23 14:14（北京时间）完成定时部署。[市场部署记录](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/actions/runs/45100567540)
- 15:15 在市场实际切换语言，两页的正文均为 0.12.0，各加载四张对应语种的实拍，图解入口也分别对应简体中文和英文。[中文详情](https://awesome-dsh-plugin.com/zh/p/StarWind97/dsh-fatfish-notes/) · [英文详情](https://awesome-dsh-plugin.com/p/StarWind97/dsh-fatfish-notes/)
- 两页均使用同一固定安装入口。15:17 从该入口匿名下载并检查包内版本为 0.12.0，共 269 个文件，SHA-256 与公开校验文件及候选一致。公开目录里的默认截图清单也已同步至 0.12.0。[市场目录](https://awesome-dsh-plugin.com/plugins.json) · [公开校验文件](https://github.com/StarWind97/dsh-fatfish-notes/releases/download/v0.12.0/dsh-fatfish-notes.tgz.sha256)

本机发布和公开下载记录位于 `dist/i18n-0120/publication/`。市场页面的观测记录位于 `dist/i18n-0120/market-verification/`。
