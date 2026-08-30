# AHO_download

- Purpose: Public, download-only GitHub Pages library for student files.
- Open locally: run `node .site/scripts/generate-index.mjs`, then serve `.site-dist` with a local web server.
- Current state: Download-site updates for all non-technical file types, direct file downloads, and folder ZIP downloads are committed and pushed. A local update now also starts directly at the file overview and collapses each folder until the user presses the open-folder button; it awaits commit and push. The public page is live at https://augustolrik.github.io/AHO_download/.
- Blockers: None.
- Next useful step: Commit and push the local folder-collapse update; thereafter add teaching files directly to this folder, commit, and push from GitHub Desktop to update the download list and folder ZIP files automatically.
