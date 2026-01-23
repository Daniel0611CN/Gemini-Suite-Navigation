chrome.runtime.onMessage.addListener((request, sender, sendResponse) => (console.log("Background received message:", request), !0)), chrome.runtime.onInstalled.addListener(function (details) { console.log("Extension installed/updated:", details.reason); const settingsKey = "ai-pdf-settings"; if ("install" === details.reason) { console.log("Gemini/AI Studio PDF Extension Installed."); const initialSettings = { fileName: "ai-conversation", theme: "light", orientation: "portrait", compression: !0 }; chrome.storage.local.set({ [settingsKey]: initialSettings }, () => { chrome.runtime.lastError ? console.error("Error saving initial settings:", chrome.runtime.lastError) : console.log("Default PDF settings saved to local storage.") }) } else "update" === details.reason && (console.log("Gemini/AI Studio PDF Extension Updated."), chrome.storage.local.get("ai-pdf-settings", result => { if (!result["ai-pdf-settings"]) { console.log("Settings key not found on update, initializing defaults."); const initialSettings = {}; chrome.storage.local.set({ [settingsKey]: initialSettings }) } })) });

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
        };

        if (previousVersion && isVersionOlder(previousVersion, currentVersion)) {
            chrome.storage.local.set({
                'gfe_show_update_modal': true,
                'gfe_previous_version': previousVersion
            });
        }
    }
});
