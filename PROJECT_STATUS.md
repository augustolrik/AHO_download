# AHO_download

- Purpose: Public, download-only GitHub Pages library for student files.
- Open locally: run `node .site/scripts/generate-index.mjs`, then serve `.site-dist` with a local web server.
- Current state: Download-site updates for all non-technical file types, direct file downloads, and folder ZIP downloads are committed and pushed. Tegne Spil has a fixed Release download button, and Tegne_Spil is excluded from Pages output. The public page is live at https://augustolrik.github.io/AHO_download/.
- Blockers: None.
- Next useful step: Create a GitHub Release with `Tegne-Spil.zip` containing `Tegne Spil.exe` and `Toturial.dgm`; the download button will then work.
