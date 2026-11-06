# Rename DSH Notebook to Fatfish Notes (肥鱼笔记) and update to 0.6.0

Submitted as [PR #12722](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12722). Submission does not mean approval or storefront availability.

## Summary

Update the existing listing from #11960 and #12283 to **肥鱼笔记 · Fatfish Notes 0.6.0**. The GitHub repository was renamed in place; this is the same project. The listing continues to describe conversation capture, Markdown notes, file export and private GitHub sync.

```diff
- data/plugins/StarWind97__dsh-github-notebook.yml
+ data/plugins/StarWind97__dsh-fatfish-notes.yml
```

Update the display name, repository and icon URLs, and the pinned release tarball. The category and functional description remain unchanged. Only this plugin entry changes; generated READMEs are untouched.

## Evidence

- **Before:** the existing entry points to DSH Notebook 0.5.1 under its old repository/package name.
- **After:** [Fatfish Notes 0.6.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.6.0) is public. The package, checksum, icon and four screenshots were downloaded without authentication and matched the local release artifacts. The public package was installed in an isolated DSH profile; all 128 packaged files matched.
- Type checking, build and 218 regression tests passed. Tested on Windows with DSH **0.2.2-rc.1**, including conversation image capture/export, automatic saving, chapter navigation, initialization and two-way synchronization through a dedicated private test repository. macOS has not been tested.
- Package SHA-256: `d77bff6697bb3e05325edc078b1f46f9f59fd68a2d80b9d0b46ae2772a718b00`.

## Merge Danger

**Door:** Two-way for the catalog entry: this YAML change can be reverted.

**Blast Radius:** One listing. The package identifier changes from `dsh-github-notebook` to `dsh-fatfish-notes`; it does not automatically upgrade the old plugin identity or adopt its old data format. The developer's isolated data was migrated once. Historical 0.5.x releases remain available, and the README documents the installation boundary. No duplicate listing is added.
