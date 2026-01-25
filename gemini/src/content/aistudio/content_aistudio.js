try {
  const __aiStudioError = console.error.bind(console);
  ((console.log = () => {}),
    (console.debug = () => {}),
    (console.warn = () => {}),
    (console.error = __aiStudioError));
} catch (e) {}
(console.log(
  "[AI Studio PDF] Content script loaded. V3 (Unified Export, Settings Format Choice)",
),
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if ("getConversation" === request.action)
      return (
        console.log(
          "[AI Studio PDF] Received request to extract AI Studio conversation...",
        ),
        (async () => {
          try {
            showLoadingIndicator("Extracting all messages...");
            const conversation = await extractAndProcessFullConversation(!1);
            (console.log(
              "[AI Studio PDF] Conversation extracted (for potential external use): " +
                (conversation.length > 0
                  ? `${conversation.length} pairs/parts`
                  : "None"),
            ),
              sendResponse({ conversation: conversation }));
          } catch (error) {
            (console.error(
              "[AI Studio PDF] Error during getConversation action:",
              error,
            ),
              sendResponse({ error: error.message }));
          } finally {
            removeLoadingIndicator();
          }
        })(),
        !0
      );
    if ("setButtonVisibility" === request.action && "studio" === request.site) {
      if (
        (console.log(
          `[AI Studio PDF] Received setButtonVisibility: ${request.visible}`,
        ),
        request.visible)
      )
        injectButton();
      else {
        const buttonContainer = document.getElementById("aistudio-to-pdf");
        if (buttonContainer) {
          buttonContainer.remove();
          const exportDropdown = document.getElementById(
            "aistudio-export-dropdown",
          );
          (exportDropdown && exportDropdown.remove(),
            (isExportDropdownOpen = !1));
          const settingsPanel = document.getElementById(
            "aistudio-pdf-settings-panel",
          );
          if (settingsPanel && isSettingsPanelOpen) {
            (settingsPanel.remove(),
              (isSettingsPanelOpen = !1),
              document.removeEventListener(
                "click",
                window._aistudioPdfSettingsPanelClickHandler,
                !0,
              ),
              delete window._aistudioPdfSettingsPanelClickHandler);
            const animationStyleTag = document.getElementById(
              `${settingsPanel.id}-style`,
            );
            animationStyleTag && animationStyleTag.remove();
          }
          console.log(
            "[AI Studio PDF] Save Chat button removed via popup toggle.",
          );
        }
      }
      return (
        sendResponse({ status: "Button visibility updated for AI Studio" }),
        !0
      );
    }
    return !1;
  }));
let isExportDropdownOpen = !1,
  isSettingsPanelOpen = !1,
  selectedMessageCount = 0,
  exportSettings = {
    fileName: "aistudio-conversation",
    exportFormat: "pdf",
    orientation: "portrait",
    compression: !0,
  };
function showLoadingIndicator(message = "Processing...") {
  removeLoadingIndicator();
  const indicator = document.createElement("div");
  ((indicator.id = "aistudio-pdf-loading-indicator"),
    (indicator.style.cssText =
      "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 10px 20px; border-radius: 5px; font-family: 'Google Sans', sans-serif; font-size: 14px; z-index: 20000; box-shadow: 0 2px 5px rgba(0,0,0,0.3); text-align: center;"),
    (indicator.textContent = message),
    document.body.appendChild(indicator));
}
function updateLoadingIndicator(message) {
  const indicator = document.getElementById("aistudio-pdf-loading-indicator");
  indicator && (indicator.textContent = message);
}
function removeLoadingIndicator() {
  const indicator = document.getElementById("aistudio-pdf-loading-indicator");
  indicator && indicator.remove();
}
function saveExportSettings() {
  try {
    (localStorage.setItem(
      "aistudio-export-settings-v3",
      JSON.stringify(exportSettings),
    ),
      console.log("[AI Studio PDF] Export settings saved:", exportSettings));
  } catch (error) {
    console.error("[AI Studio PDF] Failed to save export settings:", error);
  }
}
function loadInitialExportSettings() {
  let defaultSettings = {
    fileName: "aistudio-conversation",
    exportFormat: "pdf",
    orientation: "portrait",
    compression: !0,
  };
  try {
    const savedSettings = localStorage.getItem("aistudio-export-settings-v3");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      ((exportSettings = { ...defaultSettings, ...parsedSettings }),
        (exportSettings.fileName &&
          !exportSettings.fileName.includes("gemini")) ||
          (exportSettings.fileName = "aistudio-conversation"));
      (["pdf", "html", "markdown", "json"].includes(
        exportSettings.exportFormat,
      ) ||
        (console.warn(
          `[AI Studio PDF] Invalid exportFormat '${exportSettings.exportFormat}' found in storage, resetting to 'pdf'.`,
        ),
        (exportSettings.exportFormat = "pdf")),
        console.log(
          "[AI Studio PDF] Initial export settings loaded (V3):",
          exportSettings,
        ));
    } else
      (console.log(
        "[AI Studio PDF] No saved settings (V3) found, using defaults.",
      ),
        (exportSettings = { ...defaultSettings }),
        saveExportSettings());
  } catch (error) {
    (console.error(
      "[AI Studio PDF] Failed to load initial export settings (V3):",
      error,
    ),
      (exportSettings = { ...defaultSettings }),
      saveExportSettings());
  }
}
function createButton() {
  console.log("[AI Studio PDF] Creating button elements");
  const container = document.createElement("div");
  ((container.id = "aistudio-to-pdf"),
    (container.style.display = "flex"),
    (container.style.alignItems = "center"));
  const shadow = container.attachShadow({ mode: "open" });
  console.log("[AI Studio PDF] Shadow DOM created");
  const style = document.createElement("style");
  ((style.textContent =
    " @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto+Mono&display=swap'); :host { all: initial; font-family: 'Google Sans', sans-serif; display: flex; align-items: center; } * { font-family: 'Google Sans', sans-serif; box-sizing: border-box; } .container { display: flex; align-items: center; gap: 8px; }\n    .save-button {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 8px;\n        background: #ffffff; /* MODIFICADO */\n        color: #3c4043; /* MODIFICADO */\n        border: 1px solid #dadce0; /* MODIFICADO */\n        padding: 0 16px;\n        border-radius: 100px;\n        font-size: 14px;\n        font-weight: 500;\n        cursor: pointer;\n        transition: all 0.2s ease;\n        height: 36px;\n        line-height: 36px;\n        white-space: nowrap;\n    }\n    .save-button:hover {\n        background: #f8f9fa; /* MODIFICADO */\n        border-color: #cdd0d4; /* MODIFICADO */\n        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* Opcional: sombra sutil */\n    }\n    .save-button:active, .save-button.active {\n        background: #f1f3f4; /* MODIFICADO */\n        border-color: #babdc0; /* MODIFICADO */\n        box-shadow: inset 0 1px 1px rgba(0,0,0,0.05); /* Opcional: sombra interior */\n    }\n    /* Estilos de botón de configuración eliminados */ .selection-button { display: flex; align-items: center; justify-content: center; height: 36px; border-radius: 100px; font-size: 14px; font-weight: 500; padding: 0 16px; border: none; cursor: pointer; transition: background 0.2s ease; white-space: nowrap; } .cancel-button { background: #fff; color: #1a73e8; border: 1px solid #dadce0; } .cancel-button:hover { background: rgba(26, 115, 232, 0.04); border-color: #cde2fc; } .save-selection-button { background: #1a73e8; color: white; } .save-selection-button:hover { background: #1765cc; } .save-selection-button:disabled { background: #f1f3f4; color: #bdc1c6; cursor: not-allowed; border: 1px solid transparent; }; "),
    shadow.appendChild(style),
    console.log("[AI Studio PDF] Styles added"));
  const wrapper = document.createElement("div");
  wrapper.className = "container";
  const exportButton = document.createElement("button");
  return (
    (exportButton.id = "export-button"),
    (exportButton.className = "save-button"),
    (exportButton.innerHTML = "<span>Save Chat</span>"),
    exportButton.addEventListener("click", (e) => {
      const settingsPanel = document.getElementById(
        "aistudio-pdf-settings-panel",
      );
      settingsPanel && (settingsPanel.remove(), (isSettingsPanelOpen = !1));
      (showExportDropdown(exportButton.getBoundingClientRect(), exportButton),
        e.stopPropagation());
    }),
    wrapper.appendChild(exportButton),
    shadow.appendChild(wrapper),
    container
  );
}
function injectButton() {
  const existingContainer = document.querySelector("#aistudio-to-pdf");
  if (existingContainer)
    return (
      console.log(
        "[AI Studio PDF] Button container already exists, ensuring it is visible.",
      ),
      void (existingContainer.style.display = "flex")
    );
  console.log(
    "[AI Studio PDF] Injecting button using fixed positioning logic...",
  );
  const container = createButton();
  if (!container)
    return void console.error(
      "[AI Studio PDF] Failed to create button container.",
    );
  let header;
  const headerSelectors = [".mat-toolbar", 'header[role="toolbar"]'];
  for (const selector of headerSelectors)
    if (((header = document.querySelector(selector)), header)) {
      console.log(
        `[AI Studio PDF] Found header element with selector: ${selector}`,
      );
      break;
    }
  let topPosition = "50px";
  if (((header = document.querySelector(".mat-toolbar")), header)) {
    const headerRect = header.getBoundingClientRect();
    ((topPosition = headerRect.top + headerRect.height - 5 + "px"),
      console.log(`[AI Studio PDF] Found toolbar. Using top: ${topPosition}`));
  } else
    console.log(
      "[AI Studio PDF] .mat-toolbar not found. Using default top position.",
    );
  ((container.style.cssText = `position: fixed !important; top: ${topPosition} !important; left: 20px !important; right: auto !important; z-index: 10000 !important;`),
    console.log(
      `[AI Studio PDF] Applying fixed position: top=${topPosition}, left=20px`,
    ),
    document.body.appendChild(container),
    console.log("[AI Studio PDF] Button inserted into body."),
    setupMessageObserver(),
    setupGlobalEventListeners());
}
function setupMessageObserver() {
  console.log("[AI Studio PDF] Setting up message observer.");
  const chatObserver = new MutationObserver((mutations) => {
      let shouldUpdateCheckboxes = !1;
      !!document.getElementById("aistudio-selection-active") &&
        (mutations.forEach((mutation) => {
          mutation.addedNodes.length &&
            mutation.addedNodes.forEach((node) => {
              1 === node.nodeType &&
                (node.matches?.("ms-chat-turn") ||
                  node.querySelector?.("ms-chat-turn")) &&
                (shouldUpdateCheckboxes = !0);
            });
        }),
        shouldUpdateCheckboxes &&
          (console.log(
            "[AI Studio PDF] New messages detected, re-injecting checkboxes.",
          ),
          setTimeout(() => {
            document.getElementById("aistudio-selection-active") &&
              (injectMessageCheckboxes(), updateSelectionCounter());
          }, 100)));
    }),
    observerTarget =
      document.querySelector(".chat-view-container") || document.body;
  (chatObserver.observe(observerTarget, { childList: !0, subtree: !0 }),
    console.log(
      "[AI Studio PDF] Message observer attached to:",
      observerTarget.tagName,
    ));
}
function injectMessageCheckboxes() {
  (console.log("[AI Studio PDF] Injecting message selection checkboxes."),
    (selectedMessageCount = 0),
    document
      .querySelectorAll(".aistudio-export-checkbox-container")
      .forEach((el) => el.remove()),
    document
      .querySelectorAll(".message-highlighted")
      .forEach((el) => el.classList.remove("message-highlighted")),
    document
      .querySelectorAll(".message-container-for-select")
      .forEach((el) => el.classList.remove("message-container-for-select")),
    console.log(
      "[AI Studio PDF] Cleaned up existing checkboxes and highlights.",
    ));
  let selectionStyles = document.getElementById("aistudio-selection-styles");
  if (!selectionStyles) {
    ((selectionStyles = document.createElement("style")),
      (selectionStyles.id = "aistudio-selection-styles"),
      (selectionStyles.textContent =
        "\n        ms-chat-turn { position: relative; } /* Necesario para posicionamiento absoluto del checkbox */\n        /* ms-chat-turn:hover { background-color: rgba(26, 115, 232, 0.04); border-radius: 8px; } */\n        .message-highlighted { background-color: rgba(232, 240, 254, 0.5) !important; border-radius: 8px; }\n        .aistudio-export-checkbox-container {\n            position: absolute;\n            z-index: 100;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            width: 32px;\n            height: 32px;\n            right: 12px;\n            top: 12px; /* Ajustar posición según sea necesario */\n            cursor: pointer;\n            opacity: 0; /* Oculto por defecto */\n            transition: opacity 0.2s ease;\n            background-color: rgba(255, 255, 255, 0.8); /* Fondo ligero para visibilidad */\n            border-radius: 50%;\n        }\n        ms-chat-turn:hover .aistudio-export-checkbox-container,\n        .message-highlighted .aistudio-export-checkbox-container {\n            opacity: 1; /* Mostrar al pasar el cursor o cuando está seleccionado */\n        }\n        .aistudio-export-checkbox {\n            /* Ocultar el checkbox input real */\n            position: absolute;\n            opacity: 0;\n            width: 0;\n            height: 0;\n            cursor: pointer;\n        }\n        .aistudio-checkbox-custom {\n            /* Estilo de la parte visible */\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            width: 20px;\n            height: 20px;\n            border: 2px solid #7f8c8d;\n            border-radius: 4px;\n            background: #fff;\n            transition: all 0.2s ease;\n            pointer-events: none; /* Clics manejados por la etiqueta */\n        }\n        .aistudio-export-checkbox:checked + .aistudio-checkbox-custom {\n            background: #1a73e8;\n            border-color: #1a73e8;\n        }\n        .aistudio-export-checkbox:checked + .aistudio-checkbox-custom::after {\n            /* Checkmark */\n            content: '';\n            display: block;\n            width: 5px;\n            height: 10px;\n            border: solid white;\n            border-width: 0 2.5px 2.5px 0;\n            transform: rotate(45deg) translate(-1px, -1px);\n        }\n        /* Tooltip Style */\n        .aistudio-selection-tooltip {\n            position: fixed;\n            bottom: 20px;\n            left: 50%;\n            transform: translateX(-50%);\n            background: rgba(0,0,0,0.8);\n            color: white;\n            padding: 8px 16px;\n            border-radius: 6px;\n            box-shadow: 0 2px 6px rgba(0,0,0,0.15);\n            font-size: 13px;\n            white-space: nowrap;\n            z-index: 11000; /* Above loading indicator */\n            animation: fadeOutTooltip 3s 1s forwards; /* Fade out after 1s, last for 3s */\n            pointer-events: none;\n        }\n        @keyframes fadeOutTooltip {\n            0% { opacity: 1; }\n            90% { opacity: 1; }\n            100% { opacity: 0; visibility: hidden; }\n        }"),
      document.head.appendChild(selectionStyles),
      console.log("[AI Studio PDF] Added selection styles to head."));
    let tooltip = document.querySelector(".aistudio-selection-tooltip");
    tooltip ||
      ((tooltip = document.createElement("div")),
      (tooltip.className = "aistudio-selection-tooltip"),
      (tooltip.textContent =
        "Click checkboxes to select messages for PDF export"),
      document.body.appendChild(tooltip),
      tooltip.addEventListener("animationend", () => tooltip.remove()));
  }
  const chatTurns = document.querySelectorAll("ms-chat-turn");
  (console.log(
    `[AI Studio PDF] Found ${chatTurns.length} chat turns for checkboxes.`,
  ),
    chatTurns.forEach((turn, index) => {
      const type = turn.querySelector('div[data-turn-role="User"]')
        ? "user"
        : turn.querySelector('div[data-turn-role="Model"]')
          ? "model"
          : "unknown";
      "unknown" !== type && attachCheckbox(turn, index, type);
    }),
    updateSelectionCounter());
}
function attachCheckbox(parentElement, index, type) {
  "static" === getComputedStyle(parentElement).position &&
    (parentElement.style.position = "relative");
  const checkboxId = `aistudio-export-${type}-${index}`,
    existingCheckbox = parentElement.querySelector(`#${checkboxId}`);
  if (existingCheckbox)
    return void (existingCheckbox.checked &&
    !parentElement.classList.contains("message-highlighted")
      ? parentElement.classList.add("message-highlighted")
      : !existingCheckbox.checked &&
        parentElement.classList.contains("message-highlighted") &&
        parentElement.classList.remove("message-highlighted"));
  const checkboxContainer = document.createElement("label");
  ((checkboxContainer.className = "aistudio-export-checkbox-container"),
    (checkboxContainer.htmlFor = checkboxId));
  const checkbox = document.createElement("input");
  ((checkbox.type = "checkbox"),
    (checkbox.checked = !0),
    (checkbox.id = checkboxId),
    (checkbox.className = "aistudio-export-checkbox"),
    (checkbox.dataset.messageIndex = index),
    (checkbox.dataset.messageType = type));
  const customCheckbox = document.createElement("span");
  ((customCheckbox.className = "aistudio-checkbox-custom"),
    checkboxContainer.appendChild(checkbox),
    checkboxContainer.appendChild(customCheckbox),
    parentElement.classList.add("message-highlighted"),
    selectedMessageCount++,
    checkbox.addEventListener("change", function (event) {
      (this.checked
        ? (parentElement.classList.add("message-highlighted"),
          selectedMessageCount++)
        : (parentElement.classList.remove("message-highlighted"),
          selectedMessageCount--),
        updateSelectionCounter(),
        event.stopPropagation());
    }),
    parentElement.appendChild(checkboxContainer));
}
function updateSelectionCounter() {
  const shadowHost = document.querySelector("#aistudio-to-pdf");
  if (!shadowHost || !shadowHost.shadowRoot) return;
  const saveButton = shadowHost.shadowRoot.querySelector(
    "#aistudio-save-selection-btn",
  );
  saveButton &&
    ((saveButton.textContent = `Save ${selectedMessageCount} message${1 !== selectedMessageCount ? "s" : ""}`),
    (saveButton.disabled = 0 === selectedMessageCount));
}
function exitSelectionMode() {
  (console.log("[AI Studio PDF] Exiting selection mode."),
    document.querySelectorAll(".message-highlighted").forEach((el) => {
      (el.classList.remove("message-highlighted"),
        "MS-CHAT-TURN" === el.tagName &&
          "relative" === el.style.position &&
          (el.style.position = ""));
    }),
    document
      .querySelectorAll(".aistudio-export-checkbox-container")
      .forEach((container) => container.remove()));
  const marker = document.getElementById("aistudio-selection-active");
  marker && marker.remove();
  const selectionStyles = document.getElementById("aistudio-selection-styles");
  selectionStyles && selectionStyles.remove();
  const tooltip = document.querySelector(".aistudio-selection-tooltip");
  tooltip && tooltip.remove();
  const shadowHost = document.querySelector("#aistudio-to-pdf");
  if (
    shadowHost &&
    shadowHost.shadowRoot &&
    shadowHost.dataset.originalContent
  ) {
    const shadow = shadowHost.shadowRoot;
    ((shadow.innerHTML = shadowHost.dataset.originalContent),
      delete shadowHost.dataset.originalContent);
    const exportButton = shadow.querySelector("#export-button");
    (exportButton &&
      exportButton.addEventListener("click", (e) => {
        const settingsPanel = document.getElementById(
          "aistudio-pdf-settings-panel",
        );
        settingsPanel && (settingsPanel.remove(), (isSettingsPanelOpen = !1));
        (showExportDropdown(exportButton.getBoundingClientRect(), exportButton),
          e.stopPropagation());
      }),
      console.log("[AI Studio PDF] Original export button restored."));
  } else
    console.warn(
      "[AI Studio PDF] Could not restore original button. Shadow host or original content missing.",
    );
  selectedMessageCount = 0;
}
function enterSelectionMode() {
  if (
    (console.log("[AI Studio PDF] Entering selection mode."),
    !document.getElementById("aistudio-selection-active"))
  ) {
    const marker = document.createElement("div");
    ((marker.id = "aistudio-selection-active"),
      (marker.style.display = "none"),
      document.body.appendChild(marker));
  }
  const shadowHost = document.querySelector("#aistudio-to-pdf");
  if (!shadowHost || !shadowHost.shadowRoot)
    return void console.error(
      "[AI Studio PDF] Cannot enter selection mode: Shadow host not found.",
    );
  const shadow = shadowHost.shadowRoot;
  shadowHost.dataset.originalContent ||
    (shadowHost.dataset.originalContent = shadow.innerHTML);
  const wrapper = shadow.querySelector(".container");
  if (!wrapper)
    return void console.error(
      "[AI Studio PDF] Cannot enter selection mode: Wrapper container not found.",
    );
  const exportButtonEl = shadow.querySelector("#export-button");
  if (
    (exportButtonEl && exportButtonEl.remove(),
    shadow.querySelector("#aistudio-save-selection-btn"))
  )
    console.log("[AI Studio PDF] Selection controls already exist.");
  else {
    const selectionContainer = document.createElement("div");
    ((selectionContainer.id = "aistudio-selection-controls"),
      (selectionContainer.style.display = "flex"),
      (selectionContainer.style.gap = "8px"));
    const cancelButton = document.createElement("button");
    ((cancelButton.id = "aistudio-cancel-selection-btn"),
      (cancelButton.className = "selection-button cancel-button"),
      (cancelButton.textContent = "Cancel"),
      cancelButton.addEventListener("click", (e) => {
        (exitSelectionMode(), e.stopPropagation());
      }));
    const saveButton = document.createElement("button");
    ((saveButton.id = "aistudio-save-selection-btn"),
      (saveButton.className = "selection-button save-selection-button"),
      (saveButton.textContent = "Save 0 messages"),
      (saveButton.disabled = !0),
      saveButton.addEventListener("click", (e) => {
        (generatePDFFromPage(), exitSelectionMode(), e.stopPropagation());
      }),
      selectionContainer.appendChild(cancelButton),
      selectionContainer.appendChild(saveButton),
      wrapper.appendChild(selectionContainer),
      console.log("[AI Studio PDF] Selection controls added."));
  }
  injectMessageCheckboxes();
}
function cleanAndValidateSnippet(htmlSnippet) {
  if (!htmlSnippet || "string" != typeof htmlSnippet) return null;
  const parser = new DOMParser();
  let doc;
  try {
    doc = parser.parseFromString(htmlSnippet, "text/html");
  } catch (parseError) {
    return (
      console.error(
        "[AI Studio PDF] Error parsing HTML snippet during cleaning:",
        parseError,
        htmlSnippet.substring(0, 100),
      ),
      htmlSnippet
    );
  }
  const turnDiv = doc.body.firstElementChild;
  if (!turnDiv)
    return (
      console.warn(
        "[AI Studio PDF] Cleaning: Snippet did not contain a valid root element.",
        htmlSnippet.substring(0, 100),
      ),
      null
    );
  turnDiv.querySelectorAll(".thought-container").forEach((tc) => tc.remove());
  turnDiv
    .querySelectorAll('.turn-content > div[style*="height:"]')
    .forEach((pd) => {
      if (
        pd.style.height &&
        (!pd.textContent || pd.textContent.trim().length < 10)
      ) {
        let hasSignificantChild = !1,
          isOnlyAngularCommentNode =
            1 === pd.childNodes.length &&
            pd.childNodes[0].nodeType === Node.COMMENT_NODE;
        if (!isOnlyAngularCommentNode)
          for (const child of pd.childNodes)
            if (child.nodeType === Node.ELEMENT_NODE) {
              if ("SCRIPT" !== child.tagName && "STYLE" !== child.tagName) {
                hasSignificantChild = !0;
                break;
              }
            } else if (
              child.nodeType === Node.TEXT_NODE &&
              child.textContent.trim().length > 0
            ) {
              hasSignificantChild = !0;
              break;
            }
        (isOnlyAngularCommentNode ||
          (!hasSignificantChild && pd.children.length < 2)) &&
          pd.remove();
      }
    });
  const turnContent = turnDiv.querySelector(".turn-content");
  if (!turnContent)
    return (
      console.warn(
        "[AI Studio PDF] Cleaning: Could not find .turn-content within turn div:",
        turnDiv.outerHTML.substring(0, 100),
      ),
      null
    );
  {
    const meaningfulText = turnContent.textContent?.trim() ?? "",
      hasMeaningfulChildren = Array.from(turnContent.children).some(
        (child) =>
          !["DIV", "MS-PROMPT-FEEDBACK", "BUTTON", "MAT-ICON", "SVG"].includes(
            child.tagName,
          ) || child.textContent?.trim().length > 0,
      );
    if (meaningfulText.length < 1 && !hasMeaningfulChildren)
      return (
        console.log(
          "[AI Studio PDF] Discarding turn after cleaning as .turn-content is empty:",
          turnDiv.outerHTML.substring(0, 150) + "...",
        ),
        null
      );
  }
  return (
    turnDiv
      .querySelectorAll(".ignore-when-copying")
      .forEach((el) => el.remove()),
    turnDiv.outerHTML
  );
}
function filterModelOutputs(inputData) {
  let modelOutputCounter = 0;
  const filteredResult = [];
  for (let i = 0; i < inputData.length; i++) {
    const currentItem = inputData[i],
      newItem = { question: currentItem.question, answer: currentItem.answer };
    (newItem.answer &&
      "" !== newItem.answer.trim() &&
      (modelOutputCounter++,
      (1 === modelOutputCounter ||
        (modelOutputCounter > 1 && modelOutputCounter % 2 != 0)) &&
        (console.log(
          `[AI Studio PDF] Filtering rule matched: Removing model output #${modelOutputCounter}`,
        ),
        (newItem.answer = ""))),
      newItem.question || newItem.answer
        ? filteredResult.push(newItem)
        : console.log(
            `[AI Studio PDF] Discarding pair at original index ${i} as it became empty after filtering.`,
          ));
  }
  return (
    console.log(
      `[AI Studio PDF] Filtered conversation: ${inputData.length} initial pairs/parts -> ${filteredResult.length} final pairs/parts`,
    ),
    filteredResult
  );
}
async function extractAndProcessFullConversation(applyFiltering = !0) {
  if (
    (console.log(
      `[AI Studio PDF] Starting full conversation extraction (filtering=${applyFiltering})...`,
    ),
    performance.memory)
  ) {
    const memUsed = Math.round(performance.memory.usedJSHeapSize / 1048576),
      memLimit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
    (console.log(`[AI Studio PDF] Memory usage: ${memUsed}MB / ${memLimit}MB`),
      memUsed > 0.8 * memLimit &&
        console.warn(
          "[AI Studio PDF] High memory usage detected. Enabling aggressive optimization mode.",
        ));
  }
  const chatContainer = document.querySelector("ms-autoscroll-container");
  if (!chatContainer) {
    console.error(
      "[AI Studio PDF] Could not find the target scroll container 'ms-autoscroll-container'.",
    );
    if (0 === document.querySelectorAll("ms-chat-turn").length)
      throw new Error(
        "No chat messages found to export. Please start a conversation first.",
      );
    throw new Error(
      "Could not find the chat container. The page structure may have changed. Try refreshing the page.",
    );
  }
  console.log(
    `[AI Studio PDF] Found scroll container: ${chatContainer.tagName}`,
  );
  let scrollIncrement = 150;
  const initialScrollTop = chatContainer.scrollTop,
    collectedSnippetsSet = new Set(),
    collectedSnippetsData = [],
    scrollMessages = ["scrolling...", "scrolling..", "scrolling.", "scrolling"];
  let scrollCount = 0;
  let reachedEnd = !1;
  showLoadingIndicator("Scrolling chat to collect all messages...");
  try {
    chatContainer.scrollHeight;
    ((chatContainer.scrollTop = chatContainer.scrollHeight),
      await new Promise((r) => setTimeout(r, 500)),
      (chatContainer.scrollTop = 0),
      console.log(
        "[AI Studio PDF] Scrolled to top after ensuring messages loaded. Waiting...",
      ),
      await new Promise((r) => setTimeout(r, 800)));
    const collectVisibleSnippets = () => {
      let addedCount = 0;
      return (
        chatContainer
          .querySelectorAll("ms-chat-turn")
          .forEach((turn, turnIndex) => {
            const turnId = turn.id;
            if (!turnId) return;
            if (collectedSnippetsSet.has(turnId)) return;
            const userContainer = turn.querySelector(
                '.user-prompt-container[data-turn-role="User"]',
              ),
              modelContainer = turn.querySelector(
                '.model-prompt-container[data-turn-role="Model"]',
              ),
              container = userContainer || modelContainer;
            if (container) {
              const turnContent = container.querySelector(".turn-content");
              if (!turnContent) return;
              if (
                1 === turnContent.children.length &&
                turnContent.querySelector('div[style*="height"]') &&
                !turnContent.querySelector("ms-prompt-chunk")
              )
                return;
              if (!(turnContent.textContent || "").trim()) return;
              const role = container.getAttribute("data-turn-role");
              (collectedSnippetsSet.add(turnId),
                collectedSnippetsData.push({
                  html: container.outerHTML,
                  role: role,
                  hash: turnId,
                  index: collectedSnippetsData.length,
                  turnId: turnId,
                }),
                addedCount++);
            }
          }),
        addedCount
      );
    };
    let initialCollectionNewCount = collectVisibleSnippets();
    for (
      console.log(
        `[AI Studio PDF] Initial collection (Attempt 1): ${initialCollectionNewCount} new snippets. Total unique: ${collectedSnippetsData.length}`,
      ),
        0 === collectedSnippetsData.length &&
          (console.warn(
            "[AI Studio PDF] No snippets collected on first attempt at top. Retrying initial collection...",
          ),
          updateLoadingIndicator("Re-checking top of chat for messages..."),
          (chatContainer.scrollTop = 0),
          await new Promise((r) => setTimeout(r, Math.max(500, 400))),
          (initialCollectionNewCount = collectVisibleSnippets()),
          console.log(
            `[AI Studio PDF] Initial collection (Attempt 2): ${initialCollectionNewCount} new snippets. Total unique: ${collectedSnippetsData.length}`,
          )),
        updateLoadingIndicator(
          `Collected ${collectedSnippetsData.length} initial messages...`,
        ),
        console.log(
          `[AI Studio PDF] Final initial snippets count before scrolling: ${collectedSnippetsData.length}`,
        );
      scrollCount < 800;
    ) {
      const currentTop = chatContainer.scrollTop,
        clientHeight = chatContainer.clientHeight,
        scrollHeight = chatContainer.scrollHeight,
        isHumongous = scrollHeight > 10 * clientHeight;
      if (
        (isHumongous &&
          scrollCount > 10 &&
          (scrollIncrement = Math.min(500, 1.1 * scrollIncrement)),
        collectedSnippetsData.length > 1e3 &&
          (console.warn(
            "[AI Studio PDF] Large chat detected (>1000 messages). Optimizing memory usage...",
          ),
          (scrollIncrement = 750),
          collectedSnippetsData.length > 2e3 &&
            (console.warn(
              "[AI Studio PDF] Extremely large chat (>2000 messages). Consider splitting export.",
            ),
            updateLoadingIndicator(
              `Found ${collectedSnippetsData.length} messages. Processing (this may take time)...`,
            ),
            performance.memory)))
      ) {
        const memUsed = performance.memory.usedJSHeapSize / 1048576;
        if (memUsed > 0.9 * (performance.memory.jsHeapSizeLimit / 1048576)) {
          (console.error(
            "[AI Studio PDF] Memory limit approaching. Stopping collection early.",
          ),
            (reachedEnd = !0));
          break;
        }
      }
      if (currentTop + clientHeight >= scrollHeight - 10) {
        (console.log(
          "[AI Studio PDF] Reached bottom or very close before this scroll iteration.",
        ),
          (reachedEnd = !0),
          collectVisibleSnippets());
        break;
      }
      let intendedScrollTarget = currentTop + scrollIncrement;
      const maxPossibleScrollTop = scrollHeight - clientHeight;
      (intendedScrollTarget > maxPossibleScrollTop &&
        (intendedScrollTarget = maxPossibleScrollTop),
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            ((chatContainer.scrollTop = intendedScrollTarget),
              scrollCount++,
              setTimeout(resolve, 800));
          });
        }));
      let effectiveScrollTopForThisIteration = chatContainer.scrollTop;
      const actualScrolledDistance =
        effectiveScrollTopForThisIteration - currentTop;
      let isProblematicJump = !1;
      (actualScrolledDistance > 1.25 * scrollIncrement &&
        intendedScrollTarget < maxPossibleScrollTop - 10 &&
        (isProblematicJump = !0),
        isProblematicJump &&
          (console.warn(
            `[AI Studio PDF] Scroll jump detected. From: ${currentTop}, Aimed for: ${intendedScrollTarget}, Landed at: ${effectiveScrollTopForThisIteration}. ScrollHeight: ${scrollHeight}`,
          ),
          collectVisibleSnippets(),
          console.log(
            `[AI Studio PDF] Collected snippets at jumped position ${effectiveScrollTopForThisIteration}. Total unique: ${collectedSnippetsData.length}`,
          ),
          console.log(
            `[AI Studio PDF] Attempting corrective scroll to intended target: ${intendedScrollTarget}.`,
          ),
          (chatContainer.scrollTop = intendedScrollTarget),
          await new Promise((r) => setTimeout(r, Math.max(250, 400))),
          (effectiveScrollTopForThisIteration = chatContainer.scrollTop),
          console.log(
            `[AI Studio PDF] Position after corrective scroll: ${effectiveScrollTopForThisIteration}.`,
          )));
      const newlyAddedCount = collectVisibleSnippets();
      let indicatorMessage,
        loadingMessage =
          scrollMessages[(scrollCount - 1) % scrollMessages.length];
      ((indicatorMessage = isHumongous
        ? loadingMessage +
          " (this is a big chat; scrolling will take some time)"
        : `${loadingMessage} (Found ${collectedSnippetsData.length} messages)`),
        updateLoadingIndicator(indicatorMessage),
        console.log(
          `[AI Studio PDF] Scroll ${scrollCount}: Found ${collectedSnippetsData.length} total unique (+${newlyAddedCount} new). Pos: ${effectiveScrollTopForThisIteration}/${scrollHeight - clientHeight}`,
        ));
      const currentClientHeight = chatContainer.clientHeight;
      if (
        effectiveScrollTopForThisIteration + currentClientHeight >=
        chatContainer.scrollHeight - 10
      ) {
        (console.log(
          "[AI Studio PDF] Reached bottom or very close after scrolling and collection.",
        ),
          (reachedEnd = !0),
          collectVisibleSnippets(),
          console.log(
            `[AI Studio PDF] Final collection at bottom. Total unique: ${collectedSnippetsData.length}`,
          ));
        break;
      }
      if (
        actualScrolledDistance < 5 &&
        0 === newlyAddedCount &&
        scrollCount > 1
      ) {
        (console.log(
          "[AI Studio PDF] Scroll effectively stopped and no new content. Assuming end.",
        ),
          (chatContainer.scrollTop += 50),
          await new Promise((r) => setTimeout(r, Math.max(250, 400))),
          collectVisibleSnippets(),
          console.log(
            `[AI Studio PDF] Final check after getting stuck (nudged). Total unique: ${collectedSnippetsData.length}`,
          ),
          (reachedEnd = !0));
        break;
      }
    }
    (!reachedEnd &&
      scrollCount >= 800 &&
      console.warn(
        "[AI Studio PDF] Reached maximum scroll attempts (800). Collection may be incomplete.",
      ),
      console.log("[AI Studio PDF] Performing final collection pass..."),
      (chatContainer.scrollTop = 0),
      await new Promise((r) => setTimeout(r, 300)),
      collectVisibleSnippets(),
      (chatContainer.scrollTop = chatContainer.scrollHeight / 2),
      await new Promise((r) => setTimeout(r, 300)),
      collectVisibleSnippets(),
      (chatContainer.scrollTop = chatContainer.scrollHeight),
      await new Promise((r) => setTimeout(r, 300)));
    collectVisibleSnippets();
    (console.log(
      `[AI Studio PDF] Final collection complete. Total unique messages: ${collectedSnippetsData.length}`,
    ),
      updateLoadingIndicator(
        `Scroll complete. Cleaning ${collectedSnippetsData.length} messages...`,
      ));
    let conversationData = [],
      collectedSnippetsArray = [];
    const processSnippets = (passName) => {
      const processedData = [],
        tempDiv = document.createElement("div");
      console.log(
        `[AI Studio PDF] Cleaning ${collectedSnippetsArray.length} collected snippets (${passName})...`,
      );
      for (let i = 0; i < collectedSnippetsArray.length; i += 100) {
        const chunk = collectedSnippetsArray.slice(i, i + 100);
        (chunk.forEach((snippetData) => {
          const cleanedSnippet = cleanAndValidateSnippet(
            snippetData.html || snippetData,
          );
          if (cleanedSnippet) {
            let role = null;
            try {
              tempDiv.innerHTML = cleanedSnippet;
              const turnDiv = tempDiv.firstElementChild;
              turnDiv &&
                turnDiv.matches("div[data-turn-role]") &&
                (role = turnDiv.getAttribute("data-turn-role"));
            } catch (e) {
              (console.error(
                `[AI Studio PDF] Error parsing cleaned snippet for role (${passName}):`,
                e,
              ),
                (role = null));
            }
            "User" === role
              ? (processedData.length > 0 &&
                  processedData[processedData.length - 1].question &&
                  !processedData[processedData.length - 1].answer &&
                  console.debug(
                    `[AI Studio PDF] (${passName}) Consecutive user turns, creating new pair.`,
                  ),
                processedData.push({ question: cleanedSnippet, answer: "" }))
              : "Model" === role
                ? processedData.length > 0 &&
                  processedData[processedData.length - 1].question &&
                  !processedData[processedData.length - 1].answer
                  ? (processedData[processedData.length - 1].answer =
                      cleanedSnippet)
                  : (console.debug(
                      `[AI Studio PDF] (${passName}) Model turn without preceding user turn, adding new pair.`,
                    ),
                    processedData.push({
                      question: "",
                      answer: cleanedSnippet,
                    }))
                : console.debug(
                    `[AI Studio PDF] (${passName}) Unknown role for cleaned snippet, skipping:`,
                    cleanedSnippet.substring(0, 100),
                  );
          }
        }),
          (chunk.length = 0));
      }
      return (
        tempDiv.remove(),
        console.log(
          `[AI Studio PDF] Cleaning (${passName}) complete. ${processedData.length} valid pairs/parts.`,
        ),
        processedData
      );
    };
    (collectedSnippetsData.length > 0
      ? (collectedSnippetsData.sort((a, b) => (a.index || 0) - (b.index || 0)),
        (collectedSnippetsArray = collectedSnippetsData),
        console.log(
          `[AI Studio PDF] Processing ${collectedSnippetsArray.length} collected snippets...`,
        ),
        (conversationData = processSnippets("Pass 1")))
      : console.warn(
          "[AI Studio PDF] No HTML snippets collected after initial checks and scrolling.",
        ),
      0 === conversationData.length &&
        collectedSnippetsData.length > 0 &&
        (console.warn(
          `[AI Studio PDF] First processing pass yielded 0 pairs/parts, but ${collectedSnippetsData.length} raw snippets were collected. Attempting re-processing...`,
        ),
        updateLoadingIndicator(
          `Re-processing ${collectedSnippetsData.length} collected messages...`,
        ),
        await new Promise((r) => setTimeout(r, 300)),
        (conversationData = processSnippets("Pass 2"))));
    try {
      ((chatContainer.scrollTop = initialScrollTop),
        console.log("[AI Studio PDF] Restored original scroll."));
    } catch (e) {}
    return (
      collectedSnippetsSet.clear(),
      (collectedSnippetsData.length = 0),
      (collectedSnippetsArray.length = 0),
      conversationData
    );
  } catch (error) {
    console.error("[AI Studio PDF] Error during full chat extraction:", error);
    try {
      chatContainer.scrollTop = initialScrollTop;
    } catch (e) {}
    throw (
      collectedSnippetsSet.clear(),
      (collectedSnippetsData.length = 0),
      collectedSnippetsArray && (collectedSnippetsArray.length = 0),
      removeLoadingIndicator(),
      error
    );
  }
}
function aiPdfLibAvailable() {
  try {
    return (
      "undefined" != typeof pdfMake &&
      "function" == typeof pdfMake.createPdf &&
      "function" == typeof htmlToPdfmake
    );
  } catch (_) {
    return !1;
  }
}
function createMathText(latex, isDisplay) {
  let text = latex;
  return (
    (text = text
      .replace(/\\alpha/g, "α")
      .replace(/\\beta/g, "β")
      .replace(/\\gamma/g, "γ")),
    (text = text
      .replace(/\\delta/g, "δ")
      .replace(/\\epsilon/g, "ε")
      .replace(/\\varepsilon/g, "ε")),
    (text = text
      .replace(/\\zeta/g, "ζ")
      .replace(/\\eta/g, "η")
      .replace(/\\theta/g, "θ")),
    (text = text
      .replace(/\\iota/g, "ι")
      .replace(/\\kappa/g, "κ")
      .replace(/\\lambda/g, "λ")),
    (text = text
      .replace(/\\mu/g, "μ")
      .replace(/\\nu/g, "ν")
      .replace(/\\xi/g, "ξ")),
    (text = text
      .replace(/\\pi/g, "π")
      .replace(/\\rho/g, "ρ")
      .replace(/\\sigma/g, "σ")),
    (text = text
      .replace(/\\tau/g, "τ")
      .replace(/\\upsilon/g, "υ")
      .replace(/\\phi/g, "φ")),
    (text = text
      .replace(/\\chi/g, "χ")
      .replace(/\\psi/g, "ψ")
      .replace(/\\omega/g, "ω")),
    (text = text
      .replace(/\\Gamma/g, "Γ")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\Theta/g, "Θ")),
    (text = text
      .replace(/\\Lambda/g, "Λ")
      .replace(/\\Xi/g, "Ξ")
      .replace(/\\Pi/g, "Π")),
    (text = text
      .replace(/\\Sigma/g, "Σ")
      .replace(/\\Phi/g, "Φ")
      .replace(/\\Psi/g, "Ψ")),
    (text = text.replace(/\\Omega/g, "Ω")),
    (text = text
      .replace(/\\sum/g, "∑")
      .replace(/\\prod/g, "∏")
      .replace(/\\int/g, "∫")),
    (text = text
      .replace(/\\oint/g, "∮")
      .replace(/\\iint/g, "∬")
      .replace(/\\iiint/g, "∭")),
    (text = text
      .replace(/\\infty/g, "∞")
      .replace(/\\partial/g, "∂")
      .replace(/\\nabla/g, "∇")),
    (text = text
      .replace(/\\pm/g, "±")
      .replace(/\\mp/g, "∓")
      .replace(/\\times/g, "×")),
    (text = text
      .replace(/\\cdot/g, "·")
      .replace(/\\div/g, "÷")
      .replace(/\\ast/g, "∗")),
    (text = text
      .replace(/\\circ/g, "∘")
      .replace(/\\bullet/g, "•")
      .replace(/\\oplus/g, "⊕")),
    (text = text.replace(/\\otimes/g, "⊗").replace(/\\odot/g, "⊙")),
    (text = text
      .replace(/\\leq/g, "≤")
      .replace(/\\geq/g, "≥")
      .replace(/\\neq/g, "≠")),
    (text = text
      .replace(/\\approx/g, "≈")
      .replace(/\\equiv/g, "≡")
      .replace(/\\sim/g, "∼")),
    (text = text
      .replace(/\\simeq/g, "≃")
      .replace(/\\cong/g, "≅")
      .replace(/\\propto/g, "∝")),
    (text = text
      .replace(/\\ll/g, "≪")
      .replace(/\\gg/g, "≫")
      .replace(/\\prec/g, "≺")),
    (text = text
      .replace(/\\succ/g, "≻")
      .replace(/\\preceq/g, "≼")
      .replace(/\\succeq/g, "≽")),
    (text = text.replace(/\\rightarrow/g, "→").replace(/\\leftarrow/g, "←")),
    (text = text.replace(/\\Rightarrow/g, "⇒").replace(/\\Leftarrow/g, "⇐")),
    (text = text
      .replace(/\\leftrightarrow/g, "↔")
      .replace(/\\Leftrightarrow/g, "⇔")),
    (text = text.replace(/\\uparrow/g, "↑").replace(/\\downarrow/g, "↓")),
    (text = text.replace(/\\Uparrow/g, "⇑").replace(/\\Downarrow/g, "⇓")),
    (text = text.replace(/\\mapsto/g, "↦").replace(/\\to/g, "→")),
    (text = text.replace(/\\implies/g, "⟹").replace(/\\iff/g, "⟺")),
    (text = text
      .replace(/\\in/g, "∈")
      .replace(/\\notin/g, "∉")
      .replace(/\\ni/g, "∋")),
    (text = text.replace(/\\subset/g, "⊂").replace(/\\subseteq/g, "⊆")),
    (text = text.replace(/\\supset/g, "⊃").replace(/\\supseteq/g, "⊇")),
    (text = text.replace(/\\cup/g, "∪").replace(/\\cap/g, "∩")),
    (text = text.replace(/\\emptyset/g, "∅").replace(/\\varnothing/g, "∅")),
    (text = text.replace(/\\forall/g, "∀").replace(/\\exists/g, "∃")),
    (text = text
      .replace(/\\nexists/g, "∄")
      .replace(/\\neg/g, "¬")
      .replace(/\\lnot/g, "¬")),
    (text = text
      .replace(/\\land/g, "∧")
      .replace(/\\lor/g, "∨")
      .replace(/\\wedge/g, "∧")),
    (text = text.replace(/\\vee/g, "∨").replace(/\\setminus/g, "∖")),
    (text = text
      .replace(/\\angle/g, "∠")
      .replace(/\\perp/g, "⊥")
      .replace(/\\parallel/g, "∥")),
    (text = text
      .replace(/\\triangle/g, "△")
      .replace(/\\square/g, "□")
      .replace(/\\diamond/g, "◊")),
    (text = text
      .replace(/\\star/g, "★")
      .replace(/\\dagger/g, "†")
      .replace(/\\ddagger/g, "‡")),
    (text = text
      .replace(/\\ldots/g, "…")
      .replace(/\\cdots/g, "⋯")
      .replace(/\\vdots/g, "⋮")),
    (text = text
      .replace(/\\ddots/g, "⋱")
      .replace(/\\therefore/g, "∴")
      .replace(/\\because/g, "∵")),
    (text = text.replace(/\\mathbb{R}/g, "ℝ").replace(/\\mathbb{N}/g, "ℕ")),
    (text = text.replace(/\\mathbb{Z}/g, "ℤ").replace(/\\mathbb{Q}/g, "ℚ")),
    (text = text.replace(/\\mathbb{C}/g, "ℂ").replace(/\\mathbb{P}/g, "ℙ")),
    (text = text.replace(/\\mathbb{F}/g, "𝔽")),
    (text = text.replace(/\\frac{([^}]+)}{([^}]+)}/g, (match, num, den) =>
      "1" === num && "2" === den
        ? "½"
        : "1" === num && "3" === den
          ? "⅓"
          : "1" === num && "4" === den
            ? "¼"
            : "2" === num && "3" === den
              ? "⅔"
              : "3" === num && "4" === den
                ? "¾"
                : `${num}⁄${den}`,
    )),
    (text = text.replace(
      /\\sqrt\[([^\]]+)\]{([^}]+)}/g,
      (match, n, content) => `ⁿ√(${content})`,
    )),
    (text = text.replace(/\\sqrt{([^}]+)}/g, "√($1)")),
    (text = text.replace(/\\lim_{([^}]+)\\to([^}]+)}/g, "lim$1→$2")),
    (text = text.replace(/\\lim_{([^}]+)}/g, "lim$1")),
    (text = text.replace(/\\sum_{([^}]+)}\^{([^}]+)}/g, "∑_{$1}^{$2}")),
    (text = text.replace(/\\prod_{([^}]+)}\^{([^}]+)}/g, "∏_{$1}^{$2}")),
    (text = text.replace(/\\int_{([^}]+)}\^{([^}]+)}/g, "∫_{$1}^{$2}")),
    (text = text.replace(/\^{0}/g, "⁰").replace(/\^0(?![0-9])/g, "⁰")),
    (text = text.replace(/\^{1}/g, "¹").replace(/\^1(?![0-9])/g, "¹")),
    (text = text.replace(/\^{2}/g, "²").replace(/\^2(?![0-9])/g, "²")),
    (text = text.replace(/\^{3}/g, "³").replace(/\^3(?![0-9])/g, "³")),
    (text = text.replace(/\^{4}/g, "⁴").replace(/\^4(?![0-9])/g, "⁴")),
    (text = text.replace(/\^{5}/g, "⁵").replace(/\^5(?![0-9])/g, "⁵")),
    (text = text.replace(/\^{6}/g, "⁶").replace(/\^6(?![0-9])/g, "⁶")),
    (text = text.replace(/\^{7}/g, "⁷").replace(/\^7(?![0-9])/g, "⁷")),
    (text = text.replace(/\^{8}/g, "⁸").replace(/\^8(?![0-9])/g, "⁸")),
    (text = text.replace(/\^{9}/g, "⁹").replace(/\^9(?![0-9])/g, "⁹")),
    (text = text.replace(/\^{n}/g, "ⁿ").replace(/\^n(?![a-z])/gi, "ⁿ")),
    (text = text.replace(/\^{i}/g, "ⁱ").replace(/\^i(?![a-z])/gi, "ⁱ")),
    (text = text.replace(/\^{-1}/g, "⁻¹")),
    (text = text.replace(/_{0}/g, "₀").replace(/_0(?![0-9])/g, "₀")),
    (text = text.replace(/_{1}/g, "₁").replace(/_1(?![0-9])/g, "₁")),
    (text = text.replace(/_{2}/g, "₂").replace(/_2(?![0-9])/g, "₂")),
    (text = text.replace(/_{3}/g, "₃").replace(/_3(?![0-9])/g, "₃")),
    (text = text.replace(/_{4}/g, "₄").replace(/_4(?![0-9])/g, "₄")),
    (text = text.replace(/_{5}/g, "₅").replace(/_5(?![0-9])/g, "₅")),
    (text = text.replace(/_{6}/g, "₆").replace(/_6(?![0-9])/g, "₆")),
    (text = text.replace(/_{7}/g, "₇").replace(/_7(?![0-9])/g, "₇")),
    (text = text.replace(/_{8}/g, "₈").replace(/_8(?![0-9])/g, "₈")),
    (text = text.replace(/_{9}/g, "₉").replace(/_9(?![0-9])/g, "₉")),
    (text = text.replace(/_{n}/g, "ₙ").replace(/_n(?![a-z])/gi, "ₙ")),
    (text = text.replace(/_{i}/g, "ᵢ").replace(/_i(?![a-z])/gi, "ᵢ")),
    (text = text.replace(/_{j}/g, "ⱼ").replace(/_j(?![a-z])/gi, "ⱼ")),
    (text = text.replace(/_{k}/g, "ₖ").replace(/_k(?![a-z])/gi, "ₖ")),
    (text = text
      .replace(/\^{([^}]+)}/g, "^($1)")
      .replace(/\^([a-zA-Z0-9])/g, "^$1")),
    (text = text
      .replace(/_{([^}]+)}/g, "_($1)")
      .replace(/_([a-zA-Z0-9])/g, "_$1")),
    (text = text
      .replace(/\\sin/g, "sin")
      .replace(/\\cos/g, "cos")
      .replace(/\\tan/g, "tan")),
    (text = text
      .replace(/\\arcsin/g, "arcsin")
      .replace(/\\arccos/g, "arccos")
      .replace(/\\arctan/g, "arctan")),
    (text = text
      .replace(/\\sinh/g, "sinh")
      .replace(/\\cosh/g, "cosh")
      .replace(/\\tanh/g, "tanh")),
    (text = text
      .replace(/\\ln/g, "ln")
      .replace(/\\log/g, "log")
      .replace(/\\exp/g, "exp")),
    (text = text
      .replace(/\\det/g, "det")
      .replace(/\\dim/g, "dim")
      .replace(/\\ker/g, "ker")),
    (text = text
      .replace(/\\min/g, "min")
      .replace(/\\max/g, "max")
      .replace(/\\sup/g, "sup")),
    (text = text
      .replace(/\\inf/g, "inf")
      .replace(/\\deg/g, "deg")
      .replace(/\\gcd/g, "gcd")),
    (text = text.replace(/\\vec{([^}]+)}/g, "$1⃗")),
    (text = text.replace(/\\mathbf{([^}]+)}/g, (match, content) =>
      content.toUpperCase(),
    )),
    (text = text.replace(/\\mathrm{([^}]+)}/g, "$1")),
    (text = text.replace(/\\text{([^}]+)}/g, "$1")),
    (text = text.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")")),
    (text = text.replace(/\\left\[/g, "[").replace(/\\right\]/g, "]")),
    (text = text.replace(/\\left\{/g, "{").replace(/\\right\}/g, "}")),
    (text = text.replace(/\\left\|/g, "|").replace(/\\right\|/g, "|")),
    (text = text.replace(/\\left/g, "").replace(/\\right/g, "")),
    (text = text.replace(/\\([a-zA-Z]+)/g, "$1")),
    (text = text.replace(/[{}]/g, "")),
    isDisplay
      ? `<div style="text-align: center; margin: 12px 0; font-size: 16px; line-height: 1.5;">${text}</div>`
      : `<span style="font-size: inherit;">${text}</span>`
  );
}
function processMathForPdfMake(html) {
  if (!html) return "";
  const container = document.createElement("div");
  ((container.innerHTML = html),
    container.querySelectorAll(".katex, .katex-display").forEach((elem) => {
      const mathElem = elem.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      if (mathElem) {
        const mathHtml = createMathText(
            mathElem.textContent,
            elem.classList.contains("katex-display"),
          ),
          tempDiv = document.createElement("div");
        ((tempDiv.innerHTML = mathHtml), elem.replaceWith(tempDiv.firstChild));
      }
    }));
  let htmlContent = container.innerHTML;
  return (
    (htmlContent = htmlContent.replace(
      /\$\$([^$]+)\$\$|\\\[([^\]]+)\\\]/g,
      (match, p1, p2) => createMathText(p1 || p2, !0),
    )),
    (htmlContent = htmlContent.replace(
      /\$([^$]+)\$|\\\(([^)]+)\\\)/g,
      (match, p1, p2) => createMathText(p1 || p2, !1),
    )),
    (container.innerHTML = htmlContent),
    container.innerHTML
  );
}
function aiSanitizeHtmlForPdf(html) {
  if (!html) return "";
  try {
    let processedHtml = processMathForPdfMake(html);
    const container = document.createElement("div");
    return (
      (container.innerHTML = processedHtml),
      container
        .querySelectorAll(
          '.actions-container, ms-prompt-feedback, .turn-header, button, mat-icon, svg[class*="mat-icon"], .ignore-when-copying',
        )
        .forEach((el) => el.remove()),
      container.querySelectorAll("ms-code-block").forEach((block) => {
        let codeText = "";
        const pre = block.querySelector("pre");
        codeText = pre ? pre.textContent || "" : block.textContent || "";
        const preEl = document.createElement("pre"),
          codeEl = document.createElement("code");
        ((codeEl.textContent = codeText),
          preEl.appendChild(codeEl),
          block.replaceWith(preEl));
      }),
      container
        .querySelectorAll("[jslog]")
        .forEach((el) => el.removeAttribute("jslog")),
      container.querySelectorAll("*").forEach((el) => {
        [...el.attributes].forEach((attr) => {
          /^on[a-z]+$/i.test(attr.name) && el.removeAttribute(attr.name);
        });
      }),
      container.innerHTML
    );
  } catch (e) {
    return (
      console.error("[AI Studio PDF] aiSanitizeHtmlForPdf error:", e),
      html
    );
  }
}
async function aiImageUrlToDataURLViaCanvas(
  url,
  type = "image/jpeg",
  quality = 0.92,
) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      ((img.crossOrigin = "anonymous"),
        (img.onload = async () => {
          try {
            if ("function" == typeof img.decode)
              try {
                await img.decode();
              } catch (_) {}
            const c = document.createElement("canvas");
            ((c.width = img.naturalWidth || img.width),
              (c.height = img.naturalHeight || img.height));
            const ctx = c.getContext("2d");
            if (!ctx || 0 === c.width || 0 === c.height) return resolve(null);
            ctx.drawImage(img, 0, 0);
            const data = c.toDataURL(type, quality);
            resolve(data);
          } catch (err) {
            (console.warn("[AI Studio PDF] Canvas toDataURL failed:", url, err),
              resolve(null));
          }
        }),
        (img.onerror = () => resolve(null)),
        (img.src = url));
    } catch (err) {
      (console.warn(
        "[AI Studio PDF] aiImageUrlToDataURLViaCanvas error:",
        url,
        err,
      ),
        resolve(null));
    }
  });
}
async function aiFetchImageAsDataURL(url) {
  try {
    const resp = await fetch(url, {
      credentials: "omit",
      cache: "force-cache",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      ((fr.onloadend = () => res(fr.result)),
        (fr.onerror = rej),
        fr.readAsDataURL(blob));
    });
  } catch (err) {
    return (
      console.warn(
        "[AI Studio PDF] Failed to inline image via fetch:",
        url,
        err,
      ),
      null
    );
  }
}
async function aiInlineImagesInHtml(html) {
  if (!html) return "";
  const wrapper = document.createElement("div");
  wrapper.innerHTML = aiSanitizeHtmlForPdf(html);
  const imgs = Array.from(wrapper.querySelectorAll("img"));
  return (
    await Promise.all(
      imgs.map(async (img) => {
        const src = (img.getAttribute("src") || "").trim();
        if (!src) return;
        if (src.startsWith("data:")) return;
        if (src.startsWith("blob:") || src.startsWith("chrome-extension:")) {
          const alt = (img.getAttribute("alt") || "").trim(),
            placeholder = document.createElement("div");
          return (
            (placeholder.textContent =
              "Image not included in PDF" + (alt ? " — " + alt : "")),
            void img.replaceWith(placeholder)
          );
        }
        const tryUrls = [src];
        try {
          const u = new URL(src);
          u.searchParams.has("authuser") &&
            (u.searchParams.delete("authuser"), tryUrls.push(u.toString()));
        } catch (_) {}
        let data = null;
        for (const u of tryUrls)
          if (
            ((data =
              (await aiImageUrlToDataURLViaCanvas(u, "image/jpeg", 0.92)) ||
              (await aiFetchImageAsDataURL(u))),
            data)
          )
            break;
        if (data) img.setAttribute("src", data);
        else {
          const alt = (img.getAttribute("alt") || "").trim(),
            ph = document.createElement("div");
          ((ph.textContent =
            "Image not included in PDF" + (alt ? " — " + alt : "")),
            img.replaceWith(ph));
        }
      }),
    ),
    wrapper.innerHTML
  );
}
async function aiBuildPdfDocDefinition(conversationData) {
  const styles = {
      header: {
        fontSize: 16,
        bold: !0,
        margin: [0, 0, 0, 6],
        color: "#1f1f1f",
      },
      timestamp: {
        fontSize: 9,
        italics: !0,
        color: "#5f6368",
        margin: [0, 0, 0, 10],
      },
      speaker: {
        fontSize: 10,
        bold: !0,
        color: "#1f1f1f",
        margin: [0, 6, 0, 2],
      },
      paragraph: { fontSize: 10, color: "#1f1f1f" },
      tableHeader: { bold: !0, fillColor: "#f1f3f4" },
    },
    content = [];
  (content.push({
    text: exportSettings.fileName || "AI Studio Conversation",
    style: "header",
  }),
    content.push({
      text: `Exported on: ${new Date().toLocaleString()}`,
      style: "timestamp",
    }));
  for (const item of conversationData) {
    if (item.question) {
      content.push({ text: "User", style: "speaker" });
      const html = await aiInlineImagesInHtml(item.question);
      try {
        const converted = htmlToPdfmake(html, {
          defaultStyles: { tableHeader: styles.tableHeader },
        });
        Array.isArray(converted)
          ? content.push(...converted)
          : content.push(converted);
      } catch (e) {
        content.push({
          text: html.replace(/<[^>]+>/g, ""),
          style: "paragraph",
        });
      }
    }
    if (item.answer) {
      content.push({ text: "Model", style: "speaker" });
      const html = await aiInlineImagesInHtml(item.answer);
      try {
        const converted = htmlToPdfmake(html, {
          defaultStyles: { tableHeader: styles.tableHeader },
        });
        Array.isArray(converted)
          ? content.push(...converted)
          : content.push(converted);
      } catch (e) {
        content.push({
          text: html.replace(/<[^>]+>/g, ""),
          style: "paragraph",
        });
      }
    }
  }
  return {
    pageSize: "A4",
    pageOrientation:
      "landscape" === exportSettings.orientation ? "landscape" : "portrait",
    pageMargins: [20, 20, 20, 24],
    content: content,
    styles: styles,
    defaultStyle: { fontSize: 10, color: "#1f1f1f" },
  };
}
async function aiGeneratePdfWithPdfMake(conversationData) {
  if (
    (console.log(
      "[AI Studio PDF] Using pdfMake for PDF generation (Gemini-style).",
    ),
    !aiPdfLibAvailable())
  )
    throw new Error("pdfMake/html-to-pdfmake not available");
  const docDef = await aiBuildPdfDocDefinition(conversationData),
    date = new Date(),
    dateStr = date.toISOString().split("T")[0],
    timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-"),
    fileName = `${exportSettings.fileName || "aistudio-conversation"}-${dateStr}-${timeStr}.pdf`;
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDef).download(fileName, () => {
        (console.log("[AI Studio PDF] pdfMake download initiated"), resolve());
      });
    } catch (e) {
      reject(e);
    }
  });
}
async function generateAndSavePDF() {
  console.log("[AI Studio PDF] PDF export selected. Starting...");
  let attempt = 1,
    finalConversationData = [];
  for (; attempt <= 2; ) {
    (console.log(`[AI Studio PDF] PDF Generation - Attempt #${attempt}`),
      attempt > 1 &&
        (updateLoadingIndicator(
          `Retrying PDF extraction (Attempt ${attempt})...`,
        ),
        await new Promise((r) => setTimeout(r, 2e3))));
    try {
      if (
        ((finalConversationData = await extractAndProcessFullConversation(!0)),
        finalConversationData.length > 0)
      )
        break;
      if (
        (console.warn(
          `[AI Studio PDF] PDF Generation - Attempt #${attempt} resulted in no valid content.`,
        ),
        2 === attempt)
      )
        return (
          alert(
            "No valid content found after cleaning. If content is visible, please try saving again later.",
          ),
          void removeLoadingIndicator()
        );
    } catch (error) {
      if (
        (console.error(
          `[AI Studio PDF] Error during PDF generation process (Attempt #${attempt}):`,
          error,
        ),
        2 === attempt)
      )
        return (
          alert(
            `An error occurred during PDF generation (Attempt #${attempt}): ${error.message}. Check the console.`,
          ),
          void removeLoadingIndicator()
        );
    }
    attempt++;
  }
  if (finalConversationData.length > 0) {
    if (aiPdfLibAvailable())
      try {
        return (
          updateLoadingIndicator("Generating PDF (optimized)..."),
          await aiGeneratePdfWithPdfMake(finalConversationData),
          updateLoadingIndicator("PDF saved successfully!"),
          void setTimeout(removeLoadingIndicator, 2e3)
        );
      } catch (e) {
        console.error(
          "[AI Studio PDF] pdfMake generation failed, falling back to html2pdf:",
          e,
        );
      }
    (updateLoadingIndicator("Generating PDF..."),
      generatePDF(finalConversationData));
  } else removeLoadingIndicator();
}
async function generateAndSaveHTML() {
  console.log("[AI Studio PDF] HTML export selected. Starting...");
  let attempt = 1,
    conversationData = [];
  for (; attempt <= 2; ) {
    (console.log(`[AI Studio PDF] HTML Generation - Attempt #${attempt}`),
      attempt > 1 &&
        (updateLoadingIndicator(
          `Retrying HTML extraction (Attempt ${attempt})...`,
        ),
        await new Promise((r) => setTimeout(r, 2e3))));
    try {
      if (
        ((conversationData = await extractAndProcessFullConversation(!1)),
        conversationData.length > 0)
      )
        break;
      if (
        (console.warn(
          `[AI Studio PDF] HTML Generation - Attempt #${attempt} resulted in no valid content.`,
        ),
        2 === attempt)
      )
        return (
          alert(
            "No conversation content found to export as HTML, even after a retry. If content is visible, please try saving again later.",
          ),
          void removeLoadingIndicator()
        );
    } catch (error) {
      if (
        (console.error(
          `[AI Studio PDF] Error during HTML generation process (Attempt #${attempt}):`,
          error,
        ),
        2 === attempt)
      )
        return (
          alert(
            `Failed to generate HTML file (Attempt #${attempt}): ${error.message}. Check console.`,
          ),
          void removeLoadingIndicator()
        );
    }
    attempt++;
  }
  if (conversationData.length > 0) {
    updateLoadingIndicator("Generating HTML file...");
    const pageTitle = exportSettings.fileName || "AI Studio Conversation",
      date = new Date(),
      fileName = `${pageTitle}-${date.toISOString().split("T")[0]}-${date.toTimeString().split(" ")[0].replace(/:/g, "-")}.html`;
    let htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${pageTitle}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto+Mono&family=Roboto:wght@400;500&display=swap" rel="stylesheet"><style>${'\n            body { font-family: \'Google Sans\', Roboto, sans-serif; line-height: 1.6; padding: 25px; background-color: #f8f9fa; color: #202124; margin: 0; }\n            .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 20px 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }\n            h1 { border-bottom: 1px solid #dadce0; padding-bottom: 10px; margin-top: 0; margin-bottom: 25px; font-weight: 500; color: #3c4043; font-size: 1.5em; }\n            .message { margin-bottom: 25px; padding: 15px; border-radius: 8px; border: 1px solid #e8eaed; position: relative; overflow: hidden; }\n            .message[data-turn-role="User"] { background-color: #e8f0fe; border-left: 4px solid #1a73e8; }\n            .message[data-turn-role="Model"] { background-color: #f1f3f4; border-left: 4px solid #34a853; }\n            .message::before { content: attr(data-turn-role); position: absolute; top: -1px; left: -1px; background-color: inherit; color: #fff; padding: 3px 8px; font-size: 0.75em; font-weight: 500; border-radius: 8px 0 8px 0; border-right: 1px solid #e8eaed; border-bottom: 1px solid #e8eaed; }\n            .message[data-turn-role="User"]::before { background-color: #1a73e8; }\n            .message[data-turn-role="Model"]::before { background-color: #34a853; }\n            .message div[data-turn-role] { margin: 0 !important; padding: 0 !important; }\n            .message .turn-header { display: none !important; }\n            .message .turn-content { margin-top: 15px !important; padding-top: 10px; word-wrap: break-word; }\n            .message .turn-content p:first-child { margin-top: 0; } .message .turn-content p:last-child { margin-bottom: 0; }\n            ms-code-block, pre { display: block; background-color: #ffffff; border: 1px solid #dadce0; border-radius: 8px; padding: 12px 16px; margin: 1em 0; font-family: \'Roboto Mono\', monospace; font-size: 13px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }\n            .message[data-turn-role="User"] ms-code-block, .message[data-turn-role="User"] pre { background-color: #f1f8ff; }\n            .message[data-turn-role="Model"] ms-code-block, .message[data-turn-role="Model"] pre { background-color: #e6f4ea; }\n            ms-code-block footer { display: none !important; }\n            code:not(pre code):not(ms-code-block code) { font-family: \'Roboto Mono\', monospace; background-color: rgba(60, 64, 67, 0.1); padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }\n            .actions-container, button, mat-icon, svg[class*="mat-icon"], ms-prompt-feedback, .turn-footer, .thought-container, .mat-expansion-panel, .cdk-describedby-host, .ignore-when-copying { display: none !important; }\n            a { color: #1a73e8; text-decoration: none; } a:hover { text-decoration: underline; }\n            strong, b { font-weight: 600; color: #202124; } ul, ol { padding-left: 30px; } li { margin-bottom: 5px; }\n            img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }\n            table { width: 100%; border-collapse: collapse; margin: 1em 0; border: 1px solid #dadce0; }\n            th, td { border: 1px solid #dadce0; padding: 8px 12px; text-align: left; } th { background-color: #f8f9fa; font-weight: 500; }\n        '}</style></head><body><div class="container"><h1>${pageTitle}</h1>`;
    const ignoreStartRegex =
        /^\s*<!--\s*IGNORE_WHEN_COPYING_START\s*-->\s*(\r?\n)?/gim,
      ignoreEndRegex = /^\s*<!--\s*IGNORE_WHEN_COPYING_END\s*-->\s*(\r?\n)?/gim,
      tempCleanerDiv = document.createElement("div");
    (conversationData.forEach((item) => {
      (item.question &&
        ((tempCleanerDiv.innerHTML = item.question),
        tempCleanerDiv
          .querySelectorAll("ms-code-block pre, pre")
          .forEach((pre) => {
            pre.innerHTML = pre.innerHTML
              .replaceAll(ignoreStartRegex, "")
              .replaceAll(ignoreEndRegex, "");
          }),
        (htmlContent += tempCleanerDiv.innerHTML.replace(
          /<div data-turn-role="User"/,
          '<div class="message" data-turn-role="User"',
        )),
        (htmlContent += "\n\n")),
        item.answer &&
          ((tempCleanerDiv.innerHTML = item.answer),
          tempCleanerDiv
            .querySelectorAll("ms-code-block pre, pre")
            .forEach((pre) => {
              pre.innerHTML = pre.innerHTML
                .replaceAll(ignoreStartRegex, "")
                .replaceAll(ignoreEndRegex, "");
            }),
          (htmlContent += tempCleanerDiv.innerHTML.replace(
            /<div data-turn-role="Model"/,
            '<div class="message" data-turn-role="Model"',
          )),
          (htmlContent += "\n\n")));
    }),
      (htmlContent += "</div></body></html>"),
      triggerDownload(fileName, htmlContent, "text/html;charset=utf-8"));
  } else removeLoadingIndicator();
}
async function generateAndSaveMarkdown() {
  console.log("[AI Studio PDF] Markdown export selected. Starting...");
  let attempt = 1,
    conversationData = [];
  for (; attempt <= 2; ) {
    (console.log(`[AI Studio PDF] Markdown Generation - Attempt #${attempt}`),
      attempt > 1 &&
        (updateLoadingIndicator(
          `Retrying Markdown extraction (Attempt ${attempt})...`,
        ),
        await new Promise((r) => setTimeout(r, 2e3))));
    try {
      if (
        ((conversationData = await extractAndProcessFullConversation(!1)),
        conversationData.length > 0)
      )
        break;
      if (
        (console.warn(
          `[AI Studio PDF] Markdown Generation - Attempt #${attempt} resulted in no valid content.`,
        ),
        2 === attempt)
      )
        return (
          alert(
            "No conversation content found to export as Markdown, even after a retry. If content is visible, please try saving again later.",
          ),
          void removeLoadingIndicator()
        );
    } catch (error) {
      if (
        (console.error(
          `[AI Studio PDF] Error during Markdown generation process (Attempt #${attempt}):`,
          error,
        ),
        2 === attempt)
      )
        return (
          alert(
            `Failed to generate Markdown (Attempt #${attempt}): ${error.message}. Check console.`,
          ),
          void removeLoadingIndicator()
        );
    }
    attempt++;
  }
  if (conversationData.length > 0) {
    updateLoadingIndicator("Generating Markdown file...");
    let markdownContent = "# AI Studio Conversation\n\n";
    const tempDiv = document.createElement("div"),
      ignoreStartRegex =
        /^\s*<!--\s*IGNORE_WHEN_COPYING_START\s*-->\s*(\r?\n)?/gim,
      ignoreEndRegex = /^\s*<!--\s*IGNORE_WHEN_COPYING_END\s*-->\s*(\r?\n)?/gim,
      convertToMarkdown = (html) => {
        if (!html) return "";
        try {
          tempDiv.innerHTML = html;
          const sourceElement =
            tempDiv.querySelector(".turn-content") || tempDiv;
          (sourceElement.querySelectorAll("ms-code-block").forEach((block) => {
            const pre = block.querySelector("pre");
            pre &&
              (pre.innerHTML = pre.innerHTML
                .replaceAll(ignoreStartRegex, "")
                .replaceAll(ignoreEndRegex, ""));
            const code = pre
                ? pre.textContent
                : block.textContent
                    .replaceAll(ignoreStartRegex, "")
                    .replaceAll(ignoreEndRegex, ""),
              langMatch = code.match(/^(\w+)\s*\n/),
              lang = langMatch ? langMatch[1] : "",
              codeContent = langMatch
                ? code.substring(langMatch[0].length)
                : code;
            block.replaceWith(
              `\n\n\`\`\`${lang}\n${codeContent.trim()}\n\`\`\`\n\n`,
            );
          }),
            sourceElement.querySelectorAll("a").forEach((a) => {
              a.replaceWith(
                `[${a.textContent || a.innerText || ""}](${a.getAttribute("href") || ""})`,
              );
            }),
            sourceElement.querySelectorAll("img").forEach((img) => {
              img.replaceWith(
                `\n\n![${img.getAttribute("alt") || "image"}](${img.getAttribute("src") || ""})\n\n`,
              );
            }),
            sourceElement
              .querySelectorAll("code:not(pre code)")
              .forEach((code) => {
                code.replaceWith(`\`${code.textContent}\``);
              }),
            sourceElement.querySelectorAll("strong, b").forEach((el) => {
              el.replaceWith(`**${el.textContent}**`);
            }),
            sourceElement.querySelectorAll("em, i").forEach((el) => {
              el.replaceWith(`*${el.textContent}*`);
            }),
            sourceElement.querySelectorAll("ul, ol").forEach((list) => {
              let listMd = "\n";
              (Array.from(list.children).forEach((li, index) => {
                let liContent = li.innerHTML.replace(/<br\s*\/?>/gi, "\n"),
                  tempLiDiv = document.createElement("div");
                ((tempLiDiv.innerHTML = liContent),
                  tempLiDiv.querySelectorAll("strong, b").forEach((el) => {
                    el.replaceWith(`**${el.textContent}**`);
                  }),
                  tempLiDiv.querySelectorAll("em, i").forEach((el) => {
                    el.replaceWith(`*${el.textContent}*`);
                  }),
                  tempLiDiv
                    .querySelectorAll("code:not(pre code)")
                    .forEach((el) => {
                      el.replaceWith(`\`${el.textContent}\``);
                    }),
                  tempLiDiv.querySelectorAll("a").forEach((el) => {
                    el.replaceWith(
                      `[${el.textContent}](${el.getAttribute("href")})`,
                    );
                  }),
                  (listMd += `${"OL" === list.tagName ? index + 1 + "." : "*"} ${tempLiDiv.textContent?.trim() || ""}\n`));
              }),
                list.replaceWith(listMd));
            }),
            sourceElement.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
              h.replaceWith(
                `\n\n${"#".repeat(parseInt(h.tagName.substring(1), 10))} ${h.textContent}\n\n`,
              );
            }),
            sourceElement.querySelectorAll("p").forEach((p) => {
              const next = p.nextElementSibling;
              !p.textContent.trim() ||
                (next &&
                  [
                    "H1",
                    "H2",
                    "H3",
                    "H4",
                    "H5",
                    "H6",
                    "UL",
                    "OL",
                    "PRE",
                    "BLOCKQUOTE",
                    "HR",
                    "TABLE",
                    "MS-CODE-BLOCK",
                  ].includes(next?.tagName)) ||
                p.after("\n\n");
            }));
          let text = sourceElement.innerText || sourceElement.textContent || "";
          return ((text = text.replace(/(\n\s*){3,}/g, "\n\n")), text.trim());
        } catch (e) {
          return (
            console.error(
              "Error converting HTML snippet to Markdown:",
              e,
              html.substring(0, 100),
            ),
            (tempDiv.innerHTML = html),
            tempDiv.textContent || ""
          );
        }
      };
    conversationData.forEach((item, index) => {
      (item.question &&
        (markdownContent += `**User:**\n\n${convertToMarkdown(item.question)}\n\n`),
        item.answer &&
          (markdownContent += `**Model:**\n\n${convertToMarkdown(item.answer)}\n\n`),
        index < conversationData.length - 1 && (markdownContent += "---\n\n"));
    });
    const date = new Date(),
      dateStr = date.toISOString().split("T")[0],
      timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-");
    triggerDownload(
      `${exportSettings.fileName || "aistudio-conversation"}-${dateStr}-${timeStr}.md`,
      markdownContent,
      "text/markdown;charset=utf-8",
    );
  } else removeLoadingIndicator();
}
async function generateAndSaveJSON() {
  console.log("[AI Studio PDF] JSON export selected. Starting...");
  let attempt = 1,
    conversationData = [];
  for (; attempt <= 2; ) {
    (console.log(`[AI Studio PDF] JSON Generation - Attempt #${attempt}`),
      attempt > 1 &&
        (updateLoadingIndicator(
          `Retrying JSON extraction (Attempt ${attempt})...`,
        ),
        await new Promise((r) => setTimeout(r, 2e3))));
    try {
      if (
        ((conversationData = await extractAndProcessFullConversation(!1)),
        conversationData.length > 0)
      )
        break;
      if (
        (console.warn(
          `[AI Studio PDF] JSON Generation - Attempt #${attempt} resulted in no valid content.`,
        ),
        2 === attempt)
      )
        return (
          alert(
            "No conversation content found to export as JSON, even after a retry. If content is visible, please try saving again later.",
          ),
          void removeLoadingIndicator()
        );
    } catch (error) {
      if (
        (console.error(
          `[AI Studio PDF] Error during JSON generation process (Attempt #${attempt}):`,
          error,
        ),
        2 === attempt)
      )
        return (
          alert(
            `Failed to generate JSON (Attempt #${attempt}): ${error.message}. Check console.`,
          ),
          void removeLoadingIndicator()
        );
    }
    attempt++;
  }
  if (conversationData.length > 0) {
    updateLoadingIndicator("Generating JSON file...");
    const jsonData = [],
      tempDiv = document.createElement("div");
    conversationData.forEach((item) => {
      if (item.question) {
        let role = "user";
        try {
          ((tempDiv.innerHTML = item.question),
            tempDiv.querySelector('div[data-turn-role="User"]') ||
              (role = "unknown_user"));
        } catch (e) {}
        jsonData.push({ role: role, content_html: item.question });
      }
      if (item.answer) {
        let role = "model";
        try {
          ((tempDiv.innerHTML = item.answer),
            tempDiv.querySelector('div[data-turn-role="Model"]') ||
              (role = "unknown_model"));
        } catch (e) {}
        jsonData.push({ role: role, content_html: item.answer });
      }
    });
    const jsonString = JSON.stringify(jsonData, null, 2),
      date = new Date(),
      dateStr = date.toISOString().split("T")[0],
      timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-");
    triggerDownload(
      `${exportSettings.fileName || "aistudio-conversation"}-${dateStr}-${timeStr}.json`,
      jsonString,
      "application/json;charset=utf-8",
    );
  } else removeLoadingIndicator();
}
function extractConversationElements() {
  console.log(
    "[AI Studio PDF] Extracting conversation elements (V4 - using data-turn-role)...",
  );
  const conversation = [],
    chatTurns = document.querySelectorAll("ms-chat-turn");
  (console.log(
    `[AI Studio PDF] Found ${chatTurns.length} visible chat turns for extraction.`,
  ),
    chatTurns.forEach((turn) => {
      let questionHtml = "",
        answerHtml = "";
      const userDiv = turn.querySelector('div[data-turn-role="User"]');
      userDiv && (questionHtml = userDiv.outerHTML);
      const modelDiv = turn.querySelector('div[data-turn-role="Model"]');
      (modelDiv && (answerHtml = modelDiv.outerHTML),
        questionHtml
          ? (conversation.length > 0 &&
              conversation[conversation.length - 1].question &&
              conversation[conversation.length - 1].answer,
            conversation.push({ question: questionHtml, answer: "" }))
          : answerHtml &&
            (conversation.length > 0 &&
            conversation[conversation.length - 1].question &&
            !conversation[conversation.length - 1].answer
              ? (conversation[conversation.length - 1].answer = answerHtml)
              : conversation.push({ question: "", answer: answerHtml })));
    }));
  const finalConversation = conversation.filter((p) => p.question || p.answer);
  return (
    console.log(
      `[AI Studio PDF] Extracted ${finalConversation.length} valid pairs/parts (using data-turn-role).`,
    ),
    finalConversation
  );
}
function generatePDFFromPage() {
  console.log("[AI Studio PDF] Generating PDF from selected page elements...");
  let selectedMessages = [];
  const highlightedTurns = document.querySelectorAll(
    "ms-chat-turn.message-highlighted",
  );
  (console.log(
    `[AI Studio PDF] Found ${highlightedTurns.length} highlighted chat turns for PDF.`,
  ),
    highlightedTurns.forEach((turn) => {
      let rawQuestionHtml = "",
        rawAnswerHtml = "";
      const userDiv = turn.querySelector('div[data-turn-role="User"]');
      userDiv && (rawQuestionHtml = userDiv.outerHTML);
      const modelDiv = turn.querySelector('div[data-turn-role="Model"]');
      modelDiv && (rawAnswerHtml = modelDiv.outerHTML);
      const cleanedQuestionHtml = cleanAndValidateSnippet(rawQuestionHtml),
        cleanedAnswerHtml = cleanAndValidateSnippet(rawAnswerHtml);
      let isUserTurn = !1,
        isModelTurn = !1;
      const tempDiv = document.createElement("div");
      if (cleanedQuestionHtml)
        try {
          ((tempDiv.innerHTML = cleanedQuestionHtml),
            (isUserTurn = !!tempDiv.querySelector(
              'div[data-turn-role="User"]',
            )));
        } catch (e) {}
      if (cleanedAnswerHtml && !isUserTurn)
        try {
          ((tempDiv.innerHTML = cleanedAnswerHtml),
            (isModelTurn = !!tempDiv.querySelector(
              'div[data-turn-role="Model"]',
            )));
        } catch (e) {}
      (isUserTurn ||
        isModelTurn ||
        ((isUserTurn = turn.classList.contains("user")),
        (isModelTurn = turn.classList.contains("model"))),
        isUserTurn && cleanedQuestionHtml
          ? (selectedMessages.length > 0 &&
              selectedMessages[selectedMessages.length - 1].question &&
              selectedMessages[selectedMessages.length - 1].answer,
            selectedMessages.push({
              question: cleanedQuestionHtml,
              answer: "",
            }))
          : isModelTurn && cleanedAnswerHtml
            ? selectedMessages.length > 0 &&
              selectedMessages[selectedMessages.length - 1].question &&
              "" === selectedMessages[selectedMessages.length - 1].answer
              ? (selectedMessages[selectedMessages.length - 1].answer =
                  cleanedAnswerHtml)
              : selectedMessages.push({
                  question: "",
                  answer: cleanedAnswerHtml,
                })
            : cleanedQuestionHtml
              ? (console.warn(
                  "[AI Studio PDF] Adding selected turn based only on cleaned User content.",
                ),
                selectedMessages.push({
                  question: cleanedQuestionHtml,
                  answer: cleanedAnswerHtml || "",
                }))
              : cleanedAnswerHtml &&
                (console.warn(
                  "[AI Studio PDF] Adding selected turn based only on cleaned Model content.",
                ),
                selectedMessages.length > 0 &&
                selectedMessages[selectedMessages.length - 1].question &&
                "" === selectedMessages[selectedMessages.length - 1].answer
                  ? (selectedMessages[selectedMessages.length - 1].answer =
                      cleanedAnswerHtml)
                  : selectedMessages.push({
                      question: "",
                      answer: cleanedAnswerHtml,
                    })));
    }),
    console.log(
      `[AI Studio PDF] Processed ${selectedMessages.length} selected message pairs/parts after cleaning.`,
    ));
  const finalMessages = filterModelOutputs(selectedMessages);
  finalMessages.length > 0
    ? (console.log(
        `[AI Studio PDF] Generating PDF with ${finalMessages.length} final selected pairs/parts after filtering.`,
      ),
      generatePDF(finalMessages))
    : (alert(
        "Selected messages did not contain valid content after cleaning and filtering.",
      ),
      console.warn(
        "[AI Studio PDF] Selected messages yielded no content after cleaning and filtering.",
      ));
}
function generatePDF(conversationData) {
  if (
    (console.log("[AI Studio PDF] === PDF GENERATION DIAGNOSTICS ==="),
    console.log("[AI Studio PDF] Browser:", navigator.userAgent),
    console.log(
      "[AI Studio PDF] Conversation data length:",
      conversationData.length,
    ),
    console.log("[AI Studio PDF] Export settings:", exportSettings),
    console.log("[AI Studio PDF] Document ready state:", document.readyState),
    console.log(
      "[AI Studio PDF] Fonts API available:",
      !(!document.fonts || !document.fonts.ready),
    ),
    console.log(
      "[AI Studio PDF] html2pdf available:",
      "undefined" != typeof html2pdf,
    ),
    console.log(
      "[AI Studio PDF] Starting PDF generation process with options:",
      exportSettings,
    ),
    console.log(
      `[AI Studio PDF] Rendering ${conversationData.length} pairs/parts into PDF.`,
    ),
    "undefined" == typeof html2pdf)
  )
    return (
      console.error("[AI Studio PDF] html2pdf library not loaded!"),
      alert("Error: PDF generation library (html2pdf) is not available."),
      void removeLoadingIndicator()
    );
  const pdfContainer = document.createElement("div");
  ((pdfContainer.style.backgroundColor = "#ffffff"),
    (pdfContainer.style.color = "#3c4043"),
    (pdfContainer.style.fontFamily = "'Google Sans', 'Roboto', sans-serif"),
    (pdfContainer.style.fontSize = "14px"),
    (pdfContainer.style.lineHeight = "1.6"),
    (pdfContainer.style.position = "fixed"),
    (pdfContainer.style.top = "0"),
    (pdfContainer.style.left = "0"),
    (pdfContainer.style.width = "100%"),
    (pdfContainer.style.height = "100%"),
    (pdfContainer.style.visibility = "hidden"),
    (pdfContainer.style.pointerEvents = "none"),
    (pdfContainer.style.overflow = "auto"),
    (pdfContainer.style.zIndex = "99999"));
  const styleElement = document.createElement("style");
  ((styleElement.textContent =
    "\n        /* ... (styles remain unchanged from your provided code) ... */\n        .pdf-render-wrapper * { box-sizing: border-box; font-family: inherit; color: inherit; }\n        .pdf-render-wrapper { background-color: #ffffff !important; color: #3c4043 !important; }\n        .pdf-render-wrapper .message-pair { margin-bottom: 20px; page-break-inside: avoid !important; }\n        .pdf-render-wrapper .message-pair:first-child { page-break-before: avoid !important; margin-top: 0; padding-top: 0; }\n        .pdf-render-wrapper .message-part { padding: 16px 0px; display: flex; align-items: flex-start; gap: 16px; border-bottom: 1px solid #f1f3f4; page-break-inside: avoid !important; }\n        .pdf-render-wrapper .message-pair:last-child .message-part:last-child { border-bottom: none; }\n        .pdf-render-wrapper .icon { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; margin-top: 0px; font-size: 14px; font-weight: 500; line-height: 32px; display: flex; align-items: center; justify-content: center; text-align: center; }\n        .pdf-render-wrapper .icon.user-icon { background-color: #d2e3fc; color: #041e49; }\n        .pdf-render-wrapper .icon.model-icon { background-color: #f1f3f4; color: #3c4043; }\n        .pdf-render-wrapper .content { flex-grow: 1; min-width: 0; /* Prevent flex overflow */ padding-top: 4px; /* Align text better with icon center */ }\n        /* Target the outer div directly */\n        .pdf-render-wrapper .content div[data-turn-role] { margin: 0; padding: 0; }\n        .pdf-render-wrapper .content .turn-content { word-wrap: break-word; } /* Ensure content wraps */\n        .pdf-render-wrapper .content p { margin: 0 0 0.8em 0; line-height: 1.6; page-break-inside: avoid; }\n        .pdf-render-wrapper .content p:last-child { margin-bottom: 0; }\n        /* Code Block Styling */\n        .pdf-render-wrapper .content ms-code-block { display: block; background-color: #f1f3f4 !important; border: 1px solid #dadce0; border-radius: 8px; padding: 12px 16px; margin: 1em 0; page-break-inside: avoid !important; }\n        .pdf-render-wrapper .content ms-code-block pre { display: block; background-color: transparent !important; color: #202124 !important; padding: 0; border-radius: 0; overflow-x: auto; font-family: 'Roboto Mono', monospace !important; font-size: 13px !important; line-height: 1.5 !important; white-space: pre-wrap; word-wrap: break-word; border: none; margin: 0; page-break-inside: avoid !important; }\n        .pdf-render-wrapper .content ms-code-block pre code { font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; background-color: transparent !important; padding: 0 !important; border-radius: 0 !important; border: none !important; white-space: inherit !important; word-wrap: inherit !important; }\n        .pdf-render-wrapper .content ms-code-block footer { display: none !important; } /* Hide code block footer */\n        /* Inline Code Styling */\n        .pdf-render-wrapper .content code:not(pre code):not(ms-code-block code) { font-family: 'Roboto Mono', monospace; font-size: 0.875em; background-color: rgba(60, 64, 67, 0.08); padding: 2px 5px; border-radius: 4px; vertical-align: baseline; word-break: break-all; color: #3c4043; }\n        /* List Styling */\n        .pdf-render-wrapper .content ul, .pdf-render-wrapper .content ol { padding-left: 25px; margin: 0.8em 0; page-break-inside: avoid; }\n        .pdf-render-wrapper .content li { margin-bottom: 6px; page-break-inside: avoid; }\n        /* Emphasis Styling */\n        .pdf-render-wrapper .content strong, .pdf-render-wrapper .content b { font-weight: 600; color: #202124; }\n        .pdf-render-wrapper .content em, .pdf-render-wrapper .content i { font-style: italic; }\n        /* Link Styling */\n        .pdf-render-wrapper .content a { color: #1a73e8; text-decoration: none; }\n        .pdf-render-wrapper .content a:hover { text-decoration: underline; }\n        /* Image Styling */\n        .pdf-render-wrapper .content img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; page-break-inside: avoid !important;}\n        /* Table Styling */\n        .pdf-render-wrapper .content table { width: 100%; border-collapse: collapse; margin: 1em 0; border: 1px solid #e0e0e0; page-break-inside: avoid !important; }\n        .pdf-render-wrapper .content th, .pdf-render-wrapper .content td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; page-break-inside: avoid; }\n        .pdf-render-wrapper .content th { background-color: rgba(0,0,0,0.04); font-weight: 500; }\n        /* Hide unwanted elements */\n        .pdf-render-wrapper .content .actions-container,\n        .pdf-render-wrapper .content button,\n        .pdf-render-wrapper .content mat-icon,\n        .pdf-render-wrapper .content svg[class*=\"mat-icon\"],\n        .pdf-render-wrapper .content ms-prompt-feedback,\n        .pdf-render-wrapper .content .turn-footer,\n        .pdf-render-wrapper .content .thought-container,\n        .pdf-render-wrapper .content .mat-expansion-panel,\n        .pdf-render-wrapper .content .cdk-describedby-host,\n        .pdf-render-wrapper .content .ignore-when-copying {\n             display: none !important;\n        }\n    "),
    pdfContainer.appendChild(styleElement));
  const contentWrapper = document.createElement("div");
  ((contentWrapper.className = "pdf-render-wrapper"),
    (contentWrapper.style.width =
      "landscape" === exportSettings.orientation ? "842pt" : "595pt"),
    (contentWrapper.style.padding = "40pt"),
    (contentWrapper.style.margin = "0 auto"),
    (contentWrapper.style.backgroundColor = "#ffffff"),
    (contentWrapper.style.boxSizing = "border-box"),
    pdfContainer.appendChild(contentWrapper));
  const ignoreStartRegex =
      /^\s*<!--\s*IGNORE_WHEN_COPYING_START\s*-->\s*(\r?\n)?/gim,
    ignoreEndRegex = /^\s*<!--\s*IGNORE_WHEN_COPYING_END\s*-->\s*(\r?\n)?/gim;
  (conversationData.forEach((item) => {
    const messagePairDiv = document.createElement("div");
    messagePairDiv.className = "message-pair";
    const tempContentDiv = document.createElement("div");
    if (item.question) {
      ((tempContentDiv.innerHTML = item.question),
        tempContentDiv
          .querySelectorAll("ms-code-block pre, pre")
          .forEach((pre) => {
            pre.innerHTML = pre.innerHTML
              .replaceAll(ignoreStartRegex, "")
              .replaceAll(ignoreEndRegex, "");
          }));
      const questionDiv = document.createElement("div");
      questionDiv.className = "message-part question";
      const userIcon = document.createElement("div");
      ((userIcon.className = "icon user-icon"), (userIcon.textContent = "U"));
      const contentDiv = document.createElement("div");
      contentDiv.className = "content";
      const userTurnDiv = tempContentDiv.querySelector(
        'div[data-turn-role="User"] .turn-content',
      );
      if (userTurnDiv)
        for (; userTurnDiv.firstChild; )
          contentDiv.appendChild(userTurnDiv.firstChild);
      else
        for (
          console.warn(
            "[AI Studio PDF] User turn structure unexpected, appending raw.",
          );
          tempContentDiv.firstChild;
        )
          contentDiv.appendChild(tempContentDiv.firstChild);
      (questionDiv.appendChild(userIcon),
        questionDiv.appendChild(contentDiv),
        messagePairDiv.appendChild(questionDiv));
    }
    if (item.answer) {
      ((tempContentDiv.innerHTML = item.answer),
        tempContentDiv
          .querySelectorAll("ms-code-block pre, pre")
          .forEach((pre) => {
            pre.innerHTML = pre.innerHTML
              .replaceAll(ignoreStartRegex, "")
              .replaceAll(ignoreEndRegex, "");
          }));
      const answerDiv = document.createElement("div");
      answerDiv.className = messagePairDiv.querySelector(".question")
        ? "message-part answer"
        : "message-part";
      const modelIcon = document.createElement("div");
      ((modelIcon.className = "icon model-icon"),
        (modelIcon.textContent = "G"));
      const contentDiv = document.createElement("div");
      contentDiv.className = "content";
      const modelTurnDiv = tempContentDiv.querySelector(
        'div[data-turn-role="Model"] .turn-content',
      );
      if (modelTurnDiv)
        for (; modelTurnDiv.firstChild; )
          contentDiv.appendChild(modelTurnDiv.firstChild);
      else
        for (
          console.warn(
            "[AI Studio PDF] Model turn structure unexpected, appending raw.",
          );
          tempContentDiv.firstChild;
        )
          contentDiv.appendChild(tempContentDiv.firstChild);
      (answerDiv.appendChild(modelIcon),
        answerDiv.appendChild(contentDiv),
        messagePairDiv.appendChild(answerDiv));
    }
    messagePairDiv.querySelector(".content")?.innerHTML.trim() &&
      contentWrapper.appendChild(messagePairDiv);
  }),
    document.body.appendChild(pdfContainer),
    console.log("[AI Studio PDF] PDF content container added for rendering."),
    console.log("[AI Studio PDF] Container diagnostics:", {
      width: pdfContainer.offsetWidth,
      height: pdfContainer.offsetHeight,
      visibility: pdfContainer.style.visibility,
      contentWrapperWidth: contentWrapper.offsetWidth,
      contentWrapperHeight: contentWrapper.offsetHeight,
      messageCount: contentWrapper.querySelectorAll(".message-pair").length,
      hasContent: contentWrapper.innerHTML.length > 0,
    }));
  const date = new Date(),
    dateStr = date.toISOString().split("T")[0],
    timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-"),
    pdfOptions = {
      margin: 0,
      filename: `${`${exportSettings.fileName || "aistudio-conversation"}-${dateStr}-${timeStr}`}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: !0,
        backgroundColor: "#ffffff",
        logging: !1,
        letterRendering: !0,
        allowTaint: !1,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      },
      jsPDF: {
        unit: "pt",
        format: "a4",
        orientation: exportSettings.orientation,
        compress: exportSettings.compression,
      },
      pagebreak: { mode: ["css", "avoid-all", "legacy"] },
    };
  (console.log("[AI Studio PDF] html2pdf options:", pdfOptions),
    updateLoadingIndicator("Generating PDF..."));
  const generateWithRetry = (retryCount = 0) => {
    html2pdf()
      .from(contentWrapper)
      .set(pdfOptions)
      .save()
      .then(() => {
        (console.log("[AI Studio PDF] PDF generation successful."),
          updateLoadingIndicator("PDF saved successfully!"),
          setTimeout(removeLoadingIndicator, 2e3));
      })
      .catch((error) => {
        if (
          (console.error("[AI Studio PDF] PDF generation failed:", error),
          retryCount < 2)
        )
          return (
            console.log(
              `[AI Studio PDF] Retrying PDF generation (attempt ${retryCount + 2}/3)...`,
            ),
            void setTimeout(() => generateWithRetry(retryCount + 1), 1e3)
          );
        (alert(
          `PDF Generation Error: ${error.message || "Unknown error"}\n\nTroubleshooting tips:\n- Try refreshing the page and exporting again\n- Check if any browser extensions might be interfering\n- Try disabling ad blockers temporarily\n- Report persistent issues with browser version and OS details`,
        ),
          removeLoadingIndicator());
      })
      .finally(() => {
        (pdfContainer.parentNode === document.body &&
          document.body.removeChild(pdfContainer),
          console.log("[AI Studio PDF] Temporary PDF container removed."));
      });
  };
  new Promise((resolve) => {
    document.fonts && document.fonts.ready
      ? document.fonts.ready
          .then(() => {
            (console.log("[AI Studio PDF] All fonts loaded successfully"),
              resolve());
          })
          .catch((err) => {
            (console.warn(
              "[AI Studio PDF] Font loading error, continuing anyway:",
              err,
            ),
              resolve());
          })
      : (console.log(
          "[AI Studio PDF] document.fonts not supported, using timeout fallback",
        ),
        setTimeout(resolve, 500));
  }).then(() => {
    (console.log("[AI Studio PDF] Starting PDF generation after font loading"),
      setTimeout(() => generateWithRetry(), 500));
  });
}
async function saveEntireChatBasedOnSettings() {
  switch (
    (console.log(
      `[AI Studio PDF] Initiating 'Save Entire Chat' with format: ${exportSettings.exportFormat}`,
    ),
    loadInitialExportSettings(),
    exportSettings.exportFormat)
  ) {
    case "pdf":
      await generateAndSavePDF();
      break;
    case "html":
      await generateAndSaveHTML();
      break;
    case "markdown":
      await generateAndSaveMarkdown();
      break;
    case "json":
      await generateAndSaveJSON();
      break;
    default:
      (console.error(
        `[AI Studio PDF] Unknown export format selected: ${exportSettings.exportFormat}`,
      ),
        alert(
          `Error: Unknown export format selected (${exportSettings.exportFormat}). Please choose a valid format in Settings.`,
        ),
        removeLoadingIndicator());
  }
}
function showExportDropdown(buttonRect, buttonElement) {
  const existingDropdown = document.getElementById("aistudio-export-dropdown");
  if (existingDropdown)
    return (
      existingDropdown.remove(),
      (isExportDropdownOpen = !1),
      buttonElement?.classList.remove("active"),
      void console.log("[AI Studio PDF] Export dropdown closed.")
    );
  (console.log("[AI Studio PDF] Showing export dropdown."),
    (isExportDropdownOpen = !0),
    buttonElement?.classList.add("active"));
  const dropdown = document.createElement("div");
  dropdown.id = "aistudio-export-dropdown";
  const buttonCenter = buttonRect.left + buttonRect.width / 2;
  dropdown.style.cssText = `\n        position: fixed;\n        top: ${buttonRect.bottom + 8}px;\n        left: ${buttonCenter}px; /* MODIFIED - Use center */\n        transform: translateX(-50%); /* MODIFIED - Center horizontally */\n        min-width: ${buttonRect.width}px;\n        max-width: 280px;\n        background: #fff;\n        border-radius: 8px;\n        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);\n        padding: 8px 0;\n        z-index: 10001;\n        border: 1px solid rgba(0, 0, 0, 0.1);\n        overflow: hidden;\n        color: #202124;\n        font-family: 'Google Sans', sans-serif;\n        font-size: 14px;\n    `;
  ([
    { text: "Save Entire Chat", action: saveEntireChatBasedOnSettings },
    { text: "Settings...", action: showSettingsPanel },
  ].forEach((opt) => {
    const optionDiv = document.createElement("div");
    ((optionDiv.className = "aistudio-export-option"),
      (optionDiv.textContent = opt.text),
      (optionDiv.style.cssText =
        "padding: 10px 16px; cursor: pointer; transition: background-color 0.15s ease; white-space: nowrap;"),
      opt.text.includes("Settings") &&
        ((optionDiv.style.borderTop = "1px solid #e0e0e0"),
        (optionDiv.style.marginTop = "4px"),
        (optionDiv.style.paddingTop = "12px")),
      optionDiv.addEventListener(
        "mouseenter",
        () => (optionDiv.style.backgroundColor = "rgba(26, 115, 232, 0.08)"),
      ),
      optionDiv.addEventListener(
        "mouseleave",
        () => (optionDiv.style.backgroundColor = "transparent"),
      ),
      optionDiv.addEventListener("click", (e) => {
        (dropdown.remove(),
          (isExportDropdownOpen = !1),
          buttonElement?.classList.remove("active"),
          opt.action(),
          e.stopPropagation());
      }),
      dropdown.appendChild(optionDiv));
  }),
    document.body.appendChild(dropdown),
    (window._aistudioPdfExportDropdownClickHandler = (e) => {
      dropdown.contains(e.target) ||
        buttonElement?.contains(e.target) ||
        (dropdown.remove(),
        (isExportDropdownOpen = !1),
        buttonElement?.classList.remove("active"),
        document.removeEventListener(
          "click",
          window._aistudioPdfExportDropdownClickHandler,
          !0,
        ),
        delete window._aistudioPdfExportDropdownClickHandler);
    }),
    setTimeout(() => {
      document.addEventListener(
        "click",
        window._aistudioPdfExportDropdownClickHandler,
        !0,
      );
    }, 0));
}
function triggerDownload(filename, content, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    ((a.href = url),
      (a.download = filename),
      document.body.appendChild(a),
      a.click(),
      document.body.removeChild(a),
      URL.revokeObjectURL(url),
      console.log(`[AI Studio PDF] Download triggered for: ${filename}`),
      updateLoadingIndicator("Download started!"),
      setTimeout(removeLoadingIndicator, 2e3));
  } catch (error) {
    (console.error(
      `[AI Studio PDF] Error triggering download for ${filename}:`,
      error,
    ),
      alert(
        `Error creating download for ${filename}. See console for details.`,
      ),
      removeLoadingIndicator());
  }
}
function showSettingsPanel() {
  const panelId = "aistudio-pdf-settings-panel",
    existingPanel = document.getElementById(panelId);
  if (existingPanel) {
    (existingPanel.remove(),
      (isSettingsPanelOpen = !1),
      console.log("[AI Studio PDF] Settings panel closed."),
      document.removeEventListener(
        "click",
        window._aistudioPdfSettingsPanelClickHandler,
        !0,
      ),
      delete window._aistudioPdfSettingsPanelClickHandler);
    const animationStyleTag = document.getElementById(`${panelId}-style`);
    return void (animationStyleTag && animationStyleTag.remove());
  }
  (console.log("[AI Studio PDF] Showing settings panel."),
    (isSettingsPanelOpen = !0));
  const colors_bgPrimary = "#ffffff",
    colors_textPrimary = "#202124",
    colors_textSecondary = "#5f6368",
    colors_borderSecondary = "#e0e0e0",
    colors_accentText = "#ffffff",
    colors_inputBg = "#ffffff",
    colors_inputBorder = "#dadce0",
    colors_inputBorderFocus = "#1a73e8",
    colors_pillBg = "#e8eaed",
    colors_pillBgHover = "#d8dadc",
    colors_pillBgSelected = "#1a73e8",
    colors_pillText = "#3c4043",
    colors_pillTextSelected = "#ffffff",
    colors_checkboxBorder = "#5f6368",
    colors_checkboxBgChecked = "#1a73e8",
    panel = document.createElement("div");
  ((panel.id = panelId),
    panel.setAttribute("role", "dialog"),
    panel.setAttribute("aria-modal", "true"),
    panel.setAttribute("aria-labelledby", "aistudio-pdf-settings-header"),
    (panel.style.cssText = `\n        position: fixed;\n        top: 70px; /* Adjusted top */\n        left: 50%;\n        transform: translateX(-50%);\n        width: 400px; /* Slightly wider */\n        background: ${colors_bgPrimary};\n        border-radius: 12px; /* Larger radius */\n        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0,0,0,0.1);\n        padding: 24px;\n        z-index: 10002;\n        border: 1px solid ${colors_borderSecondary};\n        color: ${colors_textPrimary};\n        font-family: 'Google Sans', sans-serif;\n        font-size: 14px;\n        display: flex;\n        flex-direction: column;\n        gap: 20px; /* Increased gap */\n        animation: fadeInSettingsPanel 0.15s ease-out;\n        outline: none;\n    `));
  const closeButton = document.createElement("button");
  function closeSettingsActions() {
    (panel.remove(),
      (isSettingsPanelOpen = !1),
      document.removeEventListener(
        "click",
        window._aistudioPdfSettingsPanelClickHandler,
        !0,
      ),
      delete window._aistudioPdfSettingsPanelClickHandler);
    const animationStyleTag = document.getElementById(`${panelId}-style`);
    (animationStyleTag && animationStyleTag.remove(),
      console.log("[AI Studio PDF] Settings panel closed by UI action."));
    const shadowHost = document.querySelector("#aistudio-to-pdf");
    shadowHost?.shadowRoot?.querySelector("#export-button")?.focus();
  }
  ((closeButton.innerHTML = "&times;"),
    closeButton.setAttribute("aria-label", "Close settings"),
    (closeButton.style.cssText = `\n        position: absolute;\n        top: 12px; /* Adjust to align with padding */\n        right: 12px;\n        font-size: 24px;\n        font-weight: 300;\n        color: ${colors_textSecondary};\n        background: transparent;\n        border: none;\n        cursor: pointer;\n        padding: 4px 8px;\n        line-height: 1;\n        border-radius: 50%;\n    `),
    (closeButton.onmouseover = () => {
      ((closeButton.style.backgroundColor = colors_pillBgHover),
        (closeButton.style.color = colors_textPrimary));
    }),
    (closeButton.onmouseout = () => {
      ((closeButton.style.backgroundColor = "transparent"),
        (closeButton.style.color = colors_textSecondary));
    }),
    closeButton.addEventListener("click", closeSettingsActions),
    panel.appendChild(closeButton));
  const settingsStyle = document.createElement("style");
  ((settingsStyle.id = `${panelId}-style`),
    (settingsStyle.textContent = `\n        @keyframes fadeInSettingsPanel {\n            from { opacity: 0; transform: translateY(-10px) translateX(-50%); }\n            to { opacity: 1; transform: translateY(0) translateX(-50%); }\n        }\n        .settings-pill-button {\n            padding: 8px 12px;\n            border-radius: 100px; /* Pill shape */\n            background-color: ${colors_pillBg};\n            color: ${colors_pillText};\n            font-size: 13px;\n            font-weight: 500;\n            cursor: pointer;\n            transition: background-color 0.2s ease, color 0.2s ease;\n            border: none;\n            text-align: center;\n            flex-grow: 1; /* Make pills in a group take equal width */\n        }\n        .settings-pill-button:hover {\n            background-color: ${colors_pillBgHover};\n        }\n        .settings-pill-button.selected {\n            background-color: ${colors_pillBgSelected};\n            color: ${colors_pillTextSelected};\n        }\n        .settings-pill-button-group {\n            display: flex;\n            gap: 8px; /* Gap between pills */\n            border-radius: 100px; /* Rounded ends for the group visual */\n            overflow: hidden; /* Ensures border-radius clips children if needed */\n        }\n         .settings-checkbox-label {\n            display: flex;\n            align-items: center;\n            gap: 10px;\n            cursor: pointer;\n            font-size: 14px;\n            color: ${colors_textPrimary};\n            padding: 8px 0; /* Add some padding for click area */\n        }\n        .settings-checkbox-custom {\n            width: 20px;\n            height: 20px;\n            border: 2px solid ${colors_checkboxBorder};\n            border-radius: 4px;\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            transition: background-color 0.1s ease, border-color 0.1s ease;\n            flex-shrink: 0;\n        }\n        .settings-checkbox-custom svg { /* Checkmark style */\n            width: 14px;\n            height: 14px;\n            fill: none;\n            stroke: ${colors_accentText};\n            stroke-width: 2.5;\n            stroke-linecap: round;\n            stroke-linejoin: round;\n            visibility: hidden; /* Hidden by default */\n        }\n        .settings-checkbox-input:checked + .settings-checkbox-custom {\n            background-color: ${colors_checkboxBgChecked};\n            border-color: ${colors_checkboxBgChecked};\n        }\n        .settings-checkbox-input:checked + .settings-checkbox-custom svg {\n            visibility: visible;\n        }\n        .settings-checkbox-input { /* Hide actual checkbox */\n            opacity: 0;\n            width: 0;\n            height: 0;\n            position: absolute;\n        }\n        .settings-section-divider {\n            height: 1px;\n            background-color: ${colors_borderSecondary};\n            margin: 8px 0; /* Adjusted margin */\n        }\n    `),
    document.head.appendChild(settingsStyle));
  const header = document.createElement("div");
  ((header.id = "aistudio-pdf-settings-header"),
    (header.textContent = "Export Settings"),
    (header.style.cssText = `\n        font-size: 18px; /* Larger */\n        font-weight: 500;\n        padding-bottom: 16px; /* Increased padding */\n        border-bottom: 1px solid ${colors_borderSecondary};\n        margin-bottom: 8px; /* Adjusted margin */\n        color: ${colors_textPrimary};\n    `),
    panel.appendChild(header));
  const createSettingGroup = (labelText, descriptionText = null) => {
      const group = document.createElement("div");
      group.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
      const label = document.createElement("label");
      if (
        ((label.textContent = labelText),
        (label.style.cssText = `\n            font-size: 14px; /* Slightly larger */\n            color: ${colors_textPrimary}; /* Darker label */\n            font-weight: 500;\n            margin-bottom: 2px; /* Space before control */\n        `),
        group.appendChild(label),
        descriptionText)
      ) {
        const description = document.createElement("p");
        ((description.textContent = descriptionText),
          (description.style.cssText = `font-size: 12px; color: ${colors_textSecondary}; margin: 0 0 4px 0; line-height: 1.4;`),
          group.appendChild(description));
      }
      return group;
    },
    createRadioPillGroup = (name, options, currentValue, onChangeCallback) => {
      const groupContainer = document.createElement("div");
      return (
        (groupContainer.className = "settings-pill-button-group"),
        options.forEach((opt) => {
          const button = document.createElement("button");
          ((button.type = "button"),
            (button.className = "settings-pill-button"),
            (button.textContent = opt.text),
            (button.dataset.value = opt.value),
            opt.value === currentValue && button.classList.add("selected"),
            button.addEventListener("click", () => {
              (groupContainer
                .querySelectorAll(".settings-pill-button")
                .forEach((btn) => btn.classList.remove("selected")),
                button.classList.add("selected"),
                onChangeCallback(opt.value));
            }),
            groupContainer.appendChild(button));
        }),
        groupContainer
      );
    },
    fileNameGroup = createSettingGroup(
      "File Name Base",
      "This name will be used for all exported files.",
    ),
    fileNameInput = ((id, placeholder, value, onChangeCallback) => {
      const input = document.createElement("input");
      return (
        (input.type = "text"),
        (input.id = id),
        (input.placeholder = placeholder),
        (input.value = value),
        (input.style.cssText = `\n            padding: 10px 14px; /* Increased padding */\n            border: 1px solid ${colors_inputBorder};\n            border-radius: 8px; /* More rounded */\n            font-size: 14px;\n            font-family: 'Roboto', sans-serif;\n            outline: none;\n            transition: border-color 0.2s ease, box-shadow 0.2s ease;\n            width: 100%;\n            background-color: ${colors_inputBg};\n            color: ${colors_textPrimary};\n            box-sizing: border-box;\n        `),
        input.addEventListener("focus", () => {
          ((input.style.borderColor = colors_inputBorderFocus),
            (input.style.boxShadow = `0 0 0 2px ${colors_inputBorderFocus}40`));
        }),
        input.addEventListener("blur", () => {
          ((input.style.borderColor = colors_inputBorder),
            (input.style.boxShadow = "none"));
        }),
        input.addEventListener("input", () => onChangeCallback(input.value)),
        input
      );
    })(
      "aistudio-export-filename",
      "e.g., aistudio-chat",
      exportSettings.fileName || "",
      (value) => {
        ((exportSettings.fileName = value.trim() || "aistudio-conversation"),
          saveExportSettings());
      },
    );
  (fileNameGroup.appendChild(fileNameInput), panel.appendChild(fileNameGroup));
  const formatGroup = createSettingGroup("Export Format"),
    formatPills = createRadioPillGroup(
      0,
      [
        { value: "pdf", text: "PDF" },
        { value: "html", text: "HTML" },
        { value: "markdown", text: "Markdown" },
        { value: "json", text: "JSON" },
      ],
      exportSettings.exportFormat,
      (selectedValue) => {
        ((exportSettings.exportFormat = selectedValue), saveExportSettings());
        const pdfSettingsEnabled = "pdf" === selectedValue,
          pdfSettingsContainer = document.getElementById(
            "pdf-specific-settings",
          );
        pdfSettingsContainer &&
          ((pdfSettingsContainer.style.opacity = pdfSettingsEnabled
            ? "1"
            : "0.5"),
          (pdfSettingsContainer.style.pointerEvents = pdfSettingsEnabled
            ? "auto"
            : "none"),
          (pdfSettingsContainer.style.maxHeight = pdfSettingsEnabled
            ? "500px"
            : "0"),
          (pdfSettingsContainer.style.paddingTop = pdfSettingsEnabled
            ? "20px"
            : "0"),
          (pdfSettingsContainer.style.marginTop = pdfSettingsEnabled
            ? "20px"
            : "0"),
          (pdfSettingsContainer.style.borderTop = pdfSettingsEnabled
            ? `1px solid ${colors_borderSecondary}`
            : "none"));
      },
    );
  (formatGroup.appendChild(formatPills), panel.appendChild(formatGroup));
  const pdfSettingsContainer = document.createElement("div");
  ((pdfSettingsContainer.id = "pdf-specific-settings"),
    (pdfSettingsContainer.style.cssText =
      "\n        display: flex;\n        flex-direction: column;\n        gap: 20px;\n        transition: opacity 0.2s ease, max-height 0.3s ease-out, padding 0.3s ease-out, margin 0.3s ease-out, border-top 0.3s ease-out;\n        overflow: hidden; /* Important for max-height transition */\n    "));
  const isPdfCurrentlySelected = "pdf" === exportSettings.exportFormat;
  ((pdfSettingsContainer.style.opacity = isPdfCurrentlySelected ? "1" : "0.5"),
    (pdfSettingsContainer.style.pointerEvents = isPdfCurrentlySelected
      ? "auto"
      : "none"),
    (pdfSettingsContainer.style.maxHeight = isPdfCurrentlySelected
      ? "500px"
      : "0"),
    (pdfSettingsContainer.style.paddingTop = isPdfCurrentlySelected
      ? "20px"
      : "0"),
    (pdfSettingsContainer.style.marginTop = isPdfCurrentlySelected
      ? "20px"
      : "0"),
    (pdfSettingsContainer.style.borderTop = isPdfCurrentlySelected
      ? `1px solid ${colors_borderSecondary}`
      : "none"));
  const orientationGroup = createSettingGroup("Page Orientation"),
    orientationPills = createRadioPillGroup(
      0,
      [
        { value: "portrait", text: "Portrait" },
        { value: "landscape", text: "Landscape" },
      ],
      exportSettings.orientation,
      (selectedValue) => {
        ((exportSettings.orientation = selectedValue), saveExportSettings());
      },
    );
  (orientationGroup.appendChild(orientationPills),
    pdfSettingsContainer.appendChild(orientationGroup));
  const compressionGroup = createSettingGroup("PDF Compression"),
    compressionCheckbox = ((id, labelText, checked, onChangeCallback) => {
      const label = document.createElement("label");
      ((label.className = "settings-checkbox-label"), (label.htmlFor = id));
      const input = document.createElement("input");
      ((input.type = "checkbox"),
        (input.id = id),
        (input.className = "settings-checkbox-input"),
        (input.checked = checked),
        input.addEventListener("change", () =>
          onChangeCallback(input.checked),
        ));
      const customCheckbox = document.createElement("span");
      return (
        (customCheckbox.className = "settings-checkbox-custom"),
        (customCheckbox.innerHTML =
          '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>'),
        label.appendChild(input),
        label.appendChild(customCheckbox),
        label.appendChild(document.createTextNode(labelText)),
        label
      );
    })(
      "aistudio-pdf-compression",
      "Enable Compression (Reduces file size)",
      exportSettings.compression,
      (checked) => {
        ((exportSettings.compression = checked), saveExportSettings());
      },
    );
  (compressionGroup.appendChild(compressionCheckbox),
    pdfSettingsContainer.appendChild(compressionGroup),
    panel.appendChild(pdfSettingsContainer),
    document.body.appendChild(panel),
    panel.focus(),
    (window._aistudioPdfSettingsPanelClickHandler = (e) => {
      panel.contains(e.target) || closeSettingsActions();
    }),
    setTimeout(() => {
      document.addEventListener(
        "click",
        window._aistudioPdfSettingsPanelClickHandler,
        !0,
      );
    }, 0),
    panel.addEventListener("keydown", (e) => {
      "Escape" === e.key && closeSettingsActions();
    }));
}
function toggleExportMode() {
  if (!!document.getElementById("aistudio-selection-active"))
    (console.log("[AI Studio PDF] Toggling export mode: Exiting selection."),
      exitSelectionMode());
  else {
    console.log("[AI Studio PDF] Toggling export mode: Entering selection.");
    const settingsPanel = document.getElementById(
      "aistudio-pdf-settings-panel",
    );
    if (settingsPanel) {
      (settingsPanel.remove(),
        (isSettingsPanelOpen = !1),
        document.removeEventListener(
          "click",
          window._aistudioPdfSettingsPanelClickHandler,
          !0,
        ),
        delete window._aistudioPdfSettingsPanelClickHandler);
      const animationStyleTag = document.getElementById(
        "aistudio-pdf-settings-panel-style",
      );
      (animationStyleTag && animationStyleTag.remove(),
        console.log("[AI Studio PDF] Closed settings panel automatically."));
    }
    enterSelectionMode();
  }
}
function setupGlobalEventListeners() {
  (console.log("[AI Studio PDF] Setting up global event listeners."),
    document.removeEventListener("dblclick", handleGlobalDoubleClick),
    document.addEventListener("dblclick", handleGlobalDoubleClick));
}
function handleGlobalDoubleClick(e) {
  const shadowHost = document.querySelector("#aistudio-to-pdf"),
    exportDropdown = document.getElementById("aistudio-export-dropdown");
  if (exportDropdown && !exportDropdown.contains(e.target)) {
    const exportButton =
      shadowHost?.shadowRoot?.querySelector("#export-button");
    (exportButton && exportButton.contains(e.target)) ||
      (console.log(
        "[AI Studio PDF] Closing export dropdown via double-click outside.",
      ),
      exportDropdown.remove(),
      (isExportDropdownOpen = !1),
      exportButton?.classList.remove("active"),
      window._aistudioPdfExportDropdownClickHandler &&
        (document.removeEventListener(
          "click",
          window._aistudioPdfExportDropdownClickHandler,
          !0,
        ),
        delete window._aistudioPdfExportDropdownClickHandler));
  }
  const settingsPanel = document.getElementById("aistudio-pdf-settings-panel");
  settingsPanel &&
    !settingsPanel.contains(e.target) &&
    console.log(
      "[AI Studio PDF] Double-click outside settings panel detected (should trigger its own close handler).",
    );
}
(loadInitialExportSettings(),
  window.aistudioPdfInitialized
    ? (console.log(
        "[AI Studio PDF] Initialization skipped (already run). Re-checking visibility for existing button.",
      ),
      chrome.storage.sync.get("studioButtonVisible", function (result) {
        const isButtonVisible =
            void 0 === result.studioButtonVisible || result.studioButtonVisible,
          buttonContainer = document.getElementById("aistudio-to-pdf");
        buttonContainer && !isButtonVisible
          ? (buttonContainer.remove(),
            console.log(
              "[AI Studio PDF] Button was present but now set to hidden by user, removing.",
            ))
          : !buttonContainer && isButtonVisible
            ? (console.log(
                "[AI Studio PDF] Button not present but should be visible, attempting re-injection.",
              ),
              injectButton())
            : buttonContainer &&
              isButtonVisible &&
              (buttonContainer.style.display = "flex");
      }))
    : ((window.aistudioPdfInitialized = !0),
      console.log("[AI Studio PDF] Running initialization..."),
      loadInitialExportSettings(),
      chrome.storage.sync.get("studioButtonVisible", function (result) {
        const isButtonVisible =
          void 0 === result.studioButtonVisible || result.studioButtonVisible;
        (console.log(
          "[AI Studio PDF] Initial button visibility from storage:",
          isButtonVisible,
        ),
          isButtonVisible
            ? ("undefined" != typeof html2pdf
                ? (console.log(
                    "[AI Studio PDF] html2pdf library is available (loaded via manifest).",
                  ),
                  "loading" === document.readyState
                    ? document.addEventListener(
                        "DOMContentLoaded",
                        injectButton,
                      )
                    : injectButton())
                : (console.error(
                    "[AI Studio PDF] CRITICAL: html2pdf library NOT FOUND. PDF generation will not work. This is unexpected as it should be loaded via manifest.json. Check extension packaging and manifest content script order.",
                  ),
                  alert(
                    "Error: PDF generation library (html2pdf) not found. PDF export will be unavailable. If the problem persists, please report this issue to the extension developer.",
                  ),
                  "loading" === document.readyState
                    ? document.addEventListener(
                        "DOMContentLoaded",
                        injectButton,
                      )
                    : injectButton()),
              console.log(
                "[AI Studio PDF] Initialization proceeding for button injection (pending DOMContentLoaded if applicable).",
              ))
            : console.log(
                "[AI Studio PDF] Button visibility set to false by user. Not injecting button initially.",
              ));
      })));
