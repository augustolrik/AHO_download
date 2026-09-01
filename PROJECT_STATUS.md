# AHO_download

- Purpose: Public, download-only GitHub Pages library for student files.
- Open locally: run `node .site/scripts/generate-index.mjs`, then serve `.site-dist` with a local web server.
- Current state: Download-site updates for all non-technical file types, direct file downloads, and folder ZIP downloads are committed and pushed. Tegne Spil v1.0.0 is published as `Tegne-Spil.zip` on GitHub Releases, and the homepage button points to the latest Release. Tegne_Spil is excluded from Pages output. The public page is live at https://augustolrik.github.io/AHO_download/.
- Blockers: None.
- Next useful step: When Tegne Spil changes, publish a newer GitHub Release with a ZIP-file named `Tegne-Spil.zip`; the homepage button will automatically use it.
