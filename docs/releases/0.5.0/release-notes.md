# DSH Notebook 0.5.0 · 私人笔记管理

保存会话、管理图文笔记、导出文件，通过自己的 GitHub 私有仓库跨设备同步。

## 首发功能

- **会话转存**：保存当前问答、自选消息或整个会话，保留原始素材；可选 AI 建议标题、摘要和标签。
- **图文编辑**：原地 Markdown 编辑与实时预览，支持各级标题、列表、任务列表、代码块、表格和图片。标题、标签、摘要与正文均可手动修改。
- **阅读与管理**：跟随 DSH 深浅色，可调列表宽度、标准／全宽正文、搜索与标签筛选、笔记本、时间排序和回收站。
- **文件导出**：笔记和会话可导出 Markdown、图文 ZIP、PDF、长图或分页图片。
- **私有同步**：本机保存，通过自己 GitHub 账号下的专用私有仓库同步。首次接入成功后可临时离线编辑，联网后自动同步。

## 安装

适用于 **DSH 0.2.1-rc.5**。**Windows 已验证，macOS 尚未实测**。

下载本页附件 `dsh-github-notebook-0.5.0.tgz`，不要下载 Source code 压缩包。先启动一次 DSH，再完全退出，用实际下载路径执行：

```powershell
dsh plugin --profile desktop add "D:\Downloads\dsh-github-notebook-0.5.0.tgz"
```

重启 DSH 后打开侧栏的「DSH笔记」。首次设置会提示安装 Git、GitHub CLI，登录自己的 GitHub 账号，并新建或连接专用私有笔记库。默认库名为 `dsh-notes`，本机位置可更改。

Web 用户请替换 profile 名称。安装与升级、备份恢复的详细步骤见[使用说明](https://github.com/StarWind97/dsh-github-notebook/blob/v0.5.0/docs/user-guide.zh.md)。校验文件为同页的 `SHA256SUMS.txt`。

## 已知边界

首次设置必须联网；离线修改在完成同步前只存在于当前电脑。macOS 和两台物理电脑之间的长期使用仍待实测。当前不提供 Markdown 文件导入、笔记自动附加到会话或 AI 改写正文。

从 `0.5.0-rc.12` 升级不改变笔记存储格式，原有绑定继续使用。升级前请保存、同步并备份本机资料。

遇到问题请提交 [Issue](https://github.com/StarWind97/dsh-github-notebook/issues)，附版本、复现步骤及遮去私人内容的截图，不要上传令牌或完整私人笔记库。

## English

DSH Notebook provides private note management for DeepSeek Harness. Its first release saves conversations as private notes, supports in-place Markdown editing with images, and exports Markdown, image ZIPs, PDF, long images or paginated images. Notes sync through a dedicated private repository in your own GitHub account; temporary offline editing is available after the initial online setup.

Requires **DSH 0.2.1-rc.5**. **Windows tested; macOS untested.** Download the `.tgz` asset, quit DSH, install it with `dsh plugin --profile desktop add <path-to-tgz>`, then restart. Setup guides you through Git, GitHub CLI, sign-in and connecting a private notebook. See the [English README](https://github.com/StarWind97/dsh-github-notebook/blob/v0.5.0/README.en.md).

Markdown file import, automatic note attachment to a conversation and AI rewriting of note bodies are not included. This version retains the rc.12 storage format.
