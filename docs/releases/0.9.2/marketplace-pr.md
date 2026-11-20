## 更新范围

```diff
- 下载肥鱼笔记 0.9.1
+ 下载肥鱼笔记 0.9.2
```

此 PR 更新已有条目 `data/plugins/StarWind97__dsh-fatfish-notes.yml` 的 `tarball`。0.9.2 将宿主声明由 rc.3 扩展为 `>=0.2.2-rc.3 <0.2.3-0`。

## 验证

- 0.9.1 精确声明 rc.3。0.9.2 在 rc.3 Windows 桌面原地升级通过，并在 rc.4 Web 安装、编辑保存、双向同步和重启读回通过。rc.4 Windows 桌面未实测。
- 407 项回归通过。已匿名下载 0.9.2 正式包，从公开地址实际安装到上述两套隔离环境，并核对各 254 个文件与包一致。[公开 Release](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.2) · [验收记录](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/releases/0.9.2/review.zh.md)

## 回退

市场影响仅限此条安装链接。需要回退时可通过后续 PR 恢复 0.9.1 链接，历史包仍可下载。
