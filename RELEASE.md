# Releases

Releases are distributed only through GitHub Releases. A maintainer updates `gemini/manifest.json`, commits the change, and pushes a tag such as `v1.1.0`. GitHub Actions validates the repository, packages the installable `gemini/` directory, and attaches a versioned ZIP to the release.

Users download the ZIP, extract it, and load the extracted `gemini/` directory through `chrome://extensions` with Developer mode enabled.
