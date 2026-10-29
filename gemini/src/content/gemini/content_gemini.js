(function () {
  const selectors = globalThis.GeminiSelectors;
  const platform = 'gemini';

  function getUserMessages() {
    const selector = selectors?.getPromptSelector(platform) || '[data-message-author-role="user"]';
    return Array.from(document.querySelectorAll(selector)).map((element) => element.textContent.trim()).filter(Boolean);
  }

  function showStatus(message, kind = 'info') {
    const id = 'gsn-platform-status';
    let status = document.getElementById(id);
    if (!status) {
      status = document.createElement('div');
      status.id = id;
      document.body.appendChild(status);
    }
    status.dataset.kind = kind;
    status.textContent = message;
    status.classList.add('gsn-visible');
    window.setTimeout(() => status.classList.remove('gsn-visible'), 3500);
  }

  function installTools() {
    if (document.getElementById('gsn-gemini-tools')) return;
    const host = document.querySelector('main, #app-root');
    if (!host) return;
    const tools = document.createElement('div');
    tools.id = 'gsn-gemini-tools';
    tools.innerHTML = `
      <button type="button" data-action="copy-prompts">Copy prompts</button>
      <button type="button" data-action="open-settings">Suite settings</button>`;
    tools.addEventListener('click', async (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'copy-prompts') {
        const messages = getUserMessages();
        if (!messages.length) return showStatus('No user prompts found yet.', 'warning');
        await navigator.clipboard.writeText(messages.join('\n\n'));
        showStatus(`${messages.length} prompts copied.`);
      }
      if (action === 'open-settings') chrome.runtime.openOptionsPage();
    });
    host.appendChild(tools);
  }

  const observer = new MutationObserver(installTools);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installTools();
})();
