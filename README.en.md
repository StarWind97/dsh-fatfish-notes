<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/fatfish-brand-transparent-dark.svg">
    <img src="assets/brand/fatfish-brand-transparent-light.svg" width="280" height="280" alt="Fatfish Notes">
  </picture>
</p>

# Fatfish Notes · 肥鱼笔记

[简体中文](README.md)

Keep useful conversations as Markdown notes. Read, edit and reference them beside your chats, with local storage and sync through your own private GitHub repository.

> Current version: **0.9.0 for DSH 0.2.2-rc.3**, verified on Windows. See the [release notes](docs/releases/0.9.0/release-notes.md) and [verification record](docs/releases/0.9.0/review.zh.md).

![Keep image results, editing prompts and observations together](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/01-image.png)

## From conversations to notes

- Save a turn, selected messages or an entire conversation. Choose uploaded and AI-delivered files, preserve their position in the note, and keep the original conversation for comparison.
- Search, read, edit and create notes in the conversation sidebar. Link notes to a conversation and add a note-copy reading instruction to the composer for review before sending.
- Edit Markdown in place, paste or drop files, and switch images between inline display and download links.
- Organize with full-text search, tags, favorites, separate pinning, manual notebook order, note links, history, bulk actions and trash.
- Choose from eight layouts and ten palettes, adjust prose fonts and code highlighting, and share appearance preferences across views of the same DSH instance.
- Export a single PNG using the reading layout, a PDF for reading or printing, or a Markdown bundle with original images and files.
- Save locally while offline after initial setup; sync resumes when connected. Import Markdown files, folders or ZIPs, and export a notebook or the full library.

![Refer to saved notes beside a conversation and plan the next step](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/02-conversation.png)

Keep code snippets, results, files and related notes together for the next time you need them.

![Code highlighting, a results table and file links in dark mode](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/03-code.png)

## Installation and upgrade

Download `dsh-fatfish-notes-0.9.0.tgz` from the [0.9.0 release](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.0) for **DSH 0.2.2-rc.3**, not the Source code archive. Users remaining on rc.1 can keep 0.8.0; older plugins cannot read the new saved formats.

Start DSH once to initialize its profile, then quit it. Install a matching package using its actual path:

```powershell
dsh plugin --profile desktop add "D:\Downloads\dsh-fatfish-notes-0.9.0.tgz"
```

Web users should replace `desktop` with their profile name. If `dsh` is not on PATH, use `resources\runtime\cli\bin\dsh.cmd` inside the DSH installation directory. Restart DSH and open Fatfish Notes.

No uninstall or rebinding is needed for an upgrade. Before upgrading to 0.9.0, finish sync, close DSH and the separate note window, and back up both the local notebook folder and `DSH_HOME/fatfish-notes`. **Upgrade all instances sharing one repository together.** New writes can use v3/v4 formats that 0.8.0 cannot read. A downgrade needs a matching host and pre-upgrade backup, not just the old plugin. Existing templates remain ordinary notes; edited handbook content is preserved.

## Getting started

1. Let setup check **Git** and **GitHub CLI**. Install missing tools using the official links, then recheck or restart DSH. The plugin runs these tools for you.
2. Sign in to your own **GitHub account**. Create a dedicated private library, or connect one previously created by this plugin on another computer.
3. Verify the repository and local folder, then complete the first sync. A new empty library includes a three-note handbook. Existing libraries can add it from **Settings → Help**.

Notes and archived resources live on your computer and in your private repository, not on the plugin author's servers. Initial setup requires a connection; local save and cloud sync are tracked separately afterward.

Editing saves automatically. Work in the main page, sidebar or a separate window, with editing handoff when two views open the same note. Open-note tabs last for the current window only.

Use list import/export for Markdown migration. Open exported copies in other editors instead of sharing the internal data directory. **Settings → Sync and storage** shows sync status, authorization and local storage options. Detailed [instructions](docs/user-guide.zh.md) are available in Chinese.

![Adjust the layout, palette and panel density](https://raw.githubusercontent.com/StarWind97/dsh-fatfish-notes/main/assets/screenshots/2026-11-17/04-settings.png)

## Scope and limitations

- Verified on **Windows / DSH 0.2.2-rc.3**. macOS and two physical computers have not been tested.
- The separate window uses installed Chrome or Edge and depends on DSH staying open.
- Appearance preferences are shared within one DSH instance, not across devices. Temporary light/dark overrides affect the current view; the sidebar always follows DSH. Favorites, pins and notebook order sync through the private repository.
- Referencing does not send a message automatically or register a native composer attachment. Optional AI suggestions cover title, summary and tags during capture; note bodies are edited manually.
- Ordinary attachments have no inline preview or playback. Files over 50 MiB require confirmation; the limit is 100 MiB. PNG/PDF exports do not bundle originals; use Markdown bundles for those.
- Import/export covers ordinary Markdown and common image, file and note links, not other apps' plugins, canvases or databases. Permanent deletion does not rewrite Git history or guarantee secure erasure.

Report problems through [Issues](https://github.com/StarWind97/dsh-fatfish-notes/issues), including OS, host/plugin versions and reproduction steps. Do not include credentials or private notes.

Code is [MIT licensed](LICENSE). See [third-party and font notices](THIRD_PARTY_NOTICES.md). Screenshots show the actual isolated interface with sample notes and a staged conversation; the brand icons include updates still in development. Development starts [here](docs/README.md).
