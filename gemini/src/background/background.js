chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptionsPage') {
        chrome.runtime.openOptionsPage(() => {
            const error = chrome.runtime.lastError;
            if (error) {
                console.error('[Gemini Suite Navigation] Could not open options page.', error);
                sendResponse({ ok: false, error: error.message });
                return;
            }
            sendResponse({ ok: true });
        });
        return true;
    }
    return false;
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log(`[Gemini Suite Navigation] Extension ${details.reason}.`);
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "update") {
        const previousVersion = details.previousVersion;
        const currentVersion = chrome.runtime.getManifest().version;

        const isVersionOlder = (oldV, newV) => {
            const oldParts = oldV.split('.').map(Number);
            const newParts = newV.split('.').map(Number);
            for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
                const a = oldParts[i] || 0;
                const b = newParts[i] || 0;
                if (a < b) return true;
                if (a > b) return false;
            }
            return false;
        }; // Función para verificar si una versión es más antigua que otra

        if (previousVersion && isVersionOlder(previousVersion, currentVersion)) {
            chrome.storage.local.set({
                'gfe_show_update_modal': true,
                'gfe_previous_version': previousVersion
            });
        }
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return;
    const action = command === 'toggle-sidebar' ? 'toggleSidebar' : 'focusSearch';
    try {
        await chrome.tabs.sendMessage(tab.id, { action });
    } catch (error) {
        console.error(`[Gemini Suite Navigation] Could not send ${action} command.`, error);
    }
});
