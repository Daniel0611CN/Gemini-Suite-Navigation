(function () {
  const selectors = {
    gemini: {
      prompt: 'user-query-content .query-text, user-query-content .query-text-line, [data-message-author-role="user"], [data-testid="user-query"]',
      input: 'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]',
      chatItem: '.conversation-items-container, [data-test-id="conversation"], [data-testid="conversation"], nav a[href*="/app/"]',
      chatClickable: '.conversation, [data-test-id="conversation"], [data-testid="conversation"], nav a[href*="/app/"]',
      actionsMenu: 'button[data-test-id="actions-menu-button"], button[aria-label*="More"], button[aria-label*="Más"], [role="button"][aria-label*="More"], [role="button"][aria-label*="Más"]',
      deleteButton: 'button[data-test-id="delete-button"], [role="menuitem"][aria-label*="Delete"], [role="menuitem"][aria-label*="Eliminar"]',
      confirmButton: 'button[data-test-id="confirm-button"], button[aria-label*="Confirm"], button[aria-label*="Confirmar"]',
      sideNav: 'mat-drawer, nav, [role="navigation"]',
      settingsButton: 'side-nav-action-button[data-test-id="settings-and-help-button"], button[aria-label*="Settings"], button[aria-label*="Configuración"], [role="button"][aria-label*="Settings"], [role="button"][aria-label*="Configuración"]'
    },
    aistudio: {
      prompt: '[data-message-author-role="user"], [data-testid="user-query"], .query-text, .query-text-line',
      input: 'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]',
      chatItem: '[data-test-id="conversation"], [data-testid="conversation"], .conversation, nav a[href*="/prompt/"]',
      chatClickable: '[data-test-id="conversation"], .conversation',
      actionsMenu: 'button[aria-label*="More"], button[aria-label*="Más"], button[data-test-id="actions-menu-button"]',
      deleteButton: 'button[data-test-id="delete-button"], [role="menuitem"][aria-label*="Delete"], [role="menuitem"][aria-label*="Eliminar"]',
      confirmButton: 'button[data-test-id="confirm-button"], button[aria-label*="Confirm"], button[aria-label*="Confirmar"]',
      sideNav: 'nav, [role="navigation"], body',
      settingsButton: 'button[aria-label*="Settings"], button[aria-label*="Configuración"]'
    },
    notebooklm: {
      prompt: 'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]',
      input: 'textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]',
      chatItem: '[data-notebook-id], a[href*="/notebook/"]',
      chatClickable: '[data-notebook-id], a[href*="/notebook/"]',
      actionsMenu: 'button[aria-label*="More"], button[aria-label*="Más"]',
      deleteButton: '[role="menuitem"][aria-label*="Delete"], [role="menuitem"][aria-label*="Eliminar"]',
      confirmButton: 'button[aria-label*="Confirm"], button[aria-label*="Confirmar"]',
      sideNav: 'nav, [role="navigation"], body',
      settingsButton: 'button[aria-label*="Settings"], button[aria-label*="Configuración"]'
    }
  };

  function getPlatform() {
    if (location.hostname === 'aistudio.google.com') return 'aistudio';
    if (location.hostname === 'notebooklm.google.com') return 'notebooklm';
    return 'gemini';
  }

  function getSelectors(platform = getPlatform()) {
    return selectors[platform] || selectors.gemini;
  }

  function getPromptSelector(platform = getPlatform()) {
    return getSelectors(platform).prompt;
  }

  function getInputSelector(platform = getPlatform()) {
    return getSelectors(platform).input;
  }

  function hasApplicationShell(platform = getPlatform()) {
    const config = getSelectors(platform);
    return Boolean(document.querySelector('#app-root, main, .initial-input-area, nav, ' + config.input));
  }

  function openSettings() {
    chrome.runtime.sendMessage({ action: 'openOptionsPage' }, (response) => {
      const error = chrome.runtime.lastError;
      if (error || !response?.ok) {
        console.error('[Gemini Suite Navigation] Could not open settings.', error || response?.error);
      }
    });
  }

  function getActionDock() {
    let dock = document.getElementById('gsn-action-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'gsn-action-dock';
      dock.setAttribute('role', 'toolbar');
      dock.setAttribute('aria-label', 'Gemini Suite Navigation tools');
      document.body?.appendChild(dock);
    }
    return dock;
  }

  function mountActionDock(id, content, onClick) {
    const dock = getActionDock();
    let tool = document.getElementById(id);
    if (!tool) {
      tool = document.createElement('div');
      tool.id = id;
      tool.innerHTML = content;
      dock.appendChild(tool);
      if (onClick) tool.addEventListener('click', onClick);
    }
    return tool;
  }

  function showCompatibilityError(message) {
    console.error(`[Gemini Suite Navigation] ${message}`);
    if (document.getElementById('gsn-compatibility-error')) return;
    const banner = document.createElement('div');
    banner.id = 'gsn-compatibility-error';
    banner.setAttribute('role', 'alert');
    banner.textContent = `${message} The page may have changed; update the extension or report the site version.`;
    Object.assign(banner.style, {
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      maxWidth: 'min(640px, 90vw)',
      padding: '12px 16px',
      borderRadius: '8px',
      background: '#b3261e',
      color: '#fff',
      font: '14px Google Sans, sans-serif',
      boxShadow: '0 4px 16px rgba(0,0,0,.3)'
    });
    document.body?.appendChild(banner);
  }

  globalThis.GeminiSelectors = Object.freeze({
    getPlatform,
    getSelectors,
    getPromptSelector,
    getInputSelector,
    hasApplicationShell,
    openSettings,
    getActionDock,
    mountActionDock,
    showCompatibilityError
  });
})();
