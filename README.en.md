# DSH Notebook · Private Note Management

[简体中文](README.md)

Save conversations, manage notes with images, export files, and sync across devices through your own private GitHub repository.

![DSH Notebook library](https://raw.githubusercontent.com/StarWind97/dsh-github-notebook/main/assets/screenshots/01-library.png)

Version `0.5.1` adds automatic local saving, recovery on reopening, foreground two-way checks every five minutes, and an account sign-in entry for an already connected notebook. Check GitHub Releases for publication status.

## Features

- Save the current exchange, selected turns or messages, or a whole conversation. Keep the original conversation material separately from the editable note.
- Edit Markdown in place with live previews, headings, lists, code blocks, tables and images. Follow the host's light or dark appearance.
- Export notes or conversations as Markdown, ZIP with image attachments, PDF, a long image or paginated images.
- Keep a local copy and sync through a dedicated private GitHub repository. After the initial online setup, temporary offline edits are saved locally and sync resumes automatically.
- Optionally request title, summary and tag suggestions when saving a conversation. Note bodies are edited manually.

## Install

This guide covers **0.5.1**. Supported host: **DSH 0.2.1-rc.5**. Verified on **Windows**; macOS has not been tested.

Check [GitHub Releases](https://github.com/StarWind97/dsh-github-notebook/releases) for publication status and download `dsh-github-notebook-0.5.1.tgz`, not the automatically generated Source code archive. Start DSH once to initialize its profile, then quit it before installing:

```powershell
dsh plugin --profile desktop add "D:\Downloads\dsh-github-notebook-0.5.1.tgz"
```

Use the actual downloaded path. Web users should replace `desktop` with their profile name. If `dsh` is not on PATH, use `resources\runtime\cli\bin\dsh.cmd` inside the DSH installation directory. Restart DSH and open the notebook from the sidebar.

## First-time setup

1. Install **Git** and **GitHub CLI** if the setup screen reports them missing. It provides official download links and a recheck button. The plugin runs these tools for you; you do not need to learn Git commands.
2. Sign in to your own **GitHub account** through the browser. New users can create a private notebook, with `dsh-notes` as the suggested name. On another computer, connect the notebook previously created by this plugin in the same account.
3. Confirm the cloud repository and local folder, then complete the first sync. Ordinary project repositories are not accepted as existing notebooks.

Notes and archived images live on this computer and in your own private GitHub repository, not on the plugin author's servers. Cloud data is private by default. Tool installation and sign-in are separate from a successful first sync. Local changes made offline are not available on another device until they have synced.

If an already connected notebook needs GitHub authorization again, open **Sync and settings → Sync account**, sign in as the original account, and complete browser verification. The repository and local folder stay unchanged. A different account cannot sync this notebook.

## Upgrade, limitations and feedback

Before upgrading, save your edits, confirm sync, quit DSH and back up the notebook folder and plugin control directory. Install the new package with the same command. Existing bindings are retained. Version 0.5.1 uses the same notebook storage format as 0.5.0. To roll back, quit DSH and reinstall the retained 0.5.0 package; manual Save/Cancel behavior returns.

Markdown file import and automatic attachment of a note to a conversation are not available in this version. Two isolated instances on one Windows computer have been tested; two physical computers and macOS still need real-device testing. Detailed [usage instructions](docs/user-guide.zh.md) and [verification records](docs/verification-log.zh.md) are available in Chinese.

Report problems through [Issues](https://github.com/StarWind97/dsh-github-notebook/issues), including OS, host/plugin versions and reproduction steps. Do not include credentials or private notebook contents.

Code is [MIT licensed](LICENSE). See [third-party and font notices](THIRD_PARTY_NOTICES.md). Screenshots show sample content in an isolated host.
