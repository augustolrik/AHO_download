# asf

- Purpose: Public, download-only GitHub Pages library for student files.
- Open locally: run `node .site/scripts/generate-index.mjs`, then serve `.site-dist` with a local web server.
- Current state: Local project folder is renamed to `asf`. The public GitHub repository and live page still use the previous `AHO_download` name until the GitHub repository is renamed; afterwards its short address will be https://augustolrik.github.io/asf/.
- Blockers: GitHub browser session is not signed in, so the online repository cannot be renamed in this session.
- Next useful step: Sign in to GitHub, rename the repository from `AHO_download` to `asf`, then update the local remote URL and commit/push the pending download-site changes.
