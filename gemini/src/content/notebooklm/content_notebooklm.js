(function () {
  const NOTEBOOK_SELECTOR = '[data-notebook-id], a[href*="/notebook/"], [role="main"]';

  function installTools() {
    if (document.getElementById('gsn-notebooklm-tools')) return;
    if (!document.querySelector(NOTEBOOK_SELECTOR)) return;
    const tools = globalThis.GeminiSelectors.mountActionDock('gsn-notebooklm-tools', `
      <strong>NotebookLM tools</strong>
      <button type="button" data-action="copy-notebook">Copy visible notebook text</button>
      <button type="button" data-action="open-settings">Suite settings</button>`, async (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'copy-notebook') {
        const text = document.querySelector('main, [role="main"]')?.innerText.trim();
        if (text) await navigator.clipboard.writeText(text);
      }
      if (action === 'open-settings') globalThis.GeminiSelectors.openSettings();
    });
    if (!tools) return;
  }

  const observer = new MutationObserver(installTools);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installTools();
})();
