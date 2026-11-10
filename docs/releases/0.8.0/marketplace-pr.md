# Update Fatfish Notes (肥鱼笔记) to 0.8.0

Release: https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.8.0

## Summary

Update the existing `data/plugins/StarWind97__dsh-fatfish-notes.yml` entry to 0.8.0. Keep its repository, package identity, name, icon and category. Change the pinned tarball and descriptions; no new listing is needed.

This release adds a separate notebook window, adaptive three-column layout, same-note editing handoff, favorites, recent visits, improved search, revision previews and recovery, batch organization, backlinks and reusable templates. It also reduces repeated filesystem validation and UI refresh work.

## Verification

Supported host remains DSH 0.2.2-rc.1, verified on Windows. Independent windows use installed Chrome or Edge and share the running DSH notebook service. macOS is not claimed as tested.

Candidate checks are recorded in the [release review](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/releases/0.8.0/review.zh.md): type checking and build passed; the 261-test suite passed 260 initially, with one Windows directory rename error passing two unchanged targeted reruns. All 151 packaged files matched the isolated installation. Actual public 0.7.0 data upgraded with notes, images and attachments intact. Two-window saves, editing protection, history preview, private GitHub sync and restart persistence passed. The runtime matches the previously reviewed performance package.

Published package SHA-256: `359b175cf89f509c41002efbbd94c52b7f7ee101c75c66b7490ade44e23289f9` (15,033,583 bytes). Only the two README files differ from the reviewed candidate; runtime code and dependencies are identical.

Anonymous downloads of the public tarball, checksum file, icon and all eight declared screenshots matched local bytes. The exact public tarball URL was installed into an isolated DSH profile: all 151 files matched. The embedded and separate windows opened successfully; existing notes, archived images, attachment bytes and history preview passed. Sync with the designated private test repository completed with no pending changes or page errors. No npm publication is required.

## Upgrade boundary

Existing repository binding and notebook data are retained. Instances sharing a private repository should upgrade together: old runtimes do not understand the new favorite/template revision fields. Downgrading after using them requires a matching data backup.
