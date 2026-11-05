# DSH Notebook 0.5.1 · 自动保存与同步体验更新

私人笔记管理：保存会话、编辑图文、导出文件，通过自己的 GitHub 私有仓库跨设备继续工作。

## 更新内容

- **编辑自动保存**：标题、标签、摘要和正文自动保存在本机。点击「完成编辑」、离开笔记或正常关闭 DSH 后，回来从最新内容的阅读态继续。
- **同步提示更清楚**：正在同步显示转圈，成功显示绿色对号；点击查看简短说明和必要操作。笔记库打开时每五分钟检查并同步云端更新。
- **恢复 GitHub 登录更方便**：已连接的笔记库在「同步与设置 → 同步账号」即可重新登录。使用原绑定账号后恢复同步，无需重新接入仓库。
- **回收站确认更轻便**：垃圾桶图标先展开确认，移入后可撤销。
- **反馈入口**：顶栏「问题与建议」直接打开本项目的 GitHub 反馈页面。

同步仍包括上传本机修改和拉取云端更新；临时断网时已绑定笔记库可继续编辑，恢复连接后同步。账号或权限问题会单独提示，不统一称为网络错误。

## 安装与升级

下载附件 `dsh-github-notebook-0.5.1.tgz`，不要下载 Source code。升级前确认同步成功、退出 DSH，并备份笔记资料夹和插件控制目录。执行：

```powershell
dsh plugin --profile desktop add "D:\Downloads\dsh-github-notebook-0.5.1.tgz"
```

替换为实际下载路径，然后重启 DSH。Web 使用者选择自己的 profile。0.5.0 的仓库绑定和笔记格式继续沿用；需要回退时正常退出并安装保留的 0.5.0 包，恢复手动保存／取消操作。

适用 DSH **0.2.1-rc.5**；Windows 已验证，macOS 尚未实测。全量回归 207 项通过，隔离宿主覆盖旧版升级、自动保存和重启、真实私库双向同步以及带图片导出。

[使用与备份说明](https://github.com/StarWind97/dsh-github-notebook/blob/v0.5.1/docs/user-guide.zh.md) · [反馈问题](https://github.com/StarWind97/dsh-github-notebook/issues)

**English:** This update adds automatic local saving, clearer two-way sync status, GitHub sign-in recovery for connected notebooks, lightweight trash confirmation, and a feedback link. Upgrade with the release tarball after backing up and quitting DSH. The 0.5.0 notebook format and repository binding are retained. Windows / DSH 0.2.1-rc.5 tested; macOS not yet tested.
