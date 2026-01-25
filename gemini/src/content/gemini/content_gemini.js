chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if ("getConversation" === request.action)
    return (
      console.log(
        "content.js: Extracting Gemini conversation (for popup use)...",
      ),
      scrollToTopAndWait()
        .then(() => {
          const conversation = extractConversationElements();
          (console.log(
            "content.js: Conversation extracted (for popup use):",
            conversation,
          ),
            sendResponse({ conversation: conversation }));
        })
        .catch((error) => {
          (console.error(
            "Error during conversation extraction for popup:",
            error,
          ),
            sendResponse({
              error:
                error.message ||
                "Failed to extract conversation after scrolling.",
            }));
        }),
      !0
    );
  if ("setButtonVisibility" === request.action && "gemini" === request.site) {
    if (
      (console.log(
        `[Gemini Exporter] Received setButtonVisibility: ${request.visible}`,
      ),
      request.visible)
    )
      injectButton();
    else {
      const buttonContainer = document.getElementById("gemini-exporter");
      if (buttonContainer) {
        (buttonContainer.remove(),
          chatObserver &&
            (chatObserver.disconnect(),
            (chatObserver = null),
            console.log(
              "[Gemini Exporter] Observer disconnected on button removal.",
            )));
        const exportDropdown = document.getElementById(
          "export-dropdown-gemini",
        );
        (exportDropdown && exportDropdown.remove(),
          (isExportDropdownOpen = !1));
        const settingsPopup = document.getElementById("settings-popup-gemini"),
          backdrop = document.getElementById("settings-backdrop-gemini"),
          styleTag = document.getElementById("settings-popup-gemini-style");
        (settingsPopup &&
          isSettingsPopupOpen &&
          closeSettingsPopup(settingsPopup, backdrop, styleTag),
          console.log(
            "[Gemini Exporter] Save Chat button removed via popup toggle.",
          ));
      }
    }
    return (
      sendResponse({ status: "Button visibility updated for Gemini" }),
      !0
    );
  }
  return !0;
});
let isExportDropdownOpen = !1,
  isSettingsPopupOpen = !1,
  selectedMessageCount = 0,
  chatObserver = null,
  exportSettings = {
    fileName: "gemini-conversation",
    format: "pdf",
    pdfTheme: "auto",
    orientation: "portrait",
    compression: !0,
    uiTheme: "auto",
    debugLogs: !1,
  };
function debugLog(...args) {
  try {
    exportSettings &&
      exportSettings.debugLogs &&
      console.debug("[Gemini Exporter]", ...args);
  } catch (_) {}
}
const loadingSpinnerSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="18" height="18" style="shape-rendering: auto; display: block; background: transparent;" xmlns:xlink="http://www.w3.org/1999/xlink"><g><circle cx="50" cy="50" fill="none" stroke="currentColor" stroke-width="10" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle><g></g></g></svg>',
  checkmarkSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  defaultIconSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="save-button-icon" width="18" height="18"><path d="M17 3H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6z"></path></svg>';
function isDarkModeActive() {
  if (document.body.classList.contains("dark-theme")) return !0;
  const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
  if (bodyBgColor) {
    const rgb = bodyBgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      return (
        (299 * parseInt(rgb[0]) +
          587 * parseInt(rgb[1]) +
          114 * parseInt(rgb[2])) /
          1e3 <
        128
      );
    }
  }
  return !1;
}
function getCurrentTheme() {
  return "auto" === exportSettings.uiTheme
    ? isDarkModeActive()
      ? "dark"
      : "light"
    : exportSettings.uiTheme;
}
let saveSettingsTimeout = null;
function debouncedSaveExportSettings(immediate = !1) {
  immediate
    ? (clearTimeout(saveSettingsTimeout),
      (saveSettingsTimeout = null),
      saveExportSettings())
    : (clearTimeout(saveSettingsTimeout),
      (saveSettingsTimeout = setTimeout(() => {
        (saveExportSettings(), (saveSettingsTimeout = null));
      }, 500)));
}
function loadInitialExportSettings() {
  try {
    const savedSettings = localStorage.getItem("gemini-exporter-settings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      (Object.keys(exportSettings).forEach((key) => {
        parsedSettings.hasOwnProperty(key) &&
          ("format" !== key ||
          ["pdf", "html", "md", "json"].includes(parsedSettings[key])
            ? "pdfTheme" === key
              ? (exportSettings[key] = "auto")
              : "uiTheme" !== key ||
                  ["auto", "light", "dark"].includes(parsedSettings[key])
                ? "orientation" !== key ||
                  ["portrait", "landscape"].includes(parsedSettings[key])
                  ? "compression" === key &&
                    "boolean" != typeof parsedSettings[key]
                    ? console.warn(
                        `[Gemini Exporter] Invalid compression value "${parsedSettings[key]}". Using default "${exportSettings.compression}".`,
                      )
                    : "debugLogs" === key &&
                        "boolean" != typeof parsedSettings[key]
                      ? console.warn(
                          `[Gemini Exporter] Invalid debugLogs value "${parsedSettings[key]}". Using default "${exportSettings.debugLogs}".`,
                        )
                      : (exportSettings[key] = parsedSettings[key])
                  : console.warn(
                      `[Gemini Exporter] Invalid orientation "${parsedSettings[key]}". Using default "${exportSettings.orientation}".`,
                    )
                : console.warn(
                    `[Gemini Exporter] Invalid uiTheme "${parsedSettings[key]}". Using default "${exportSettings.uiTheme}".`,
                  )
            : console.warn(
                `[Gemini Exporter] Invalid format "${parsedSettings[key]}". Using default "${exportSettings.format}".`,
              ));
      }),
        console.log(
          "[Gemini Exporter] Initial exporter settings loaded:",
          exportSettings,
        ));
    } else
      (console.log(
        "[Gemini Exporter] No saved settings found, using defaults:",
        exportSettings,
      ),
        saveExportSettings());
  } catch (error) {
    console.error(
      "[Gemini Exporter] Failed to load initial exporter settings:",
      error,
    );
  }
}
function getFormattedTimestamp() {
  const date = new Date();
  return `${date.toISOString().split("T")[0]}-${date.toTimeString().split(" ")[0].replace(/:/g, "-")}`;
}
function generateFilename(baseName, format) {
  const timestamp = getFormattedTimestamp();
  return `${baseName.replace(/[^a-z0-9_\-]/gi, "_") || "gemini-conversation"}-${timestamp}.${format}`;
}
function downloadData(data, filename, mimeType) {
  try {
    const blob = new Blob([data], { type: mimeType }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    ((a.href = url),
      (a.download = filename),
      document.body.appendChild(a),
      a.click(),
      document.body.removeChild(a),
      URL.revokeObjectURL(url),
      console.log(
        `[Gemini Exporter] Successfully initiated download for ${filename}`,
      ));
  } catch (error) {
    (console.error(
      `[Gemini Exporter] Error creating download for ${filename}:`,
      error,
    ),
      alert(
        `Failed to initiate download for ${filename}. See console for details.`,
      ));
  }
}
function convertHtmlToMarkdown(html) {
  if (!html) return "";
  let markdown = html;
  const tempDiv = document.createElement("div");
  function processNode(node) {
    if (!node || "string" != typeof node.nodeName) return "";
    let md = "";
    switch (node.nodeName) {
      case "#text":
        md = (node.textContent || "").replace(/([*_~])/g, "\\$1");
        break;
      case "P":
        md = processChildren(node) + "\n\n";
        break;
      case "H1":
        md = "# " + processChildren(node) + "\n\n";
        break;
      case "H2":
        md = "## " + processChildren(node) + "\n\n";
        break;
      case "H3":
        md = "### " + processChildren(node) + "\n\n";
        break;
      case "H4":
        md = "#### " + processChildren(node) + "\n\n";
        break;
      case "H5":
        md = "##### " + processChildren(node) + "\n\n";
        break;
      case "H6":
        md = "###### " + processChildren(node) + "\n\n";
        break;
      case "UL":
        md =
          Array.from(node.children)
            .map((li) => "* " + processChildren(li).trim())
            .join("\n") + "\n\n";
        break;
      case "OL":
        md =
          Array.from(node.children)
            .map((li, i) => `${i + 1}. ${processChildren(li).trim()}`)
            .join("\n") + "\n\n";
        break;
      case "LI":
      case "DIV":
      case "SPAN":
      default:
        md = processChildren(node);
        break;
      case "A":
        md = `[${processChildren(node)}](${node.href || ""})`;
        break;
      case "STRONG":
      case "B":
        md = "**" + processChildren(node) + "**";
        break;
      case "EM":
      case "I":
        md = "*" + processChildren(node) + "*";
        break;
      case "CODE-BLOCK":
        const codeContentNode = node.querySelector("pre code, pre"),
          langMatch = codeContentNode?.className?.match(/language-(\S+)/);
        md = `\`\`\`${langMatch ? langMatch[1] : ""}\n${codeContentNode?.textContent || node.textContent || ""}\n\`\`\`\n\n`;
        break;
      case "PRE":
        md = node.closest("code-block")
          ? processChildren(node)
          : `\`\`\`\n${node.textContent || ""}\n\`\`\`\n\n`;
        break;
      case "CODE":
        md = node.closest("pre, code-block")
          ? node.textContent || ""
          : "`" + node.textContent + "`";
        break;
      case "BLOCKQUOTE":
        md = "> " + processChildren(node).replace(/\n/g, "\n> ") + "\n\n";
        break;
      case "HR":
        md = "---\n\n";
        break;
      case "TABLE":
        const headerRow = node.querySelector("thead tr, tr:first-child"),
          bodyRows = Array.from(
            node.querySelectorAll("tbody tr, tr:not(:first-child)"),
          );
        let tableMd = "";
        if (headerRow) {
          const headers = Array.from(headerRow.querySelectorAll("th, td")).map(
            (cell) => processChildren(cell).trim(),
          );
          ((tableMd += `| ${headers.join(" | ")} |\n`),
            (tableMd += `| ${headers.map(() => "---").join(" | ")} |\n`));
        }
        (bodyRows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll("td")).map((cell) =>
            processChildren(cell).trim(),
          );
          tableMd += `| ${cells.join(" | ")} |\n`;
        }),
          (md = tableMd + "\n"));
        break;
      case "IMG":
        md = `![${node.alt || "image"}](${node.src || ""})\n`;
        break;
      case "BR":
        md = "  \n";
    }
    return md;
  }
  function processChildren(parentNode) {
    return parentNode &&
      "object" == typeof parentNode.childNodes &&
      null !== parentNode.childNodes
      ? Array.from(parentNode.childNodes).map(processNode).join("")
      : "";
  }
  return (
    (tempDiv.innerHTML = html),
    tempDiv
      .querySelectorAll(
        "div.code-block-decoration, sources-carousel-inline, sources-carousel, source-footnote",
      )
      .forEach((el) => el.remove()),
    (markdown = processChildren(tempDiv)),
    (markdown = markdown.replace(/\n{3,}/g, "\n\n").trim()),
    markdown
  );
}
function formatConversationHTML(conversationData, theme = "light") {
  const isDarkMode = "dark" === theme,
    bgColor = isDarkMode ? "#131314" : "#FFFFFF",
    textColor = isDarkMode ? "#e8eaed" : "#1f1f1f",
    userMessageBgColor = isDarkMode ? "rgba(255, 255, 255, 0.03)" : "#F7F7F7",
    geminiMessageBgColor = bgColor,
    speakerLabelColor = textColor,
    metadataColor = isDarkMode ? "#9aa0a6" : "#5f6368",
    borderColor = isDarkMode ? "#282829" : "#EFEFEF",
    linkColor = isDarkMode ? "#8ab4f8" : "#1a73e8",
    codeBgColor = isDarkMode ? "#202124" : "#f8f9fa",
    codeTextColor = isDarkMode ? "#e8eaed" : "#1f1f1f",
    codeHeaderBgColor = isDarkMode
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(0,0,0,0.05)",
    codeHeaderTextColor = isDarkMode ? "#bdc1c6" : "#3c4043",
    tableHeaderBg = isDarkMode
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(0,0,0,0.06)",
    inlineCodeBg = isDarkMode
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0,0,0,0.06)";
  let htmlString = `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${exportSettings.fileName || "Gemini Conversation"}</title>\n    <style>\n/* Importación de Google Fonts externa eliminada para evitar problemas CSP del sitio. Se usan fuentes del sistema en su lugar. */\n        html { background-color: ${bgColor}; }\n        body { \n            font-family: 'Google Sans', sans-serif, Arial, sans-serif; \n            margin: 0; \n            padding: 20px; \n            background-color: ${bgColor}; \n            color: ${textColor};\n            font-size: 10pt; /* Tamaño de texto de mensaje predeterminado */\n            line-height: 1.4;  /* Altura de línea de mensaje predeterminada */\n        }\n        .conversation-wrapper { max-width: 800px; margin: 0 auto; }\n        .export-header h1 {\n            font-size: 16pt;\n            font-weight: 500;\n            color: ${textColor};\n            margin-bottom: 4px;\n        }\n        .export-header .timestamp {\n            font-size: 8pt;\n            font-style: italic;\n            color: ${metadataColor};\n            margin-bottom: 16px;\n        }\n        .export-header hr {\n            border: none;\n            border-top: 1px solid ${borderColor};\n            margin-bottom: 16px;\n        }\n        .message-pair { \n            margin-bottom: 16px; \n            border: 1px solid ${borderColor}; \n            border-radius: 8px; \n            overflow: hidden; \n        }\n        .message-part { \n            padding: 8px; /* Relleno reducido */\n        }\n        .message-part.question { background-color: ${userMessageBgColor}; }\n        .message-part.answer { background-color: ${geminiMessageBgColor}; }\n        \n        .speaker-label {\n            font-size: 10pt;\n            font-weight: bold;\n            color: ${speakerLabelColor};\n            margin: 0 0 4px 0; /* Reducir espaciado debajo de la etiqueta */\n        }\n        .content { \n            min-width: 0; \n            word-wrap: break-word; \n            color: inherit; /* Inherits from body or message-part */\n            font-size: 10pt; /* Ensure content text is 10pt */\n            line-height: 1.4; /* Ensure content text line-height */\n        }\n        .content * { max-width: 100%; box-sizing: border-box; }\n        .content p { margin: 0.5em 0; } /* Keep some paragraph spacing */\n        .content ul, .content ol { padding-left: 25px; margin: 0.5em 0; }\n        .content li { margin-bottom: 5px; }\n        .content strong, .content b { font-weight: bold; } /* Standard bold */\n        .content em, .content i { font-style: italic; } /* Standard italic */\n        \n        a { color: ${linkColor}; text-decoration: none; }\n        a:hover { text-decoration: underline; }\n        img { height: auto; border-radius: 4px; margin: 5px 0; }\n        table { width: 100%; border-collapse: collapse; margin: 1em 0; page-break-inside: auto; }\n        th, td { border: 1px solid ${borderColor}; padding: 8px 10px; text-align: left; }\n        th { background-color: ${tableHeaderBg}; font-weight: bold; }\n        \n        code-block { display: block; margin: 1em 0; border-radius: 8px; overflow: hidden; border: 1px solid ${borderColor}; background-color: ${codeBgColor} !important; color: ${codeTextColor} !important; page-break-inside: avoid; }\n        .code-block-decoration { padding: 8px 12px; background-color: ${codeHeaderBgColor}; font-size: 12px; color: ${codeHeaderTextColor}; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${borderColor}; }\n        .code-block-decoration .buttons { display: none; } \n        .formatted-code-block-internal-container { padding: 0; }\n        pre { display: block; background-color: transparent !important; color: inherit !important; padding: 12px 15px; margin: 0; font-family: 'Roboto Mono', monospace; font-size: 9.5pt; /* Slightly smaller for pre */ line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; border: none; page-break-inside: auto; }\n        code { font-family: 'Roboto Mono', monospace; font-size: 0.9em; background-color: ${inlineCodeBg}; padding: 2px 4px; border-radius: 3px; color: inherit; word-break: break-all; }\n        pre code { background-color: transparent !important; padding: 0; font-size: inherit; border-radius: 0; }\n        \n        .hljs-keyword { color: ${isDarkMode ? "#569cd6" : "#a31515"}; font-weight: bold; }\n        .hljs-string { color: ${isDarkMode ? "#ce9178" : "#d69d85"}; }\n        .hljs-number { color: ${isDarkMode ? "#b5cea8" : "#098658"}; }\n        .hljs-comment { color: ${isDarkMode ? "#6A9955" : "#008000"}; font-style: italic; }\n        .hljs-function .hljs-title { color: ${isDarkMode ? "#DCDCAA" : "#795e26"}; }\n        .hljs-params { color: ${isDarkMode ? "#9CDCFE" : "#267f99"}; }\n        .hljs-built_in, .hljs-literal { color: ${isDarkMode ? "#4EC9B0" : "#0000ff"}; }\n        \n        .katex-display { display: block; text-align: center; margin: 1em 0; page-break-inside: avoid; }\n        .katex { font-size: 1.1em; color: inherit; }\n        sources-carousel-inline, sources-carousel, source-footnote { display: none !important; }\n    </style>\n</head>\n<body>\n    <div class="conversation-wrapper">\n        <div class="export-header">\n        <h1>${exportSettings.fileName || "Gemini Conversation"}</h1>\n            <p class="timestamp">Exported on: ${new Date().toLocaleString()}</p>\n            <hr>\n        </div>\n`;
  return (
    conversationData.forEach((item) => {
      if (((htmlString += '<div class="message-pair">\n'), item.question)) {
        let processedQuestion = item.question;
        (window.mathProcessor &&
          window.mathProcessor.isKaTeXAvailable() &&
          (processedQuestion = window.mathProcessor.processMathContent(
            item.question,
          )),
          (htmlString += `    <div class="message-part question">\n        <p class="speaker-label user-label"><strong>User</strong></p>\n        <div class="content">${processedQuestion}</div>\n    </div>\n`));
      }
      if (item.answer) {
        let processedAnswer = item.answer;
        window.mathProcessor &&
          window.mathProcessor.isKaTeXAvailable() &&
          (processedAnswer = window.mathProcessor.processMathContent(
            item.answer,
          ));
        const answerBorderStyle = item.question
          ? `border-top: 1px solid ${borderColor};`
          : "";
        htmlString += `    <div class="message-part answer" style="${answerBorderStyle}">\n        <p class="speaker-label gemini-label"><strong>Gemini</strong></p>\n        <div class="content">${processedAnswer}</div>\n    </div>\n`;
      }
      htmlString += "</div>\n";
    }),
    (htmlString += "\n    </div>\n</body>\n</html>"),
    htmlString
  );
}
function downloadAsHTML(conversationData, baseFilename) {
  const filename = generateFilename(baseFilename, "html");
  let theme = "light";
  (("dark" === exportSettings.pdfTheme ||
    ("auto" === exportSettings.pdfTheme &&
      document.body.classList.contains("dark-theme"))) &&
    (theme = "dark"),
    console.log(`[Gemini Exporter] Exporting HTML with theme: ${theme}`));
  downloadData(
    formatConversationHTML(conversationData, theme),
    filename,
    "text/html;charset=utf-8",
  );
}
function downloadAsMarkdown(conversationData, baseFilename) {
  const filename = generateFilename(baseFilename, "md");
  let markdownContent = `# ${baseFilename || "Gemini Conversation"}\nExported on: ${new Date().toLocaleString()}\n\n---\n\n`;
  (conversationData.forEach((item) => {
    (item.question &&
      (markdownContent += `**You:**\n${convertHtmlToMarkdown(item.question)}\n\n`),
      item.answer &&
        (markdownContent += `**Gemini:**\n${convertHtmlToMarkdown(item.answer)}\n\n`),
      (markdownContent += "---\n\n"));
  }),
    downloadData(markdownContent, filename, "text/markdown;charset=utf-8"));
}
function downloadAsJSON(conversationData, baseFilename) {
  const filename = generateFilename(baseFilename, "json"),
    jsonData = {
      title: baseFilename || "Gemini Conversation",
      exportedAt: new Date().toISOString(),
      conversation: conversationData.map((item) => ({
        question: item.question || null,
        answer: item.answer || null,
      })),
    };
  downloadData(
    JSON.stringify(jsonData, null, 2),
    filename,
    "application/json;charset=utf-8",
  );
}
function downloadAsTXT(conversationData, baseFilename) {
  const filename = generateFilename(baseFilename, "txt");
  let textContent = `${baseFilename || "Gemini Conversation"}\n`;
  ((textContent += `Exported on: ${new Date().toLocaleString()}\n\n`),
    (textContent +=
      "-----------------------------------------------------\n\n"));
  const htmlToText = (html) => {
    if (!html) return "";
    const tempDiv = document.createElement("div");
    return (
      (tempDiv.innerHTML = html),
      tempDiv
        .querySelectorAll(
          ".gemini-export-checkbox-container, style, script, sources-carousel-inline, sources-carousel, source-footnote",
        )
        .forEach((el) => el.remove()),
      (tempDiv.textContent || tempDiv.innerText || "").trim()
    );
  };
  (conversationData.forEach((item) => {
    (item.question &&
      (textContent += `User:\n${htmlToText(item.question)}\n\n`),
      item.answer && (textContent += `Gemini:\n${htmlToText(item.answer)}\n\n`),
      (textContent +=
        "-----------------------------------------------------\n\n"));
  }),
    downloadData(textContent, filename, "text/plain;charset=utf--8"));
}
function downloadAsCSV(conversationData, baseFilename) {
  const filename = generateFilename(baseFilename, "csv"),
    htmlToText = (html) => {
      if (!html) return "";
      const tempDiv = document.createElement("div");
      return (
        (tempDiv.innerHTML = html),
        tempDiv
          .querySelectorAll(
            ".gemini-export-checkbox-container, style, script, sources-carousel-inline, sources-carousel, source-footnote",
          )
          .forEach((el) => el.remove()),
        (tempDiv.textContent || tempDiv.innerText || "").trim()
      );
    },
    escapeCsvCell = (text) => {
      if (null == text) return "";
      let cell = text.toString();
      return (
        (cell = cell.replace(/"/g, '""')),
        (cell.includes(",") || cell.includes("\n") || cell.includes('"')) &&
          (cell = `"${cell}"`),
        cell
      );
    };
  let csvContent = "Timestamp,Speaker,Content\n";
  (conversationData.forEach((item, index) => {
    const timestamp = new Date().toISOString();
    if (item.question) {
      const speaker = "User",
        content = htmlToText(item.question);
      csvContent += `${escapeCsvCell(timestamp)},${escapeCsvCell(speaker)},${escapeCsvCell(content)}\n`;
    }
    if (item.answer) {
      const speaker = "Gemini",
        content = htmlToText(item.answer);
      csvContent += `${escapeCsvCell(timestamp)},${escapeCsvCell(speaker)},${escapeCsvCell(content)}\n`;
    }
  }),
    downloadData(csvContent, filename, "text/csv;charset=utf-8"));
}
function parseColor(colorString) {
  if ("string" != typeof colorString)
    return (
      console.warn(
        "[Gemini Exporter] Invalid colorString input to parseColor:",
        colorString,
      ),
      { r: 0, g: 0, b: 0 }
    );
  if (colorString.startsWith("#")) {
    let hex = colorString.substring(1);
    if (
      (3 === hex.length &&
        (hex = hex
          .split("")
          .map((char) => char + char)
          .join("")),
      6 === hex.length)
    ) {
      const num = parseInt(hex, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: 255 & num };
    }
  } else if (colorString.startsWith("rgb")) {
    const parts = colorString.match(/[\d.]+/g);
    if (parts && parts.length >= 3)
      return {
        r: parseInt(parts[0]),
        g: parseInt(parts[1]),
        b: parseInt(parts[2]),
      };
  }
  return (
    console.warn(
      `[Gemini Exporter] Could not parse color string: "${colorString}". Defaulting to black.`,
    ),
    { r: 0, g: 0, b: 0 }
  );
}
function isCanvasEffectivelyEmpty(
  canvas,
  targetBgColor,
  tolerance = 5,
  sampleDensity = 0.05,
) {
  if (!canvas || "function" != typeof canvas.getContext)
    return (
      console.warn(
        "[Gemini Exporter] Invalid canvas provided to isCanvasEffectivelyEmpty.",
      ),
      !1
    );
  const ctx = canvas.getContext("2d", { willReadFrequently: !0 });
  if (!ctx)
    return (
      console.warn("[Gemini Exporter] Could not get 2D context from canvas."),
      !1
    );
  const width = canvas.width,
    height = canvas.height;
  if (0 === width || 0 === height) return !0;
  try {
    const data = ctx.getImageData(0, 0, width, height).data,
      numPixelsToSample = Math.max(
        1,
        Math.floor(width * height * sampleDensity),
      ),
      totalPixels = width * height,
      step = Math.max(1, Math.floor(totalPixels / numPixelsToSample));
    for (let i = 0; i < totalPixels; i += step) {
      const pixelIndex = 4 * i,
        r = data[pixelIndex],
        g = data[pixelIndex + 1],
        b = data[pixelIndex + 2];
      if (
        Math.abs(r - targetBgColor.r) > tolerance ||
        Math.abs(g - targetBgColor.g) > tolerance ||
        Math.abs(b - targetBgColor.b) > tolerance
      )
        return !1;
    }
  } catch (e) {
    return (
      console.error(
        "[Gemini Exporter] Error reading canvas data for emptiness check:",
        e,
      ),
      !1
    );
  }
  return !0;
}
function getExportButtonElement() {
  const shadowHost = document.querySelector("#gemini-exporter");
  return shadowHost?.shadowRoot?.querySelector("#export-button");
}
function setButtonLoading(button, text = "Generating PDF...") {
  button &&
    ((button.disabled = !0),
    (button.innerHTML = `${loadingSpinnerSVG}<span>${text}</span>`),
    (button.style.cursor = "wait"));
}
function setButtonSuccess(button, text = "Downloaded") {
  button &&
    ((button.disabled = !0),
    (button.innerHTML = `${checkmarkSVG}<span>${text}</span>`),
    (button.style.cursor = "default"));
}
function resetButtonState(button) {
  if (!button) return;
  const isInSelectionMode = !!document.getElementById(
    "gemini-selection-active",
  );
  if (
    ((button.disabled = isInSelectionMode && 0 === selectedMessageCount),
    (button.style.cursor = button.disabled ? "not-allowed" : "pointer"),
    isInSelectionMode)
  ) {
    const buttonText =
      selectedMessageCount > 0
        ? `Save ${selectedMessageCount} as PDF`
        : "Select Messages";
    button.innerHTML = `${defaultIconSVG}<span>${buttonText}</span>`;
  } else button.innerHTML = `${defaultIconSVG}<span>Save Chat</span>`;
}
function createButton() {
  console.log("[Gemini Exporter] Creating button elements");
  const container = document.createElement("div");
  ((container.id = "gemini-exporter"),
    (container.style.display = "flex"),
    (container.style.alignItems = "center"));
  const shadow = container.attachShadow({ mode: "open" });
  console.log("[Gemini Exporter] Shadow DOM created");
  const style = document.createElement("style"),
    isDark = "dark" === getCurrentTheme();
  ((style.textContent = `\n/* Removed external Google Fonts import in shadow DOM to avoid CSP issues. */\n        :host {\n            all: initial; /* Prevent external styles bleeding in */\n            font-family: 'Google Sans', sans-serif;\n            display: flex;\n            align-items: center;\n        }\n        * {\n             font-family: inherit;\n             box-sizing: border-box;\n        }\n        .container {\n            display: flex;\n            align-items: center;\n            gap: 8px;\n        }\n        .save-button, .selection-button {\n            display: inline-flex; /* Use inline-flex for better alignment */\n            align-items: center;\n            justify-content: center;\n            gap: 6px; /* Slightly reduced gap */\n            padding: 6px 12px; /* MODIFIED: Vertical padding reduced */\n            border-radius: 16px;\n            font-size: 14px;\n            font-weight: 500;\n            letter-spacing: 0.15px;\n            cursor: pointer;\n            transition: all 120ms ease-in-out;\n            height: 32px; /* MODIFIED: Height reduced */\n            line-height: 20px; /* Per specs */\n            white-space: nowrap;\n            outline: none; /* Remove default focus outline */\n            background: ${isDark ? "#303134" : "#FFFFFF"}; /* Reverted to #FFFFFF for light mode */\n            color: ${isDark ? "#bdc1c6" : "#5f6368"};\n            border: 1px solid ${isDark ? "#5f6368" : "#DADCE0"};\n        }\n        .save-button:hover:not(:disabled) {\n            background: ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(60, 64, 67, 0.04)"}; /* Light grey hover for light mode */\n            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);\n        }\n        .save-button:active:not(:disabled) {\n            background: ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)"}; /* Darker grey active for light mode */\n        }\n        .save-button:focus:not(:active) {\n            outline: 2px solid #d2e3fc;\n            outline-offset: 2px;\n        }\n        .save-button.active:not(:disabled) { /* Style for when dropdown is open */\n            background: ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)"}; \n        }\n        .save-button:disabled {\n            background: ${isDark ? "#303134" : "#f1f3f4"}; /* Disabled light mode is light grey */\n            color: ${isDark ? "#5f6368" : "#bdc1c6"};\n            cursor: not-allowed;\n            border: 1px solid ${isDark ? "#444547" : "#dadce0"};\n        }\n        .save-button svg {\n            width: 16px;\n            height: 16px;\n            color: currentColor;\n            vertical-align: middle;\n            flex-shrink: 0; /* Prevent icon shrinking */\n        }\n       .save-button span {\n            /* No specific margin needed with inline-flex and gap */\n       }\n       .icon { /* Generic icon class if needed */\n            width: 16px;\n            height: 16px;\n            color: currentColor;\n        }\n       .cancel-button {\n            background: ${isDark ? "#303134" : "#FFFFFF"}; /* Reverted to #FFFFFF for light mode */\n            color: ${isDark ? "#bdc1c6" : "#5f6368"};\n            border: 1px solid ${isDark ? "#5f6368" : "#dadce0"};\n            box-shadow: none;\n        }\n       .cancel-button:hover {\n            background: ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(60, 64, 67, 0.04)"}; /* Light grey hover for light mode */\n            border-color: ${isDark ? "#5f6368" : "#dadce0"};\n        }\n    `),
    shadow.appendChild(style),
    console.log("[Gemini Exporter] Styles added"));
  const wrapper = document.createElement("div");
  wrapper.className = "container";
  const exportButton = document.createElement("button");
  return (
    (exportButton.id = "export-button"),
    (exportButton.className = "save-button"),
    (exportButton.innerHTML = `${defaultIconSVG}<span>Save Chat</span>`),
    exportButton.setAttribute("role", "button"),
    exportButton.setAttribute("aria-label", "Export to PDF"),
    exportButton.setAttribute("tabindex", "0"),
    exportButton.addEventListener("click", (e) => {
      const isInSelectionMode = !!document.getElementById(
          "gemini-selection-active",
        ),
        settingsPopup = document.getElementById(
          "gemini-exporter-settings-popup",
        );
      if (
        (settingsPopup &&
          (settingsPopup.dispatchEvent(new CustomEvent("close-popup")),
          (isSettingsPopupOpen = !1)),
        isInSelectionMode)
      )
        exportButton.disabled
          ? console.log(
              "[Gemini Exporter] Save button clicked in selection mode, but no messages selected.",
            )
          : saveSelectedMessages();
      else {
        showExportDropdown(exportButton.getBoundingClientRect(), exportButton);
      }
      e.stopPropagation();
    }),
    wrapper.appendChild(exportButton),
    shadow.appendChild(wrapper),
    container
  );
}
function injectButton() {
  if (document.querySelector("#gemini-exporter")) {
    console.log(
      "[Gemini Exporter] Button container #gemini-exporter already exists.",
    );
    const existingContainer = document.getElementById("gemini-exporter");
    return void (
      existingContainer && (existingContainer.style.display = "flex")
    );
  }
  console.log(
    "[Gemini Exporter] Attempting to inject button #gemini-exporter...",
  );
  const existingContainerOld = document.querySelector("#gemini-exporter");
  existingContainerOld &&
    (console.log(
      "[Gemini Exporter] Button container (gemini-exporter) already exists. Re-applying theme and state.",
    ),
    existingContainerOld.remove());
  const oldStyles = document.getElementById("gemini-exporter-spacing-styles");
  oldStyles &&
    (oldStyles.remove(),
    console.log("[Gemini Exporter] Removed old spacing styles."));
  const container = createButton(),
    topBarActions = document.querySelector("top-bar-actions");
  if (!topBarActions)
    return void console.log(
      "[Gemini Exporter] Target parent 'top-bar-actions' not found. Button not injected.",
    );
  const studioSidebarLauncher = topBarActions.querySelector(
    ".studio-sidebar-launcher",
  );
  if (studioSidebarLauncher)
    (studioSidebarLauncher.insertAdjacentElement("beforebegin", container),
      (container.style.marginRight = "8px"),
      (container.style.marginTop = "2px"),
      console.log(
        "[Gemini Exporter] Button injected successfully before '.studio-sidebar-launcher'.",
      ));
  else {
    console.log(
      "[Gemini Exporter] '.studio-sidebar-launcher' not found. Using fallback placement.",
    );
    const referenceElement = topBarActions.querySelector(
      ".buttons-container.adv-upsell",
    );
    if (referenceElement)
      (referenceElement.insertAdjacentElement("afterend", container),
        (container.style.marginLeft = "8px"),
        (container.style.marginTop = "2px"),
        console.log(
          "[Gemini Exporter] Button injected successfully after fallback reference element '.buttons-container.adv-upsell'.",
        ));
    else {
      console.log(
        "[Gemini Exporter] Fallback: Target reference element '.buttons-container.adv-upsell' not found. Attempting to append at end.",
      );
      const lastChild = topBarActions.lastElementChild;
      lastChild
        ? (lastChild.insertAdjacentElement("afterend", container),
          (container.style.marginLeft = "8px"),
          (container.style.marginTop = "2px"),
          console.log(
            "[Gemini Exporter] Button injected via fallback (appended after last element in top-bar-actions).",
          ))
        : (topBarActions.appendChild(container),
          (container.style.marginTop = "2px"),
          console.log(
            "[Gemini Exporter] Button injected via fallback (appended to empty top-bar-actions).",
          ));
    }
  }
  (document.getElementById("gemini-selection-active")
    ? enterSelectionMode()
    : resetButtonState(getExportButtonElement()),
    setupMessageObserver(),
    setupGlobalEventListeners());
}
function setupMessageObserver() {
  (console.log("[Gemini Exporter] Setting up message observer."),
    chatObserver &&
      (chatObserver.disconnect(),
      console.log("[Gemini Exporter] Disconnected previous observer.")),
    (chatObserver = new MutationObserver((mutations) => {
      let shouldUpdateCheckboxes = !1;
      !!document.getElementById("gemini-selection-active") &&
        (mutations.forEach((mutation) => {
          mutation.addedNodes.length &&
            mutation.addedNodes.forEach((node) => {
              1 === node.nodeType &&
                (node.matches?.("div.conversation-container") ||
                  node.querySelector?.(
                    "div.conversation-container, message-content, user-query-content",
                  )) &&
                (shouldUpdateCheckboxes = !0);
            });
        }),
        shouldUpdateCheckboxes &&
          (console.log(
            "[Gemini Exporter] New messages detected or structure changed in selection mode, re-injecting checkboxes.",
          ),
          setTimeout(() => {
            document.getElementById("gemini-selection-active") &&
              injectMessageCheckboxes();
          }, 100)));
    })));
  const chatArea = document.querySelector("main"),
    observerTarget = chatArea || document.body;
  (chatArea ||
    console.warn(
      "[Gemini Exporter] 'main' element not found, observing document.body for message changes. This might be less efficient.",
    ),
    chatObserver.observe(observerTarget, { childList: !0, subtree: !0 }),
    console.log(
      "[Gemini Exporter] Message observer attached to:",
      observerTarget.tagName,
    ));
}
function injectMessageCheckboxes() {
  (console.log("[Gemini Exporter] Injecting message selection checkboxes."),
    (selectedMessageCount = 0),
    document
      .querySelectorAll(".gemini-export-checkbox-container")
      .forEach((el) => el.remove()),
    document
      .querySelectorAll(".message-highlighted")
      .forEach((el) => el.classList.remove("message-highlighted")),
    document
      .querySelectorAll(".message-container-for-select")
      .forEach((el) => el.classList.remove("message-container-for-select")),
    console.log(
      "[Gemini Exporter] Cleaned up existing checkboxes and highlights.",
    ));
  let selectionStyles = document.getElementById("gemini-selection-styles");
  if (!selectionStyles) {
    ((selectionStyles = document.createElement("style")),
      (selectionStyles.id = "gemini-selection-styles"),
      (selectionStyles.textContent =
        "\n            .message-container-for-select {\n                position: relative; /* Needed for absolute positioning of checkbox */\n                transition: background-color 0.2s ease;\n                border-radius: 8px; /* Add radius for better visual on hover/highlight */\n                /* outline: 1px dashed transparent; /* Optional: subtle indicator */\n                /* outline-offset: -2px; */\n            }\n            .message-container-for-select:hover {\n                background-color: rgba(26, 115, 232, 0.04); /* Light blue hover */\n                 /* outline-color: rgba(26, 115, 232, 0.2); /* Optional */\n            }\n            .message-highlighted { /* Style for *selected* messages */\n                background-color: rgba(232, 240, 254, 0.7) !important; /* More prominent blue highlight */\n                 /* outline-color: rgba(26, 115, 232, 0.5) !important; /* Optional */\n            }\n            .gemini-export-checkbox-container {\n                position: absolute;\n                z-index: 100;\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                width: 32px; /* Slightly larger touch target */\n                height: 32px;\n                right: 8px;  /* Position top-right */\n                top: 8px;\n                cursor: pointer;\n                opacity: 0; /* Hidden by default */\n                transition: opacity 0.2s ease;\n                background-color: rgba(255, 255, 255, 0.7); /* Semi-transparent background */\n                border-radius: 50%; /* Circular background */\n                backdrop-filter: blur(2px); /* Optional: blur effect */\n            }\n            /* Show checkbox container on hover OR when the message is selected */\n            .message-container-for-select:hover .gemini-export-checkbox-container,\n            .message-highlighted .gemini-export-checkbox-container {\n                opacity: 1;\n            }\n            .gemini-export-checkbox { /* The actual checkbox input */\n                position: absolute;\n                opacity: 0; /* Hide the native checkbox */\n                width: 0;\n                height: 0;\n                cursor: pointer; /* Cursor should be on the container/label */\n            }\n            .gemini-checkbox-custom { /* The visible styled checkbox */\n                display: inline-flex;\n                align-items: center;\n                justify-content: center;\n                width: 20px;\n                height: 20px;\n                border: 2px solid #7f8c8d; /* Grey border */\n                border-radius: 4px;\n                background: #fff;\n                transition: all 0.2s ease;\n                pointer-events: none; /* Click is handled by label container */\n            }\n            .gemini-export-checkbox:checked + .gemini-checkbox-custom {\n                background: #1a73e8; /* Blue when checked */\n                border-color: #1a73e8;\n            }\n            /* Checkmark style */\n            .gemini-export-checkbox:checked + .gemini-checkbox-custom::after {\n                content: '';\n                display: block;\n                width: 5px;\n                height: 10px;\n                border: solid white;\n                border-width: 0 2.5px 2.5px 0;\n                transform: rotate(45deg) translate(-1px, -1px); /* Position checkmark */\n            }\n            /* Tooltip Style */\n            .gemini-selection-tooltip {\n                position: fixed;\n                bottom: 20px;\n                left: 50%;\n                transform: translateX(-50%);\n                background: rgba(0,0,0,0.8);\n                color: white;\n                padding: 8px 16px;\n                border-radius: 6px;\n                box-shadow: 0 2px 6px rgba(0,0,0,0.15);\n                font-size: 13px;\n                white-space: nowrap;\n                z-index: 11000; /* High z-index */\n                animation: fadeOutTooltip 3s 1s forwards; /* Fade out after 1s, takes 3s */\n                pointer-events: none; /* Don't block clicks */\n            }\n            @keyframes fadeOutTooltip {\n                0% { opacity: 1; }\n                90% { opacity: 1; } /* Stay visible for a while */\n                100% { opacity: 0; visibility: hidden; }\n            }\n        "),
      document.head.appendChild(selectionStyles),
      console.log("[Gemini Exporter] Added selection styles to head."));
    let tooltip = document.querySelector(".gemini-selection-tooltip");
    tooltip ||
      ((tooltip = document.createElement("div")),
      (tooltip.className = "gemini-selection-tooltip"),
      (tooltip.textContent =
        "Click checkboxes to select messages for PDF export."),
      document.body.appendChild(tooltip),
      tooltip.addEventListener("animationend", () => tooltip.remove()));
  }
  const scroller = getScrollHost();
  if (!scroller)
    return void console.error(
      "[Gemini Exporter] Scroller not found during checkbox injection.",
    );
  const conversationContainers = scroller.querySelectorAll(
    "div.conversation-container",
  );
  (console.log(
    `[Gemini Exporter] Found ${conversationContainers.length} conversation containers for checkboxes within scroller.`,
  ),
    conversationContainers.forEach((container, index) => {
      container.classList.add("message-container-for-select");
      const userQuery = container.querySelector("user-query"),
        messageContent = container.querySelector("message-content");
      (userQuery && attachCheckbox(userQuery, index, "user"),
        messageContent && attachCheckbox(messageContent, index, "gemini"));
    }),
    updateSelectionCounter());
}
function attachCheckbox(parentElement, index, type) {
  "static" === getComputedStyle(parentElement).position &&
    (parentElement.style.position = "relative");
  const checkboxId = `gemini-export-${type}-${index}`;
  if (parentElement.querySelector(`#${checkboxId}`)) {
    console.warn(
      `[Gemini Exporter] Checkbox already exists for ${type}-${index}, ensuring state.`,
    );
    return void (parentElement.querySelector(`#${checkboxId}`).checked
      ? parentElement.classList.add("message-highlighted")
      : parentElement.classList.remove("message-highlighted"));
  }
  const checkboxContainer = document.createElement("label");
  ((checkboxContainer.className = "gemini-export-checkbox-container"),
    (checkboxContainer.htmlFor = checkboxId));
  const checkbox = document.createElement("input");
  ((checkbox.type = "checkbox"),
    (checkbox.checked = !1),
    (checkbox.id = checkboxId),
    (checkbox.className = "gemini-export-checkbox"),
    (checkbox.dataset.messageIndex = index),
    (checkbox.dataset.messageType = type));
  const customCheckbox = document.createElement("span");
  ((customCheckbox.className = "gemini-checkbox-custom"),
    checkboxContainer.appendChild(checkbox),
    checkboxContainer.appendChild(customCheckbox),
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
  const exportButton = getExportButtonElement();
  if (!exportButton) return;
  if (!!document.getElementById("gemini-selection-active")) {
    const currentFormat = exportSettings.format.toUpperCase();
    exportButton.disabled = 0 === selectedMessageCount;
    const buttonText =
        selectedMessageCount > 0
          ? `Save ${selectedMessageCount} as ${currentFormat}`
          : "Select Messages",
      buttonTitle =
        selectedMessageCount > 0
          ? `Click to save ${selectedMessageCount} selected message${1 !== selectedMessageCount ? "s" : ""} as ${currentFormat}`
          : "Select messages using checkboxes first";
    ("wait" !== exportButton.style.cursor &&
      "default" !== exportButton.style.cursor &&
      ((exportButton.innerHTML = `${defaultIconSVG}<span>${buttonText}</span>`),
      (exportButton.style.cursor = exportButton.disabled
        ? "not-allowed"
        : "pointer")),
      (exportButton.title = buttonTitle));
  } else
    "wait" !== exportButton.style.cursor &&
      "default" !== exportButton.style.cursor &&
      (resetButtonState(exportButton), (exportButton.title = ""));
}
function exitSelectionMode() {
  (console.log("[Gemini Exporter] Exiting selection mode."),
    document.querySelectorAll(".message-highlighted").forEach((el) => {
      el.classList.remove("message-highlighted");
    }),
    document
      .querySelectorAll(".gemini-export-checkbox-container")
      .forEach((container) => {
        container.remove();
      }),
    document.querySelectorAll(".message-container-for-select").forEach((el) => {
      (el.classList.remove("message-container-for-select"),
        "relative" === el.style.position && (el.style.position = ""));
    }));
  const marker = document.getElementById("gemini-selection-active");
  marker && marker.remove();
  const selectionStyles = document.getElementById("gemini-selection-styles");
  selectionStyles && selectionStyles.remove();
  const tooltip = document.querySelector(".gemini-selection-tooltip");
  tooltip && tooltip.remove();
  const shadowHost = document.querySelector("#gemini-exporter");
  if (shadowHost && shadowHost.shadowRoot) {
    const cancelButton = shadowHost.shadowRoot.querySelector(
      "#gemini-cancel-selection-btn",
    );
    cancelButton && cancelButton.remove();
    (resetButtonState(getExportButtonElement()),
      console.log("[Gemini Exporter] Restored normal button state."));
  } else
    console.warn(
      "[Gemini Exporter] Could not restore normal button state (shadow host missing).",
    );
  selectedMessageCount = 0;
}
function enterSelectionMode() {
  if (
    (console.log("[Gemini Exporter] Entering selection mode."),
    !document.getElementById("gemini-selection-active"))
  ) {
    const marker = document.createElement("div");
    ((marker.id = "gemini-selection-active"),
      (marker.style.display = "none"),
      document.body.appendChild(marker));
  }
  const shadowHost = document.querySelector("#gemini-exporter");
  if (!shadowHost || !shadowHost.shadowRoot)
    return void console.error(
      "[Gemini Exporter] Cannot enter selection mode: Shadow host not found.",
    );
  const shadow = shadowHost.shadowRoot,
    wrapper = shadow.querySelector(".container");
  if (!wrapper)
    return void console.error(
      "[Gemini Exporter] Cannot enter selection mode: Wrapper container not found in shadow DOM.",
    );
  const exportButtonEl = getExportButtonElement();
  if (
    (exportButtonEl
      ? ((exportButtonEl.innerHTML = `${defaultIconSVG}<span>Select Messages</span>`),
        (exportButtonEl.disabled = !0),
        (exportButtonEl.title = "Select messages using checkboxes first"),
        (exportButtonEl.style.cursor = "not-allowed"))
      : console.warn(
          "[Gemini Exporter] Export button not found in shadow DOM when trying to enter selection mode.",
        ),
    shadow.querySelector("#gemini-cancel-selection-btn"))
  )
    console.log("[Gemini Exporter] Cancel button already exists.");
  else {
    const cancelButton = document.createElement("button");
    ((cancelButton.id = "gemini-cancel-selection-btn"),
      (cancelButton.className = "selection-button cancel-button"),
      (cancelButton.textContent = "Cancel Selection"),
      (cancelButton.style.marginLeft = "8px"),
      cancelButton.addEventListener("click", (e) => {
        (exitSelectionMode(), e.stopPropagation());
      }),
      exportButtonEl && exportButtonEl.parentNode === wrapper
        ? exportButtonEl.insertAdjacentElement("afterend", cancelButton)
        : wrapper.appendChild(cancelButton),
      console.log("[Gemini Exporter] Cancel button added for selection mode."));
  }
  injectMessageCheckboxes();
}
function extractSelectedElementsHTML() {
  console.log("[Gemini Exporter] Extracting selected page elements...");
  const selectedMessages = [],
    scroller = getScrollHost();
  if (!scroller)
    return (
      console.error(
        "[Gemini Exporter] Scroller not found during selection extraction.",
      ),
      selectedMessages
    );
  const allConversationContainers = scroller.querySelectorAll(
    "div.conversation-container",
  );
  return (
    console.log(
      `[Gemini Exporter] Checking ${allConversationContainers.length} containers for selected messages.`,
    ),
    allConversationContainers.forEach((container) => {
      const userQuery = container.querySelector("user-query"),
        messageContent = container.querySelector("message-content");
      let questionHTML = "",
        answerHTML = "";
      const userCheckbox = userQuery?.querySelector(".gemini-export-checkbox");
      if (userCheckbox && userCheckbox.checked) {
        const userTextElements = userQuery.querySelectorAll(".query-text-line");
        questionHTML =
          userTextElements && userTextElements.length > 0
            ? Array.from(userTextElements)
                .map((el) => el.innerHTML.trim())
                .join(" ")
            : userQuery.querySelector("user-query-content")?.innerHTML.trim() ||
              "";
        const tempQ = document.createElement("div");
        ((tempQ.innerHTML = questionHTML),
          tempQ
            .querySelectorAll(".gemini-export-checkbox-container")
            .forEach((el) => el.remove()),
          (questionHTML = tempQ.innerHTML));
      }
      const messageCheckbox = messageContent?.querySelector(
        ".gemini-export-checkbox",
      );
      if (messageCheckbox && messageCheckbox.checked) {
        const geminiOutputElement = messageContent.querySelector(
          ".markdown-main-panel, .output-content .markdown, .output-content",
        );
        answerHTML = geminiOutputElement
          ? geminiOutputElement.innerHTML.trim()
          : "";
        const tempA = document.createElement("div");
        ((tempA.innerHTML = answerHTML),
          tempA
            .querySelectorAll(".gemini-export-checkbox-container")
            .forEach((el) => el.remove()),
          (answerHTML = tempA.innerHTML));
      }
      (questionHTML || answerHTML) &&
        selectedMessages.push({
          question: questionHTML || null,
          answer: answerHTML || null,
        });
    }),
    console.log(
      `[Gemini Exporter] Processed ${selectedMessages.length} selected message pairs.`,
    ),
    selectedMessages
  );
}
function isPdfMakeAvailable() {
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
function sanitizeHtmlForPdf(htmlString, skipMathProcessing = !1) {
  if (!htmlString) return "";
  try {
    let processedHtml = htmlString;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = processedHtml;
    return (
      [
        "sources-carousel-inline",
        "sources-carousel",
        "source-footnote",
        ".code-block-decoration .buttons",
        ".gemini-export-checkbox-container",
      ].forEach((selector) => {
        tempDiv.querySelectorAll(selector).forEach((el) => el.remove());
      }),
      tempDiv.querySelectorAll("code-block").forEach((cb) => {
        const pre = cb.querySelector("pre");
        if (pre) {
          const wrapper = document.createElement("div");
          (wrapper.appendChild(pre.cloneNode(!0)), cb.replaceWith(wrapper));
        } else cb.replaceWith(cb.textContent || "");
      }),
      tempDiv
        .querySelectorAll("[jslog]")
        .forEach((el) => el.removeAttribute("jslog")),
      tempDiv.innerHTML
    );
  } catch (e) {
    return (debugLog("sanitizeHtmlForPdf error:", e), htmlString);
  }
}
async function imageUrlToDataURLViaCanvas(
  url,
  mime = "image/jpeg",
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
            const canvas = document.createElement("canvas");
            ((canvas.width = img.naturalWidth || img.width),
              (canvas.height = img.naturalHeight || img.height));
            const ctx = canvas.getContext("2d");
            if (!ctx || 0 === canvas.width || 0 === canvas.height)
              return void resolve(null);
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL(mime, quality);
            resolve(dataUrl);
          } catch (e) {
            (debugLog("Canvas toDataURL failed for image:", url, e),
              resolve(null));
          }
        }),
        (img.onerror = () => resolve(null)),
        (img.src = url));
    } catch (e) {
      (debugLog("imageUrlToDataURLViaCanvas error:", url, e), resolve(null));
    }
  });
}
async function urlToDataURL(url) {
  try {
    const resp = await fetch(url, {
      credentials: "omit",
      cache: "force-cache",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      ((reader.onloadend = () => resolve(reader.result)),
        (reader.onerror = reject),
        reader.readAsDataURL(blob));
    });
  } catch (e) {
    return (debugLog("Failed to inline image via fetch:", url, e), null);
  }
}
async function sanitizeHtmlForPdfAsync(htmlString) {
  if (!htmlString) return "";
  const processedHtml = processMathForPdfMake(htmlString),
    tempDiv = document.createElement("div");
  tempDiv.innerHTML = sanitizeHtmlForPdf(processedHtml);
  const imgNodes = Array.from(tempDiv.querySelectorAll("img"));
  return (
    await Promise.all(
      imgNodes.map(async (img) => {
        const orig = (img.getAttribute("src") || "").trim();
        if (!orig) return;
        if (orig.startsWith("data:")) return;
        if (orig.startsWith("blob:") || orig.startsWith("chrome-extension:")) {
          const altText = (img.getAttribute("alt") || "").trim(),
            placeholder = document.createElement("div");
          placeholder.className = "export-image-placeholder";
          const sourceLabel = orig.startsWith("blob:")
            ? "local blob"
            : "extension resource";
          return (
            (placeholder.textContent = `Image not included in PDF (source: ${sourceLabel})${altText ? ` — ${altText}` : ""}`),
            void img.replaceWith(placeholder)
          );
        }
        const candidates = [orig];
        try {
          const u = new URL(orig);
          u.searchParams.has("authuser") &&
            (u.searchParams.delete("authuser"), candidates.push(u.toString()));
        } catch (_) {}
        let dataUrl = null;
        for (const tryUrl of candidates)
          if (
            ((dataUrl = await imageUrlToDataURLViaCanvas(
              tryUrl,
              "image/jpeg",
              0.92,
            )),
            dataUrl || (dataUrl = await urlToDataURL(tryUrl)),
            dataUrl)
          )
            break;
        if (dataUrl) img.setAttribute("src", dataUrl);
        else {
          const altText = (img.getAttribute("alt") || "").trim();
          let domain = "";
          try {
            domain = new URL(orig).hostname;
          } catch (_) {}
          const placeholder = document.createElement("div");
          ((placeholder.className = "export-image-placeholder"),
            (placeholder.textContent = `Image not included in PDF${domain ? ` (protected source: ${domain})` : ""}${altText ? ` — ${altText}` : ""}`),
            img.replaceWith(placeholder));
        }
      }),
    ),
    tempDiv.innerHTML
  );
}
function processMathForPdfMake(html) {
  if (!html) return html;
  const tempDiv = document.createElement("div");
  ((tempDiv.innerHTML = html),
    tempDiv.querySelectorAll(".katex").forEach((el) => {
      const annotation = el.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      if (annotation && annotation.textContent) {
        const latex = annotation.textContent.trim(),
          span = document.createElement("span");
        ((span.style.fontFamily = "monospace"),
          (span.textContent = latex),
          el.replaceWith(span));
      } else el.replaceWith(el.textContent || "");
    }),
    tempDiv.querySelectorAll('img[src^="data:image/svg"]').forEach((img) => {
      const alt = img.getAttribute("alt") || "";
      if (alt) {
        const span = document.createElement("span");
        ((span.textContent = alt), img.replaceWith(span));
      } else img.remove();
    }));
  let processed = tempDiv.innerHTML;
  return (
    (processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) =>
      createMathText(math.trim(), !0),
    )),
    (processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) =>
      createMathText(math.trim(), !0),
    )),
    (processed = processed.replace(
      /(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g,
      (match, math) => createMathText(math.trim(), !1),
    )),
    (processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) =>
      createMathText(math.trim(), !1),
    )),
    processed
  );
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
async function buildPdfMakeDocDefinition(conversationData) {
  let pdfTheme = "light";
  ("dark" === exportSettings.pdfTheme ||
    ("auto" === exportSettings.pdfTheme &&
      document.body.classList.contains("dark-theme"))) &&
    (pdfTheme = "dark");
  const isDark = "dark" === pdfTheme,
    styles = {
      header: {
        fontSize: 16,
        bold: !0,
        margin: [0, 0, 0, 6],
        color: isDark ? "#e8eaed" : "#1f1f1f",
      },
      timestamp: {
        fontSize: 9,
        italics: !0,
        color: isDark ? "#9aa0a6" : "#5f6368",
        margin: [0, 0, 0, 10],
      },
      speaker: {
        fontSize: 10,
        bold: !0,
        color: isDark ? "#e8eaed" : "#1f1f1f",
        margin: [0, 6, 0, 2],
      },
      paragraph: { fontSize: 10, color: isDark ? "#e8eaed" : "#1f1f1f" },
      code: {
        fontSize: 9,
        color: isDark ? "#e8eaed" : "#1f1f1f",
        margin: [0, 2, 0, 6],
      },
      tableHeader: { bold: !0, fillColor: isDark ? "#2a2b2c" : "#f1f3f4" },
    },
    defaultStyle = { fontSize: 10, color: isDark ? "#e8eaed" : "#1f1f1f" },
    content = [];
  (content.push({
    text: exportSettings.fileName || "Gemini Conversation",
    style: "header",
  }),
    content.push({
      text: `Exported on: ${new Date().toLocaleString()}`,
      style: "timestamp",
    }));
  for (const item of conversationData) {
    if (item.question) {
      content.push({ text: "User", style: "speaker" });
      const qHtml = await sanitizeHtmlForPdfAsync(item.question);
      try {
        const qNodes = htmlToPdfmake(qHtml, {
          defaultStyles: { tableHeader: styles.tableHeader },
        });
        Array.isArray(qNodes) ? content.push(...qNodes) : content.push(qNodes);
      } catch (e) {
        content.push({
          text: qHtml.replace(/<[^>]+>/g, ""),
          style: "paragraph",
        });
      }
    }
    if (item.answer) {
      content.push({ text: "Gemini", style: "speaker" });
      const aHtml = await sanitizeHtmlForPdfAsync(item.answer);
      try {
        const aNodes = htmlToPdfmake(aHtml, {
          defaultStyles: { tableHeader: styles.tableHeader },
        });
        Array.isArray(aNodes) ? content.push(...aNodes) : content.push(aNodes);
      } catch (e) {
        content.push({
          text: aHtml.replace(/<[^>]+>/g, ""),
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
    defaultStyle: defaultStyle,
  };
}
async function generatePDFWithPdfMake(conversationData) {
  if (
    (console.log(
      "[Gemini Exporter] Using pdfMake for PDF generation (no fallback).",
    ),
    !isPdfMakeAvailable())
  ) {
    const msg =
      "pdfMake/html-to-pdfmake not found. Please include pdfmake.min.js (with vfs_fonts) and html-to-pdfmake.min.js in the extension.";
    throw (console.error("[Gemini Exporter]", msg), alert(msg), new Error(msg));
  }
  try {
    const docDefinition = await buildPdfMakeDocDefinition(conversationData),
      fileName = generateFilename(exportSettings.fileName, "pdf");
    await new Promise((resolve) => {
      pdfMake.createPdf(docDefinition).download(fileName, () => resolve());
    });
  } catch (e) {
    throw (
      console.error("[Gemini Exporter] pdfMake generation failed:", e),
      alert(`PDF generation failed: ${e?.message || e}`),
      e
    );
  }
}
function generatePDF(conversationData) {
  (console.log("[Gemini Exporter] === PDF GENERATION DIAGNOSTICS ==="),
    console.log("[Gemini Exporter] Browser:", navigator.userAgent),
    console.log(
      "[Gemini Exporter] Conversation data length:",
      conversationData.length,
    ),
    console.log("[Gemini Exporter] Export settings:", exportSettings),
    console.log("[Gemini Exporter] Document ready state:", document.readyState),
    console.log(
      "[Gemini Exporter] Fonts API available:",
      !(!document.fonts || !document.fonts.ready),
    ),
    console.log(
      "[Gemini Exporter] html2pdf available:",
      "undefined" != typeof html2pdf,
    ));
  let pdfTheme = "light";
  ("dark" === exportSettings.pdfTheme ||
    ("auto" === exportSettings.pdfTheme &&
      document.body.classList.contains("dark-theme"))) &&
    (pdfTheme = "dark");
  const isDarkMode = "dark" === pdfTheme;
  console.log(
    `[Gemini Exporter] PDF Theme determined as: ${pdfTheme} (isDarkMode: ${isDarkMode})`,
  );
  const bgColor = isDarkMode ? "#131314" : "#FFFFFF",
    textColor = isDarkMode ? "#e8eaed" : "#1f1f1f",
    userMessageBgColor = isDarkMode ? "rgba(255, 255, 255, 0.03)" : "#F7F7F7",
    geminiMessageBgColor = bgColor,
    speakerLabelColor = textColor,
    metadataColor = isDarkMode ? "#9aa0a6" : "#5f6368",
    borderColor = isDarkMode ? "#282829" : "#EFEFEF",
    linkColor = isDarkMode ? "#8ab4f8" : "#1a73e8",
    codeBgColor = isDarkMode ? "#202124" : "#f8f9fa",
    codeTextColor = isDarkMode ? "#e8eaed" : "#1f1f1f",
    codeHeaderBgColor = isDarkMode
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(0,0,0,0.05)",
    codeHeaderTextColor = isDarkMode ? "#bdc1c6" : "#3c4043",
    tableHeaderBg = isDarkMode
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(0,0,0,0.06)",
    inlineCodeBg = isDarkMode
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0,0,0,0.06)",
    hljsKeywordColor = isDarkMode ? "#569cd6" : "#a31515",
    hljsStringColor = isDarkMode ? "#ce9178" : "#d69d85",
    hljsNumberColor = isDarkMode ? "#b5cea8" : "#098658",
    hljsCommentColor = isDarkMode ? "#6A9955" : "#008000",
    hljsFuncTitleColor = isDarkMode ? "#DCDCAA" : "#795e26",
    hljsParamsColor = isDarkMode ? "#9CDCFE" : "#267f99",
    hljsBuiltInColor = isDarkMode ? "#4EC9B0" : "#0000ff";
  return (
    console.log(
      `[Gemini Exporter] Starting PDF generation process (Theme: ${pdfTheme})`,
    ),
    new Promise((resolve, reject) => {
      if ("undefined" == typeof html2pdf) {
        const errorMsg =
          "Error: PDF generation library (html2pdf) is not available. Please wait a moment or reload the page.";
        return (
          console.error("[Gemini Exporter] html2pdf library not loaded!"),
          alert(errorMsg),
          void reject(new Error(errorMsg))
        );
      }
      const pdfRenderContainer = document.createElement("div");
      ((pdfRenderContainer.style.position = "fixed"),
        (pdfRenderContainer.style.top = "0"),
        (pdfRenderContainer.style.left = "0"),
        (pdfRenderContainer.style.width = "100%"),
        (pdfRenderContainer.style.height = "100%"),
        (pdfRenderContainer.style.visibility = "hidden"),
        (pdfRenderContainer.style.pointerEvents = "none"),
        (pdfRenderContainer.style.overflow = "auto"),
        (pdfRenderContainer.style.zIndex = "99999"),
        (pdfRenderContainer.style.backgroundColor = bgColor),
        (pdfRenderContainer.style.color = textColor),
        (pdfRenderContainer.style.fontFamily =
          "'Google Sans', sans-serif, Arial, sans-serif"),
        (pdfRenderContainer.style.fontSize = "10pt"),
        (pdfRenderContainer.style.lineHeight = "1.4"));
      console.log("[Gemini Exporter] Using PDF internal padding: 20pt");
      const styleElement = document.createElement("style");
      ((styleElement.textContent = `\n            /* Removed external font import to avoid CSP. Use system monospace fallback. */\n            .pdf-render-wrapper * { box-sizing: border-box; font-family: inherit; color: inherit; line-height: inherit; }\n            .pdf-render-wrapper {\n                background-color: ${bgColor} !important; \n                color: ${textColor} !important;\n                font-size: 10pt; \n                line-height: 1.4;\n                padding: 20pt;\n                margin: 0; width: 100%; box-sizing: border-box;\n            }\n            .pdf-render-wrapper .export-header h1 {\n                font-size: 16pt;\n                font-weight: 500;\n                color: ${textColor};\n                margin-bottom: 4px;\n            }\n            .pdf-render-wrapper .export-header .timestamp {\n                font-size: 8pt;\n                font-style: italic;\n                color: ${metadataColor};\n                margin-bottom: 16px;\n            }\n            .pdf-render-wrapper .export-header hr {\n                border: none;\n                border-top: 1px solid ${borderColor};\n                margin-bottom: 16px;\n            }\n            .pdf-render-wrapper .message-pair { \n                margin-bottom: 16px; \n                page-break-inside: avoid; \n                border: 1px solid ${borderColor}; \n                border-radius: 6pt; /* Slightly smaller radius for PDF */ \n                overflow: hidden; \n            }\n            .pdf-render-wrapper .message-part { \n                padding: 8pt; /* Tightened padding for PDF */\n            }\n            .pdf-render-wrapper .message-part.question { background-color: ${userMessageBgColor}; }\n            .pdf-render-wrapper .message-part.answer { background-color: ${geminiMessageBgColor}; }\n            \n            .pdf-render-wrapper .speaker-label {\n                font-size: 10pt;\n                font-weight: bold;\n                color: ${speakerLabelColor};\n                margin: 0 0 4pt 0;\n            }\n            .pdf-render-wrapper .content { \n                min-width: 0; word-wrap: break-word; \n                font-size: 10pt; \n                line-height: 1.4; \n            }\n            .pdf-render-wrapper .content * { max-width: 100%; box-sizing: border-box; }\n            .pdf-render-wrapper .content p { margin: 0.5em 0; }\n            .pdf-render-wrapper .content ul, .pdf-render-wrapper .content ol { padding-left: 20pt; margin: 0.5em 0; }\n            .pdf-render-wrapper .content li { margin-bottom: 4pt; }\n            .pdf-render-wrapper .content strong, .pdf-render-wrapper .content b { font-weight: bold; }\n            .pdf-render-wrapper .content em, .pdf-render-wrapper .content i { font-style: italic; }\n            .pdf-render-wrapper a { color: ${linkColor}; text-decoration: none; word-break: break-all; }\n            .pdf-render-wrapper img { max-width: 100%; height: auto; border-radius: 3pt; margin: 4pt 0; }\n            .pdf-render-wrapper table { width: 100%; border-collapse: collapse; margin: 1em 0; page-break-inside: auto; }\n            .pdf-render-wrapper th, .pdf-render-wrapper td { border: 1px solid ${borderColor}; padding: 6pt 8pt; text-align: left; }\n            .pdf-render-wrapper th { background-color: ${tableHeaderBg}; font-weight: bold; }\n            .pdf-render-wrapper code-block { display: block; margin: 1em 0; border-radius: 6pt; overflow: hidden; border: 1px solid ${borderColor}; background-color: ${codeBgColor} !important; color: ${codeTextColor} !important; page-break-inside: avoid; }\n            .pdf-render-wrapper .code-block-decoration { padding: 6pt 9pt; background-color: ${codeHeaderBgColor}; font-size: 9pt; color: ${codeHeaderTextColor}; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${borderColor}; }\n            .pdf-render-wrapper .code-block-decoration .buttons { display: none; }\n            .pdf-render-wrapper .formatted-code-block-internal-container { padding: 0; }\n            .pdf-render-wrapper pre { display: block; background-color: transparent !important; color: inherit !important; padding: 9pt 12pt; margin: 0; font-family: 'Roboto Mono', monospace; font-size: 9.5pt; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; border: none; page-break-inside: auto; }\n            .pdf-render-wrapper code { font-family: 'Roboto Mono', monospace; font-size: 0.9em; background-color: ${inlineCodeBg}; padding: 1pt 3pt; border-radius: 3pt; color: inherit; word-break: break-all; }\n            .pdf-render-wrapper pre code { background-color: transparent !important; padding: 0; font-size: inherit; border-radius: 0; }\n            .pdf-render-wrapper .hljs-keyword { color: ${hljsKeywordColor}; font-weight: bold; }\n            .pdf-render-wrapper .hljs-string { color: ${hljsStringColor}; }\n            .pdf-render-wrapper .hljs-number { color: ${hljsNumberColor}; }\n            .pdf-render-wrapper .hljs-comment { color: ${hljsCommentColor}; font-style: italic; }\n            .pdf-render-wrapper .hljs-function .hljs-title { color: ${hljsFuncTitleColor}; }\n            .pdf-render-wrapper .hljs-params { color: ${hljsParamsColor}; }\n            .pdf-render-wrapper .hljs-built_in, .pdf-render-wrapper .hljs-literal { color: ${hljsBuiltInColor}; }\n            .pdf-render-wrapper .katex-display { display: block; text-align: center; margin: 1em 0; page-break-inside: avoid; }\n            .pdf-render-wrapper .katex { font-size: 1.1em; color: inherit; }\n            .pdf-render-wrapper sources-carousel-inline, .pdf-render-wrapper sources-carousel, .pdf-render-wrapper source-footnote { display: none !important; }\n        `),
        pdfRenderContainer.appendChild(styleElement));
      const contentWrapper = document.createElement("div");
      ((contentWrapper.className = "pdf-render-wrapper"),
        pdfRenderContainer.appendChild(contentWrapper));
      const cleanHtmlContent = (htmlString) => {
          if (!htmlString) return "";
          try {
            let processedHtml = htmlString;
            window.mathProcessor &&
              window.mathProcessor.isKaTeXAvailable() &&
              ((processedHtml =
                window.mathProcessor.processMathContent(htmlString)),
              console.log(
                "[Gemini Exporter] Math content processed for PDF rendering",
              ));
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = processedHtml;
            return (
              [
                "sources-carousel-inline",
                "sources-carousel",
                "source-footnote",
                ".code-block-decoration .buttons",
                ".gemini-export-checkbox-container",
              ].forEach((selector) => {
                tempDiv.querySelectorAll(selector).forEach((el) => el.remove());
              }),
              tempDiv
                .querySelectorAll("[jslog]")
                .forEach((el) => el.removeAttribute("jslog")),
              tempDiv.querySelectorAll("*").forEach((el) => {
                el.hasAttribute("style") && el.removeAttribute("style");
              }),
              tempDiv.innerHTML
            );
          } catch (e) {
            return (
              console.error(
                "[Gemini Exporter] Error cleaning HTML content:",
                e,
              ),
              htmlString
            );
          }
        },
        headerDiv = document.createElement("div");
      headerDiv.className = "export-header";
      const titleElement = document.createElement("h1");
      ((titleElement.textContent =
        exportSettings.fileName || "Gemini Conversation"),
        headerDiv.appendChild(titleElement));
      const timestampElement = document.createElement("p");
      ((timestampElement.className = "timestamp"),
        (timestampElement.textContent = `Exported on: ${new Date().toLocaleString()}`),
        headerDiv.appendChild(timestampElement));
      const hrElement = document.createElement("hr");
      (headerDiv.appendChild(hrElement),
        contentWrapper.appendChild(headerDiv),
        conversationData.forEach((item) => {
          const messagePairDiv = document.createElement("div");
          if (((messagePairDiv.className = "message-pair"), item.question)) {
            const questionDiv = document.createElement("div");
            questionDiv.className = "message-part question";
            const userLabel = document.createElement("p");
            ((userLabel.className = "speaker-label user-label"),
              (userLabel.innerHTML = "<strong>User</strong>"));
            const contentDiv = document.createElement("div");
            ((contentDiv.className = "content"),
              (contentDiv.innerHTML = cleanHtmlContent(item.question)),
              questionDiv.appendChild(userLabel),
              questionDiv.appendChild(contentDiv),
              messagePairDiv.appendChild(questionDiv));
          }
          if (item.answer) {
            const answerDiv = document.createElement("div");
            ((answerDiv.className = "message-part answer"),
              item.question &&
                (answerDiv.style.borderTop = `1px solid ${borderColor}`));
            const geminiLabel = document.createElement("p");
            ((geminiLabel.className = "speaker-label gemini-label"),
              (geminiLabel.innerHTML = "<strong>Gemini</strong>"));
            const contentDiv = document.createElement("div");
            ((contentDiv.className = "content"),
              (contentDiv.innerHTML = cleanHtmlContent(item.answer)),
              answerDiv.appendChild(geminiLabel),
              answerDiv.appendChild(contentDiv),
              messagePairDiv.appendChild(answerDiv));
          }
          messagePairDiv.querySelector(".content")?.innerHTML.trim() &&
            contentWrapper.appendChild(messagePairDiv);
        }));
      if (!contentWrapper.querySelector(".message-pair")) {
        const errorMsg = "No content found to generate PDF.";
        return (
          console.warn("[Gemini Exporter]", errorMsg),
          alert(errorMsg),
          pdfRenderContainer.parentNode === document.body &&
            document.body.removeChild(pdfRenderContainer),
          void reject(new Error(errorMsg))
        );
      }
      if (isDarkMode) {
        const spacer = document.createElement("div");
        ((spacer.style.minHeight = "800pt"),
          (spacer.style.width = "1px"),
          (spacer.style.opacity = "0"),
          contentWrapper.appendChild(spacer),
          console.log(
            "[Gemini Exporter] Added dark mode PDF bottom spacer to content wrapper.",
          ));
      }
      (document.body.appendChild(pdfRenderContainer),
        console.log(
          "[Gemini Exporter] PDF content container added to body for rendering.",
        ),
        console.log("[Gemini Exporter] Container dimensions:", {
          width: pdfRenderContainer.offsetWidth,
          height: pdfRenderContainer.offsetHeight,
          visibility: pdfRenderContainer.style.visibility,
        }));
      const fileName = generateFilename(exportSettings.fileName, "pdf"),
        parsedPageBgColor = parseColor(bgColor);
      let isLastPageCanvasDeemedEmpty = !1,
        html2pdfTotalPages = 0;
      const pdfOptions = {
        margin: 0,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 3,
          useCORS: !0,
          backgroundColor: bgColor,
          logging: !1,
          letterRendering: !0,
          windowWidth: 1200,
          windowHeight: 1600,
        },
        jsPDF: {
          unit: "pt",
          format: "a4",
          orientation: exportSettings.orientation,
          compress: exportSettings.compression,
        },
        pagebreak: { mode: ["css", "avoid-all", "legacy"] },
        progress: function (worker) {
          if (
            (worker.progress &&
              void 0 !== worker.progress.total &&
              (html2pdfTotalPages = worker.progress.total),
            isDarkMode &&
              "rendering" === worker.state &&
              worker.progress.page === worker.progress.total &&
              worker.progress.total > 1)
          ) {
            const canvasForLastPage = worker.progress.canvas;
            canvasForLastPage
              ? isCanvasEffectivelyEmpty(
                  canvasForLastPage,
                  parsedPageBgColor,
                  5,
                  0.05,
                ) &&
                ((isLastPageCanvasDeemedEmpty = !0),
                console.log(
                  "[Gemini Exporter] Dark mode: Canvas for the last anticipated page is effectively empty.",
                ))
              : console.warn(
                  "[Gemini Exporter] Dark mode: Canvas object not available in 'rendering' state for last page check.",
                );
          }
          if (
            isDarkMode &&
            "addingPage" === worker.state &&
            worker.progress.pdf
          ) {
            const jspdf = worker.progress.pdf,
              pageWidth = jspdf.internal.pageSize.getWidth(),
              pageHeight = jspdf.internal.pageSize.getHeight();
            (jspdf.setFillColor(
              parsedPageBgColor.r,
              parsedPageBgColor.g,
              parsedPageBgColor.b,
            ),
              jspdf.rect(0, 0, pageWidth, pageHeight, "F"));
          }
        },
      };
      console.log("[Gemini Exporter] html2pdf options:", pdfOptions);
      const generateWithRetry = (retryCount = 0) => {
        html2pdf()
          .from(contentWrapper)
          .set(pdfOptions)
          .toPdf()
          .get("pdf")
          .then(function (jspdf) {
            const actualTotalPagesInJsPdf = jspdf.internal.getNumberOfPages();
            return (
              isDarkMode &&
              isLastPageCanvasDeemedEmpty &&
              actualTotalPagesInJsPdf > 1 &&
              actualTotalPagesInJsPdf === html2pdfTotalPages
                ? (jspdf.deletePage(actualTotalPagesInJsPdf),
                  console.log(
                    `[Gemini Exporter] Removed the last page (${actualTotalPagesInJsPdf}) as its content canvas was deemed empty in dark mode.`,
                  ))
                : isDarkMode &&
                  isLastPageCanvasDeemedEmpty &&
                  console.log(
                    `[Gemini Exporter] Last page canvas was empty in dark mode, but page not removed. Conditions: actualTotalPages (${actualTotalPagesInJsPdf}) > 1, actualTotalPages === html2pdfTotalPages (${html2pdfTotalPages}).`,
                  ),
              jspdf
            );
          })
          .then(function (jspdf) {
            if (isDarkMode) {
              const numberOfPagesInCurrentJsPdfObject =
                jspdf.internal.getNumberOfPages();
              numberOfPagesInCurrentJsPdfObject > 1
                ? (jspdf.deletePage(numberOfPagesInCurrentJsPdfObject),
                  console.log(
                    `[Gemini Exporter] Dark Mode: Final user-requested step - removed the last page. PDF now has ${jspdf.internal.getNumberOfPages()} pages.`,
                  ))
                : console.log(
                    "[Gemini Exporter] Dark Mode: Final user-requested step - PDF has 1 page or less, so no last page was removed by this specific rule.",
                  );
            }
            (jspdf.save(fileName),
              console.log("[Gemini Exporter] PDF download initiated."),
              resolve());
          })
          .catch((error) => {
            if (
              (console.error("[Gemini Exporter] PDF generation failed:", error),
              retryCount < 2)
            )
              return (
                console.log(
                  `[Gemini Exporter] Retrying PDF generation (attempt ${retryCount + 2}/3)...`,
                ),
                void setTimeout(() => generateWithRetry(retryCount + 1), 1e3)
              );
            (error && error.message && /CORS/.test(error.message)
              ? alert(
                  `PDF Generation Error: Failed to load some content (like images) due to security restrictions (CORS). Try exporting as HTML for full fidelity.\n\nDetails: ${error.message}`,
                )
              : alert(
                  `PDF Generation Error: ${error.message || "Unknown error"}\n\nTroubleshooting tips:\n- Try refreshing the page and exporting again\n- Check if any browser extensions might be interfering\n- Try disabling ad blockers temporarily\n- Report persistent issues with browser version and OS details`,
                ),
              reject(error));
          })
          .finally(() => {
            pdfRenderContainer.parentNode === document.body &&
              (document.body.removeChild(pdfRenderContainer),
              console.log(
                "[Gemini Exporter] Temporary PDF container removed from body.",
              ));
          });
      };
      new Promise((resolve) => {
        document.fonts && document.fonts.ready
          ? document.fonts.ready
              .then(() => {
                (console.log("[Gemini Exporter] All fonts loaded successfully"),
                  resolve());
              })
              .catch((err) => {
                (console.warn(
                  "[Gemini Exporter] Font loading error, continuing anyway:",
                  err,
                ),
                  resolve());
              })
          : (console.log(
              "[Gemini Exporter] document.fonts not supported, using timeout fallback",
            ),
            setTimeout(resolve, 500));
      }).then(() => {
        (console.log(
          "[Gemini Exporter] Starting PDF generation after font loading",
        ),
          setTimeout(() => generateWithRetry(), 500));
      });
    })
  );
}
function generatePDFViaPrint(conversationData) {
  return new Promise((resolve, reject) => {
    try {
      const theme =
        "dark" === exportSettings.pdfTheme ||
        ("auto" === exportSettings.pdfTheme &&
          document.body.classList.contains("dark-theme"))
          ? "dark"
          : "light";
      fallbackPrintOverlay(conversationData, theme).then(resolve).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}
function fallbackPrintOverlay(conversationData, theme) {
  return new Promise((resolve, reject) => {
    try {
      const isDarkMode = "dark" === theme,
        overlayId = "gemini-print-overlay",
        existing = document.getElementById(overlayId);
      existing && existing.remove();
      const overlay = document.createElement("div");
      ((overlay.id = overlayId),
        (overlay.style.position = "fixed"),
        (overlay.style.left = "0"),
        (overlay.style.top = "0"),
        (overlay.style.right = "0"),
        (overlay.style.bottom = "0"),
        (overlay.style.zIndex = "2147483647"),
        (overlay.style.background = isDarkMode ? "#131314" : "#ffffff"),
        (overlay.style.color = isDarkMode ? "#e8eaed" : "#1f1f1f"),
        (overlay.style.overflow = "auto"));
      const style = document.createElement("style");
      ((style.textContent = `\n                /* Print isolation: show only our overlay when printing */\n                @media print {\n                  html, body { height: auto !important; overflow: visible !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n                  /* Remove other elements from flow entirely so overlay starts at top and paginates */\n                  body > *:not(#${overlayId}) { display: none !important; }\n                  #${overlayId} { position: static !important; overflow: visible !important; height: auto !important; width: auto !important; display: block !important; }\n                  #${overlayId} .wrapper { overflow: visible !important; }\n                }\n                #${overlayId} .wrapper { max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.4; }\n                #${overlayId} .export-header h1 { font-size: 16pt; font-weight: 500; margin: 0 0 4px 0; }\n                #${overlayId} .export-header .timestamp { font-size: 8pt; font-style: italic; opacity: 0.85; margin-bottom: 16px; }\n                #${overlayId} .export-header hr { border: none; border-top: 1px solid ${isDarkMode ? "#282829" : "rgba(0,0,0,0.15)"}; margin-bottom: 16px; }\n                #${overlayId} .message-pair { border: 1px solid ${isDarkMode ? "#282829" : "rgba(0,0,0,0.15)"}; border-radius: 8px; overflow: visible; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid-page; }\n                #${overlayId} .message-part { padding: 8px; page-break-inside: auto; }\n                #${overlayId} .message-part.question { background: ${isDarkMode ? "rgba(255,255,255,0.03)" : "#f7f7f7"}; }\n                #${overlayId} .message-part.answer { background: ${isDarkMode ? "#131314" : "#ffffff"}; }\n                #${overlayId} .speaker-label { font-size: 10pt; font-weight: bold; margin: 0 0 4px 0; }\n                #${overlayId} .content { font-size: 10pt; word-wrap: break-word; }\n                #${overlayId} .content * { max-width: 100%; box-sizing: border-box; }\n                #${overlayId} .content p { margin: 0.5em 0; }\n                #${overlayId} .content ul, #${overlayId} .content ol { padding-left: 25px; margin: 0.5em 0; }\n                #${overlayId} .content li { margin-bottom: 5px; }\n                #${overlayId} .content code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Roboto Mono', monospace; font-size: 0.9em; background: ${isDarkMode ? "#202124" : "rgba(0,0,0,0.06)"}; padding: 2px 4px; border-radius: 3px; }\n                #${overlayId} .content pre { background: ${isDarkMode ? "#202124" : "rgba(0,0,0,0.06)"}; padding: 10px 12px; overflow-x: auto; border-radius: 6px; }\n                #${overlayId} a { color: ${isDarkMode ? "#8ab4f8" : "#1a73e8"}; text-decoration: none; }\n                #${overlayId} a:hover { text-decoration: underline; }\n                #${overlayId} table { width: 100%; border-collapse: collapse; margin: 1em 0; }\n                #${overlayId} th, #${overlayId} td { border: 1px solid ${isDarkMode ? "#282829" : "rgba(0,0,0,0.15)"}; padding: 8px 10px; text-align: left; }\n                #${overlayId} th { background: ${isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}; }\n                /* KaTeX adjustments if CSS is present */\n                #${overlayId} .katex-display { display: block; text-align: center; margin: 1em 0; page-break-inside: avoid; break-inside: avoid-page; }\n                #${overlayId} .katex { font-size: 1.1em; color: inherit; }\n            `),
        overlay.appendChild(style));
      const wrapper = document.createElement("div");
      wrapper.className = "wrapper";
      const header = document.createElement("div");
      header.className = "export-header";
      const h1 = document.createElement("h1");
      h1.textContent = exportSettings.fileName || "Gemini Conversation";
      const ts = document.createElement("p");
      ((ts.className = "timestamp"),
        (ts.textContent = "Exported on: " + new Date().toLocaleString()));
      const hr = document.createElement("hr");
      (header.appendChild(h1),
        header.appendChild(ts),
        header.appendChild(hr),
        wrapper.appendChild(header));
      const cleanAndProcess = (html) => {
        if (!html) return "";
        try {
          let processed = html;
          window.mathProcessor &&
            window.mathProcessor.isKaTeXAvailable() &&
            (processed = window.mathProcessor.processMathContent(processed));
          const temp = document.createElement("div");
          return (
            (temp.innerHTML = processed),
            temp
              .querySelectorAll(
                "sources-carousel-inline, sources-carousel, source-footnote",
              )
              .forEach((el) => el.remove()),
            temp
              .querySelectorAll("[jslog]")
              .forEach((el) => el.removeAttribute("jslog")),
            temp.innerHTML
          );
        } catch (e) {
          return html;
        }
      };
      ((conversationData || []).forEach((item) => {
        const pair = document.createElement("div");
        if (((pair.className = "message-pair"), item.question)) {
          const q = document.createElement("div");
          q.className = "message-part question";
          const l = document.createElement("p");
          ((l.className = "speaker-label"),
            (l.innerHTML = "<strong>User</strong>"));
          const c = document.createElement("div");
          ((c.className = "content"),
            (c.innerHTML = cleanAndProcess(item.question)),
            q.appendChild(l),
            q.appendChild(c),
            pair.appendChild(q));
        }
        if (item.answer) {
          const a = document.createElement("div");
          ((a.className = "message-part answer"),
            item.question &&
              (a.style.borderTop =
                "1px solid " + (isDarkMode ? "#282829" : "rgba(0,0,0,0.15)")));
          const l = document.createElement("p");
          ((l.className = "speaker-label"),
            (l.innerHTML = "<strong>Gemini</strong>"));
          const c = document.createElement("div");
          ((c.className = "content"),
            (c.innerHTML = cleanAndProcess(item.answer)),
            a.appendChild(l),
            a.appendChild(c),
            pair.appendChild(a));
        }
        wrapper.appendChild(pair);
      }),
        overlay.appendChild(wrapper),
        document.body.appendChild(overlay));
      const afterPrint = () => {
        window.removeEventListener("afterprint", afterPrint);
        try {
          overlay.remove();
        } catch (_) {}
        resolve();
      };
      window.addEventListener("afterprint", afterPrint, { once: !0 });
      const triggerPrint = () => {
        try {
          window.print();
        } catch (e) {
          try {
            overlay.remove();
          } catch (_) {}
          reject(e);
        }
      };
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(triggerPrint, 50)),
      );
    } catch (e) {
      reject(e);
    }
  });
}
function getScrollHost() {
  let scroller = document.querySelector(
    '#chat-history[data-test-id="chat-history-container"]',
  );
  if (scroller)
    return (
      console.log(
        "[Gemini Exporter] Found scroll container by specific ID/data-test-id",
      ),
      scroller
    );
  if (
    ((scroller = document.querySelector("infinite-scroller.chat-history")),
    scroller)
  )
    return (
      console.log(
        "[Gemini Exporter] Found scroll container by custom element name + class",
      ),
      scroller
    );
  if (
    ((scroller = document.querySelector(".chat-history-scroll-container")),
    scroller)
  )
    return (
      console.log(
        "[Gemini Exporter] Found scroll container by common class name",
      ),
      scroller
    );
  const mainArea = document.querySelector("main .conversation-area");
  if (mainArea) {
    const potentialScrollers = mainArea.querySelectorAll("div");
    for (const div of potentialScrollers) {
      const style = window.getComputedStyle(div);
      if (
        ("auto" === style.overflowY || "scroll" === style.overflowY) &&
        div.clientHeight > 300
      )
        return (
          console.log(
            "[Gemini Exporter] Found potential scroll container by computed style within main area",
          ),
          div
        );
    }
  }
  return (
    (scroller = document.querySelector("infinite-scroller")),
    scroller
      ? (console.warn(
          "[Gemini Exporter] Found scroll container by 'infinite-scroller' tag name (fallback).",
        ),
        scroller)
      : (console.error(
          "[Gemini Exporter] All specific scroll container selectors failed. Falling back to documentElement. Scrolling might not work correctly.",
        ),
        document.documentElement)
  );
}
async function scrollToTopAndWait(opts = {}) {
  const {
    loadWaitTimeout: loadWaitTimeout = 2e3,
    maxTotalTime: maxTotalTime = 3e4,
    maxScrollAttempts: maxScrollAttempts = 100,
  } = opts;
  return (
    console.log("[Gemini Exporter] Starting robust scroll to top..."),
    new Promise(async (resolve, reject) => {
      let scroller;
      try {
        if (((scroller = getScrollHost()), !scroller))
          throw new Error("Scroll container returned null.");
        const scrollElement =
          scroller === document.documentElement ? document.body : scroller;
        if (scrollElement.scrollHeight <= scrollElement.clientHeight)
          return (
            console.log(
              "[Gemini Exporter] Scroller content doesn't exceed its height. No scrolling needed.",
            ),
            void resolve()
          );
      } catch (error) {
        return (
          console.error(
            `[Gemini Exporter] Error finding scroll container: ${error.message}`,
          ),
          void reject(
            new Error("Scroll container lookup failed. Cannot scroll."),
          )
        );
      }
      const startTime = Date.now();
      let attempts = 0;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
        scrollTarget =
          scroller === document.documentElement ? window : scroller;
      scroller === document.documentElement && document.body;
      for (; attempts < maxScrollAttempts; ) {
        if (Date.now() - startTime > maxTotalTime)
          return (
            console.warn(
              `[Gemini Exporter] Scroll timeout reached after ${maxTotalTime}ms.`,
            ),
            void reject(
              new Error(`Scroll process timed out after ${maxTotalTime}ms.`),
            )
          );
        const initialMessageCount = scroller.querySelectorAll(
            "div.conversation-container",
          ).length,
          initialScrollTop =
            scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
        if (
          (console.log(
            `[Gemini Exporter] Scroll attempt ${attempts + 1}: Current messages: ${initialMessageCount}, ScrollTop: ${initialScrollTop}`,
          ),
          0 === initialScrollTop && attempts > 0)
        ) {
          (console.log(
            "[Gemini Exporter] Reached scrollTop 0. Checking for final loads...",
          ),
            await wait(loadWaitTimeout));
          const finalMessageCount = scroller.querySelectorAll(
            "div.conversation-container",
          ).length;
          if (finalMessageCount === initialMessageCount)
            return (
              console.log(
                "[Gemini Exporter] ScrollTop is 0 and no new messages loaded after wait. Scrolling complete.",
              ),
              void resolve()
            );
          console.log(
            `[Gemini Exporter] Messages loaded after reaching top (${initialMessageCount} -> ${finalMessageCount}). Continuing check.`,
          );
        }
        (scrollTarget === window
          ? window.scrollTo(0, 0)
          : ((scrollTarget.scrollTop = 0),
            scrollTarget.dispatchEvent(new Event("scroll"))),
          console.log(
            "[Gemini Exporter] Scrolled to top (scrollTop set to 0).",
          ));
        let newMessagesLoaded = !1;
        const waitStartTime = Date.now();
        for (; Date.now() - waitStartTime < loadWaitTimeout; ) {
          const currentMessageCount = scroller.querySelectorAll(
            "div.conversation-container",
          ).length;
          if (currentMessageCount > initialMessageCount) {
            (console.log(
              `[Gemini Exporter] New messages loaded (${initialMessageCount} -> ${currentMessageCount}).`,
            ),
              (newMessagesLoaded = !0));
            break;
          }
          const currentScrollTopCheck =
            scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
          (currentScrollTopCheck > 5 &&
            0 === initialScrollTop &&
            console.warn(
              `[Gemini Exporter] Scroll position changed unexpectedly after scroll attempt (${currentScrollTopCheck}). Waiting might be interrupted.`,
            ),
            await wait(100));
        }
        if (!newMessagesLoaded) {
          const currentScrollTop =
            scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
          if (0 === currentScrollTop)
            return (
              console.log(
                "[Gemini Exporter] Scrolled, waited, no new messages loaded, and still at scrollTop 0. Assuming end of history.",
              ),
              void resolve()
            );
          console.warn(
            `[Gemini Exporter] Scrolled, waited, no new messages, but scrollTop is now ${currentScrollTop}. Continuing loop cautiously.`,
          );
        }
        (attempts++, await wait(50));
      }
      (console.warn(
        `[Gemini Exporter] Reached max scroll attempts (${maxScrollAttempts}). Finishing scroll process.`,
      ),
        resolve());
    })
  );
}
async function saveEntireChat(format = exportSettings.format) {
  const exportButton = getExportButtonElement();
  (console.log(
    `[Gemini Exporter] Saving entire chat as ${format.toUpperCase()} (from settings)...`,
  ),
    setButtonLoading(exportButton, "Preparing Chat..."));
  try {
    await scrollToTopAndWait();
  } catch (error) {
    return (
      console.error("[Gemini Exporter] Failed to scroll to top:", error),
      alert(
        `Error scrolling to top: ${error.message || "Unknown error"}. Export may be incomplete.`,
      ),
      void resetButtonState(exportButton)
    );
  }
  ("pdf" === format
    ? setButtonLoading(exportButton)
    : setButtonLoading(exportButton, `Generating ${format.toUpperCase()}...`),
    await new Promise((resolve) => setTimeout(resolve, 50)));
  const conversation = extractConversationElements();
  if (!conversation || 0 === conversation.length)
    return (
      alert("Could not find any conversation content to export."),
      console.warn(
        "[Gemini Exporter] No conversation elements found for 'Save Entire Chat'.",
      ),
      void resetButtonState(exportButton)
    );
  let savePromise;
  console.log(
    `[Gemini Exporter] Extracted ${conversation.length} message pairs. Saving as ${format.toUpperCase()}.`,
  );
  try {
    switch (format) {
      case "html":
        (downloadAsHTML(conversation, exportSettings.fileName),
          (savePromise = Promise.resolve()));
        break;
      case "md":
        (downloadAsMarkdown(conversation, exportSettings.fileName),
          (savePromise = Promise.resolve()));
        break;
      case "json":
        (downloadAsJSON(conversation, exportSettings.fileName),
          (savePromise = Promise.resolve()));
        break;
      case "txt":
        (downloadAsTXT(conversation, exportSettings.fileName),
          (savePromise = Promise.resolve()));
        break;
      case "csv":
        (downloadAsCSV(conversation, exportSettings.fileName),
          (savePromise = Promise.resolve()));
        break;
      case "pdf":
        savePromise = generatePDFViaPrint(conversation);
        break;
      default:
        (console.error(`[Gemini Exporter] Unknown format requested: ${format}`),
          alert(`Unknown export format selected in settings: ${format}`),
          (savePromise = Promise.reject(
            new Error(`Unknown format: ${format}`),
          )));
    }
    (await savePromise,
      setButtonSuccess(exportButton),
      setTimeout(() => resetButtonState(exportButton), 2e3));
  } catch (error) {
    (console.error(
      `[Gemini Exporter] Error during save operation for ${format}:`,
      error,
    ),
      error?.message?.includes("PDF Generation Error") ||
        alert(
          `Failed to save chat as ${format.toUpperCase()}: ${error.message || "Unknown error"}`,
        ),
      resetButtonState(exportButton));
  }
}
async function saveSelectedMessages() {
  const exportButton = getExportButtonElement();
  if (0 === selectedMessageCount)
    return void console.warn(
      "[Gemini Exporter] Save selected called, but count is 0.",
    );
  const currentFormat = exportSettings.format.toUpperCase();
  (console.log(
    `[Gemini Exporter] Saving selection of ${selectedMessageCount} message(s) as ${currentFormat}...`,
  ),
    setButtonLoading(
      exportButton,
      `Preparing Selection (${selectedMessageCount})...`,
    ));
  try {
    await scrollToTopAndWait({ maxTotalTime: 15e3 });
  } catch (error) {
    (console.error(
      "[Gemini Exporter] Failed to scroll to top before saving selection:",
      error,
    ),
      alert(
        `Warning: Error scrolling to top (${error.message || "Unknown error"}). Some selected messages might be missing if they were not loaded. Proceeding with currently visible selection.`,
      ));
  }
  (setButtonLoading(
    exportButton,
    `Generating ${currentFormat} (${selectedMessageCount})...`,
  ),
    await new Promise((resolve) => setTimeout(resolve, 50)));
  const selectedConversation = extractSelectedElementsHTML();
  if (!selectedConversation || 0 === selectedConversation.length)
    return (
      alert(
        "No messages were selected for export, or selected messages could not be extracted.",
      ),
      console.warn(
        "[Gemini Exporter] No messages extracted despite selected count > 0.",
      ),
      void resetButtonState(exportButton)
    );
  console.log(
    `[Gemini Exporter] Extracted ${selectedConversation.length} selected message pairs. Saving as ${currentFormat}.`,
  );
  const selectionFilename = `${exportSettings.fileName}-selection`;
  let savePromise;
  try {
    switch (exportSettings.format) {
      case "html":
        (downloadAsHTML(selectedConversation, selectionFilename),
          (savePromise = Promise.resolve()));
        break;
      case "md":
        (downloadAsMarkdown(selectedConversation, selectionFilename),
          (savePromise = Promise.resolve()));
        break;
      case "json":
        (downloadAsJSON(selectedConversation, selectionFilename),
          (savePromise = Promise.resolve()));
        break;
      case "txt":
        (downloadAsTXT(selectedConversation, selectionFilename),
          (savePromise = Promise.resolve()));
        break;
      case "csv":
        (downloadAsCSV(selectedConversation, selectionFilename),
          (savePromise = Promise.resolve()));
        break;
      case "pdf":
        savePromise = generatePDFViaPrint(selectedConversation);
        break;
      default:
        (console.error(
          `[Gemini Exporter] Unknown format for selected messages: ${exportSettings.format}`,
        ),
          alert(
            `Unknown export format for selection: ${exportSettings.format}`,
          ),
          (savePromise = Promise.reject(
            new Error(`Unknown format for selection: ${exportSettings.format}`),
          )));
    }
    (await savePromise,
      setButtonSuccess(exportButton, `${currentFormat} Saved`),
      setTimeout(() => {
        exitSelectionMode();
      }, 2e3));
  } catch (error) {
    (console.error(
      `[Gemini Exporter] Error during ${currentFormat} save operation for selected messages:`,
      error,
    ),
      (error?.message?.includes("PDF Generation Error") &&
        "pdf" === exportSettings.format) ||
        alert(
          `Failed to save selected messages as ${currentFormat}: ${error.message || "Unknown error"}`,
        ),
      resetButtonState(exportButton));
  }
}
function showExportDropdown(buttonRect, buttonElement) {
  const existingDropdown = document.getElementById("gemini-export-dropdown");
  if (existingDropdown) {
    existingDropdown.remove();
    const associatedStyleTag = document.getElementById(
      "gemini-export-dropdown-dynamic-styles",
    );
    return (
      associatedStyleTag && associatedStyleTag.remove(),
      (isExportDropdownOpen = !1),
      buttonElement?.classList.remove("active"),
      void console.log("[Gemini Exporter] Export dropdown closed.")
    );
  }
  if (!!document.getElementById("gemini-selection-active"))
    return void console.log(
      "[Gemini Exporter] Cannot show default dropdown while in selection mode.",
    );
  (console.log("[Gemini Exporter] Showing export dropdown (default mode)."),
    (isExportDropdownOpen = !0),
    buttonElement?.classList.add("active"));
  const isDark = "dark" === getCurrentTheme(),
    dropdown = document.createElement("div");
  dropdown.id = "gemini-export-dropdown";
  const buttonCenter = buttonRect.left + buttonRect.width / 2;
  dropdown.style.cssText = `\n        position: fixed;\n        top: ${buttonRect.bottom + 8}px;\n        left: ${buttonCenter}px; \n        transform: translateX(-50%); \n        min-width: ${buttonRect.width}px;\n        max-width: 280px;\n        background: ${isDark ? "#303134" : "#fff"};\n        border-radius: 8px;\n        box-shadow: 0 4px 15px ${isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.15)"};\n        padding: 8px 0;\n        z-index: 10001;\n        border: 1px solid ${isDark ? "#5f6368" : "rgba(0, 0, 0, 0.1)"};\n        overflow: hidden;\n        color: ${isDark ? "#e8eaed" : "#202124"};\n        font-family: 'Google Sans', sans-serif;\n        font-size: 14px;\n    `;
  const dropdownStyle = document.createElement("style");
  ((dropdownStyle.id = "gemini-export-dropdown-dynamic-styles"),
    (dropdownStyle.textContent = `\n        .gemini-export-option:hover {\n             background-color: ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(60, 64, 67, 0.04)"};\n        }\n    `),
    document.head.appendChild(dropdownStyle));
  const cleanupAssociatedStyle = () => {
    const styleTag = document.getElementById(
      "gemini-export-dropdown-dynamic-styles",
    );
    styleTag && styleTag.parentNode && styleTag.remove();
  };
  ([
    {
      text: `Save Entire Chat as ${exportSettings.format.toUpperCase()}`,
      action: () => saveEntireChat(exportSettings.format),
    },
    { text: "---", isSeparator: !0 },
    { text: "Select Messages for Export...", action: toggleExportMode },
    { text: "---", isSeparator: !0 },
    { text: "Settings...", action: showSettingsPopup },
  ].forEach((opt) => {
    if (opt.isSeparator) {
      const separator = document.createElement("div");
      return (
        (separator.style.cssText = `height: 1px; background-color: ${isDark ? "#5f6368" : "#e0e0e0"}; margin: 6px 0;`),
        void dropdown.appendChild(separator)
      );
    }
    const optionDiv = document.createElement("div");
    ((optionDiv.className = "gemini-export-option"),
      (optionDiv.textContent = opt.text),
      (optionDiv.style.cssText = `\n            padding: 10px 16px;\n            cursor: pointer;\n            transition: background-color 0.15s ease;\n            white-space: nowrap;\n            color: ${isDark ? "#e8eaed" : "#3c4043"};\n        `),
      optionDiv.addEventListener("click", (e) => {
        (dropdown.remove(),
          cleanupAssociatedStyle(),
          (isExportDropdownOpen = !1),
          buttonElement?.classList.remove("active"),
          opt.action(),
          e.stopPropagation());
      }),
      dropdown.appendChild(optionDiv));
  }),
    document.body.appendChild(dropdown));
  const handleOutsideClick = (e) => {
    dropdown.contains(e.target) ||
      buttonElement?.contains(e.target) ||
      (dropdown.remove(),
      cleanupAssociatedStyle(),
      (isExportDropdownOpen = !1),
      buttonElement?.classList.remove("active"),
      document.removeEventListener("click", handleOutsideClick, !0),
      console.log(
        "[Gemini Exporter] Export dropdown closed via outside click.",
      ));
  };
  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick, !0);
  }, 0);
}
function extractConversationElements() {
  const conversation = [];
  let scroller;
  try {
    if (((scroller = getScrollHost()), !scroller))
      throw new Error("Scroller element not found.");
  } catch (error) {
    return (
      console.error(
        "[Gemini Exporter] Could not find chat history scroller for extraction:",
        error,
      ),
      conversation
    );
  }
  const conversationContainers = scroller.querySelectorAll(
    "div.conversation-container",
  );
  return (
    console.log(
      `[Gemini Exporter] Found ${conversationContainers.length} conversation containers within scroller.`,
    ),
    conversationContainers.forEach((container) => {
      const userQueryContent = container.querySelector(
          "user-query, user-query-content",
        ),
        messageContent = container.querySelector("message-content");
      let questionHTML = "";
      const userTextElements =
        userQueryContent?.querySelectorAll(".query-text-line");
      if (userTextElements && userTextElements.length > 0)
        questionHTML = Array.from(userTextElements)
          .map((el) => el.innerHTML.trim())
          .join(" ");
      else if (userQueryContent) {
        const clone = userQueryContent.cloneNode(!0);
        (clone
          .querySelectorAll("mat-icon, .icon-button")
          .forEach((el) => el.remove()),
          (questionHTML = clone.innerHTML.trim()));
      }
      let answerHTML = "";
      const geminiOutputElement = messageContent?.querySelector(
        ".markdown-main-panel, .output-content .markdown, .output-content",
      );
      if (geminiOutputElement)
        answerHTML = geminiOutputElement.innerHTML.trim();
      else if (messageContent) {
        const clone = messageContent.cloneNode(!0);
        (clone
          .querySelectorAll(
            "message-actions, mat-icon-button, .icon-button, response-actions",
          )
          .forEach((el) => el.remove()),
          (answerHTML = clone.innerHTML.trim()));
      }
      if (questionHTML || answerHTML) {
        const tempDivQ = document.createElement("div");
        ((tempDivQ.innerHTML = questionHTML),
          tempDivQ
            .querySelectorAll(".gemini-export-checkbox-container")
            .forEach((el) => el.remove()));
        const tempDivA = document.createElement("div");
        ((tempDivA.innerHTML = answerHTML),
          tempDivA
            .querySelectorAll(".gemini-export-checkbox-container")
            .forEach((el) => el.remove()),
          conversation.push({
            question: tempDivQ.innerHTML || null,
            answer: tempDivA.innerHTML || null,
          }));
      }
    }),
    conversation
  );
}
function createSettingsPanelContent() {
  const contentFragment = document.createDocumentFragment(),
    isDark = "dark" === getCurrentTheme(),
    styleElement = document.createElement("style");
  ((styleElement.textContent = `\n        /* Gemini Design Tokens ... (styles remain the same) ... */\n        .gemini-settings-panel-content { \n            --color-bg-primary: ${isDark ? "#131314" : "#ffffff"};\n            --color-bg-secondary: ${isDark ? "#1e1e1f" : "#f5f5f5"};\n            --color-text-primary: ${isDark ? "#e3e3e3" : "#202124"};\n            --color-text-secondary: ${isDark ? "#9aa0a6" : "#5f6368"};\n            --color-border: ${isDark ? "#303134" : "#dadce0"};\n            --color-focus: #d2e3fc; \n            --color-text-on-focus: ${isDark ? "#131314" : "#0b57d0"}; \n            --color-item-bg: ${isDark ? "#303134" : "#f1f3f4"};\n            --color-item-selected-bg: ${isDark ? "rgba(210, 227, 252, 0.15)" : "#d2e3fc"}; \n            --color-item-selected-text: ${isDark ? "#d2e3fc" : "#0b57d0"};\n            --color-item-hover-bg: ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(60, 64, 67, 0.04)"};\n            --spacing-xs: 4px; --spacing-sm: 8px; --spacing-md: 12px; \n            --spacing-lg: 18px; --spacing-xl: 24px; \n            --font-family-google: 'Google Sans', sans-serif;\n            --font-size-xl: 22px; --font-size-lg: 16px; --font-size-md: 14px; \n            --font-size-sm: 13px; --font-size-xs: 12px;\n            --border-radius-sm: 4px; --border-radius-md: 8px;\n            --border-radius-lg: 12px; --border-radius-pill: 100px;\n            width: 100%; color: var(--color-text-primary); font-family: var(--font-family-google);\n        }\n        .gemini-modal-title { font-size: var(--font-size-xl); font-weight: 400; color: var(--color-text-primary); margin-bottom: var(--spacing-md); line-height: 1.3; }\n        .gemini-section-header { font-size: var(--font-size-lg); font-weight: 500; color: var(--color-text-primary); margin-top: var(--spacing-md); margin-bottom: var(--spacing-sm); }\n        .gemini-divider { height: 1px; background-color: var(--color-border); margin: var(--spacing-md) 0; width: 100%; }\n        .gemini-form-group { margin-bottom: var(--spacing-md); }\n        .gemini-form-label { display: block; font-size: var(--font-size-md); font-weight: 400; color: var(--color-text-primary); margin-bottom: var(--spacing-xs); }\n        .gemini-pill-group { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }\n        .gemini-pill-radio { position: relative; display: inline-block; }\n        .gemini-pill-radio input[type="radio"] { position: absolute; opacity: 0; width: 0; height: 0; }\n        .gemini-pill-radio-label { display: inline-flex; align-items: center; justify-content: center; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--border-radius-pill); background-color: var(--color-item-bg); color: var(--color-text-primary); font-size: var(--font-size-sm); font-weight: 400; cursor: pointer; transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; min-width: 70px; text-align: center; border: 1px solid transparent; }\n        .gemini-pill-radio input[type="radio"]:checked + .gemini-pill-radio-label { background-color: var(--color-item-selected-bg); color: var(--color-item-selected-text); font-weight: 500; border-color: transparent; }\n        .gemini-pill-radio input[type="radio"]:focus-visible + .gemini-pill-radio-label { outline: 2px solid var(--color-focus); outline-offset: 1px; border-color: transparent; }\n        .gemini-pill-radio-label:hover { background-color: var(--color-item-hover-bg); }\n        .gemini-text-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); font-family: var(--font-family-google); font-size: var(--font-size-md); color: var(--color-text-primary); background-color: ${isDark ? "rgba(255, 255, 255, 0.05)" : "#f8f9fa"}; border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); outline: none; transition: border-color 0.2s ease, background-color 0.2s ease; box-sizing: border-box; }\n        .gemini-text-input:focus { border-color: var(--color-focus); background-color: ${isDark ? "rgba(255, 255, 255, 0.08)" : "#fff"}; }\n        .gemini-text-input::placeholder { color: var(--color-text-secondary); }\n        .gemini-checkbox { display: flex; align-items: center; position: relative; cursor: pointer; margin-top: var(--spacing-xs); padding: var(--spacing-xs) 0; }\n        .gemini-checkbox input[type="checkbox"] { position: absolute; opacity: 0; width: 0; height: 0; }\n        .gemini-checkbox-control { display: inline-flex; align-items: center; gap: var(--spacing-sm); }\n        .gemini-checkbox-mark { position: relative; display: inline-block; width: 16px; height: 16px; border: 1.5px solid var(--color-text-secondary); border-radius: var(--border-radius-sm); transition: all 0.2s ease; background-color: transparent; flex-shrink: 0; }\n        .gemini-checkbox input[type="checkbox"]:checked + .gemini-checkbox-control .gemini-checkbox-mark { background-color: var(--color-focus); border-color: var(--color-focus); }\n        .gemini-checkbox input[type="checkbox"]:checked + .gemini-checkbox-control .gemini-checkbox-mark::after { content: ''; position: absolute; top: 1px; left: 5px; width: 4px; height: 8px; border: solid var(--color-text-on-focus); border-width: 0 2px 2px 0; transform: rotate(45deg); }\n        .gemini-checkbox input[type="checkbox"]:focus-visible + .gemini-checkbox-control .gemini-checkbox-mark { outline: 2px solid var(--color-focus); outline-offset: 1px; }\n        .gemini-checkbox-label { font-size: var(--font-size-md); color: var(--color-text-primary); line-height: 1.5; }\n    `),
    contentFragment.appendChild(styleElement));
  const settingsPanel = document.createElement("div");
  settingsPanel.className = "gemini-settings-panel-content";
  const modalTitle = document.createElement("h2");
  ((modalTitle.className = "gemini-modal-title"),
    (modalTitle.textContent = "Export Settings"),
    settingsPanel.appendChild(modalTitle));
  const fileNameGroup = document.createElement("div");
  fileNameGroup.className = "gemini-form-group";
  const fileNameLabel = document.createElement("label");
  ((fileNameLabel.className = "gemini-form-label"),
    (fileNameLabel.textContent = "File Name"),
    fileNameGroup.appendChild(fileNameLabel));
  const fileNameInput = document.createElement("input");
  ((fileNameInput.className = "gemini-text-input"),
    (fileNameInput.type = "text"),
    (fileNameInput.placeholder = "e.g., my-gemini-chat"),
    (fileNameInput.value = exportSettings.fileName || ""),
    fileNameInput.setAttribute("aria-label", "Base file name for export"),
    fileNameInput.addEventListener("input", () => {
      ((exportSettings.fileName = fileNameInput.value
        .trim()
        .replace(/[^a-z0-9_\-]/gi, "_")),
        debouncedSaveExportSettings());
    }),
    fileNameInput.addEventListener("change", () => {
      (debouncedSaveExportSettings(!0),
        console.log(
          `[Gemini Exporter] Base filename set to: ${exportSettings.fileName}`,
        ));
    }),
    fileNameGroup.appendChild(fileNameInput));
  const uiThemeGroup = document.createElement("div");
  uiThemeGroup.className = "gemini-form-group";
  const uiThemeLabel = document.createElement("label");
  ((uiThemeLabel.className = "gemini-form-label"),
    (uiThemeLabel.textContent = "UI Theme"),
    uiThemeGroup.appendChild(uiThemeLabel));
  const uiThemePillGroup = document.createElement("div");
  ((uiThemePillGroup.className = "gemini-pill-group"),
    ["Auto", "Light", "Dark"].forEach((themeName) => {
      const value = themeName.toLowerCase(),
        finalValue = "auto" === value ? "auto" : value,
        pillContainer = document.createElement("label");
      pillContainer.className = "gemini-pill-radio";
      const radioInput = document.createElement("input");
      ((radioInput.type = "radio"),
        (radioInput.name = "ui-theme"),
        (radioInput.value = finalValue),
        (radioInput.checked = exportSettings.uiTheme === finalValue),
        radioInput.setAttribute("aria-label", `Set UI theme to ${themeName}`));
      const pillLabel = document.createElement("span");
      ((pillLabel.className = "gemini-pill-radio-label"),
        (pillLabel.textContent = themeName),
        radioInput.addEventListener("change", () => {
          if (radioInput.checked) {
            ((exportSettings.uiTheme = finalValue),
              debouncedSaveExportSettings(!0),
              console.log(`[Gemini Exporter] UI theme set to: ${finalValue}`),
              injectButton());
            const settingsPopup = document.getElementById(
              "gemini-exporter-settings-popup",
            );
            settingsPopup &&
              (settingsPopup.dispatchEvent(new CustomEvent("close-popup")),
              setTimeout(() => showSettingsPopup(), 100));
          }
        }),
        pillContainer.appendChild(radioInput),
        pillContainer.appendChild(pillLabel),
        uiThemePillGroup.appendChild(pillContainer));
    }),
    uiThemeGroup.appendChild(uiThemePillGroup));
  const divider1 = document.createElement("div");
  divider1.className = "gemini-divider";
  const formatGroup = document.createElement("div");
  formatGroup.className = "gemini-form-group";
  const formatLabel = document.createElement("label");
  ((formatLabel.className = "gemini-form-label"),
    (formatLabel.textContent = "Export Format"),
    formatGroup.appendChild(formatLabel));
  const formatPillGroup = document.createElement("div");
  formatPillGroup.className = "gemini-pill-group";
  ([
    { label: "PDF", value: "pdf" },
    { label: "Markdown", value: "md" },
    { label: "Text", value: "txt" },
    { label: "JSON", value: "json" },
    { label: "HTML", value: "html" },
    { label: "CSV", value: "csv" },
  ].forEach((format) => {
    const pillContainer = document.createElement("label");
    pillContainer.className = "gemini-pill-radio";
    const radioInput = document.createElement("input");
    ((radioInput.type = "radio"),
      (radioInput.name = "export-format"),
      (radioInput.value = format.value),
      (radioInput.checked = exportSettings.format === format.value),
      radioInput.setAttribute(
        "aria-label",
        `Set default format to ${format.label}`,
      ));
    const pillLabel = document.createElement("span");
    ((pillLabel.className = "gemini-pill-radio-label"),
      (pillLabel.textContent = format.label),
      radioInput.addEventListener("change", () => {
        if (radioInput.checked) {
          ((exportSettings.format = format.value),
            debouncedSaveExportSettings(!0),
            console.log(
              `[Gemini Exporter] Default format set to: ${format.value}`,
            ));
          const dropdownOption = document.querySelector(
            "#gemini-export-dropdown .gemini-export-option:first-child",
          );
          dropdownOption &&
            dropdownOption.textContent.startsWith("Save Entire Chat") &&
            (dropdownOption.textContent = `Save Entire Chat as ${exportSettings.format.toUpperCase()}`);
        }
      }),
      pillContainer.appendChild(radioInput),
      pillContainer.appendChild(pillLabel),
      formatPillGroup.appendChild(pillContainer));
  }),
    formatGroup.appendChild(formatPillGroup),
    (exportSettings.pdfTheme = "auto"));
  const orientationGroup = document.createElement("div");
  orientationGroup.className = "gemini-form-group";
  const orientationLabel = document.createElement("label");
  ((orientationLabel.className = "gemini-form-label"),
    (orientationLabel.textContent = "Page Orientation"),
    orientationGroup.appendChild(orientationLabel));
  const orientationPillGroup = document.createElement("div");
  ((orientationPillGroup.className = "gemini-pill-group"),
    ["Portrait", "Landscape"].forEach((orientation) => {
      const value = orientation.toLowerCase(),
        pillContainer = document.createElement("label");
      pillContainer.className = "gemini-pill-radio";
      const radioInput = document.createElement("input");
      ((radioInput.type = "radio"),
        (radioInput.name = "pdf-orientation"),
        (radioInput.value = value),
        (radioInput.checked = exportSettings.orientation === value),
        radioInput.setAttribute(
          "aria-label",
          `Set PDF orientation to ${orientation}`,
        ));
      const pillLabel = document.createElement("span");
      ((pillLabel.className = "gemini-pill-radio-label"),
        (pillLabel.textContent = orientation),
        radioInput.addEventListener("change", () => {
          radioInput.checked &&
            ((exportSettings.orientation = value),
            debouncedSaveExportSettings(!0),
            console.log(`[Gemini Exporter] PDF orientation set to: ${value}`));
        }),
        pillContainer.appendChild(radioInput),
        pillContainer.appendChild(pillLabel),
        orientationPillGroup.appendChild(pillContainer));
    }),
    orientationGroup.appendChild(orientationPillGroup));
  const compressionGroup = document.createElement("div");
  compressionGroup.className = "gemini-form-group";
  const checkboxContainer = document.createElement("label");
  checkboxContainer.className = "gemini-checkbox";
  const checkboxInput = document.createElement("input");
  ((checkboxInput.type = "checkbox"),
    (checkboxInput.checked = exportSettings.compression),
    checkboxInput.setAttribute(
      "aria-label",
      "Enable or disable PDF compression",
    ));
  const checkboxControl = document.createElement("div");
  checkboxControl.className = "gemini-checkbox-control";
  const checkboxMark = document.createElement("span");
  checkboxMark.className = "gemini-checkbox-mark";
  const checkboxLabel = document.createElement("span");
  return (
    (checkboxLabel.className = "gemini-checkbox-label"),
    (checkboxLabel.textContent = "Enable Compression (Smaller File Size)"),
    checkboxControl.appendChild(checkboxMark),
    checkboxControl.appendChild(checkboxLabel),
    checkboxContainer.appendChild(checkboxInput),
    checkboxContainer.appendChild(checkboxControl),
    checkboxInput.addEventListener("change", () => {
      ((exportSettings.compression = checkboxInput.checked),
        debouncedSaveExportSettings(!0),
        console.log(
          `[Gemini Exporter] PDF compression set to: ${exportSettings.compression}`,
        ));
    }),
    compressionGroup.appendChild(checkboxContainer),
    settingsPanel.appendChild(fileNameGroup),
    settingsPanel.appendChild(uiThemeGroup),
    settingsPanel.appendChild(divider1),
    settingsPanel.appendChild(formatGroup),
    settingsPanel.appendChild(orientationGroup),
    settingsPanel.appendChild(compressionGroup),
    contentFragment.appendChild(settingsPanel),
    contentFragment
  );
}
function showSettingsPopup() {
  const shadowHost = document.querySelector("#gemini-exporter"),
    shadowRoot = shadowHost?.shadowRoot,
    saveButton = shadowRoot?.querySelector("#export-button"),
    buttonRect = saveButton?.getBoundingClientRect();
  if (!buttonRect)
    return void console.error(
      "[Gemini Exporter] Could not find the save button to position settings popup",
    );
  const existingPopup = document.getElementById(
    "gemini-exporter-settings-popup",
  );
  (existingPopup &&
    (existingPopup.remove(),
    (isSettingsPopupOpen = !1),
    console.log(
      "[Gemini Exporter] Settings popup closed to reopen or was already open.",
    )),
    console.log("[Gemini Exporter] Showing settings popup"),
    (isSettingsPopupOpen = !0));
  const popup = document.createElement("div");
  popup.id = "gemini-exporter-settings-popup";
  const isDark = "dark" === getCurrentTheme();
  popup.style.cssText = `\n        position: fixed;\n        top: 0; left: 0; right: 0; bottom: 0;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        background-color: rgba(0, 0, 0, ${isDark ? 0.7 : 0.5});\n        z-index: 10000;\n        opacity: 0;\n        transition: opacity 0.2s ease-out;\n        font-family: 'Google Sans', sans-serif;\n    `;
  const modalBox = document.createElement("div");
  modalBox.style.cssText = `\n        background-color: ${isDark ? "var(--color-bg-primary, #131314)" : "var(--color-bg-primary, #ffffff)"};\n        border-radius: var(--border-radius-md, 8px);\n        width: 90%;\n        max-width: 520px; /* Slightly wider for better grid layout */\n        display: flex;\n        flex-direction: column;\n        max-height: 85vh; /* Adjusted max-height */\n        box-shadow: 0 4px 25px rgba(0, 0, 0, ${isDark ? 0.4 : 0.2});\n        transform: translateY(20px);\n        transition: transform 0.2s ease-out, opacity 0.2s ease-out;\n        border: 1px solid ${isDark ? "var(--color-border, #303134)" : "var(--color-border, rgba(0,0,0,0.1))"};\n        position: relative;\n        opacity: 0; /* Start hidden for transition */\n    `;
  const scrollableContent = document.createElement("div");
  scrollableContent.style.cssText =
    "\n        flex-grow: 1;\n        overflow-y: auto;\n        padding: var(--spacing-lg, 24px);\n        padding-bottom: 0; /* Remove bottom padding here, add to button row container */\n    ";
  const closeButton = document.createElement("button");
  ((closeButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'),
    (closeButton.style.cssText = `\n        position: absolute;\n        top: calc(var(--spacing-md, 16px) - 4px); /* Align with padding */\n        right: calc(var(--spacing-md, 16px) - 4px);\n        background: transparent;\n        border: none;\n        color: var(--color-text-secondary, ${isDark ? "#9aa0a6" : "#5f6368"});\n        cursor: pointer;\n        padding: var(--spacing-xs, 4px);\n        border-radius: 50%;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        z-index: 10;\n        transition: background-color 0.2s ease, color 0.2s ease;\n    `),
    closeButton.addEventListener("mouseover", () => {
      ((closeButton.style.backgroundColor = isDark
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(60, 64, 67, 0.06)"),
        (closeButton.style.color = isDark ? "#e3e3e3" : "#202124"));
    }),
    closeButton.addEventListener("mouseout", () => {
      ((closeButton.style.backgroundColor = "transparent"),
        (closeButton.style.color = isDark ? "#9aa0a6" : "#5f6368"));
    }),
    closeButton.addEventListener("click", () => closePopup()),
    modalBox.appendChild(closeButton),
    scrollableContent.appendChild(createSettingsPanelContent()),
    modalBox.appendChild(scrollableContent));
  const buttonRow = document.createElement("div");
  buttonRow.style.cssText = `\n        display: flex;\n        justify-content: flex-end;\n        gap: var(--spacing-sm, 8px);\n        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);\n        border-top: 1px solid ${isDark ? "var(--color-border, #303134)" : "var(--color-border, #e0e0e0)"};\n        flex-shrink: 0; /* Prevent button row from shrinking */\n        background-color: ${isDark ? "var(--color-bg-primary, #131314)" : "var(--color-bg-primary, #ffffff)"}; /* Match modal bg */\n        border-bottom-left-radius: var(--border-radius-md, 8px); /* Round corners with modalBox */\n        border-bottom-right-radius: var(--border-radius-md, 8px);\n    `;
  const buttonBaseStyle =
      "\n        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);\n        border-radius: var(--border-radius-sm, 4px);\n        font-size: var(--font-size-md, 14px);\n        font-weight: 500;\n        cursor: pointer;\n        transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;\n        border: 1px solid transparent;\n    ",
    cancelBtn = document.createElement("button");
  ((cancelBtn.textContent = "Cancel"),
    (cancelBtn.style.cssText =
      buttonBaseStyle +
      `\n        background-color: transparent;\n        color: var(--color-text-secondary, ${isDark ? "#9aa0a6" : "#5f6368"});\n        border-color: var(--color-border, ${isDark ? "#5f6368" : "#dadce0"});\n    `),
    cancelBtn.addEventListener("mouseover", () => {
      cancelBtn.style.backgroundColor = isDark
        ? "rgba(255, 255, 255, 0.04)"
        : "rgba(60, 64, 67, 0.04)";
    }),
    cancelBtn.addEventListener("mouseout", () => {
      cancelBtn.style.backgroundColor = "transparent";
    }),
    cancelBtn.addEventListener("click", () => closePopup()),
    buttonRow.appendChild(cancelBtn));
  const saveBtn = document.createElement("button");
  ((saveBtn.textContent = "Save Settings"),
    (saveBtn.style.cssText =
      buttonBaseStyle +
      `\n        background-color: var(--color-focus, #d2e3fc);\n        color: var(--color-text-on-focus, ${isDark ? "#131314" : "#0b57d0"});\n        border-color: var(--color-focus, #d2e3fc);\n    `),
    saveBtn.addEventListener("mouseover", () => {
      saveBtn.style.backgroundColor = isDark ? "#b8d6fb" : "#c0d9fa";
    }),
    saveBtn.addEventListener("mouseout", () => {
      saveBtn.style.backgroundColor = "#d2e3fc";
    }),
    saveBtn.addEventListener("click", () => {
      (saveExportSettings(), closePopup());
    }),
    buttonRow.appendChild(saveBtn),
    modalBox.appendChild(buttonRow),
    popup.appendChild(modalBox),
    document.body.appendChild(popup),
    popup.offsetHeight,
    (popup.style.opacity = "1"),
    (modalBox.style.opacity = "1"),
    (modalBox.style.transform = "translateY(0)"));
  let currentFocusedElement = null;
  const handleEscKey = (e) => {
      "Escape" === e.key && closePopup();
    },
    handleOutsideClick = (e) => {
      e.target === popup && closePopup();
    };
  function closePopup() {
    ((popup.style.opacity = "0"),
      (modalBox.style.opacity = "0"),
      (modalBox.style.transform = "translateY(20px)"),
      document.removeEventListener("keydown", handleEscKey),
      popup.removeEventListener("click", handleOutsideClick),
      popup.removeEventListener("close-popup", closePopupEvent),
      setTimeout(() => {
        (popup.parentNode && popup.remove(),
          (isSettingsPopupOpen = !1),
          console.log("[Gemini Exporter] Settings popup closed via UI action"),
          currentFocusedElement && currentFocusedElement.focus());
      }, 200));
  }
  const closePopupEvent = () => closePopup();
  ((currentFocusedElement = document.activeElement),
    document.addEventListener("keydown", handleEscKey),
    popup.addEventListener("click", handleOutsideClick),
    popup.addEventListener("close-popup", closePopupEvent));
}
function closeSettingsPopup(popupElement, backdropElement, styleElement) {
  (popupElement && popupElement.parentNode && popupElement.remove(),
    backdropElement && backdropElement.parentNode && backdropElement.remove(),
    styleElement && styleElement.parentNode && styleElement.remove(),
    (isSettingsPopupOpen = !1),
    console.log("[Gemini Exporter] Settings popup closed."));
}
function saveExportSettings() {
  try {
    (localStorage.setItem(
      "gemini-exporter-settings",
      JSON.stringify(exportSettings),
    ),
      console.log(
        "[Gemini Exporter] Exporter settings saved:",
        exportSettings,
      ));
  } catch (error) {
    console.error("[Gemini Exporter] Failed to save exporter settings:", error);
  }
}
function setupGlobalEventListeners() {
  (console.log(
    "[Gemini Exporter] Setting up global event listeners (double-click dismissal for dropdown).",
  ),
    document.removeEventListener("dblclick", handleGlobalDoubleClick),
    document.addEventListener("dblclick", handleGlobalDoubleClick));
}
function handleGlobalDoubleClick(e) {
  let dismissedSomething = !1;
  const shadowHost = document.querySelector("#gemini-exporter"),
    exportDropdown = document.getElementById("gemini-export-dropdown");
  if (exportDropdown && !exportDropdown.contains(e.target)) {
    exportDropdown.remove();
    const associatedStyleTag = document.getElementById(
      "gemini-export-dropdown-dynamic-styles",
    );
    (associatedStyleTag && associatedStyleTag.remove(),
      (isExportDropdownOpen = !1),
      shadowHost?.shadowRoot
        ?.querySelector("#export-button")
        ?.classList.remove("active"),
      (dismissedSomething = !0));
  }
  const settingsPopup = document.getElementById(
    "gemini-exporter-settings-popup",
  );
  (settingsPopup &&
    !settingsPopup.contains(e.target) &&
    (settingsPopup.dispatchEvent(new CustomEvent("close-popup")),
    (dismissedSomething = !0)),
    dismissedSomething &&
      console.log(
        "[Gemini Exporter] Dismissed open dropdown/popup via double-click.",
      ));
}
function toggleExportMode() {
  !!document.getElementById("gemini-selection-active")
    ? (console.log(
        "[Gemini Exporter] Toggling export mode: Exiting selection.",
      ),
      exitSelectionMode())
    : (console.log(
        "[Gemini Exporter] Toggling export mode: Entering selection.",
      ),
      enterSelectionMode());
}
loadInitialExportSettings();
let injectionTimeoutId = null,
  injectionObserver = null;
const attemptInjectButton = () => {
    (clearTimeout(injectionTimeoutId),
      (injectionTimeoutId = setTimeout(() => {
        const topBar = document.querySelector("top-bar-actions"),
          buttonExists = document.querySelector("#gemini-exporter");
        topBar && !buttonExists
          ? (console.log(
              "[Gemini Exporter] Target area found via timer/direct check. Injecting button.",
            ),
            injectButton(),
            injectionObserver &&
              (injectionObserver.disconnect(),
              (injectionObserver = null),
              console.log(
                "[Gemini Exporter] Disconnected injection observer after successful injection.",
              )))
          : buttonExists
            ? (console.log(
                "[Gemini Exporter] Button already present (timer/direct check).",
              ),
              injectionObserver &&
                (injectionObserver.disconnect(),
                (injectionObserver = null),
                console.log(
                  "[Gemini Exporter] Disconnected injection observer as button already exists.",
                )),
              document.getElementById("gemini-selection-active")
                ? (console.log(
                    "[Gemini Exporter] Found selection marker on load, re-initializing selection UI.",
                  ),
                  enterSelectionMode())
                : resetButtonState(getExportButtonElement()))
            : console.log(
                "[Gemini Exporter] Target area ('top-bar-actions') not found yet (timer/direct check). Waiting for observer or next check.",
              );
      }, 500)));
  },
  observerOptions = { childList: !0, subtree: !0 },
  startInjectionObserver = () => {
    if (!injectionObserver) {
      injectionObserver = new MutationObserver((mutationsList, observer) => {
        const topBar = document.querySelector("top-bar-actions"),
          buttonExists = document.querySelector("#gemini-exporter");
        topBar && !buttonExists
          ? (console.log(
              "[Gemini Exporter] MutationObserver detected potential target area update.",
            ),
            attemptInjectButton())
          : buttonExists &&
            (observer.disconnect(),
            (injectionObserver = null),
            console.log(
              "[Gemini Exporter] Disconnected injection observer as button now exists.",
            ),
            document.getElementById("gemini-selection-active")
              ? enterSelectionMode()
              : resetButtonState(getExportButtonElement()));
      });
      try {
        const targetNode = document.querySelector("body");
        if (!targetNode)
          return (
            console.error(
              "[Gemini Exporter] Cannot find <body> element to observe. Injection might fail.",
            ),
            void attemptInjectButton()
          );
        (injectionObserver.observe(targetNode, observerOptions),
          console.log(
            "[Gemini Exporter] Injection observer started on <body>, waiting for 'top-bar-actions'...",
          ));
      } catch (e) {
        (console.error(
          "[Gemini Exporter] Failed to start injection observer:",
          e,
        ),
          (injectionObserver = null),
          attemptInjectButton());
      }
    }
  };
function initializeExporter() {
  (console.log("[Gemini Exporter] Initializing Exporter..."),
    loadInitialExportSettings(),
    chrome.storage.sync.get("geminiButtonVisible", function (result) {
      const isButtonVisible =
        void 0 === result.geminiButtonVisible || result.geminiButtonVisible;
      if (
        (console.log(
          "[Gemini Exporter] Initial button visibility from storage:",
          isButtonVisible,
        ),
        !isButtonVisible)
      ) {
        console.log(
          "[Gemini Exporter] Button visibility set to false by user. Not proceeding with injection.",
        );
        const buttonContainer = document.getElementById("gemini-exporter");
        return void (
          buttonContainer &&
          (buttonContainer.remove(),
          console.log(
            "[Gemini Exporter] Removed pre-existing button because visibility is false.",
          ))
        );
      }
      console.log(
        "[Gemini Exporter] Button is visible. Proceeding with injection setup.",
      );
      let retries = 0,
        injectionInterval = null;
      injectionInterval = setInterval(() => {
        document.querySelector("top-bar-actions")
          ? (clearInterval(injectionInterval),
            (injectionInterval = null),
            console.log(
              "[Gemini Exporter] 'top-bar-actions' found. Calling injectButton().",
            ),
            injectButton(),
            setupMessageObserver(),
            setupGlobalEventListeners())
          : (retries++,
            retries >= 25 &&
              (clearInterval(injectionInterval),
              (injectionInterval = null),
              console.warn(
                "[Gemini Exporter] Target 'top-bar-actions' for button injection not found after multiple retries. Button not injected.",
              )));
      }, 800);
    }));
}
("loading" === document.readyState
  ? document.addEventListener("DOMContentLoaded", initializeExporter)
  : initializeExporter(),
  (() => {
    const BUTTON_ID = "gemini-export-pdf-button",
      PDF_BUTTON_CSS = `\n        .${BUTTON_ID} {\n            /* Layout & Sizing */\n            display: flex;\n            align-items: center;\n            gap: 6px; /* Space between icon and text */\n            padding: 8px 12px; /* 8px vertical, 12px horizontal */\n            \n            /* Typography */\n            font-family: 'Google Sans', Roboto, Arial, sans-serif; /* Ensure Google Sans is loaded by Gemini or provide reliable fallbacks */\n            font-size: 14px;\n            line-height: 20px;\n            font-weight: 500;\n            letter-spacing: 0.15px;\n            color: #1A73E8;\n            \n            /* Background */\n            background-color: #FFFFFF;\n            \n            /* Border */\n            border: 1px solid #DADCE0;\n            border-radius: 16px; /* Pill-shape */\n            \n            /* Icon - Handled by inline SVG stroke attribute */\n\n            /* Shadow */\n            box-shadow: none;\n            \n            /* Transition */\n            transition: background-color 120ms ease-in-out, box-shadow 120ms ease-in-out, border-color 120ms ease-in-out;\n            \n            /* User Interaction */\n            cursor: pointer;\n            user-select: none;\n            outline: none; /* Base, focus-visible will provide the ring */\n        }\n\n        .${BUTTON_ID} svg {\n            width: 16px;\n            height: 16px;\n            flex-shrink: 0; /* Prevent icon from shrinking */\n        }\n\n        .${BUTTON_ID}:hover {\n            background-color: rgba(26, 115, 232, 0.08);\n            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);\n        }\n\n        .${BUTTON_ID}:active {\n            background-color: rgba(26, 115, 232, 0.16);\n            box-shadow: none; /* Remove shadow on active, common pattern */\n        }\n\n        .${BUTTON_ID}:focus-visible {\n            outline: 2px solid #1A73E8;\n            outline-offset: 2px;\n            /* Optional: Match hover background for visual consistency on focus */\n            /* background-color: rgba(26, 115, 232, 0.08); */\n        }\n    `;
    function ensureStylesInjected() {
      if (document.getElementById("gemini-export-pdf-styles")) return;
      const styleElement = document.createElement("style");
      ((styleElement.id = "gemini-export-pdf-styles"),
        (styleElement.textContent = PDF_BUTTON_CSS),
        document.head.appendChild(styleElement));
    }
    function createAndInjectButton(toolbarElement) {
      if (document.getElementById(BUTTON_ID)) return;
      const button = document.createElement("button");
      ((button.id = BUTTON_ID),
        (button.className = BUTTON_ID),
        button.setAttribute("role", "button"),
        button.setAttribute("aria-label", "Export to PDF"),
        button.setAttribute("tabindex", "0"),
        (button.innerHTML =
          '\n        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#1A73E8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n            <path d="M14 2V8H20" stroke="#1A73E8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n            <path d="M10.5 15.5C10.5 16.3284 9.82843 17 9 17H7.5C6.67157 17 6 16.3284 6 15.5V12.5C6 11.6716 6.67157 11 7.5 11H9C9.82843 11 10.5 11.6716 10.5 12.5V13" stroke="#1A73E8" stroke-width="1.5"/>\n            <path d="M13.5 17V11H15.5C16.3284 11 17 11.6716 17 12.5V14.5C17 15.3284 16.3284 16 15.5 16H13.5" stroke="#1A73E8" stroke-width="1.5"/>\n            <path d="M17 13.5H13.5" stroke="#1A73E8" stroke-width="1.5"/>\n        </svg>\n    <span>PDF</span>'),
        button.addEventListener("click", () => {
          console.log(
            "Export to PDF button clicked. Implement your PDF generation logic here.",
          );
        }),
        button.addEventListener("keydown", (event) => {
          ("Enter" !== event.key && " " !== event.key) ||
            (event.preventDefault(), button.click());
        }),
        toolbarElement.appendChild(button));
    }
    new MutationObserver((mutationsList, obs) => {
      const toolbarElement = document.querySelector(".prompt-toolbar");
      toolbarElement &&
        (ensureStylesInjected(), createAndInjectButton(toolbarElement));
    }).observe(document.body, { childList: !0, subtree: !0 });
    const initialToolbar = document.querySelector(".prompt-toolbar");
    initialToolbar &&
      (ensureStylesInjected(), createAndInjectButton(initialToolbar));
  })());
