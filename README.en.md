# Fatfish Notes · Private Note Management

[简体中文](README.md)

Save conversations, manage notes with images, export files, and sync across devices through your own private GitHub repository.

![Fatfish Notes library](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/01-library.png)

The source tree is the **0.7.0 release candidate, not yet published**. The public stable download remains 0.6.0. Notebook management, import/export, ordinary attachments and batch cleanup below describe 0.7.0. See the [candidate release notes](docs/releases/0.7.0/release-notes.md).

## Features

- Save the current exchange, selected turns or messages, or a whole conversation. Keep the original conversation material separately from the editable note.
- Edit Markdown in place with live previews, headings, lists, code blocks, tables and images. Follow the host's light or dark appearance.
- Export notes or conversations as Markdown, ZIP with image attachments, PDF, a long image or paginated images.
- Organize notes in notebooks with a default destination. Import Markdown files, folders or ZIP archives; export a notebook or the library as portable Markdown with relative image, attachment and note links.
- Save and download ordinary files including PDF, audio and video without inline preview or playback. Files over 10 MiB require confirmation; files over 50 MiB are rejected.
- Link notes by stable identity, and select multiple notes for trash cleanup. Permanent deletion keeps files that other notes still reference.
- Keep a local copy and sync through a dedicated private GitHub repository. After the initial online setup, temporary offline edits are saved locally and sync resumes automatically.
- Optionally request title, summary and tag suggestions when saving a conversation. Note bodies are edited manually.

## Install

The public release is **0.6.0**; **0.7.0** is awaiting release review. Supported host: **DSH 0.2.2-rc.1**. Verified on **Windows**; macOS has not been tested.

Download `dsh-fatfish-notes-0.6.0.tgz` from the [0.6.0 release page](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.6.0), not the automatically generated Source code archive. Start DSH once to initialize its profile, then quit it before installing:

```powershell
dsh plugin --profile desktop add "D:\Downloads\dsh-fatfish-notes-0.6.0.tgz"
```

Use the actual downloaded path. Web users should replace `desktop` with their profile name. If `dsh` is not on PATH, use `resources\runtime\cli\bin\dsh.cmd` inside the DSH installation directory. Restart DSH and open the notebook from the sidebar.

## First-time setup

1. Install **Git** and **GitHub CLI** if the setup screen reports them missing. It provides official download links and a recheck button. The plugin runs these tools for you; you do not need to learn Git commands.
2. Sign in to your own **GitHub account** through the browser. New users can create a private notebook, with `fatfish-notes` as the suggested name. On another computer, connect the notebook previously created by this plugin in the same account.
3. Use the suggested local folder or choose a parent directory in the system folder picker. The repository name is appended automatically. Confirm the cloud repository and final local path, then complete the first sync. Existing nonempty local folders and ordinary project repositories are not accepted for first-time setup.

Notes and archived images live on this computer and in your own private GitHub repository, not on the plugin author's servers. Cloud data is private by default. Tool installation and sign-in are separate from a successful first sync. Local changes made offline are not available on another device until they have synced.

If an already connected notebook needs GitHub authorization again, open **Sync and settings → Sync account**, sign in as the original account, and complete browser verification. The repository and local folder stay unchanged. A different account cannot sync this notebook.

## Upgrade, limitations and feedback

For local review, use `dist/dsh-fatfish-notes-0.7.0.tgz` with the same installation command. There is no public 0.7.0 download yet. An upgrade from 0.6.0 retains the existing binding; no uninstall or setup reset is needed. An initialized empty library gains a default notebook.

If you have content, confirm sync, quit DSH and back up the notebook folder and `DSH_HOME/fatfish-notes` before upgrading. Instances sharing one repository should upgrade together: 0.7.0 updates the data format, and a downgrade requires a matching backup. Historical 0.5.x identity migration is documented [separately](docs/plans/2026-11-06-fatfish-notes-rename.zh.md).

Import/export supports ordinary Markdown, basic properties, images, attachments and common Obsidian links, not third-party plugins, canvases or databases. Open an exported copy in Obsidian; do not share the plugin's internal data directory with another editor. Actual Obsidian verification used 1.10.6.

Automatic attachment of a note to a conversation is not available. Permanent deletion does not rewrite Git history or guarantee secure erasure. Two physical computers and macOS still need real-device testing. Detailed [usage instructions](docs/user-guide.zh.md) and [verification records](docs/verification-log.zh.md) are available in Chinese.

Report problems through [Issues](https://github.com/StarWind97/dsh-fatfish-notes/issues), including OS, host/plugin versions and reproduction steps. Do not include credentials or private notebook contents.

Code is [MIT licensed](LICENSE). See [third-party and font notices](THIRD_PARTY_NOTICES.md). Screenshots show sample content in an isolated host.
