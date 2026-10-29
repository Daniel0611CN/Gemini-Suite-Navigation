(function () {
  const api = globalThis.GeminiSelectors;
  if (!api) return;
  const platform = api.getPlatform();
  setTimeout(() => {
    if (platform !== 'notebooklm' && !api.hasApplicationShell(platform)) {
      api.showCompatibilityError(`Gemini Suite Navigation could not find the expected ${platform} interface.`);
    }
  }, 5000);
})();
