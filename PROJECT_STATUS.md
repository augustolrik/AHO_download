# AHO_download

- Purpose: Public, download-only GitHub Pages library for student files.
- Open locally: run `node .site/scripts/generate-index.mjs`, then serve `.site-dist` with a local web server.
- Current state: Download-site updates for all non-technical file types, direct file downloads, and folder ZIP downloads are committed and pushed. A local update adds a fixed Tegne Spil Release download button and excludes Tegne_Spil from Pages output; it awaits commit and push. The public page is live at https://augustolrik.github.io/AHO_download/.
- Blockers: None.
- Next useful step: Commit and push the Release-button update, then create a GitHub Release with `Tegne-Spil.zip` containing `Tegne Spil.exe` and `Toturial.dgm`.
