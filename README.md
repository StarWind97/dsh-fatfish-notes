<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/showcase-20261117/fatfish-brand-transparent-dark.svg">
    <img src="assets/brand/showcase-20261117/fatfish-brand-transparent-light.svg" width="280" height="280" alt="肥鱼笔记 · Fatfish Notes">
  </picture>
</p>

# 肥鱼笔记 · Fatfish Notes

[English](README.en.md)

把值得留下的会话整理成自己的笔记，在会话旁阅读、修改和复用。笔记保存在本机，通过自己的 GitHub 私有仓库同步。

> 当前版本 **0.10.0**，推荐使用兼容范围内最新的 DSH。本版声明支持 `>=0.2.2-rc.3 <0.2.3-0`。见[版本说明](docs/releases/0.10.0/release-notes.md)和[验证记录](docs/releases/0.10.0/review.zh.md)。

![留下生图结果、修改指令和使用心得](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/01-image.png)

## 从会话到笔记

- **选择并保存**：保存一轮问答、几条消息或整个会话，选择用户上传与 AI 交付的图片和文件。正文保留素材位置，原始会话可以随时对照。
- **在会话旁使用**：侧栏中查找、阅读、修改和新建笔记，关联当前会话；把笔记副本的读取说明加入输入框，检查后再发送。
- **自由整理内容**：原地编辑 Markdown，粘贴或拖入图片和附件。纯图片默认展示，混合文件默认链接，图片可随时切换展示形式。
- **找回并组织**：按文字和附件名搜索，组合筛选并定位正文原句。整理标签前可查看受影响的笔记和正文。支持收藏、置顶、笔记互链、批量整理和历史恢复。
- **按习惯阅读**：八套布局、十种配色，中文与西文字体、代码高亮和字重可调；主界面与独立窗口共享外观偏好，侧栏始终跟随 DSH 明暗。
- **按用途交付**：单张 PNG 沿用阅读版式与选定宽度；PDF 适合阅读和打印；Markdown 资源包保留图片及附件原件。
- **本机保存与私库同步**：首次设置完成后，断网仍可编辑保存，联网自动续传。可导入 Markdown 文件、文件夹或 ZIP，也可导出整本或整个笔记库。

![在会话旁查阅已保存的笔记，接着讨论下一步](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/02-conversation.png)

代码片段、检查结果、文件与关联笔记也可以一起保存，便于下次查找和复用。

![深色阅读中的代码高亮、结果表格和文件链接](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/03-code.png)

## 安装与升级

下载[最新正式安装包 `dsh-fatfish-notes.tgz`](https://github.com/StarWind97/dsh-fatfish-notes/releases/latest/download/dsh-fatfish-notes.tgz)。指定版本与校验文件见 [0.10.0 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.10.0)。如果 DSH 版本过低，请先升级 DSH。新版资料需由相应版本的插件读写。

取得与宿主匹配的插件包后，先打开一次 DSH 完成初始化，再完全退出 DSH。在终端执行，替换为实际文件路径：

```powershell
dsh plugin --profile desktop add "D:\Downloads\dsh-fatfish-notes.tgz"
```

重新打开 DSH，在左侧进入「肥鱼笔记」。Web 使用者将 `desktop` 换成自己的 profile 名称。若找不到 `dsh`，使用 DSH 安装目录下 `resources\runtime\cli\bin\dsh.cmd` 的完整路径。

0.9.3 用户可以在现有 DSH 资料中直接安装 0.10.0，重启后沿用原私库和笔记。升级前完成同步，关闭独立窗口及 DSH，备份本机笔记资料夹和 `DSH_HOME/fatfish-notes`。**从 0.8.0 升级时，同一私库各端须一起升级宿主与插件。** v3/v4 资料需要新版插件，回退需要配套宿主及升级前备份。旧模板和已编辑的手册继续作为笔记保留。

## 开始使用

1. **准备工具**：首次设置检查 Git 和 GitHub CLI；缺少时提供官方安装入口。安装后重新检测，必要时重启 DSH。插件自动使用这些工具，无需学习 Git 命令。
2. **连接私有笔记库**：登录自己的 GitHub 账号，新用户可创建专用私库；换电脑则连接由本插件创建的已有私库。
3. **确认位置并同步**：核对账号、云端仓库和本机资料夹，完成首次同步。新建的空库会提供三篇可阅读和修改的用户手册；已有库可在「设置 → 帮助」主动添加。

笔记、归档图片和附件位于你的电脑及自己的私有仓库，不存放在插件作者的服务器。首次同步需要联网；之后本机保存与云端同步分别显示状态。

编辑时自动保存。可在 DSH 主页面、会话侧栏或独立窗口继续工作；同一篇笔记在两处编辑时提供交接。收藏与置顶是不同操作。窗口内打开的笔记标签便于切换，关闭窗口后不保留。

从笔记列表「导入 / 导出」迁入或导出 Markdown。将导出的副本用于 Obsidian 等软件，不要让其他软件直接写入内部资料目录。「设置 → 同步与存储」可以查看状态、恢复账号授权和更换本机位置。详见[使用说明](docs/user-guide.zh.md)。

![按习惯调整界面布局、配色与密度](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/04-settings.png)

## 使用边界

- 桌面和 Web 的实测范围见 [0.10.0 验证记录](docs/releases/0.10.0/review.zh.md)。
- 独立窗口使用 Windows 上已安装的 Chrome 或 Edge，依赖 DSH 保持运行。
- 外观偏好在同一 DSH 内共享，不跨设备同步；明暗手动切换只影响当前视图，宿主再次切换时恢复跟随。收藏、置顶和笔记本顺序随私库同步。
- 引用不会自动发送，也尚未登记到宿主原生附件栏。AI 只在转存时可选生成标题、摘要和标签，正文由用户编辑。
- 普通附件不提供内嵌预览或播放；超过 50 MiB 提醒确认，上限 100 MiB。PNG/PDF 不附带原文件，要交付原件请用 Markdown 资源包。
- 导入导出覆盖普通 Markdown 与常见图片、文件、笔记链接，不迁移其他软件的插件、白板或数据库。彻底删除不重写 Git 历史，不等同于安全擦除。

问题与建议可通过 [Issues](https://github.com/StarWind97/dsh-fatfish-notes/issues) 提交，请附系统、DSH/插件版本及复现步骤，不要提供凭据或私人笔记。

开发见[开发入口](docs/README.md)、[项目约定](AGENTS.md)与[产品设计](docs/notes-design.zh.md)。代码采用 [MIT](LICENSE)，字体及第三方依赖见[授权说明](THIRD_PARTY_NOTICES.md)。展示截图取自实际隔离界面，使用演示笔记与编排会话；展示截图保留已接受的场景内容；当前品牌图标见插件实际界面。
