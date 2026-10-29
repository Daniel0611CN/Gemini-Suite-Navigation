(function () {
  const api = globalThis.GeminiSelectors;
  if (!api) return;
  const platform = api.getPlatform();
  const selectors = api.getSelectors(platform);
  const required = platform === 'gemini' ? [selectors.prompt, selectors.settingsButton] : [selectors.prompt];
  setTimeout(() => {
    if (!required.some((selector) => document.querySelector(selector))) {
      api.showCompatibilityError(`Gemini Suite Navigation could not find the expected ${platform} interface.`);
    }
  }, 5000);
})();
