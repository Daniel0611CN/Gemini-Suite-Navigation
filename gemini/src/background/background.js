chrome.runtime.onMessage.addListener((request, sender, sendResponse) => (console.log("Mensaje recibido en background:", request), !0)), chrome.runtime.onInstalled.addListener(function (details) { console.log("Extensión instalada/actualizada:", details.reason); const settingsKey = "ai-pdf-settings"; if ("install" === details.reason) { console.log("Extensión PDF Gemini/AI Studio Instalada."); const initialSettings = { fileName: "ai-conversation", theme: "light", orientation: "portrait", compression: !0 }; chrome.storage.local.set({ [settingsKey]: initialSettings }, () => { chrome.runtime.lastError ? console.error("Error al guardar configuración inicial:", chrome.runtime.lastError) : console.log("Configuración PDF predeterminada guardada en almacenamiento local.") }) } else "update" === details.reason && (console.log("Extensión PDF Gemini/AI Studio Actualizada."), chrome.storage.local.get("ai-pdf-settings", result => { if (!result["ai-pdf-settings"]) { console.log("Clave de configuración no encontrada al actualizar, inicializando valores predeterminados."); const initialSettings = {}; chrome.storage.local.set({ [settingsKey]: initialSettings }) } })) });

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
