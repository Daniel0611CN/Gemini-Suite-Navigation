(function () {
  const selectors = {
    gemini: {
      prompt: 'user-query-content .query-text',
      chatItem: '.conversation-items-container',
      chatClickable: '.conversation',
      actionsMenu: 'button[data-test-id="actions-menu-button"]',
      deleteButton: 'button[data-test-id="delete-button"]',
      confirmButton: 'button[data-test-id="confirm-button"]',
      sideNav: 'mat-drawer',
      settingsButton: 'side-nav-action-button[data-test-id="settings-and-help-button"]'
    },
    aistudio: {
      prompt: 'textarea, [contenteditable="true"]',
      chatItem: '[data-test-id="conversation"], .conversation',
      chatClickable: '[data-test-id="conversation"], .conversation',
      actionsMenu: 'button[aria-label*="More"], button[data-test-id="actions-menu-button"]',
      deleteButton: 'button[data-test-id="delete-button"]',
      confirmButton: 'button[data-test-id="confirm-button"]',
      sideNav: 'body',
      settingsButton: 'button[aria-label*="Settings"]'
    }
  };

  function getPlatform() {
    return location.hostname === 'aistudio.google.com' ? 'aistudio' : 'gemini';
  }

  function getSelectors(platform = getPlatform()) {
    return selectors[platform] || selectors.gemini;
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

  globalThis.GeminiSelectors = Object.freeze({ getPlatform, getSelectors, showCompatibilityError });
})();
