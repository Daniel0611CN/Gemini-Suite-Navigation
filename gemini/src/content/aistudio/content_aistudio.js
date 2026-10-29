(function () {
  const selectors = globalThis.GeminiSelectors;

  function getInput() {
    return document.querySelector(selectors?.getSelectors('aistudio').input || 'textarea, [contenteditable="true"]');
  }

  function installTools() {
    if (document.getElementById('gsn-aistudio-tools')) return;
    const tools = selectors.mountActionDock('gsn-aistudio-tools', `
      <button type="button" data-action="prompt-template">Insert prompt template</button>
      <button type="button" data-action="copy-input">Copy current prompt</button>
      <button type="button" data-action="open-settings">Suite settings</button>`, async (event) => {
      const action = event.target.closest('button')?.dataset.action;
      const currentInput = getInput();
      if (action === 'prompt-template' && currentInput) {
        const template = 'Goal:\n\nContext:\n\nConstraints:\n\nExpected output:\n';
        currentInput.focus();
        if ('value' in currentInput) currentInput.value = template;
        else document.execCommand('insertText', false, template);
        currentInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (action === 'copy-input' && currentInput) {
        await navigator.clipboard.writeText('value' in currentInput ? currentInput.value : currentInput.textContent);
      }
      if (action === 'open-settings') selectors.openSettings();
    });
    if (!tools) return;
  }

  const observer = new MutationObserver(installTools);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installTools();
})();
