# GitHub 使用说明图解化

2026-11-18 用户批准实施。阅读区概览的「使用说明」继续打开 `docs/user-guide.zh.md`。把会话顶部小鱼和回答下方的「保存到笔记」放在第一页，帮助熟悉常见笔记软件的用户发现 DSH 会话内的能力。新建、阅读和查找用主界面地图速览；首次连接、同步和导出用图说明。

## 方案与范围

- 使用 GitHub Markdown、仓库内的 PNG 和短链接目录。静态图片控制取景和标注，Markdown 提供可复制的按钮名称和关键步骤。GitHub 原生支持 Mermaid，但截图标注和手机缩放可用定稿图片统一控制；本次选用原地址和原生渲染，站点部署与插件改动属于独立事项。[GitHub 图示](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams) · [图片](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#images)
- 正文首屏标出两处入口。围绕同一场景演示保存问答、从右侧「会话笔记」找回资料、点「引用 → 加入输入框」继续讨论。实拍采用隔离环境或既有已接受的公开素材，素材来源和版本边界随验证记录。
- 为主界面、首次设置、保存状态和导出选择补图。必要步骤保留短文字或替代文本。旧说明作为按主题查阅的详细参考，保留被引用的章节及路径。优先修正仍在使用的旧锚点。
- 修改在线说明及其图片、详细参考和开发入口。验收按文档第一档，检查真实控件与标注、资源和章节链接、桌面及窄宽度渲染、亮暗主题，推送后核对远端提交与原 URL。预期半天。回退可撤销本次文档提交。

## 实施与验收

- 已核对 `main`、工作区、当版发布记录和概览地址。开始编排与选择实拍。
- 图解页与七张图片已完成初稿。会话全景、入口放大与主界面地图采用 [11 月 17 日获选实拍](../../assets/screenshots/2026-11-17/README.md)。同场景引用确认窗取自该次预览的 `output/playwright/showcase-20261117/02-conversation-detail.png`。局部框选仅用于指示真实控件。转存三步、首次设置、同步状态与导出对照依据现有说明、产品实现与当前中文标签绘制。「仅图标」使用同一个真实书本加号。侧栏标题只在打开后的画面出现，正文章节明确入口是会话标题栏的小鱼。
- 原说明迁至[详细操作参考](../user-guide-reference.zh.md)。图解页保留原章节锚点和旧版导入链接，参考页修正菜单名称、同步状态与仍可执行的当前操作。进入图像清晰度与链接验收。
- 本地验收通过。核对七张 PNG 的内容、标注落点和替代文本，图片共约 1.18 MB；实拍只截取示例会话和笔记主体。检查 47 处相对路径与页内链接，保留 18 个原说明标题的锚点，另验证三处仓库内历史引用。用 Chromium 本地渲染 GitHub 风格的 Markdown，覆盖 320、390、1050 px 和亮暗主题，七张图片均解码，六个目录链接逐个跳转，首图完整可见，页面无横向溢出。证据在 `output/playwright/user-guide-20261118/` 的 `validation.json` 和预览截图。按纯文档范围交付，远端核对以 GitHub `main` 的实际渲染为准。
