(function () {
  const NOTEBOOK_SELECTOR = '[data-notebook-id], a[href*="/notebook/"], [role="main"]';

  function installTools() {
    if (document.getElementById('gsn-notebooklm-tools')) return;
    const host = document.querySelector('main, [role="main"]');
    if (!host || !document.querySelector(NOTEBOOK_SELECTOR)) return;
    const tools = document.createElement('div');
    tools.id = 'gsn-notebooklm-tools';
    tools.innerHTML = `
      <strong>NotebookLM tools</strong>
      <button type="button" data-action="copy-notebook">Copy visible notebook text</button>
      <button type="button" data-action="open-settings">Suite settings</button>`;
    tools.addEventListener('click', async (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'copy-notebook') {
        const text = document.querySelector('main, [role="main"]')?.innerText.trim();
        if (text) await navigator.clipboard.writeText(text);
      }
      if (action === 'open-settings') chrome.runtime.openOptionsPage();
    });
    host.prepend(tools);
  }

  const observer = new MutationObserver(installTools);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installTools();
})();
