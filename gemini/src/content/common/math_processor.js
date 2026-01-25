function isKaTeXAvailable() {
  try {
    return void 0 !== window.katex;
  } catch (e) {
    return (
      console.warn("[Math Processor] Error checking KaTeX availability:", e),
      !1
    );
  }
}
const katexOptions = {
  throwOnError: !1,
  errorColor: "#cc0000",
  displayMode: !1,
  output: "htmlAndMathml",
  trust: !1,
  strict: !1,
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}",
    "\\ZZ": "\\mathbb{Z}",
    "\\QQ": "\\mathbb{Q}",
    "\\CC": "\\mathbb{C}",
    "\\FF": "\\mathbb{F}",
  },
};
function processLatexMath(html) {
  if (!html || !isKaTeXAvailable()) return html;
  let processed = html;
  return (
    (processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      try {
        return `<span class="math-display-block">${katex.renderToString(math.trim(), { ...katexOptions, displayMode: !0 })}</span>`;
      } catch (e) {
        return (
          console.warn("[Math Processor] Failed to render display math:", e),
          `<span class="math-fallback math-display-fallback" data-math="${encodeHtmlAttribute(math)}">$$${escapeHtml(math)}$$</span>`
        );
      }
    })),
    (processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      try {
        return `<span class="math-display-block">${katex.renderToString(math.trim(), { ...katexOptions, displayMode: !0 })}</span>`;
      } catch (e) {
        return (
          console.warn("[Math Processor] Failed to render display math:", e),
          `<span class="math-fallback math-display-fallback" data-math="${encodeHtmlAttribute(math)}">\\[${escapeHtml(math)}\\]</span>`
        );
      }
    })),
    (processed = processed.replace(
      /(?<![\\$])\$(?!\$)([^\$\n]+?)\$(?!\$)/g,
      (match, math) => {
        if (!/[\\^_{}\\]|\\[a-zA-Z]+/.test(math)) return match;
        try {
          return `<span class="math-inline-block">${katex.renderToString(math.trim(), { ...katexOptions, displayMode: !1 })}</span>`;
        } catch (e) {
          return (
            console.warn("[Math Processor] Failed to render inline math:", e),
            `<span class="math-fallback math-inline-fallback" data-math="${encodeHtmlAttribute(math)}">$${escapeHtml(math)}$</span>`
          );
        }
      },
    )),
    (processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
      try {
        return `<span class="math-inline-block">${katex.renderToString(math.trim(), { ...katexOptions, displayMode: !1 })}</span>`;
      } catch (e) {
        return (
          console.warn("[Math Processor] Failed to render inline math:", e),
          `<span class="math-fallback math-inline-fallback" data-math="${encodeHtmlAttribute(math)}">\\(${escapeHtml(math)}\\)</span>`
        );
      }
    })),
    processed
  );
}
function processMathML(html) {
  if (!html || !isKaTeXAvailable()) return html;
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return (
    tempDiv.querySelectorAll("math").forEach((mathElement) => {
      try {
        const annotation = mathElement.querySelector(
          'annotation[encoding="application/x-tex"], annotation[encoding="LaTeX"]',
        );
        if (annotation && annotation.textContent) {
          const latex = annotation.textContent.trim(),
            displayMode = "block" === mathElement.getAttribute("display"),
            rendered = katex.renderToString(latex, {
              ...katexOptions,
              displayMode: displayMode,
            }),
            wrapper = document.createElement("span");
          ((wrapper.className = displayMode
            ? "math-display-block"
            : "math-inline-block"),
            (wrapper.innerHTML = rendered),
            mathElement.parentNode.replaceChild(wrapper, mathElement));
        } else mathElement.classList.add("mathml-content");
      } catch (e) {
        (console.warn("[Math Processor] Failed to process MathML:", e),
          mathElement.classList.add("mathml-fallback"));
      }
    }),
    tempDiv.innerHTML
  );
}
function processMathContent(html) {
  if (!html) return html;
  let processed = processMathML(html);
  return (
    (processed = processLatexMath(processed)),
    (processed = processGeminiMathElements(processed)),
    processed
  );
}
function processGeminiMathElements(html) {
  if (!html || !isKaTeXAvailable()) return html;
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  tempDiv.querySelectorAll("code").forEach((codeBlock) => {
    const text = codeBlock.textContent;
    if (text && /^\$.*\$$|^\\\[.*\\\]$|^\\\(.*\\\)$/.test(text.trim()))
      try {
        let latex = text.trim(),
          displayMode = !1;
        (latex.startsWith("$$") && latex.endsWith("$$")) ||
        (latex.startsWith("\\[") && latex.endsWith("\\]"))
          ? ((latex = latex.slice(2, -2)), (displayMode = !0))
          : latex.startsWith("\\(") && latex.endsWith("\\)")
            ? (latex = latex.slice(2, -2))
            : latex.startsWith("$") &&
              latex.endsWith("$") &&
              (latex = latex.slice(1, -1));
        const rendered = katex.renderToString(latex, {
            ...katexOptions,
            displayMode: displayMode,
          }),
          wrapper = document.createElement("span");
        ((wrapper.className = displayMode
          ? "math-display-block"
          : "math-inline-block"),
          (wrapper.innerHTML = rendered),
          codeBlock.parentNode.replaceChild(wrapper, codeBlock));
      } catch (e) {}
  });
  return (
    tempDiv
      .querySelectorAll(
        'span[class*="math"], span[class*="formula"], span[class*="equation"]',
      )
      .forEach((span) => {
        if (!span.querySelector(".katex")) {
          const text = span.textContent;
          if (text && /[\\^_{}]|\\[a-zA-Z]+/.test(text))
            try {
              const displayMode =
                  span.classList.contains("display") ||
                  span.classList.contains("block") ||
                  "block" === span.style.display,
                rendered = katex.renderToString(text.trim(), {
                  ...katexOptions,
                  displayMode: displayMode,
                });
              ((span.innerHTML = rendered),
                span.classList.add(
                  displayMode ? "math-display-block" : "math-inline-block",
                ));
            } catch (e) {
              span.classList.add("math-processing-failed");
            }
        }
      }),
    tempDiv.innerHTML
  );
}
function escapeHtml(text) {
  const div = document.createElement("div");
  return ((div.textContent = text), div.innerHTML);
}
function encodeHtmlAttribute(text) {
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function addMathStyles() {
  if (document.getElementById("math-processor-styles")) return;
  const style = document.createElement("style");
  ((style.id = "math-processor-styles"),
    (style.textContent =
      "\n        .math-display-block {\n            display: block;\n            text-align: center;\n            margin: 1em 0;\n            page-break-inside: avoid;\n        }\n        \n        .math-inline-block {\n            display: inline-block;\n            vertical-align: middle;\n        }\n        \n        .math-fallback {\n            font-family: 'Courier New', monospace;\n            background-color: rgba(255, 0, 0, 0.1);\n            padding: 2px 4px;\n            border-radius: 3px;\n        }\n        \n        .math-display-fallback {\n            display: block;\n            text-align: center;\n            margin: 1em 0;\n        }\n        \n        .math-inline-fallback {\n            display: inline-block;\n        }\n        \n        /* Ensure KaTeX renders properly in PDFs */\n        .katex {\n            font-size: 1.1em;\n            color: inherit;\n        }\n        \n        .katex-display {\n            margin: 0.5em 0;\n        }\n        \n        /* MathML fallback styles */\n        math {\n            display: inline-block;\n            font-family: 'Times New Roman', serif;\n            font-size: 1.1em;\n        }\n        \n        math[display=\"block\"] {\n            display: block;\n            text-align: center;\n            margin: 1em 0;\n        }\n        \n        .mathml-fallback {\n            background-color: rgba(255, 255, 0, 0.1);\n            padding: 2px;\n        }\n    "),
    document.head.appendChild(style));
}
("undefined" != typeof window &&
  (addMathStyles(),
  (window.mathProcessor = {
    processMathContent: processMathContent,
    processLatexMath: processLatexMath,
    processMathML: processMathML,
    isKaTeXAvailable: isKaTeXAvailable,
    addMathStyles: addMathStyles,
  })),
  "undefined" != typeof module &&
    module.exports &&
    (module.exports = {
      processMathContent: processMathContent,
      processLatexMath: processLatexMath,
      processMathML: processMathML,
      isKaTeXAvailable: isKaTeXAvailable,
      addMathStyles: addMathStyles,
    }));
