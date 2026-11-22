# Fatfish Notes detailed reference

[Illustrated guide](user-guide.en.md) · [简体中文](user-guide-reference.zh.md)

## Installation, upgrade and removal

Use the package for your DSH version. [Installation and upgrade instructions](../README.en.md#installation-and-upgrade).

Finish syncing and close DSH and separate note windows before upgrading. Back up the local note folder and `DSH_HOME/fatfish-notes`. Open the new version in the same DSH profile to continue using your existing library. A downgrade requires a compatible host and a pre-upgrade backup.

To remove the plugin, remove it from the profile where you installed it. Keep a backup of your library and the private repository if you want to use the notes again.

## First setup

The first connection needs Git, GitHub CLI, your GitHub account and a dedicated private repository. Let setup check the tools, follow the GitHub sign-in prompt, and confirm the repository and local data folder before first sync. To restore the library on a new device, sign in to the same account and connect to the existing repository.

Use **Settings → Sync and storage** to see the account, local folder, pending work and last successful sync. For a folder move, check the source and destination shown by the plugin and finish the move before opening the library through another device or profile.

## User handbook and language

The interface follows the active DSH language. Use **Settings → General → Language** in DSH to select English or Simplified Chinese. The main view, conversation sidebar and separate window use the same language.

**Settings → Help** opens the handbook in the current language or offers to add a new copy. A handbook is three ordinary notes with links and sample files. You can edit, move or delete them. A copy added in the other language is independent. Existing handbook copies stay in your library.

## Appearance and reading

Use **Settings → Appearance** for the layout, palette, contrast and panel density. The main toolbar can change the DSH light or dark theme. The separate window can use a temporary light or dark mode. The conversation sidebar follows DSH.

**Reading and code** sets the reading preset, fonts, text size, spacing and code display. **Workspace** sets the materials panel position, panel layout and reading tabs. Fonts and layout preferences apply on this device. Notes, attachments and notebook ordering sync.

The materials panel shows supplemental files and notes that link here. Pin the panel to keep it open. Use the outline to jump to headings. In reading mode, use **Home**, **End**, **Page Up** and **Page Down** with the note focused.

## Columns and separate windows

A wide main view shows the notebook list, note list and reading pane. In a narrow view, the notebook picker moves to the top of the list. Drag dividers to change their widths and double-click a divider to reset it.

The separate-window button reuses an existing Fatfish Notes window when available. On Windows it uses installed Chrome or Edge, and DSH must stay open. If Windows keeps another window in the foreground, choose Fatfish Notes from the taskbar.

When the same note is being edited in another window, use the editing handoff to continue. Pending edits are saved locally before the handoff. A callback that would switch an open edit to another note asks you to finish or keep working.

## Search, organize and reuse notes

Search words or attachment names. Use a notebook, tag, date or attachment filter for a narrower result. Clicking a text match jumps to its place in the note. Star frequently used notes for **Favorites**, pin important notes, and use the reading tabs to move between open notes.

Use **Organize → Notebooks** to create, rename, reorder or remove notebooks. Set a global default for new notes. A conversation workspace can have a different default. When removing a notebook, review the choice to move notes to the default notebook or move them to **Trash**.

Use **Organize → Tags** to choose an existing tag and preview a rename, merge or removal. Review counts and note previews before confirming. A change to a tag affects classification and keeps the note contents.

Use selection mode for bulk actions and **Trash** to restore removed notes. A permanent deletion removes active copies and unused attached files from the application. Prior commits may still retain content in Git history.

## Images, inline files and supplemental files

Paste a screenshot or drag a file into the editor. Images added on their own appear inline. Mixed file drops use file links. Use the image or file menu to switch an image between inline display and a download link.

Keep additional materials below or beside the body in **Supplemental files**. The reading panel shows the file counts. Ordinary attachments are download links. Files over 50 MiB require confirmation, and the size limit is 100 MiB.

## Conversation sidebar and workspaces

Use **Conversation notes** in the conversation header. Saved notes are linked to their source conversation automatically. Search to find another note and use its menu to link or unlink it. A workspace notebook is the suggested destination for new notes and captures in that workspace.

To reference one or several notes, review their full text, inline images and files, plus any selected supplemental files. Add the reading instructions to the current message, review it and send it yourself. The insertion preserves existing text and attachments.

## Import and export

At **Import / Export**, select Markdown files, a folder, or a ZIP. Review the import preview and choose a destination. If you preserve notebook folders, the plugin creates new folders for any conflicting names. Read the completion report for unavailable resources or unresolved links.

Use the note's export dialog for Markdown, PNG or PDF. A Markdown bundle travels with selected originals. PNG and PDF use a visual representation of the content. Export a selected notebook or the whole library from the list to migrate or create an extra copy.

## Backup, revisions and recovery

Finish syncing before switching devices. Protect the local data folder, the DSH profile data and access to the private repository. Open **Version history** in a note to inspect a prior revision and see the recovery choices. If two devices changed a note concurrently, compare the versions before keeping or merging the content.

Keep credentials in a password manager. Use the notebook editor for the live data and an exported copy for other Markdown applications.

## Feedback

Report reproducible issues with the OS and DSH and Fatfish Notes versions. Include the selected language if a label, prompt or screenshot is wrong. Keep credentials and private note content out of the report. [GitHub issues](https://github.com/StarWind97/dsh-fatfish-notes/issues).
