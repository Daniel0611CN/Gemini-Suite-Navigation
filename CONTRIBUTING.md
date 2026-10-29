# Contributing

Gemini Suite Navigation is a native JavaScript Manifest V3 extension. Keep platform-specific behavior in `gemini/src/content/gemini/` and `gemini/src/content/aistudio/`; shared behavior belongs in `common/`.

Before opening a pull request, run:

```bash
npm test
npm run check
```

Do not add analytics, remote persistence, or store-specific packaging. Changes must preserve local-only data handling and should include a focused test or validation check when behavior changes.
