## Update DSH Notebook to 0.5.1

Update the existing `data/plugins/StarWind97__dsh-github-notebook.yml` tarball from 0.5.0 to 0.5.1. The plugin was added by #11960; its name, category, descriptions and repository remain unchanged.

Version 0.5.1 adds automatic local saving, clearer two-way sync status, GitHub sign-in recovery for connected notebooks, lightweight trash confirmation and a feedback link. It retains the notebook storage format and DSH 0.2.1-rc.5 compatibility.

- Release: https://github.com/StarWind97/dsh-github-notebook/releases/tag/v0.5.1
- Distribution: GitHub Release tarball; no npm publication
- Validation: 207 regression tests, isolated Desktop/Web installation, upgrade from 0.5.0, restart recovery, private GitHub two-way sync and image exports
- Platform: Windows tested; macOS not yet tested

The release tarball, checksum file, icon and screenshots were downloaded without authentication and matched the reviewed artifacts.
