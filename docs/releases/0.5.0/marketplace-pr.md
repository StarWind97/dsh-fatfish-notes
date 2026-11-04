## Add DSH Notebook

DSH Notebook provides private note management for DeepSeek Harness: save conversations, manage notes with images, export files, and sync across devices through your own private GitHub repository.

This PR adds only `data/plugins/StarWind97__dsh-github-notebook.yml`, in the `docs` category. The entry contains English and Chinese descriptions, a repository-hosted PNG icon and a GitHub Release tarball URL. Screenshots are declared in the plugin repository's `screenshots.json`.

- Repository: https://github.com/StarWind97/dsh-github-notebook
- Release: https://github.com/StarWind97/dsh-github-notebook/releases/tag/v0.5.0
- Host requirement: DSH `0.2.1-rc.5`
- Platform coverage: Windows tested; macOS not yet tested
- Distribution: GitHub Release tarball; no npm publication

Notes and images are stored locally and synchronized to the user's own private GitHub repository. First-time setup requires Git, GitHub CLI and an online connection. Existing notebook users can edit offline and synchronize after reconnecting.
