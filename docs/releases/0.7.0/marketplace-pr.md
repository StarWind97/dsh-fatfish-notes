# Update Fatfish Notes (肥鱼笔记) to 0.7.0

Draft only. Submit after the 0.7.0 release asset is public and has passed download and installation verification.

## Summary

Update the existing `data/plugins/StarWind97__dsh-fatfish-notes.yml` entry to 0.7.0. Keep its repository, package identity, icon and category. Update the pinned tarball and descriptions to cover notebook management, Markdown import/export and ordinary file attachments. No new listing is needed.

This release adds a default notebook and notebook management, whole-library export, Markdown/folder/ZIP import, stable note links, and batch trash cleanup. It removes an unused direct Schemastery peer requirement. Ordinary PDF/audio/video attachments are stored and downloaded without inline playback or preview.

## Verification

Supported host remains DSH 0.2.2-rc.1, verified on Windows. macOS is not claimed as tested. Release checks and package checksum are recorded in `docs/releases/0.7.0/review.zh.md`; append the confirmed public release URL and public-package installation result before submission.

- Type checking, build and 238 regression tests passed. The candidate was installed in an isolated DSH profile and all 139 packaged files matched. Saving, restart persistence, image and note-link navigation, ZIP download and real private GitHub sync passed.
- An empty library created by the actual 0.6.0 storage implementation upgraded successfully and gained one default notebook. The first new note used it automatically.
- The runtime matches the preceding development package, whose exported notes were verified in Obsidian 1.10.6.
- Candidate checksum: `896509c340e8a5094f1c1c1d58bda04c955eaf976249e51805471d820dfcd8f7`. Replace this with the verified public asset checksum if release documentation changes the packed archive.

## Upgrade boundary

The package identifier remains `dsh-fatfish-notes`. Existing binding is retained. This release updates the notes data format; instances sharing one private repository should upgrade together. Reverting the catalog entry is possible, but downgrading the runtime after new-format writes requires a matching data backup.
