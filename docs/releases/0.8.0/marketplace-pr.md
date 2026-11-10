# Update Fatfish Notes (肥鱼笔记) to 0.8.0

Preparation draft — submit only after the release is public and its download and installation have been verified.

## Summary

Update the existing `data/plugins/StarWind97__dsh-fatfish-notes.yml` entry to 0.8.0. Keep its repository, package identity, name, icon and category. Change the pinned tarball and descriptions; no new listing is needed.

This release adds a separate notebook window, adaptive three-column layout, same-note editing handoff, favorites, recent visits, improved search, revision previews and recovery, batch organization, backlinks and reusable templates. It also reduces repeated filesystem validation and UI refresh work.

## Verification

Supported host remains DSH 0.2.2-rc.1, verified on Windows. Independent windows use installed Chrome or Edge and share the running DSH notebook service. macOS is not claimed as tested.

Candidate checks are recorded in the [release review](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/releases/0.8.0/review.zh.md): type checking and build passed; the 261-test suite passed 260 initially, with one Windows directory rename error passing two unchanged targeted reruns. All 151 packaged files matched the isolated installation. Actual public 0.7.0 data upgraded with notes, images and attachments intact. Two-window saves, editing protection, history preview, private GitHub sync and restart persistence passed. The runtime matches the previously reviewed performance package.

Candidate SHA-256: `43bdf1002d304d3d588ba64c3f07a9f741bbbd98d0633509ec353ec3a360f3b4`. This is not yet a public asset. Replace it with the final package digest and add anonymous download/public URL installation results before submitting this PR. No public verification is claimed while this document is a draft.

## Upgrade boundary

Existing repository binding and notebook data are retained. Instances sharing a private repository should upgrade together: old runtimes do not understand the new favorite/template revision fields. Downgrading after using them requires a matching data backup.
