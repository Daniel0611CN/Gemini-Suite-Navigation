// content.js

// --- Globals ---
let sidebar;
let promptCounter = 0;
const PROMPT_SELECTOR = 'user-query-content .query-text';

/**
 * Debounce function to limit the rate at which a function gets called.
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


/**
 * Creates and injects the main sidebar container into the page.
 * The sidebar is created only once.
 */
function createSidebar() {
    if (document.getElementById('gemini-chat-navigator-sidebar')) {
        return; // Sidebar already exists
    }

    sidebar = document.createElement('div');
    sidebar.id = 'gemini-chat-navigator-sidebar';

    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `
        <h2>Chat Navigator</h2>
        <button id="toggle-sidebar-btn" title="Toggle Navigator">‹</button>
    `;
    sidebar.appendChild(header);

    const navList = document.createElement('ul');
    navList.id = 'gemini-nav-list';
    sidebar.appendChild(navList);

    document.body.appendChild(sidebar);

    // --- Event Listeners ---

    // Add hover-to-peek functionality
    sidebar.addEventListener('mouseenter', () => {
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('peek');
        }
    });

    sidebar.addEventListener('mouseleave', () => {
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('peek');
        }
    });

    // Event listener for the permanent toggle button
    const toggleButton = document.getElementById('toggle-sidebar-btn');
    toggleButton.addEventListener('click', () => {
        sidebar.classList.remove('peek');
        sidebar.classList.toggle('collapsed');

        const isCollapsed = sidebar.classList.contains('collapsed');
        toggleButton.textContent = isCollapsed ? '›' : '‹';

        // Save the state to chrome.storage
        chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
    });
}

/**
 * Finds all user prompts on the page, extracts text, and updates the navigation sidebar.
 * This function is designed to be idempotent and can be called multiple times.
 */
function updateNavigation() {
    const navList = document.getElementById('gemini-nav-list');
    if (!navList) {
        console.log("Gemini Navigator: Nav list not found. Bailing.");
        return;
    }

    const prompts = document.querySelectorAll(PROMPT_SELECTOR);

    // Clear existing links to rebuild them, ensuring order and no duplicates.
    navList.innerHTML = '';
    promptCounter = 0;

    prompts.forEach(promptEl => {
        promptCounter++; // Increment at the start for 1-based indexing

        // Find the closest parent that can serve as a reliable anchor
        const anchorEl = promptEl.closest('user-query') || promptEl;
        if (!anchorEl.id) {
            anchorEl.id = `gemini-prompt-${promptCounter}`;
        }

        // Extract the first line or first 50 characters as the title
        let linkText = promptEl.textContent.trim().split('\n')[0];
        if (linkText.length > 50) {
            linkText = linkText.substring(0, 50) + '...';
        }

        if (!linkText) return; // Skip empty prompts

        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${anchorEl.id}`;
        link.title = promptEl.textContent.trim(); // Full prompt on hover

        // Create spans for number and text for better styling
        const numberSpan = document.createElement('span');
        numberSpan.className = 'prompt-number';
        numberSpan.textContent = `${promptCounter}.`;

        const textSpan = document.createElement('span');
        textSpan.className = 'prompt-text';
        textSpan.textContent = linkText;

        link.appendChild(numberSpan);
        link.appendChild(textSpan);

        // Add smooth scroll behavior
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetElement = document.getElementById(anchorEl.id);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    // ** FIX ** Changed from 'center' to 'start' to align to the top
                    block: 'start'
                });
                // Add a temporary highlight to the scrolled-to element
                const highlightTarget = targetElement.querySelector('.user-query-container') || targetElement;
                highlightTarget.classList.add('highlight-prompt');
                setTimeout(() => {
                    highlightTarget.classList.remove('highlight-prompt');
                }, 1500);
            }
        });

        listItem.appendChild(link);
        navList.appendChild(listItem);
    });
}

// --- Main Execution ---

// Debounced version of our update function for performance
const debouncedUpdate = debounce(updateNavigation, 500);

// Function to initialize the extension
function initialize() {
    createSidebar();

    // Load the saved state from chrome.storage
    chrome.storage.local.get('sidebarCollapsed', (data) => {
        if (data.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            document.getElementById('toggle-sidebar-btn').textContent = '›';
        }
    });

    // Initial scan of the page
    debouncedUpdate();

    // Set up a MutationObserver to watch for changes in the chat log
    const observerTarget = document.body;
    if (!observerTarget) {
        console.error("Gemini Navigator: Could not find observer target.");
        return;
    }

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const hasNewContent = Array.from(mutation.addedNodes).some(node => node.nodeType === 1 && node.querySelector(PROMPT_SELECTOR));
                if (hasNewContent) {
                    debouncedUpdate();
                    return;
                }
            }
        }
    });

    observer.observe(observerTarget, {
        childList: true,
        subtree: true
    });

    console.log("Gemini Chat Navigator is active.");
}

// Use a timer to check if the chat interface has loaded.
const initInterval = setInterval(() => {
    if (document.querySelector(PROMPT_SELECTOR)) {
        clearInterval(initInterval);
        initialize();
    }
}, 500);


// ============================================================================
// Gemini Bulk Deleter v3.0 - Final Version
// ============================================================================

// --- SELETORES ---
const CHAT_ITEM_SELECTOR = ".conversation-items-container";
const BOTTOM_CONTROLS_SELECTOR =
    'side-nav-action-button[data-test-id="settings-and-help-button"]';
const MORE_OPTIONS_BUTTON_SELECTOR =
    'button[data-test-id="actions-menu-button"]';
const MENU_DELETE_BUTTON_SELECTOR = ".mat-mdc-menu-item";
const CONFIRM_DELETE_BUTTON_SELECTOR = 'button[data-test-id="confirm-button"]';
const CHAT_CLICKABLE_AREA_SELECTOR = ".conversation";
const SIDE_NAV_SELECTOR = "mat-drawer";
const SIDE_NAV_COLLAPSED_CLASS = "mat-drawer-closed";

// --- ESTADO DA APLICAÇÃO ---
let isSelectionModeActive = false;
let bulkDeleteButton;

// CHAMA A FUNÇÃO PARA INJETAR A FONTE DE ÍCONES
injectFont();

// --- LÓGICA PRINCIPAL ---

/**
 * Observa o DOM para injetar nossa UI quando o Gemini carregar.
 */
const observer = new MutationObserver((mutations, obs) => {
    const bottomControls = document.querySelector(BOTTOM_CONTROLS_SELECTOR);
    if (bottomControls && !document.getElementById("geminiBulkDeleteBtn")) {
        console.log("Gemini UI detectada. Injetando botão de exclusão em massa.");
        injectInitialUI(bottomControls);
        obs.disconnect();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

/**
 * Injeta o botão inicial "Select" na UI.
 * @param {HTMLElement} targetElement - O elemento de 'Configurações' antes do qual vamos inserir nosso botão.
 */
function injectInitialUI(targetElement) {
    bulkDeleteButton = document.createElement("button");
    bulkDeleteButton.id = "geminiBulkDeleteBtn";

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "delete";

    const text = document.createElement("span");
    text.id = "bulkDeleteBtnText";
    text.textContent = "Select";

    bulkDeleteButton.append(icon, text);
    bulkDeleteButton.onclick = toggleSelectionMode;

    targetElement.before(bulkDeleteButton);
}

/**
 * Ativa ou desativa o modo de seleção, mostrando/escondendo os checkboxes.
 */
function toggleSelectionMode() {
    isSelectionModeActive = !isSelectionModeActive;
    const chatItems = document.querySelectorAll(CHAT_ITEM_SELECTOR);
    const buttonText = document.getElementById("bulkDeleteBtnText");

    if (isSelectionModeActive) {
        buttonText.textContent = "Cancel";
        bulkDeleteButton.classList.add("cancel-mode");
        bulkDeleteButton.classList.remove("active-delete");

        chatItems.forEach((item) => {
            const clickableArea = item.querySelector(CHAT_CLICKABLE_AREA_SELECTOR);
            if (!clickableArea || item.querySelector(".bulk-delete-checkbox")) return;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "bulk-delete-checkbox";

            checkbox.onclick = (event) => {
                event.stopPropagation();
                updateDeleteButtonState();
            };

            clickableArea.prepend(checkbox);
            item.classList.add("selection-active");
        });
    } else {
        document
            .querySelectorAll(".bulk-delete-checkbox")
            .forEach((cb) => cb.remove());
        document
            .querySelectorAll(".selection-active")
            .forEach((item) => item.classList.remove("selection-active"));

        buttonText.textContent = "Select";
        bulkDeleteButton.onclick = toggleSelectionMode;
        bulkDeleteButton.classList.remove("active-delete", "cancel-mode");
    }
}

/**
 * Injeta a fonte de ícones do Google diretamente no <head> da página.
 * Isso é mais robusto contra políticas de segurança (CSP) do que o @import no CSS.
 */
function injectFont() {
    if (document.getElementById("gemini-icon-font")) return;
    const fontLink = document.createElement("link");
    fontLink.id = "gemini-icon-font";
    fontLink.rel = "stylesheet";
    fontLink.href =
        "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
    document.head.appendChild(fontLink);
    console.log("Fonte de Ícones Material Symbols injetada via JavaScript.");
}

/**
 * Injeta o botão inicial "Select" na UI.
 * @param {HTMLElement} targetElement - O elemento de 'Configurações' antes do qual vamos inserir nosso botão.
 */
function injectInitialUI(targetElement) {
    bulkDeleteButton = document.createElement("button");
    bulkDeleteButton.id = "geminiBulkDeleteBtn";

    // Cria o ícone
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "delete";

    // Cria o texto
    const text = document.createElement("span");
    text.id = "bulkDeleteBtnText";
    text.textContent = "Select";

    // NOVO: Cria o alvo de toque para o efeito de hover
    const touchTarget = document.createElement("span");
    touchTarget.className = "mat-mdc-button-touch-target";

    // Adiciona todos os elementos ao botão na ordem correta
    bulkDeleteButton.append(icon, text, touchTarget);
    bulkDeleteButton.onclick = toggleSelectionMode;

    targetElement.before(bulkDeleteButton);
}

/**
 * Atualiza a aparência e função do botão principal com base nos checkboxes marcados.
 */
function updateDeleteButtonState() {
    const checkedCount = document.querySelectorAll(
        ".bulk-delete-checkbox:checked"
    ).length;
    const buttonText = document.getElementById("bulkDeleteBtnText");

    if (checkedCount > 0) {
        buttonText.textContent = `Delete (${checkedCount})`;
        bulkDeleteButton.classList.add("active-delete");
        bulkDeleteButton.classList.remove("cancel-mode");
        bulkDeleteButton.onclick = handleBulkDelete;
    } else {
        buttonText.textContent = "Cancel";
        bulkDeleteButton.classList.remove("active-delete");
        bulkDeleteButton.classList.add("cancel-mode");
        bulkDeleteButton.onclick = toggleSelectionMode;
    }
}

/**
 * Executa a lógica de exclusão para os itens selecionados.
 */
async function handleBulkDelete() {
    const checkedItems = document.querySelectorAll(
        ".bulk-delete-checkbox:checked"
    );
    if (checkedItems.length === 0) return;

    if (
        !confirm(`Are you sure you want to delete ${checkedItems.length} chat(s)?`)
    ) {
        return;
    }

    bulkDeleteButton.disabled = true;
    const buttonText = document.getElementById("bulkDeleteBtnText");
    const total = checkedItems.length;

    // Usamos um loop 'for' tradicional com índice para podermos mostrar o progresso
    for (let i = 0; i < total; i++) {
        const checkbox = checkedItems[i];
        const chatItem = checkbox.closest(CHAT_ITEM_SELECTOR);

        // ATUALIZA O CONTADOR ANTES de tentar deletar
        buttonText.textContent = `Deleting ${i + 1} of ${total}...`;

        try {
            const moreOptionsBtn = chatItem.querySelector(
                MORE_OPTIONS_BUTTON_SELECTOR
            );
            if (moreOptionsBtn) moreOptionsBtn.click();

            const deleteOption = await waitForElement(
                'button[data-test-id="delete-button"]'
            );
            if (deleteOption) deleteOption.click();
            else throw new Error("Botão 'Delete' do menu não encontrado.");

            const confirmButton = await waitForElement(
                'button[data-test-id="confirm-button"]'
            );
            if (confirmButton) confirmButton.click();
            else throw new Error("Botão de confirmação final não encontrado.");

            await sleep(250); // Pausa para a UI respirar
        } catch (error) {
            console.error(
                "Falha ao deletar chat:",
                chatItem.textContent.trim(),
                error
            );
            chatItem.classList.add("deletion-failed");
        }
    }

    // --- LIMPEZA FINAL ---
    // Acontece uma única vez, APÓS o loop terminar completamente.
    bulkDeleteButton.disabled = false;
    toggleSelectionMode();
}

/**
 * Espera de forma inteligente por um elemento aparecer no DOM.
 * Em vez de um tempo fixo, ele verifica continuamente até encontrar o elemento ou um tempo limite ser atingido.
 * @param {string} selector - O seletor CSS do elemento a ser esperado.
 * @param {number} timeout - O tempo máximo de espera em milissegundos.
 * @returns {Promise<Element|null>} - O elemento encontrado ou null se o tempo esgotar.
 */
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                console.warn(
                    `Timeout: Elemento "${selector}" não encontrado em ${timeout}ms.`
                );
                resolve(null);
            }
        }, 100); // Verifica a cada 100ms
    });
}

/**
 * Inicia a observação da UI principal para injetar o botão e o observador da barra lateral.
 */
function initialize() {
    injectFont(); // Garante que a fonte dos ícones seja carregada

    const mainObserver = new MutationObserver((mutations, obs) => {
        const bottomControls = document.querySelector(BOTTOM_CONTROLS_SELECTOR);
        const sideNav = document.querySelector(SIDE_NAV_SELECTOR);

        // Precisamos tanto do local do botão quanto da barra lateral para continuar
        if (
            bottomControls &&
            sideNav &&
            !document.getElementById("geminiBulkDeleteBtn")
        ) {
            console.log("Gemini UI detectada. Injetando UI e observadores.");

            injectInitialUI(bottomControls);
            setupSidebarObserver(sideNav); // Inicia o nosso novo "espião"

            obs.disconnect(); // Para de observar a UI principal
        }
    });

    mainObserver.observe(document.body, { childList: true, subtree: true });
}

/**
 * Configura o "espião" que observa as mudanças de classe na barra lateral.
 * @param {HTMLElement} sideNavElement - O elemento da barra lateral a ser vigiado.
 */
function setupSidebarObserver(sideNavElement) {
    const sidebarObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            // Se o que mudou foi o atributo 'class'
            if (
                mutation.type === "attributes" &&
                mutation.attributeName === "class"
            ) {
                const target = mutation.target;
                // Verifica se a classe de "encolhido" está presente
                if (target.classList.contains(SIDE_NAV_COLLAPSED_CLASS)) {
                    bulkDeleteButton.classList.add("icon-only");
                } else {
                    bulkDeleteButton.classList.remove("icon-only");
                }
            }
        }
    });

    // Inicia a observação e também checa o estado inicial
    sidebarObserver.observe(sideNavElement, { attributes: true });
    if (sideNavElement.classList.contains(SIDE_NAV_COLLAPSED_CLASS)) {
        bulkDeleteButton.classList.add("icon-only");
    }
}

/**
 * Função utilitária para criar pausas.
 * @param {number} ms - Tempo em milissegundos.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

initialize();


// Evita che lo script venga iniettato più volte
if (typeof window.geminiFolderExtensionLoaded === 'undefined') {
    // Per favore, incolla qui il contenuto della libreria LZ-String v1.4.4
    // URL: https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
    var LZString = function () { function o(o, r) { if (!t[o]) { t[o] = {}; for (var n = 0; n < o.length; n++)t[o][o.charAt(n)] = n } return t[o][r] } var r = String.fromCharCode, n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$", t = {}, i = { compressToBase64: function (o) { if (null == o) return ""; var r = i._compress(o, 6, function (o) { return n.charAt(o) }); switch (r.length % 4) { default: case 0: return r; case 1: return r + "==="; case 2: return r + "=="; case 3: return r + "=" } }, decompressFromBase64: function (r) { return null == r ? "" : "" == r ? null : i._decompress(r.length, 32, function (e) { return o(n, r.charAt(e)) }) }, compressToUTF16: function (o) { return null == o ? "" : i._compress(o, 15, function (o) { return r(o + 32) }) + " " }, decompressFromUTF16: function (o) { return null == o ? "" : "" == o ? null : i._decompress(o.length, 16384, function (r) { return o.charCodeAt(r) - 32 }) }, compressToUint8Array: function (o) { for (var r = i.compress(o), n = new Uint8Array(2 * r.length), e = 0, t = r.length; t > e; e++) { var s = r.charCodeAt(e); n[2 * e] = s >>> 8, n[2 * e + 1] = s % 256 } return n }, decompressFromUint8Array: function (o) { if (null === o || void 0 === o) return i.decompress(o); for (var n = new Array(o.length / 2), e = 0, t = n.length; t > e; e++)n[e] = 256 * o[2 * e] + o[2 * e + 1]; var s = []; return n.forEach(function (o) { s.push(r(o)) }), i.decompress(s.join("")) }, compressToEncodedURIComponent: function (o) { return null == o ? "" : i._compress(o, 6, function (o) { return e.charAt(o) }) }, decompressFromEncodedURIComponent: function (r) { return null == r ? "" : "" == r ? null : (r = r.replace(/ /g, "+"), i._decompress(r.length, 32, function (n) { return o(e, r.charAt(n)) })) }, compress: function (o) { return i._compress(o, 16, function (o) { return r(o) }) }, _compress: function (o, r, n) { if (null == o) return ""; var e, t, i, s = {}, p = {}, u = "", c = "", a = "", l = 2, f = 3, h = 2, d = [], m = 0, v = 0; for (i = 0; i < o.length; i += 1)if (u = o.charAt(i), Object.prototype.hasOwnProperty.call(s, u) || (s[u] = f++, p[u] = !0), c = a + u, Object.prototype.hasOwnProperty.call(s, c)) a = c; else { if (Object.prototype.hasOwnProperty.call(p, a)) { if (a.charCodeAt(0) < 256) { for (e = 0; h > e; e++)m <<= 1, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++; for (t = a.charCodeAt(0), e = 0; 8 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } else { for (t = 1, e = 0; h > e; e++)m = m << 1 | t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0; for (t = a.charCodeAt(0), e = 0; 16 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } l--, 0 == l && (l = Math.pow(2, h), h++), delete p[a] } else for (t = s[a], e = 0; h > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1; l--, 0 == l && (l = Math.pow(2, h), h++), s[c] = f++, a = String(u) } if ("" !== a) { if (Object.prototype.hasOwnProperty.call(p, a)) { if (a.charCodeAt(0) < 256) { for (e = 0; h > e; e++)m <<= 1, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++; for (t = a.charCodeAt(0), e = 0; 8 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } else { for (t = 1, e = 0; h > e; e++)m = m << 1 | t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t = 0; for (t = a.charCodeAt(0), e = 0; 16 > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1 } l--, 0 == l && (l = Math.pow(2, h), h++), delete p[a] } else for (t = s[a], e = 0; h > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1; l--, 0 == l && (l = Math.pow(2, h), h++) } for (t = 2, e = 0; h > e; e++)m = m << 1 | 1 & t, v == r - 1 ? (v = 0, d.push(n(m)), m = 0) : v++, t >>= 1; for (; ;) { if (m <<= 1, v == r - 1) { d.push(n(m)); break } v++ } return d.join("") }, decompress: function (o) { return null == o ? "" : "" == o ? null : i._decompress(o.length, 32768, function (r) { return o.charCodeAt(r) }) }, _decompress: function (o, n, e) { var t, i, s, p, u, c, a, l, f = [], h = 4, d = 4, m = 3, v = "", w = [], A = { val: e(0), position: n, index: 1 }; for (i = 0; 3 > i; i += 1)f[i] = i; for (p = 0, c = Math.pow(2, 2), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; switch (t = p) { case 0: for (p = 0, c = Math.pow(2, 8), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; l = r(p); break; case 1: for (p = 0, c = Math.pow(2, 16), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; l = r(p); break; case 2: return "" }for (f[3] = l, s = l, w.push(l); ;) { if (A.index > o) return ""; for (p = 0, c = Math.pow(2, m), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; switch (l = p) { case 0: for (p = 0, c = Math.pow(2, 8), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; f[d++] = r(p), l = d - 1, h--; break; case 1: for (p = 0, c = Math.pow(2, 16), a = 1; a != c;)u = A.val & A.position, A.position >>= 1, 0 == A.position && (A.position = n, A.val = e(A.index++)), p |= (u > 0 ? 1 : 0) * a, a <<= 1; f[d++] = r(p), l = d - 1, h--; break; case 2: return w.join("") }if (0 == h && (h = Math.pow(2, m), m++), f[l]) v = f[l]; else { if (l !== d) return null; v = s + s.charAt(0) } w.push(v), f[d++] = s + v.charAt(0), h--, s = v, 0 == h && (h = Math.pow(2, m), m++) } } }; return i }(); "function" == typeof define && define.amd ? define(function () { return LZString }) : "undefined" != typeof module && null != module && (module.exports = LZString);



    // NOTA: La condizione "if (typeof window.geminiFolderExtensionLoaded === 'undefined')"
    // è gestita dallo script di build (build.js) che avvolge l'intero contenuto.

    window.geminiFolderExtensionLoaded = true;
    console.log("Gemini Folder Extension - Caricato! v4.10.10"); // Aggiornata versione

    const GFE_PREFIX = 'gfe-';
    const GFE_INTERNAL_DND_TYPE = 'application/gfe-internal-dnd';
    const GFE_RECENT_DND_TYPE = 'application/gfe-recent-dnd';

    // --- STATO GLOBALE ---
    let foldersData = [];
    let panelsState = {};
    let geminiApiKey = null;
    let hideOrganizedChats = false; // Nuova impostazione per nascondere chat organizzate
    let updatePageTitle = false; // Nuova impostazione per aggiornare il titolo della pagina
    let pageTitlePrefix = 'Google Gemini - '; // Prefisso default
    let confirmationSettings = {}; // Nuova impostazione per salvare le preferenze di conferma
    let defaultPageTitle = null; // Memorizza il titolo originale di Gemini
    let localUpdateId = null; // ID della versione dei dati attualmente caricata in memoria

    let isAddModeActive = false;
    let isDataStale = false; // Flag per la modalità "noupdated"
    let dataLoaded = false;
    let gfeRecentChatsObserver = null;
    let gfeActiveChatObserver = null;
    let lastKnownUrl = '';
    let isInitialHighlightDone = false;


    // --- Funzioni di Utilità e Gestione Dati ---

    function getMessage(key, substitutions) {
        try {
            return chrome.i18n.getMessage(key, substitutions);
        } catch (e) {
            console.warn(`GFE: Chiave i18n non trovata: ${key}`);
            return key;
        }
    }

    function migrateDataStructure(items) {
        items.forEach(item => {
            if (item.type === 'folder') {
                if (Array.isArray(item.children)) {
                    migrateDataStructure(item.children);
                } else {
                    item.children = [];
                }
            } else if (item.type === 'chatmark') {
                if (!item.chatId && item.id.startsWith('c_')) {
                    item.chatId = item.id;
                    item.id = GFE_PREFIX + 'chatmark-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                }
            }
        });
    }

    function findItemRecursive(items, itemId) {
        let result = null;

        function search(currentItems, parent) {
            if (result) return;
            for (let i = 0; i < currentItems.length; i++) {
                const item = currentItems[i];
                if (item.id === itemId) {
                    result = {
                        item,
                        parent,
                        items: currentItems,
                        index: i
                    };
                    return;
                }
                if (item.type === 'folder' && item.children) {
                    search(item.children, item);
                }
            }
        }
        search(items, null);
        return result;
    }

    function findItemByChatIdRecursive(items, chatId) {
        let results = [];

        function search(currentItems, parent) {
            for (let i = 0; i < currentItems.length; i++) {
                const item = currentItems[i];
                if (item.type === 'chatmark' && item.chatId === chatId) {
                    results.push({ item, parent, items: currentItems, index: i });
                }
                if (item.type === 'folder' && item.children) {
                    search(item.children, item);
                }
            }
        }
        search(items, null);
        return results;
    }

    // NUOVA LOGICA DI CARICAMENTO E SALVATGGIO DATI (COMPRESSA E CHUNKED)
    const CHUNK_SIZE = 7000; // 7KB

    async function saveLocalBackup() {
        if (typeof LZString === 'undefined') {
            console.error("GFE: LZ-String non è caricata. Impossibile salvare i backup locali.");
            return;
        }
        try {
            // 1. Leggi i backup compressi esistenti
            const result = await chrome.storage.local.get('gfe_local_backups_compressed');
            let backups = [];
            if (result.gfe_local_backups_compressed) {
                const decompressed = LZString.decompressFromBase64(result.gfe_local_backups_compressed);
                backups = JSON.parse(decompressed) || [];
            }

            // 2. Aggiungi il nuovo backup
            const newBackup = {
                timestamp: Date.now(),
                folders: JSON.parse(JSON.stringify(foldersData)) // Deep copy
            };
            backups.push(newBackup);

            // 3. Ordina per data (il più recente prima)
            backups.sort((a, b) => b.timestamp - a.timestamp);

            // 4. Mantieni solo gli ultimi 5
            const latestBackups = backups.slice(0, 5);

            // 5. Comprimi e salva
            const compressedBackups = LZString.compressToBase64(JSON.stringify(latestBackups));
            await chrome.storage.local.set({ 'gfe_local_backups_compressed': compressedBackups });

            // Pulisci le vecchie chiavi di backup non compresse per manutenzione
            await chrome.storage.local.remove(['gfe_local_backups', 'gfe_local_backup_index']);

            console.log(`GFE: Backup locale compresso e ordinato salvato.`);

        } catch (e) {
            console.error("GFE: Errore durante il salvataggio del backup locale:", e);
        }
    }

    async function saveFolders(isStructuralChange = true) {
        if (typeof LZString === 'undefined') {
            console.error("GFE: LZ-String non è caricata. Impossibile salvare i dati.");
            return;
        }
        // Pulisce i vecchi dati prima di salvare i nuovi
        const oldKeysResult = await chrome.storage.sync.get(null);
        const keysToRemove = Object.keys(oldKeysResult).filter(k => k.startsWith('folders_') || k === 'folders');
        if (keysToRemove.length > 0) {
            try {
                await chrome.storage.sync.remove(keysToRemove);
            } catch (removeError) {
                console.warn("GFE: Errore durante la rimozione delle vecchie chiavi sync:", removeError);
            }
        }

        const jsonString = JSON.stringify(foldersData);
        const compressedString = LZString.compressToBase64(jsonString);

        const newUpdateId = Date.now();
        localUpdateId = newUpdateId;

        try {
            if (compressedString.length < CHUNK_SIZE) {
                await chrome.storage.sync.set({
                    'folders_compressed': compressedString,
                    'lastUpdateId': newUpdateId
                });
            } else {
                const numChunks = Math.ceil(compressedString.length / CHUNK_SIZE);
                const chunks = {};
                for (let i = 0; i < numChunks; i++) {
                    chunks[`folders_chunk_${i}`] = compressedString.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                }
                await chrome.storage.sync.set(chunks);
                await chrome.storage.sync.set({
                    'folders_chunk_count': numChunks,
                    'lastUpdateId': newUpdateId
                });
            }
            // backup locale solo se è una modifica strutturale
            if (isStructuralChange) {
                await saveLocalBackup();
            }
        } catch (e) {
            console.error(`GFE: Errore nel salvataggio dei dati delle cartelle:`, e);
            if (e.message && e.message.includes('QUOTA_BYTES')) {
                showGFENotification(getMessage("syncQuotaExceeded"), 5000);
            } else {
                showGFENotification(getMessage("genericError"), 5000);
            }
        }
    }

    async function saveNonCriticalData(key, value) {
        try {
            await chrome.storage.sync.set({ [key]: value });
        } catch (e) {
            console.error(`GFE: Errore nel salvataggio dei dati per "${key}":`, e);
        }
    }

    async function loadData() {
        if (typeof LZString === 'undefined') {
            console.error("GFE: LZ-String non è caricata. Impossibile caricare i dati.");
            return;
        }

        const result = await chrome.storage.sync.get([
            'folders_compressed',
            'folders_chunk_count',
            'folders', // Per retrocompatibilità
            'panelsState',
            'geminiApiKey',
            'hideOrganizedChats',
            'updatePageTitle',
            'pageTitlePrefix', // Nuova impostazione
            'confirmationSettings', // Nuova: impostazioni conferme
            'lastUpdateId'
        ]);

        panelsState = result.panelsState || {};
        geminiApiKey = result.geminiApiKey || null;
        hideOrganizedChats = result.hideOrganizedChats || false;
        updatePageTitle = result.updatePageTitle || false;
        confirmationSettings = result.confirmationSettings || {}; // Load conf settings
        // Imposta il default se non presente
        pageTitlePrefix = (result.pageTitlePrefix !== undefined) ? result.pageTitlePrefix : 'Google Gemini - ';
        localUpdateId = result.lastUpdateId || null;

        let jsonString = '';

        if (result['folders_compressed']) {
            jsonString = LZString.decompressFromBase64(result['folders_compressed']);
        } else if (result['folders_chunk_count']) {
            const numChunks = result['folders_chunk_count'];
            const chunkKeys = Array.from({ length: numChunks }, (_, i) => `folders_chunk_${i}`);
            const chunkResult = await chrome.storage.sync.get(chunkKeys);
            let combinedString = '';
            for (let i = 0; i < numChunks; i++) {
                combinedString += chunkResult[`folders_chunk_${i}`] || '';
            }
            jsonString = LZString.decompressFromBase64(combinedString);
        } else if (result['folders']) {
            // Dati non compressi e non chunkati (vecchio formato)
            console.log("GFE: Dati in formato legacy trovati. Migrazione...");
            foldersData = result['folders'];
            migrateDataStructure(foldersData);
            await saveFolders(); // Salva immediatamente nel nuovo formato, che imposterà anche il primo lastUpdateId
            return;
        }

        if (jsonString) {
            try {
                foldersData = JSON.parse(jsonString);
            } catch (e) {
                console.error(`GFE: Errore nel parsing dei dati per "folders":`, e);
                foldersData = [];
            }
        } else if (!result['folders']) { // Se non c'è neanche la chiave legacy
            foldersData = [];
        }

        migrateDataStructure(foldersData);
    }

    function countItemsInBackup(items) {
        let counts = { folders: 0, chatmarks: 0 };
        function traverse(nodes) {
            nodes.forEach(node => {
                if (node.type === 'folder') {
                    counts.folders++;
                    if (node.children) {
                        traverse(node.children);
                    }
                } else if (node.type === 'chatmark') {
                    counts.chatmarks++;
                }
            });
        }
        traverse(items);
        return counts;
    }

    function convertDataToTextStructure(items) {
        const result = [];

        function traverse(nodes, indent) {
            nodes.forEach(node => {
                if (node.type === 'folder') {
                    let prefix;
                    if (indent === '') prefix = 'F:';
                    else if (indent === '  ') prefix = 'SF:';
                    else prefix = 'SSF:';
                    result.push(`${indent}${prefix} ${node.name}`);
                    if (node.children && node.children.length > 0) {
                        traverse(node.children, indent + '  ');
                    }
                } else if (node.type === 'chatmark') {
                    result.push(`${indent}  C: ${node.chatId} | "${node.title}"`);
                }
            });
        }
        traverse(items, '');
        return result.join('\n');
    }

    async function handleDeleteAllData() {
        if (isDataStale) return;
        const deleteKeyCheckbox = document.getElementById(GFE_PREFIX + 'delete-api-key-checkbox');
        const shouldDeleteKey = deleteKeyCheckbox.checked;

        const message = shouldDeleteKey ? getMessage("confirmDeleteAllDataWithKey") : getMessage("confirmDeleteAllData");

        showConfirmationModal(message, async () => {
            foldersData = [];
            await saveFolders(); // Salva la struttura vuota e aggiorna/crea lastUpdateId

            panelsState = {};
            await saveNonCriticalData('panelsState', panelsState);

            if (shouldDeleteKey) {
                geminiApiKey = null;
                await saveNonCriticalData('geminiApiKey', null);
            }

            showGFENotification(getMessage("deleteAllDataSuccess"), 3000);
            setTimeout(() => window.location.reload(), 1500);
        });
    }


    function showGFENotification(message, duration = 3000) {
        document.querySelectorAll('.gfe-notification').forEach(n => n.remove());
        const notification = document.createElement('div');
        notification.className = 'gfe-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);

        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                notification.addEventListener('transitionend', () => notification.remove());
            }, duration);
        }
    }

    function showLoadingSpinner(text) {
        const overlay = document.createElement('div');
        overlay.className = 'gfe-loading-overlay';
        overlay.id = GFE_PREFIX + 'loading-overlay';

        const spinner = document.createElement('div');
        spinner.className = 'gfe-spinner';

        const label = document.createElement('div');
        label.className = 'gfe-loading-text';
        label.textContent = text;

        overlay.appendChild(spinner);
        overlay.appendChild(label);
        document.body.appendChild(overlay);
    }

    function hideLoadingSpinner() {
        const overlay = document.getElementById(GFE_PREFIX + 'loading-overlay');
        if (overlay) overlay.remove();
    }

    function closeAllContextMenus() {
        document.querySelectorAll('.gfe-folder-context-menu').forEach(menu => menu.remove());
        document.querySelectorAll('.gfe-folder-item.gfe-menu-open').forEach(item => item.classList.remove('gfe-menu-open'));
        const moreActionsBtn = document.getElementById(GFE_PREFIX + 'more-actions-btn');
        if (moreActionsBtn) moreActionsBtn.classList.remove('gfe-menu-open');
    }

    function showConfirmationModal(message, onConfirm, confirmationKey = null) {
        // Se c'è una chiave e l'utente ha scelto di non mostrare più la conferma, esegui subito
        if (confirmationKey && confirmationSettings && confirmationSettings[confirmationKey]) {
            onConfirm();
            return;
        }

        document.querySelectorAll('.gfe-confirm-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'gfe-confirm-overlay';
        const modal = document.createElement('div');
        modal.className = 'gfe-confirm-modal';

        const checkboxHTML = confirmationKey ? `
        <div class="gfe-confirm-checkbox-container">
            <input type="checkbox" id="gfe-confirm-dont-show-again">
            <label for="gfe-confirm-dont-show-again">${getMessage("dontShowAgain")}</label>
        </div>
    ` : '';

        modal.innerHTML = `
      <p>${message}</p>
      ${checkboxHTML}
      <div class="gfe-confirm-buttons">
        <button class="gfe-confirm-btn-cancel">${getMessage("cancel")}</button>
        <button class="gfe-confirm-btn-confirm">${getMessage("confirm")}</button>
      </div>
    `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        const closeModal = () => overlay.remove();
        modal.querySelector('.gfe-confirm-btn-cancel').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        modal.querySelector('.gfe-confirm-btn-confirm').addEventListener('click', async () => {
            if (confirmationKey) {
                const checkbox = modal.querySelector('#gfe-confirm-dont-show-again');
                if (checkbox && checkbox.checked) {
                    if (!confirmationSettings) confirmationSettings = {};
                    confirmationSettings[confirmationKey] = true;
                    await saveNonCriticalData('confirmationSettings', confirmationSettings);
                }
            }
            onConfirm();
            closeModal();
        });
    }

    function enterStaleMode() {
        isDataStale = true;
        const foldersPanel = document.getElementById(GFE_PREFIX + 'folders-panel');
        if (foldersPanel) {
            foldersPanel.classList.add('gfe-stale-mode');
        }
        const syncBtn = document.getElementById(GFE_PREFIX + 'sync-btn');
        if (syncBtn) {
            syncBtn.style.display = 'flex';
        }
        rerenderWithCurrentQuery(); // Rirenderizza per disabilitare i controlli
    }

    function exitStaleMode() {
        isDataStale = false;
        const foldersPanel = document.getElementById(GFE_PREFIX + 'folders-panel');
        if (foldersPanel) {
            foldersPanel.classList.remove('gfe-stale-mode');
        }
        const syncBtn = document.getElementById(GFE_PREFIX + 'sync-btn');
        if (syncBtn) {
            syncBtn.style.display = 'none';
        }
        rerenderWithCurrentQuery(); // Rirenderizza per riabilitare i controlli
    }

    async function forceDataReload() {
        showGFENotification(getMessage("refreshingData"), 2000);
        await loadData();
        exitStaleMode();
        await saveLocalBackup(); // Esegue le backup locale dopo il recupero da sync
        rerenderWithCurrentQuery();
    }

    function rerenderWithCurrentQuery() {
        const searchInput = document.getElementById(GFE_PREFIX + 'search-input');
        renderFolders(searchInput ? searchInput.value : '');
        updateActiveChatmarkHighlight();
        applyVisibilityFilters();
    }

    function filterItemsRecursive(items, query) {
        return items.reduce((acc, item) => {
            if (item.type === 'chatmark') {
                if (item.title.toLowerCase().includes(query)) {
                    acc.push(item);
                }
            } else if (item.type === 'folder') {
                const filteredChildren = filterItemsRecursive(item.children, query);
                if (item.name.toLowerCase().includes(query) || filteredChildren.length > 0) {
                    acc.push({
                        ...item,
                        children: filteredChildren
                    });
                }
            }
            return acc;
        }, []);
    }

    function renderFolders(searchQuery = '') {
        const foldersContent = document.getElementById(GFE_PREFIX + 'folders-content');
        if (!foldersContent) return;
        const query = searchQuery.trim().toLowerCase();
        const isSearchActive = query.length > 0;
        const dataToRender = isSearchActive ? filterItemsRecursive(foldersData, query) : foldersData;
        foldersContent.innerHTML = '';
        closeAllContextMenus();
        renderItemsRecursive(foldersContent, dataToRender, isSearchActive, 0, ''); // Aggiunto path iniziale vuoto
    }

    function renderItemsRecursive(container, items, isSearchActive, level, parentPath = '') {
        items.forEach(item => {
            let currentPath = parentPath;
            if (item.type === 'folder') {
                currentPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
            }

            const element = item.type === 'folder' ?
                createFolderElement(item, isSearchActive, level, currentPath) :
                createChatmarkElement(item);

            container.appendChild(element);

            if (item.type === 'folder') {
                const nestedContainer = document.createElement('div');
                nestedContainer.className = 'gfe-nested-container';
                element.appendChild(nestedContainer);
                if ((!item.collapsed || isSearchActive) && item.children && item.children.length > 0) {
                    // Passa il path corrente ai figli
                    renderItemsRecursive(nestedContainer, item.children, isSearchActive, level + 1, currentPath);
                }
            }
        });
    }

    function createFolderElement(folder, isSearchActive, level, fullPath) {
        const folderBlock = document.createElement('div');
        folderBlock.className = 'gfe-folder-block';
        const folderEl = document.createElement('div');
        folderEl.className = 'gfe-folder-item gfe-folder-header';
        if (level > 0) {
            folderEl.classList.add('gfe-is-subfolder');
        }
        folderEl.title = fullPath;
        folderEl.setAttribute('draggable', !isDataStale);
        folderEl.dataset.itemId = folder.id;
        if (folder.collapsed && !isSearchActive) {
            folderEl.classList.add('gfe-collapsed');
        }
        folderEl.innerHTML = `
        <div class="gfe-folder-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg></div>
        <div class="gfe-folder-name">${folder.name}</div>
        <div class="gfe-folder-actions"><button class="gfe-folder-menu-btn" title="${getMessage("folderMenu")}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg></button></div>
    `;
        if (!isDataStale) addDragDropHandlers(folderEl);

        folderEl.addEventListener('click', async (e) => {
            if (e.target.closest('.gfe-folder-menu-btn')) return;
            const originalFolderInfo = findItemRecursive(foldersData, folder.id);
            if (originalFolderInfo) {
                originalFolderInfo.item.collapsed = !originalFolderInfo.item.collapsed;
                await saveFolders(false);
                rerenderWithCurrentQuery();
            }
        });
        const menuBtn = folderEl.querySelector('.gfe-folder-menu-btn');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isAlreadyOpen = folderEl.classList.contains('gfe-menu-open');
            closeAllContextMenus();
            if (isAlreadyOpen) return;
            folderEl.classList.add('gfe-menu-open');
            const rect = menuBtn.getBoundingClientRect();
            const contextMenu = document.createElement('div');
            contextMenu.className = 'gfe-folder-context-menu';
            contextMenu.style.top = `${rect.bottom + 4}px`;
            contextMenu.style.left = `${rect.left}px`;
            contextMenu.innerHTML = `
          <button data-action="add-chat" ${isDataStale ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg><span>${getMessage("addChat")}</span></button>
          <button data-action="add-subfolder" ${isDataStale ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg><span>${getMessage("addSubfolder")}</span></button>
          <button data-action="rename" ${isDataStale ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>${getMessage("rename")}</span></button>
          <button data-action="delete" ${isDataStale ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>${getMessage("delete")}</span></button>
      `;
            document.body.appendChild(contextMenu);
            contextMenu.querySelector('[data-action="add-chat"]').addEventListener('click', () => {
                closeAllContextMenus();
                enterAddMode(folder.id);
            });
            contextMenu.querySelector('[data-action="add-subfolder"]').addEventListener('click', () => {
                closeAllContextMenus();
                handleAddFolder(folder.id);
            });
            contextMenu.querySelector('[data-action="rename"]').addEventListener('click', () => {
                closeAllContextMenus();
                handleRenameItem(folder.id);
            });
            contextMenu.querySelector('[data-action="delete"]').addEventListener('click', () => {
                closeAllContextMenus();
                handleDeleteItem(folder.id);
            });
        });
        folderBlock.appendChild(folderEl);
        return folderBlock;
    }

    function createChatmarkElement(chatmark) {
        const chatmarkEl = document.createElement('div');
        chatmarkEl.className = 'gfe-folder-item gfe-chatmark-item';
        chatmarkEl.dataset.itemId = chatmark.id;
        chatmarkEl.dataset.chatId = chatmark.chatId;
        chatmarkEl.title = chatmark.title; // Per i chatmark, il title resta solo il titolo della chat
        chatmarkEl.setAttribute('draggable', !isDataStale);

        // Controlla se questo chatmark è quello attivo e applica la classe durante il rendering
        const cleanUrl = lastKnownUrl.split('?')[0];
        const urlMatch = cleanUrl.match(/\/([a-f0-9]{16,})$/);
        const activeChatId = urlMatch ? 'c_' + urlMatch[1] : null;

        if (activeChatId && chatmark.chatId === activeChatId) {
            chatmarkEl.classList.add('gfe-active-chatmark');
        }

        chatmarkEl.innerHTML = `
        <div class="gfe-folder-name">${chatmark.title}</div>
        <div class="gfe-folder-actions"><button class="gfe-folder-menu-btn" title="${getMessage("chatmarkMenu")}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg></button></div>
    `;
        if (!isDataStale) addDragDropHandlers(chatmarkEl);
        chatmarkEl.addEventListener('click', (e) => {
            if (e.target.closest('.gfe-folder-menu-btn') || chatmarkEl.classList.contains('gfe-dragging')) return;
            handleChatmarkClick(chatmark);
        });
        const menuBtn = chatmarkEl.querySelector('.gfe-folder-menu-btn');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isAlreadyOpen = chatmarkEl.classList.contains('gfe-menu-open');
            closeAllContextMenus();
            if (isAlreadyOpen) return;
            chatmarkEl.classList.add('gfe-menu-open');
            const rect = menuBtn.getBoundingClientRect();
            const contextMenu = document.createElement('div');
            contextMenu.className = 'gfe-folder-context-menu';
            contextMenu.style.top = `${rect.bottom + 4}px`;
            contextMenu.style.left = `${rect.left}px`;
            contextMenu.innerHTML = `
          <button data-action="rename-chatmark" ${isDataStale ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>${getMessage("rename")}</span></button>
          <button data-action="delete-chatmark" ${isDataStale ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>${getMessage("remove")}</span></button>
      `;
            document.body.appendChild(contextMenu);
            contextMenu.querySelector('[data-action="rename-chatmark"]').addEventListener('click', () => {
                closeAllContextMenus();
                handleRenameItem(chatmark.id);
            });
            contextMenu.querySelector('[data-action="delete-chatmark"]').addEventListener('click', () => {
                closeAllContextMenus();
                handleDeleteItem(chatmark.id);
            });
        });
        return chatmarkEl;
    }

    function createCollapsiblePanel(originalPanel, panelType, panelStateKey) {
        if (!originalPanel || originalPanel.classList.contains('gfe-modified')) return;
        const collapseBtn = document.createElement('div');
        collapseBtn.className = 'gfe-collapse-button';
        collapseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'gfe-header-actions';
        actionsContainer.appendChild(collapseBtn);
        originalPanel.classList.add(GFE_PREFIX + 'modified', GFE_PREFIX + panelType);
        originalPanel.appendChild(actionsContainer);
        if (panelsState[panelStateKey]) {
            originalPanel.classList.add(GFE_PREFIX + 'collapsed');
        }

        if (panelType === 'gem' || panelType === 'my-stuff') {
            collapseBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                panelsState[panelStateKey] = originalPanel.classList.toggle(GFE_PREFIX + 'collapsed');
                await saveNonCriticalData('panelsState', panelsState);
            });
            collapseBtn.style.cursor = 'pointer';
        } else {
            originalPanel.addEventListener('click', async (e) => {
                if (e.target.closest('button')) return;
                panelsState[panelStateKey] = originalPanel.classList.toggle(GFE_PREFIX + 'collapsed');
                await saveNonCriticalData('panelsState', panelsState);
            });
        }
    }

    async function showRestoreModal() {
        if (typeof LZString === 'undefined') {
            console.error("GFE: LZ-String non è caricata. Impossibile leggere i backup.");
            showGFENotification(getMessage("genericError"));
            return;
        }
        document.querySelectorAll('.gfe-restore-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'gfe-restore-overlay gfe-confirm-overlay'; // Usa lo stile base
        const modal = document.createElement('div');
        modal.className = 'gfe-restore-modal gfe-settings-modal'; // Usa lo stile base

        let contentHTML = `<h3>${getMessage("restoreBackupTitle")}</h3>`;
        let backups = [];

        try {
            const result = await chrome.storage.local.get('gfe_local_backups_compressed');
            if (result.gfe_local_backups_compressed) {
                const decompressed = LZString.decompressFromBase64(result.gfe_local_backups_compressed);
                backups = JSON.parse(decompressed) || [];
            }
        } catch (e) {
            console.error("GFE: Errore nel caricamento dei backup", e);
            backups = [];
        }

        if (!backups || backups.length === 0) {
            contentHTML += `<p>${getMessage("noBackupsFound")}</p>`;
        } else {
            contentHTML += `<p>${getMessage("restoreBackupInfo")}</p>`;
            contentHTML += '<ul class="gfe-backup-list">';
            backups.forEach((backup, index) => {
                if (backup && backup.timestamp) {
                    const date = new Date(backup.timestamp).toLocaleString();
                    const counts = countItemsInBackup(backup.folders);
                    const details = getMessage("backupSlotDetails", [
                        counts.folders.toString(),
                        counts.chatmarks.toString()
                    ]);

                    const isCurrent = index === 0;
                    const disabledAttr = isCurrent ? 'disabled' : '';
                    const buttonTitle = isCurrent ? getMessage("restoreButtonDisabledTitle") : getMessage("restoreButton");

                    contentHTML += `
            <li>
              <span class="gfe-backup-details">
                <strong>${getMessage("backupSlotTitle", [(index + 1).toString()])}</strong>
                <small>${date} ${details}</small>
              </span>
              <button class="gfe-confirm-btn-secondary" data-backup-index="${index}" ${disabledAttr} title="${buttonTitle}">
                ${getMessage("restoreButton")}
              </button>
            </li>`;
                }
            });
            contentHTML += '</ul>';
        }

        modal.innerHTML = `
        ${contentHTML}
        <div class="gfe-confirm-buttons">
            <button class="gfe-confirm-btn-cancel">${getMessage("close")}</button>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        modal.querySelector('.gfe-confirm-btn-cancel').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        modal.querySelectorAll('.gfe-backup-list button').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (e.target.disabled) return;
                const backupIndex = parseInt(e.target.dataset.backupIndex, 10);
                const backupDate = new Date(backups[backupIndex].timestamp).toLocaleString();
                const message = getMessage("confirmRestore", [backupDate]);

                closeModal(); // Chiude la modale dei backup prima di aprire quella di conferma

                showConfirmationModal(message, async () => {
                    foldersData = backups[backupIndex].folders;
                    await saveFolders();
                    showGFENotification(getMessage("restoreSuccess"), 3000);
                    setTimeout(() => window.location.reload(), 1500);
                });
            });
        });
    }

    async function focusOnFoldersPanel() {
        const foldersPanel = document.getElementById(GFE_PREFIX + 'folders-panel');
        if (foldersPanel) {
            if (foldersPanel.classList.contains(GFE_PREFIX + 'collapsed')) {
                foldersPanel.classList.remove(GFE_PREFIX + 'collapsed');
                panelsState.folders = false;
                await saveNonCriticalData('panelsState', panelsState);
            }
            foldersPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function showSettingsModal() {
        document.querySelectorAll('.gfe-settings-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'gfe-settings-overlay';
        const modal = document.createElement('div');
        modal.className = 'gfe-settings-modal';

        const staleWarningHTML = isDataStale ? `
      <div class="gfe-stale-warning">
        <p>${getMessage("dataStaleWarning")}</p>
        <button id="gfe-settings-refresh-btn" class="gfe-confirm-btn-confirm">${getMessage("refreshButton")}</button>
      </div>
    ` : '';

        modal.innerHTML = `
        ${staleWarningHTML}
        <h3>${getMessage("settingsTitle")}</h3>
        <div class="gfe-settings-section">
            <h4>${getMessage("apiKeyLabel")}</h4>
            <p>${getMessage("apiKeyExplanation")} <a href="https://sites.google.com/view/gemini-chat-folders-api-key-gu" target="_blank">${getMessage("apiKeyGuideLink")}</a></p>
            <!-- MODIFICA v4.6.0: Aggiunto tasto verifica accanto all'input -->
            <div class="gfe-api-key-container">
                <input type="password" id="${GFE_PREFIX}api-key-input" placeholder="${getMessage("apiKeyPlaceholder")}" value="${geminiApiKey || ''}" ${isDataStale ? 'disabled' : ''}>
                <button id="${GFE_PREFIX}verify-key-btn" class="gfe-confirm-btn-secondary" style="height: 36px; padding: 0 12px; white-space: nowrap;" ${isDataStale ? 'disabled' : ''}>${getMessage("testApiKey")}</button>
            </div>
            <div id="${GFE_PREFIX}api-key-status" class="gfe-api-key-status"></div>
        </div>

        <div class="gfe-settings-section">
            <h4>${getMessage("preferencesTitle")}</h4>
            <div class="gfe-option-item">
                <input type="checkbox" id="${GFE_PREFIX}hide-organized-checkbox" ${hideOrganizedChats ? 'checked' : ''} ${isDataStale ? 'disabled' : ''}>
                <span>
                    <label for="${GFE_PREFIX}hide-organized-checkbox">${getMessage("hideOrganizedLabel")}</label>
                    <p class="gfe-option-info">${getMessage("hideOrganizedInfo")}</p>
                </span>
            </div>
            <!-- NUOVA OPZIONE: Aggiorna titolo pagina -->
            <div class="gfe-option-item">
                <input type="checkbox" id="${GFE_PREFIX}update-title-checkbox" ${updatePageTitle ? 'checked' : ''} ${isDataStale ? 'disabled' : ''}>
                <span>
                    <label for="${GFE_PREFIX}update-title-checkbox">${getMessage("updatePageTitleLabel")}</label>
                    <p class="gfe-option-info">${getMessage("updatePageTitleInfo")}</p>
                </span>
            </div>
            <!-- NUOVA SOTTO-OPZIONE: Prefisso titolo pagina -->
            <div class="gfe-setting-sub-option">
                <label for="${GFE_PREFIX}title-prefix-input">${getMessage("pageTitlePrefixLabel")}</label>
                <input type="text" id="${GFE_PREFIX}title-prefix-input" 
                       placeholder="${getMessage("pageTitlePrefixPlaceholder")}" 
                       value="${pageTitlePrefix}" 
                       ${!updatePageTitle || isDataStale ? 'disabled' : ''}>
            </div>
            <!-- NUOVA OPZIONE: Reset Conferme -->
            <div class="gfe-option-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gfe-border-color);">
                <button id="${GFE_PREFIX}reset-confirmations-btn" class="gfe-confirm-btn-secondary" style="width: 100%;" ${isDataStale ? 'disabled' : ''}>
                    ${getMessage("resetConfirmationsButton")}
                </button>
            </div>
        </div>

        <div class="gfe-confirm-buttons">
            <button class="gfe-confirm-btn-cancel">${getMessage("cancel")}</button>
            <!-- MODIFICA v4.6.0: Tasto salva impostazioni centralizzato -->
            <button id="${GFE_PREFIX}save-settings-btn" class="gfe-confirm-btn-confirm" ${isDataStale ? 'disabled' : ''}>${getMessage("saveSettings")}</button>
        </div>

        <div class="gfe-danger-zone">
            <h4>${getMessage("dangerZoneTitle")}</h4>
            <div class="gfe-backup-controls">
              <button id="gfe-manage-backups-btn" class="gfe-confirm-btn-secondary" ${isDataStale ? 'disabled' : ''}>${getMessage("manageBackupsButton")}</button>
            </div>
            <div class="gfe-delete-options">
                <input type="checkbox" id="${GFE_PREFIX}delete-api-key-checkbox" ${isDataStale ? 'disabled' : ''}>
                <label for="${GFE_PREFIX}delete-api-key-checkbox">${getMessage("deleteApiKeyCheckbox")}</label>
            </div>
            <button id="${GFE_PREFIX}delete-all-data-btn" class="gfe-delete-btn" ${isDataStale ? 'disabled' : ''}>${getMessage("deleteAllDataButton")}</button>
        </div>

        <div class="gfe-settings-section">            
            <!-- MODIFICA v4.9.1: Link al Changelog -->
            <div class="gfe-option-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--gfe-border-color);">
                <p class="gfe-option-info">${getMessage("viewChangesLink")} <a href="https://sites.google.com/view/gemini-chat-folders-change-log" target="_blank" style="color: var(--gfe-button-primary-bg); font-weight: 500;">Changelog</a></p>
            </div>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        modal.querySelector('.gfe-confirm-btn-cancel').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        if (isDataStale) {
            modal.querySelector('#gfe-settings-refresh-btn').addEventListener('click', () => {
                closeModal();
                forceDataReload();
            });
        } else {
            // Gestione abilitazione/disabilitazione input prefisso
            const titleCheckbox = modal.querySelector(`#${GFE_PREFIX}update-title-checkbox`);
            const prefixInput = modal.querySelector(`#${GFE_PREFIX}title-prefix-input`);

            titleCheckbox.addEventListener('change', (e) => {
                prefixInput.disabled = !e.target.checked;
            });

            // Handler per il reset delle conferme
            modal.querySelector(`#${GFE_PREFIX}reset-confirmations-btn`).addEventListener('click', async (e) => {
                confirmationSettings = {};
                await saveNonCriticalData('confirmationSettings', confirmationSettings);

                showGFENotification(getMessage("confirmationsResetSuccess"));

                // Visual feedback on button
                const btn = e.target;
                const originalText = btn.textContent;
                btn.textContent = "✓ " + getMessage("confirmationsResetSuccess");
                btn.style.backgroundColor = 'var(--gfe-status-valid, #81c995)';
                btn.style.color = '#fff';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 2000);
            });

            // --- MODIFICA v4.6.0: Logica Tasto Verifica (Solo Test) ---
            modal.querySelector(`#${GFE_PREFIX}verify-key-btn`).addEventListener('click', async () => {
                const apiKey = modal.querySelector(`#${GFE_PREFIX}api-key-input`).value.trim();
                const statusDiv = document.getElementById(GFE_PREFIX + 'api-key-status');
                if (!statusDiv) return;

                statusDiv.textContent = getMessage("keyVerifying");
                statusDiv.className = 'gfe-api-key-status gfe-status-verifying';

                const isValid = await validateApiKey(apiKey);
                if (isValid) {
                    statusDiv.textContent = getMessage("keyValid");
                    statusDiv.className = 'gfe-api-key-status gfe-status-valid';
                } else {
                    statusDiv.textContent = getMessage("keyInvalid");
                    statusDiv.className = 'gfe-api-key-status gfe-status-invalid';
                }
            });

            // --- MODIFICA v4.6.0: Logica Tasto Salva (Salvataggio e Chiusura) ---
            modal.querySelector(`#${GFE_PREFIX}save-settings-btn`).addEventListener('click', async () => {
                const hideChecked = modal.querySelector(`#${GFE_PREFIX}hide-organized-checkbox`).checked;
                const updateTitleChecked = modal.querySelector(`#${GFE_PREFIX}update-title-checkbox`).checked;
                const prefixValue = modal.querySelector(`#${GFE_PREFIX}title-prefix-input`).value;
                const apiKey = modal.querySelector(`#${GFE_PREFIX}api-key-input`).value.trim();

                hideOrganizedChats = hideChecked;
                const oldUpdatePageTitle = updatePageTitle;
                updatePageTitle = updateTitleChecked;
                pageTitlePrefix = prefixValue;
                geminiApiKey = apiKey;

                // Esegue le operazioni di salvataggio come indicato nello snippet
                await saveNonCriticalData('hideOrganizedChats', hideOrganizedChats);
                await saveNonCriticalData('updatePageTitle', updatePageTitle);
                await saveNonCriticalData('pageTitlePrefix', pageTitlePrefix);
                await saveNonCriticalData('geminiApiKey', geminiApiKey);

                // Se la funzione è stata disabilitata, ripristina il titolo originale
                if (oldUpdatePageTitle && !updatePageTitle) {
                    if (defaultPageTitle) {
                        document.title = defaultPageTitle;
                    }
                }

                applyVisibilityFilters();
                updateAIMenuVisibility();
                // Forza l'aggiornamento immediato del titolo (o il ripristino se disabilitato, ma gestito sopra)
                if (updatePageTitle) {
                    updateActiveChatmarkHighlight();
                }

                closeModal();
                showGFENotification(getMessage("settingsSaved"));
            });
            // --- FINE MODIFICA v4.6.0 ---

            modal.querySelector(`#${GFE_PREFIX}delete-all-data-btn`).addEventListener('click', handleDeleteAllData);
            modal.querySelector('#gfe-manage-backups-btn').addEventListener('click', () => {
                closeModal();
                showRestoreModal();
            });
        }
    }

    function showPreviewModal(structure, onConfirm) {
        document.querySelectorAll('.gfe-selection-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'gfe-selection-overlay';
        const modal = document.createElement('div');
        modal.className = 'gfe-selection-modal';

        // --- MODIFICA v4.8.0: Rilevamento cartelle esistenti per la preview ---
        function checkNodeExistence(node, existingItems) {
            if (node.type === 'chatmark') return false; // Le chat da aggiungere sono sempre "nuove" in questo contesto
            const existing = existingItems.find(f => f.name === node.name && f.type === 'folder');
            if (existing) {
                node.isExisting = true;
                if (node.children) {
                    node.children.forEach(child => checkNodeExistence(child, existing.children || []));
                }
                return true;
            }
            node.isExisting = false;
            return false;
        }

        structure.forEach(node => checkNodeExistence(node, foldersData));

        // Funzione ricorsiva per generare l'HTML dell'albero con checkbox condizionale
        function generateTreeHTML(nodes, level = 0) {
            let html = '';
            nodes.forEach(node => {
                const paddingLeft = level * 20;
                const isFolder = node.type === 'folder';
                const typeClass = isFolder ? 'gfe-tree-folder' : 'gfe-tree-chat';

                // Se la cartella esiste già, non mostriamo la checkbox
                const showCheckbox = !node.isExisting;
                const checkboxHTML = showCheckbox ?
                    `<input type="checkbox" id="gfe-preview-${node.id}" data-item-id="${node.id}" checked>` :
                    `<span class="gfe-tree-existing-icon">📂</span>`;

                html += `
                  <div class="gfe-tree-item ${typeClass}" style="padding-left: ${paddingLeft}px" data-item-id="${node.id}" data-node-type="${node.type}" data-is-existing="${node.isExisting || false}">
                      ${checkboxHTML}
                      <label for="gfe-preview-${node.id}" title="${isFolder ? node.name : node.title}">
                          ${isFolder ? (node.isExisting ? '' : '📁 ') + node.name : '💬 ' + node.title}
                      </label>
                  </div>
              `;

                if (isFolder && node.children && node.children.length > 0) {
                    html += `<div class="gfe-tree-children" id="gfe-children-${node.id}">`;
                    html += generateTreeHTML(node.children, level + 1);
                    html += `</div>`;
                }
            });
            return html;
        }

        const treeHTML = generateTreeHTML(structure);

        modal.innerHTML = `
          <h3>${getMessage("previewTitle")}</h3>
          <p>${getMessage("previewInfo")}</p>
          <div class="gfe-tree-preview-list">
              ${treeHTML}
          </div>
          <div class="gfe-confirm-buttons">
              <button class="gfe-confirm-btn-cancel">${getMessage("cancel")}</button>
              <button id="gfe-confirm-apply-btn" class="gfe-confirm-btn-confirm">${getMessage("applyChanges")}</button>
          </div>
      `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // --- MODIFICA v4.8.0: Logica di selezione intelligente ---
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const itemId = e.target.dataset.itemId;

                // 1. Logica Discendente: se deseleziono/seleziono padre, applico ai figli (con checkbox)
                const childrenContainer = modal.querySelector(`#gfe-children-${itemId}`);
                if (childrenContainer) {
                    childrenContainer.querySelectorAll('input[type="checkbox"]').forEach(childCb => {
                        if (childCb.checked !== isChecked) {
                            childCb.checked = isChecked;
                            // Non triggeriamo l'evento ricorsivamente qui per evitare loop infiniti,
                            // ma gestiamo la gerarchia manualmente.
                            childCb.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }

                // 2. Logica Ascendente (Rifinita): se deseleziono l'ultimo figlio di una cartella NUOVA, deseleziono il padre
                if (!isChecked) {
                    let currentItem = e.target.closest('.gfe-tree-item');
                    let parentContainer = currentItem?.parentElement?.closest('.gfe-tree-children');

                    while (parentContainer) {
                        const parentId = parentContainer.id.replace('gfe-children-', '');
                        const parentCheckbox = modal.querySelector(`#gfe-preview-${parentId}`);

                        // Se il genitore ha una checkbox (è una cartella nuova)
                        if (parentCheckbox) {
                            const anyChildChecked = Array.from(parentContainer.querySelectorAll(':scope > .gfe-tree-item input[type="checkbox"]'))
                                .some(childCb => childCb.checked);

                            if (!anyChildChecked) {
                                parentCheckbox.checked = false;
                                // Continua a salire
                                currentItem = parentCheckbox.closest('.gfe-tree-item');
                                parentContainer = currentItem?.parentElement?.closest('.gfe-tree-children');
                            } else {
                                break; // Fermati se c'è almeno un figlio selezionato
                            }
                        } else {
                            break; // Fermati se il genitore è una cartella esistente (senza checkbox)
                        }
                    }
                } else {
                    // Se seleziono un figlio, assicuro che tutti i padri "nuovi" siano selezionati
                    let currentItem = e.target.closest('.gfe-tree-item');
                    let parentContainer = currentItem?.parentElement?.closest('.gfe-tree-children');

                    while (parentContainer) {
                        const parentId = parentContainer.id.replace('gfe-children-', '');
                        const parentCheckbox = modal.querySelector(`#gfe-preview-${parentId}`);
                        if (parentCheckbox && !parentCheckbox.checked) {
                            parentCheckbox.checked = true;
                            currentItem = parentCheckbox.closest('.gfe-tree-item');
                            parentContainer = currentItem?.parentElement?.closest('.gfe-tree-children');
                        } else {
                            break;
                        }
                    }
                }
            });
        });

        const closeModal = () => overlay.remove();
        modal.querySelector('.gfe-confirm-btn-cancel').addEventListener('click', closeModal);

        modal.querySelector('#gfe-confirm-apply-btn').addEventListener('click', () => {
            const selectedIds = new Set();
            modal.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                selectedIds.add(cb.dataset.itemId);
            });

            // Le cartelle esistenti vengono incluse sempre per permettere la navigazione/merge
            function filterSelected(nodes) {
                return nodes.filter(node => node.isExisting || selectedIds.has(node.id)).map(node => {
                    const newNode = { ...node };
                    if (newNode.children) {
                        newNode.children = filterSelected(newNode.children);
                    }
                    return newNode;
                }).filter(node => node.type === 'chatmark' || (node.children && node.children.length > 0));
                // Ultimo filtro per pulire cartelle rimaste vuote dopo la deselezione manuale o automatica
            }

            const filteredStructure = filterSelected(structure);
            onConfirm(filteredStructure);
            closeModal();
        });
    }

    function showChatSelectionModal(chats, onConfirm) {
        if (isDataStale) return;
        document.querySelectorAll('.gfe-selection-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'gfe-selection-overlay';

        const modal = document.createElement('div');
        modal.className = 'gfe-selection-modal';

        const chatListHTML = chats.map(chat => `
          <div class="gfe-chat-selection-item">
              <input type="checkbox" id="gfe-chat-${chat.id}" data-chat-id="${chat.id}" checked>
              <label for="gfe-chat-${chat.id}" title="${chat.title}">${chat.title}</label>
          </div>
      `).join('');

        modal.innerHTML = `
          <h3>${getMessage("selectChatsTitle")}</h3>
          <p>${getMessage("selectionModalInfo")}</p>
          <div class="gfe-chat-selection-controls">
              <button id="gfe-select-all-btn">${getMessage("selectAll")}</button>
              <button id="gfe-select-none-btn">${getMessage("selectNone")}</button>
          </div>
          <div class="gfe-chat-selection-list">
              ${chatListHTML}
          </div>

          <div class="gfe-ai-options">
              <div class="gfe-ai-option-item">
                  <input type="checkbox" id="gfe-ai-existing-only-checkbox">
                  <div>
                      <label for="gfe-ai-existing-only-checkbox">${getMessage("aiUseExistingFolders")}</label>
                      <p>${getMessage("aiUseExistingFoldersInfo")}</p>
                  </div>
              </div>
              <div id="gfe-ai-default-folder-container" class="gfe-ai-default-folder-container gfe-hidden">
                  <label for="gfe-ai-default-folder-input">${getMessage("aiDefaultFolderName")}</label>
                  <input type="text" id="gfe-ai-default-folder-input" value="${getMessage("defaultFolderNameValue")}">
                  <p>${getMessage("aiDefaultFolderNameInfo")}</p>
              </div>
          </div>

          <div class="gfe-confirm-buttons">
              <button class="gfe-confirm-btn-cancel">${getMessage("cancel")}</button>
              <button id="gfe-confirm-organize-btn" class="gfe-confirm-btn-confirm">${getMessage("organizeXChats", [chats.length.toString()])}</button>
          </div>
      `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const checkboxes = modal.querySelectorAll('.gfe-chat-selection-list input[type="checkbox"]');
        const confirmBtn = modal.querySelector('#gfe-confirm-organize-btn');
        const existingOnlyCheckbox = modal.querySelector('#gfe-ai-existing-only-checkbox');
        const defaultFolderContainer = modal.querySelector('#gfe-ai-default-folder-container');

        const updateButtonState = () => {
            const selectedCount = modal.querySelectorAll('.gfe-chat-selection-list input:checked').length;
            confirmBtn.textContent = getMessage("organizeXChats", [selectedCount.toString()]);
            confirmBtn.disabled = selectedCount === 0;
        };

        checkboxes.forEach(cb => cb.addEventListener('change', updateButtonState));

        modal.querySelector('#gfe-select-all-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = true);
            updateButtonState();
        });

        modal.querySelector('#gfe-select-none-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateButtonState();
        });

        existingOnlyCheckbox.addEventListener('change', (e) => {
            defaultFolderContainer.classList.toggle('gfe-hidden', !e.target.checked);
        });

        const closeModal = () => overlay.remove();
        modal.querySelector('.gfe-confirm-btn-cancel').addEventListener('click', closeModal);

        confirmBtn.addEventListener('click', () => {
            const selectedChatIds = new Set();
            modal.querySelectorAll('.gfe-chat-selection-list input:checked').forEach(cb => {
                selectedChatIds.add(cb.dataset.chatId);
            });
            const selectedChats = chats.filter(chat => selectedChatIds.has(chat.id));

            const useExistingOnly = existingOnlyCheckbox.checked;
            const defaultFolderInput = modal.querySelector('#gfe-ai-default-folder-input');
            let defaultFolderName = defaultFolderInput.value.trim();

            if (useExistingOnly && !defaultFolderName) {
                defaultFolderName = getMessage("defaultFolderNameValue");
            }

            onConfirm(selectedChats, useExistingOnly, defaultFolderName);
            closeModal();
        });
    }

    async function showOrphanSelectionModal(orphans) {
        document.querySelectorAll('.gfe-selection-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'gfe-selection-overlay';
        const modal = document.createElement('div');
        modal.className = 'gfe-selection-modal';

        const orphanListHTML = orphans.map(orphan => `
          <div class="gfe-chat-selection-item">
              <input type="checkbox" id="gfe-orphan-${orphan.id}" data-orphan-id="${orphan.id}" checked>
              <label for="gfe-orphan-${orphan.id}" title="${orphan.title}">${orphan.title}</label>
          </div>
      `).join('');

        modal.innerHTML = `
          <h3>${getMessage("cleanupOrphansTitle")}</h3>
          <p>${getMessage("cleanupOrphansInfo", [orphans.length.toString()])}</p>
          <div class="gfe-chat-selection-controls">
              <button id="gfe-select-all-btn">${getMessage("selectAll")}</button>
              <button id="gfe-select-none-btn">${getMessage("selectNone")}</button>
          </div>
          <div class="gfe-chat-selection-list">
              ${orphanListHTML}
          </div>
          <div class="gfe-confirm-buttons">
              <button class="gfe-confirm-btn-cancel">${getMessage("cancel")}</button>
              <button id="gfe-confirm-cleanup-btn" class="gfe-delete-btn">${getMessage("cleanupXOrphans", [orphans.length.toString()])}</button>
          </div>
      `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const checkboxes = modal.querySelectorAll('.gfe-chat-selection-list input[type="checkbox"]');
        const confirmBtn = modal.querySelector('#gfe-confirm-cleanup-btn');

        const updateButtonState = () => {
            const selectedCount = modal.querySelectorAll('.gfe-chat-selection-list input:checked').length;
            confirmBtn.textContent = getMessage("cleanupXOrphans", [selectedCount.toString()]);
            confirmBtn.disabled = selectedCount === 0;
        };

        checkboxes.forEach(cb => cb.addEventListener('change', updateButtonState));
        modal.querySelector('#gfe-select-all-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = true);
            updateButtonState();
        });
        modal.querySelector('#gfe-select-none-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateButtonState();
        });

        const closeModal = () => overlay.remove();
        modal.querySelector('.gfe-confirm-btn-cancel').addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', async () => {
            const idsToDelete = new Set();
            modal.querySelectorAll('.gfe-chat-selection-list input:checked').forEach(cb => {
                idsToDelete.add(cb.dataset.orphanId);
            });

            if (idsToDelete.size > 0) {
                foldersData = removeChatmarksByIds(foldersData, idsToDelete);
                await saveFolders();
                rerenderWithCurrentQuery();
                showGFENotification(getMessage("cleanupSuccess", [idsToDelete.size.toString()]));
            }
            closeModal();
        });
    }

    function updateAIMenuVisibility() {
        const menuContainer = document.querySelector('#' + GFE_PREFIX + 'more-actions-menu-container');
        if (!menuContainer) return;

        let organizeBtn = menuContainer.querySelector('[data-action="organize-ai"]');

        if (geminiApiKey) {
            if (!organizeBtn) {
                organizeBtn = document.createElement('button');
                organizeBtn.dataset.action = 'organize-ai';
                organizeBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.28 9.03a5 5 0 1 0-5.3 8.94"></path><path d="M13 15.36 A3 3 0 1 0 13 8.64"></path><path d="M12 21a9 9 0 1 0-9-9"></path></svg>
                  <span>${getMessage("organizeWithAI")}</span>`;
                organizeBtn.addEventListener('click', () => {
                    closeAllContextMenus();
                    handleOrganizeWithAI();
                });
                const settingsBtn = menuContainer.querySelector('[data-action="settings"]');
                if (settingsBtn) {
                    menuContainer.insertBefore(organizeBtn, settingsBtn);
                } else {
                    menuContainer.appendChild(organizeBtn);
                }
            }
        } else {
            if (organizeBtn) {
                organizeBtn.remove();
            }
        }

        if (organizeBtn) {
            organizeBtn.disabled = isDataStale;
        }
    }

    function getChatIdFromNode(node) {
        // Try href first (new method)
        const href = node.getAttribute('href');
        if (href && href.includes('/app/')) {
            const parts = href.split('/app/');
            if (parts[1]) {
                // Clean potential query params if any, though usually not present on these links
                return 'c_' + parts[1].split('?')[0];
            }
        }
        // Fallback to jslog (old method)
        const jslog = node.getAttribute('jslog');
        if (jslog) {
            const match = /\"(c_[a-f0-9]{16,})\"/.exec(jslog);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    function applyVisibilityFilters() {
        const chatListContainer = document.querySelector('.conversations-container');
        if (!chatListContainer) return;

        const cleanUrl = window.location.href.split('?')[0].split('#')[0];
        const urlMatch = cleanUrl.match(/\/([a-f0-9]{16,})$/);
        const activeChatId = urlMatch ? 'c_' + urlMatch[1] : null;

        const organizedChatIds = new Set(findAllChatmarks(foldersData).map(cm => cm.chatId));

        // Update selector to 'a' tag
        chatListContainer.querySelectorAll('a[data-test-id="conversation"]').forEach(chatEl => {
            const chatId = getChatIdFromNode(chatEl);

            if (chatId) {
                // Se l'impostazione è attiva e la chat è organizzata e NON è quella attiva, la nascondiamo
                if (hideOrganizedChats && organizedChatIds.has(chatId) && chatId !== activeChatId) {
                    chatEl.style.display = 'none';
                } else {
                    chatEl.style.display = 'flex'; // Ripristina visibilità (flex is suitable for these list items)
                }
            }
        });
    }

    // Nuova funzione per gestire l'aggiornamento del titolo della pagina
    function handleTitleUpdate(activeChatId) {
        // Capture default title on first run (usually "Gemini")
        if (defaultPageTitle === null) {
            defaultPageTitle = document.title;
        }

        if (!updatePageTitle || !activeChatId) return;

        let newTitle = null;

        // 1. Cerca nei segnalibri (priorità)
        const chatmarkInfos = findItemByChatIdRecursive(foldersData, activeChatId);
        if (chatmarkInfos.length > 0) {
            newTitle = chatmarkInfos[0].item.title;
        }

        // 2. Se non trovato, cerca nel DOM della lista chat
        if (!newTitle) {
            // Construct selector for <a> tag with href containing the ID (minus the c_ prefix)
            const idPart = activeChatId.replace('c_', '');
            const chatElement = document.querySelector(`.conversations-container a[data-test-id="conversation"][href*="${idPart}"]`);
            if (chatElement) {
                const titleEl = chatElement.querySelector('.conversation-title');
                if (titleEl && titleEl.textContent) {
                    newTitle = titleEl.textContent.trim();
                }
            }
        }

        if (newTitle) {
            const fullTitle = (pageTitlePrefix || '') + newTitle;
            if (document.title !== fullTitle) {
                document.title = fullTitle;
            }
        }
    }

    async function updateActiveChatmarkHighlight() {
        const newUrl = window.location.href;

        // Estraiamo sempre l'ID per usarlo nell'aggiornamento del titolo
        const cleanUrl = newUrl.split('?')[0].split('#')[0];
        const urlMatch = cleanUrl.match(/\/([a-f0-9]{16,})$/);
        const activeChatId = urlMatch ? 'c_' + urlMatch[1] : null;

        document.querySelectorAll('.gfe-active-chatmark').forEach(el => el.classList.remove('gfe-active-chatmark'));

        if (activeChatId) {
            // Quando l'URL cambia, forziamo l'aggiornamento dei filtri visivi per assicurarci che la nuova chat attiva sia visibile
            applyVisibilityFilters();

            // Proviamo ad aggiornare il titolo della pagina se l'opzione è attiva
            handleTitleUpdate(activeChatId);

            // Ottimizzazione: se l'URL non è cambiato e abbiamo già fatto l'highlight iniziale, saltiamo la logica pesante
            if (newUrl === lastKnownUrl && isInitialHighlightDone) return;
            lastKnownUrl = newUrl;

            let needsRerender = false;
            const chatmarkInfos = findItemByChatIdRecursive(foldersData, activeChatId);

            if (chatmarkInfos.length > 0) {
                let parent = chatmarkInfos[0].parent;
                while (parent) {
                    if (parent.collapsed) {
                        parent.collapsed = false;
                        needsRerender = true;
                    }
                    const parentInfo = findItemRecursive(foldersData, parent.id);
                    parent = parentInfo ? parentInfo.parent : null;
                }
            }

            if (needsRerender) {
                await saveFolders(false);
                rerenderWithCurrentQuery();
            } else {
                const chatmarkElements = document.querySelectorAll(`.gfe-chatmark-item[data-chat-id="${activeChatId}"]`);
                chatmarkElements.forEach(el => {
                    el.classList.add('gfe-active-chatmark');
                });
            }
        }
    }

    async function showIncompatibilityModal() {
        const version = chrome.runtime.getManifest().version;
        const storageKey = `gfe_compatibility_warning_${version}`;

        // Check if already dismissed for this version
        const result = await chrome.storage.sync.get([storageKey]);
        if (result[storageKey]) return;

        document.querySelectorAll('.gfe-selection-overlay').forEach(m => m.remove());

        const overlay = document.createElement('div');
        overlay.className = 'gfe-selection-overlay';

        const modal = document.createElement('div');
        modal.className = 'gfe-selection-modal';
        // Use softer warning style (Amber/Orange instead of Red)
        // #ed6c02 is a standard Material Design warning color (dark amber)
        modal.style.borderLeft = '6px solid #ed6c02';

        modal.innerHTML = `
        <h3 style="color: #ed6c02; display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            ${getMessage("compatibilityWarningTitle")}
        </h3>
        <p style="margin-bottom: 15px; font-size: 1.1em;">
            ${getMessage("compatibilityWarningMessage")}
        </p>
        <p style="margin-bottom: 10px; font-weight: bold;">
            ${getMessage("compatibilityWarningDevMsg")}
        </p>
        <div style="background: rgba(237, 108, 2, 0.08); padding: 10px; border-radius: 4px; border: 1px solid rgba(237, 108, 2, 0.3); margin-bottom: 20px;">
           ⚠️ ${getMessage("compatibilityWarningDisclaimer")}
        </div>

        <div class="gfe-confirm-buttons">
            <button id="gfe-compatibility-ok-btn" class="gfe-confirm-btn-confirm" style="background-color: #ed6c02 !important; width: 100%; justify-content: center;">
                ${getMessage("compatibilityWarningButton")}
            </button>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const okBtn = modal.querySelector('#gfe-compatibility-ok-btn');
        okBtn.addEventListener('click', async () => {
            // Save dismissal
            await chrome.storage.sync.set({ [storageKey]: true });
            overlay.remove();
        });
    }


    // --- Funzioni per la modalità "Aggiungi Chat" ---
    function exitAddMode() {
        isAddModeActive = false;
        document.body.classList.remove('gfe-add-mode-active');
        document.querySelectorAll('.gfe-notification').forEach(n => n.remove());
        const conversationsContainer = document.querySelector('.conversations-container');
        if (conversationsContainer) {
            conversationsContainer.removeEventListener('click', handleChatSelection, true);
        }
    }

    function handleChatSelection(event) {
        event.preventDefault();
        event.stopPropagation();
        const chatItem = event.target.closest('a[data-test-id="conversation"]');
        const folderId = document.body.dataset.gfeTargetFolderId;
        exitAddMode();

        if (chatItem && folderId) {
            const folderInfo = findItemRecursive(foldersData, folderId);
            if (!folderInfo || folderInfo.item.type !== 'folder') return;
            const folder = folderInfo.item;

            const title = chatItem.querySelector('.conversation-title')?.textContent.trim() || getMessage("untitledChat");

            const chatId = getChatIdFromNode(chatItem);

            if (chatId) {
                const isAlreadyInTarget = folder.children.some(c => c.type === 'chatmark' && c.chatId === chatId);
                if (isAlreadyInTarget) {
                    showGFENotification(getMessage("chatAlreadyInTargetFolder"));
                    return;
                }

                const performAdd = async () => {
                    const newChatmark = {
                        type: 'chatmark',
                        id: GFE_PREFIX + 'chatmark-' + Date.now(),
                        chatId: chatId,
                        title: title
                    };
                    folder.children.push(newChatmark);
                    await saveFolders();
                    showGFENotification(getMessage("chatAdded", [title, folder.name]));
                    rerenderWithCurrentQuery();
                };

                const existing = findItemByChatIdRecursive(foldersData, chatId);
                if (existing.length > 0) {
                    const existingFolderName = existing[0].parent ? existing[0].parent.name : getMessage("foldersTitle");
                    const message = getMessage("confirmDuplicateChatmark", [title, folder.name, existingFolderName]);
                    showConfirmationModal(message, performAdd, 'confirmAddChat');
                } else {
                    const message = getMessage("confirmAddChat", [`<span class="chat-title">${title}</span>`, `<span class="chat-title">${folder.name}</span>`]);
                    showConfirmationModal(message, performAdd, 'confirmAddChat');
                }
            }
        }
        delete document.body.dataset.gfeTargetFolderId;
    }


    function enterAddMode(folderId) {
        if (isDataStale) return;
        const folderInfo = findItemRecursive(foldersData, folderId);
        if (!folderInfo || folderInfo.item.type !== 'folder') return;
        const folder = folderInfo.item;
        isAddModeActive = true;
        document.body.classList.add('gfe-add-mode-active');
        document.body.dataset.gfeTargetFolderId = folderId;
        showGFENotification(getMessage("addModeNotification", [folder.name]), 5000);
        const conversationsContainer = document.querySelector('.conversations-container');
        if (conversationsContainer) {
            conversationsContainer.addEventListener('click', handleChatSelection, {
                capture: true,
                once: true
            });
        }
    }

    // --- AZIONI PER GLI ITEM (CARTELLE E CHATMARK) ---
    async function handleRenameItem(itemId) {
        if (isDataStale) return;
        const itemInfo = findItemRecursive(foldersData, itemId);
        if (!itemInfo) return;
        const item = itemInfo.item;
        const currentName = item.name || item.title;
        const newName = prompt(getMessage("promptNewName", [currentName]), currentName);
        if (newName && newName.trim() !== '') {
            if (item.type === 'folder') item.name = newName.trim();
            else item.title = newName.trim();
            await saveFolders();
            rerenderWithCurrentQuery();
        }
    }

    async function handleDeleteItem(itemId) {
        if (isDataStale) return;
        const itemInfo = findItemRecursive(foldersData, itemId);
        if (!itemInfo) return;
        const {
            item,
            items,
            index
        } = itemInfo;
        const message = item.type === 'folder' ?
            getMessage("confirmDeleteFolder", [item.name]) :
            getMessage("confirmDeleteChatmark", [item.title]);

        const confirmationKey = item.type === 'folder' ? 'confirmDeleteFolder' : 'confirmDeleteChatmark';

        showConfirmationModal(message, async () => {
            items.splice(index, 1);
            await saveFolders();
            rerenderWithCurrentQuery();
        }, confirmationKey);
    }

    // --- FUNZIONI PER APRIRE CHATMARK ---
    async function findAndOpenChat(chatmark) {
        const { chatId, id: chatmarkId, title } = chatmark;
        const scroller = document.querySelector('main infinite-scroller');
        const conversationsContainer = document.querySelector('.conversations-container');
        if (!scroller || !conversationsContainer) {
            showGFENotification(getMessage("chatContainerNotFound"));
            return;
        }

        // MODIFICA 1: Gestione temporanea opzione hideOrganizedChats
        const wasHideOrganizedActive = hideOrganizedChats;
        if (wasHideOrganizedActive) {
            hideOrganizedChats = false;
            applyVisibilityFilters(); // Mostra momentaneamente tutte le chat
        }

        // Temporaneamente mostra la chat se è nascosta per permettere il click (ridondante se applyVisibilityFilters funziona, ma sicurezza in più)
        // Temporaneamente mostra la chat se è nascosta per permettere il click (ridondante se applyVisibilityFilters funziona, ma sicurezza in più)
        const targetElement = Array.from(conversationsContainer.querySelectorAll('a[data-test-id="conversation"]'))
            .find(el => getChatIdFromNode(el) === chatId);

        if (targetElement) {
            targetElement.style.display = 'flex'; // Forza visibilità
        }

        const initialScrollTop = scroller?.scrollTop || 0;
        // AUMENTO TENTATIVI E PAUSA
        for (let attempt = 1; attempt <= 7; attempt++) {
            const chatElements = conversationsContainer.querySelectorAll('a[data-test-id="conversation"]');
            let foundChatElement = null;
            for (const chatEl of chatElements) {
                if (getChatIdFromNode(chatEl) === chatId) {
                    foundChatElement = chatEl;
                    break;
                }
            }
            if (foundChatElement) {
                foundChatElement.style.display = 'flex'; // Assicura visibilità
                foundChatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                foundChatElement.classList.add('gfe-highlight');
                setTimeout(() => foundChatElement.classList.remove('gfe-highlight'), 1500);
                setTimeout(() => foundChatElement.click(), 400);
                setTimeout(() => {
                    if (scroller) scroller.scrollTop = initialScrollTop;
                    // Ripristina l'opzione se era attiva
                    if (wasHideOrganizedActive) {
                        hideOrganizedChats = true;
                    }
                    applyVisibilityFilters(); // Riapplica i filtri dopo l'operazione
                }, 800);
                return;
            }
            if (attempt < 7) {
                showGFENotification(getMessage("chatNotFoundTryAgain", [attempt.toString()]), 2500);
                if (scroller) scroller.scrollTop = scroller.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, 1500)); // AUMENTO PAUSA
            }
        }

        // Se la chat non viene trovata, ripristina comunque lo stato
        if (wasHideOrganizedActive) {
            hideOrganizedChats = true;
            applyVisibilityFilters();
        }

        const message = getMessage("confirmDeleteMissingChatmark", [title]);
        showConfirmationModal(message, async () => {
            if (isDataStale) {
                showGFENotification(getMessage("dataStaleActionBlocked"), 3000);
                return;
            }
            const itemInfo = findItemRecursive(foldersData, chatmarkId);
            if (itemInfo) {
                itemInfo.items.splice(itemInfo.index, 1);
                await saveFolders();
                rerenderWithCurrentQuery();
            }
        }, 'confirmDeleteChatmark'); // Reuse chatmark deletion preference or generic? Let's use 'confirmDeleteChatmark' for consistency as it is removing a bookmark.
    }


    async function handleChatmarkClick(chatmark) {
        const recentsHeader = document.querySelector('.title-container.gfe-recents');
        if (recentsHeader && recentsHeader.classList.contains('gfe-collapsed')) {
            recentsHeader.click();
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        await findAndOpenChat(chatmark);
    }

    function handleExportData() {
        try {
            const backupObject = {
                appId: 'GeminiChatFolders',
                exportDate: new Date().toISOString(),
                data: {
                    folders: foldersData,
                    panelsState: panelsState
                }
            };
            const jsonString = JSON.stringify(backupObject, null, 2);
            const blob = new Blob([jsonString], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `gemini-folders-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            showGFENotification(getMessage("exportSuccess"));
        } catch (e) {
            console.error("GFE: Esportazione fallita", e);
            showGFENotification(getMessage("exportError"));
        }
    }

    function handleImportData() {
        if (isDataStale) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = readerEvent => {
                try {
                    const content = readerEvent.target.result;
                    const importedObject = JSON.parse(content);
                    if (importedObject.appId !== 'GeminiChatFolders' || !importedObject.data || !Array.isArray(importedObject.data.folders)) {
                        throw new Error("Invalid file format");
                    }
                    const message = getMessage("confirmImport");
                    showConfirmationModal(message, async () => {
                        foldersData = importedObject.data.folders || [];
                        await saveFolders();
                        await saveNonCriticalData('panelsState', importedObject.data.panelsState || {});

                        showGFENotification(getMessage("importSuccessReload"), 3000);
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    });
                } catch (err) {
                    console.error("GFE: Importazione fallita", err);
                    showGFENotification(getMessage("importError"));
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // --- Funzioni per il Drag & Drop (Unificate) ---

    function addDragDropHandlers(el) {
        el.addEventListener('dragstart', (e) => {
            if (isDataStale) { e.preventDefault(); return; }
            e.stopPropagation();
            e.currentTarget.classList.add('gfe-dragging');
            e.dataTransfer.setData(GFE_INTERNAL_DND_TYPE, e.currentTarget.dataset.itemId);
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDataStale) return;
            const isInternalDrag = e.dataTransfer.types.includes(GFE_INTERNAL_DND_TYPE);
            const isRecentChatDrag = e.dataTransfer.types.includes(GFE_RECENT_DND_TYPE);
            if (!isInternalDrag && !isRecentChatDrag) return;

            const targetEl = e.currentTarget;
            const rect = targetEl.getBoundingClientRect();
            const mouseY = e.clientY - rect.top;
            const isFolder = targetEl.classList.contains('gfe-folder-header');
            targetEl.classList.remove('gfe-drop-above', 'gfe-drop-below', 'gfe-drop-inside');

            const dropZoneHeight = rect.height;
            const topThreshold = dropZoneHeight * 0.25;
            const bottomThreshold = dropZoneHeight * 0.75;

            if (mouseY < topThreshold) {
                targetEl.classList.add('gfe-drop-above');
            } else if (mouseY > bottomThreshold) {
                targetEl.classList.add('gfe-drop-below');
            } else if (isFolder) {
                targetEl.classList.add('gfe-drop-inside');
            } else {
                targetEl.classList.add(mouseY < dropZoneHeight / 2 ? 'gfe-drop-above' : 'gfe-drop-below');
            }
        });

        el.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('gfe-drop-above', 'gfe-drop-below', 'gfe-drop-inside');
        });

        el.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isDataStale) return;

            const dropTarget = e.currentTarget;
            const dropAction = dropTarget.classList.contains('gfe-drop-above') ? 'above' :
                dropTarget.classList.contains('gfe-drop-below') ? 'below' :
                    dropTarget.classList.contains('gfe-drop-inside') ? 'inside' : null;

            dropTarget.classList.remove('gfe-drop-above', 'gfe-drop-below', 'gfe-drop-inside');
            if (!dropAction) return;

            const targetId = dropTarget.dataset.itemId;
            const isInternalDrag = e.dataTransfer.types.includes(GFE_INTERNAL_DND_TYPE);
            const isRecentChatDrag = e.dataTransfer.types.includes(GFE_RECENT_DND_TYPE);

            if (isRecentChatDrag) {
                handleRecentChatDrop(e, targetId, dropAction);
            } else if (isInternalDrag) {
                handleInternalItemDrop(e, targetId, dropAction);
            }
        });

        el.addEventListener('dragend', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.gfe-dragging, .gfe-drop-above, .gfe-drop-below, .gfe-drop-inside').forEach(elem => {
                elem.classList.remove('gfe-dragging', 'gfe-drop-above', 'gfe-drop-below', 'gfe-drop-inside');
            });
        });
    }

    async function handleRecentChatDrop(e, targetId, dropAction) {
        if (isDataStale) return;
        const payload = JSON.parse(e.dataTransfer.getData(GFE_RECENT_DND_TYPE));
        const { id: chatId, title: chatTitle } = payload;

        const targetInfo = findItemRecursive(foldersData, targetId);
        if (!targetInfo) return;

        let targetParent;
        let containerItems;
        let targetParentName;

        if (dropAction === 'inside' && targetInfo.item.type === 'folder') {
            targetParent = targetInfo.item;
            containerItems = targetParent.children;
        } else {
            targetParent = targetInfo.parent;
            containerItems = targetParent ? targetParent.children : foldersData;
        }
        targetParentName = targetParent ? targetParent.name : getMessage("foldersTitle");

        const isAlreadyInTarget = containerItems.some(c => c.type === 'chatmark' && c.chatId === chatId);
        if (isAlreadyInTarget) {
            showGFENotification(getMessage("chatAlreadyInTargetFolder"));
            return;
        }

        const performAdd = async () => {
            const newChatmark = {
                type: 'chatmark',
                id: GFE_PREFIX + 'chatmark-' + Date.now(),
                chatId: chatId,
                title: chatTitle
            };

            if (dropAction === 'inside' && targetInfo.item.type === 'folder') {
                containerItems.push(newChatmark);
                targetInfo.item.collapsed = false;
            } else {
                const targetIndex = containerItems.findIndex(item => item.id === targetId);
                if (targetIndex === -1) return;
                const insertIndex = dropAction === 'above' ? targetIndex : targetIndex + 1;
                containerItems.splice(insertIndex, 0, newChatmark);
            }

            await saveFolders();
            rerenderWithCurrentQuery();
            showGFENotification(getMessage("chatAdded", [chatTitle, targetParentName]));
        };

        const existing = findItemByChatIdRecursive(foldersData, chatId);
        if (existing.length > 0) {
            const existingFolderName = existing[0].parent ? existing[0].parent.name : getMessage("foldersTitle");
            const message = getMessage("confirmDuplicateChatmark", [chatTitle, targetParentName, existingFolderName]);
            showConfirmationModal(message, performAdd, 'confirmAddChat');
        } else {
            const message = getMessage("confirmAddChat", [`<span class="chat-title">${chatTitle}</span>`, `<span class="chat-title">${targetParentName}</span>`]);
            showConfirmationModal(message, performAdd, 'confirmAddChat');
        }
    }


    async function handleInternalItemDrop(e, targetId, dropAction) {
        if (isDataStale) return;
        const draggedId = e.dataTransfer.getData(GFE_INTERNAL_DND_TYPE);
        if (draggedId === targetId) return;

        const draggedInfo = findItemRecursive(foldersData, draggedId);
        if (!draggedInfo) return;

        if (draggedInfo.item.type === 'folder') {
            let pInfo = findItemRecursive(foldersData, targetId);
            while (pInfo) {
                if (pInfo.item.id === draggedId) return;
                pInfo = pInfo.parent ? findItemRecursive(foldersData, pInfo.parent.id) : null;
            }
        }

        const [draggedItem] = draggedInfo.items.splice(draggedInfo.index, 1);
        const targetInfo = findItemRecursive(foldersData, targetId);
        if (!targetInfo) {
            draggedInfo.items.splice(draggedInfo.index, 0, draggedItem);
            return;
        }

        if (dropAction === 'inside' && targetInfo.item.type === 'folder') {
            targetInfo.item.children.unshift(draggedItem);
            targetInfo.item.collapsed = false;
        } else {
            const containerItems = targetInfo.parent ? targetInfo.parent.children : foldersData;
            const targetIndex = containerItems.findIndex(item => item.id === targetId);
            const insertIndex = dropAction === 'above' ? targetIndex : targetIndex + 1;
            containerItems.splice(insertIndex, 0, draggedItem);
        }
        await saveFolders();
        rerenderWithCurrentQuery();
    }

    async function handleAddFolder(parentId = null) {
        if (isDataStale) return;
        const folderName = prompt(getMessage("promptNewFolder"));
        if (folderName && folderName.trim() !== '') {
            const newFolder = {
                id: GFE_PREFIX + 'folder-' + Date.now(),
                type: 'folder',
                name: folderName.trim(),
                children: [],
                collapsed: false
            };
            if (parentId) {
                const parentInfo = findItemRecursive(foldersData, parentId);
                if (parentInfo && parentInfo.item.type === 'folder') {
                    parentInfo.item.children.push(newFolder);
                    parentInfo.item.collapsed = false;
                }
            } else {
                foldersData.push(newFolder);
            }
            await saveFolders();
            rerenderWithCurrentQuery();
        }
    }

    function makeRecentChatDraggable(chatElement) {
        if (chatElement.getAttribute('draggable') === 'true') return;
        chatElement.setAttribute('draggable', 'true');
        chatElement.addEventListener('dragstart', (e) => {
            if (isDataStale) { e.preventDefault(); return; }
            e.stopPropagation();
            const title = e.currentTarget.querySelector('.conversation-title')?.textContent.trim() || getMessage("untitledChat");
            const chatId = getChatIdFromNode(e.currentTarget);
            if (chatId) {
                const payload = { source: 'recent', id: chatId, title: title };
                e.dataTransfer.setData(GFE_RECENT_DND_TYPE, JSON.stringify(payload));
                e.dataTransfer.effectAllowed = 'copy';
            } else {
                e.preventDefault();
            }
        });
    }


    // --- Funzioni per la feature IA e Impostazioni ---

    async function validateApiKey(apiKey) {
        if (!apiKey) return false;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "contents": [{
                        "parts": [{
                            "text": "Hello"
                        }]
                    }]
                })
            });
            return response.ok;
        } catch (error) {
            console.error("GFE: Errore durante la validazione della chiave API:", error);
            return false;
        }
    }

    async function loadAllRecentChats() {
        const scroller = document.querySelector('main infinite-scroller');
        if (!scroller) return;

        const initialScrollTop = scroller.scrollTop;

        showGFENotification(getMessage("loadingChats"), 0);

        let lastScrollHeight = -1;
        let lastChatCount = -1;
        let stableCounter = 0;
        const STABLE_THRESHOLD = 3;

        while (stableCounter < STABLE_THRESHOLD) {
            scroller.scrollTop = scroller.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 750));

            const currentChatCount = document.querySelectorAll('.conversations-container a[data-test-id="conversation"]').length;

            if (scroller.scrollHeight === lastScrollHeight && currentChatCount === lastChatCount) {
                stableCounter++;
            } else {
                lastScrollHeight = scroller.scrollHeight;
                lastChatCount = currentChatCount;
                stableCounter = 0;
            }
        }

        scroller.scrollTop = initialScrollTop;
        document.querySelectorAll('.gfe-notification').forEach(n => n.remove());
    }

    function getUncategorizedChats() {
        const allChatElements = document.querySelectorAll('.conversations-container a[data-test-id="conversation"]');
        const uncategorizedChats = [];
        allChatElements.forEach(chatEl => {
            const chatId = getChatIdFromNode(chatEl);
            if (chatId) {
                const isCategorized = findItemByChatIdRecursive(foldersData, chatId).length > 0;
                if (!isCategorized) {
                    const title = chatEl.querySelector('.conversation-title')?.textContent.trim() || getMessage("untitledChat");
                    uncategorizedChats.push({
                        id: chatId,
                        title: title
                    });
                }
            }
        });
        return uncategorizedChats;
    }

    function parseAiTextResponse(text, uncategorizedChats) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const newStructure = [];
        let currentFolder = null;
        let currentSubFolder = null;
        let currentSubSubFolder = null;
        const errors = [];
        const uncategorizedChatsMap = new Map(uncategorizedChats.map(c => [c.id, c]));
        const categorizedChatIds = new Set();

        lines.forEach((line, index) => {
            try {
                if (line.startsWith('F:')) {
                    const folderName = line.substring(2).trim();
                    currentFolder = { id: `${GFE_PREFIX}folder-ai-${Date.now()}-${index}`, type: 'folder', name: folderName, children: [], collapsed: false };
                    newStructure.push(currentFolder);
                    currentSubFolder = null;
                    currentSubSubFolder = null;
                } else if (line.startsWith('  SF:') && currentFolder) {
                    const subFolderName = line.substring(5).trim();
                    currentSubFolder = { id: `${GFE_PREFIX}folder-ai-${Date.now()}-${index}`, type: 'folder', name: subFolderName, children: [], collapsed: false };
                    currentFolder.children.push(currentSubFolder);
                    currentSubSubFolder = null;
                } else if (line.startsWith('    SSF:') && currentSubFolder) {
                    const subSubFolderName = line.substring(8).trim();
                    currentSubSubFolder = { id: `${GFE_PREFIX}folder-ai-${Date.now()}-${index}`, type: 'folder', name: subSubFolderName, children: [], collapsed: false };
                    currentSubFolder.children.push(currentSubSubFolder);
                } else if (line.trim().startsWith('C:')) {
                    const trimmedLine = line.trim();
                    const parts = trimmedLine.substring(2).split('|');
                    const chatId = parts[0]?.trim();

                    if (chatId && uncategorizedChatsMap.has(chatId)) {
                        const originalChat = uncategorizedChatsMap.get(chatId);
                        const chatmark = {
                            type: 'chatmark',
                            id: GFE_PREFIX + 'chatmark-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                            chatId: originalChat.id,
                            title: originalChat.title
                        };
                        const parent = currentSubSubFolder || currentSubFolder || currentFolder;
                        if (parent) {
                            parent.children.push(chatmark);
                            categorizedChatIds.add(chatId);
                        } else {
                            errors.push(`Line ${index + 1}: Chat found without parent folder.`);
                        }
                    } else {
                        errors.push(`Line ${index + 1}: Chat ID from AI not in original list or malformed.`);
                    }
                } else if (line.trim()) {
                    errors.push(`Line ${index + 1}: Could not parse line: "${line}"`);
                }
            } catch (e) {
                errors.push(`Line ${index + 1}: Critical error during parsing.`);
            }
        });
        if (errors.length > 0) console.warn("GFE: AI response parsing errors:", errors);
        return { structure: newStructure, errors, categorizedChatIds };
    }


    function safeMerge(existingChildren, aiItems) {
        aiItems.forEach(aiItem => {
            if (aiItem.type === 'chatmark') {
                const alreadyExists = findItemByChatIdRecursive(foldersData, aiItem.chatId).length > 0;
                if (!alreadyExists) {
                    existingChildren.push(aiItem);
                }
            } else if (aiItem.type === 'folder') {
                let existingFolder = existingChildren.find(f => f.name === aiItem.name && f.type === 'folder');
                if (existingFolder) {
                    safeMerge(existingFolder.children, aiItem.children);
                    existingFolder.collapsed = false;
                } else {
                    existingChildren.push(aiItem);
                }
            }
        });
    }

    async function executeOrganizeWithAI(selectedChats, useExistingOnly, defaultFolderName) {
        if (isDataStale || selectedChats.length === 0) return;

        // --- MODIFICA v4.7.0: Spinner invece della notifica a tempo ---
        // per ora uso showGFENotification con durata 0ms e poi la nascondo manualmente
        //showLoadingSpinner(getMessage("organizingChats"));
        showGFENotification(getMessage("organizingChats"), 0);

        const lang = chrome.i18n.getUILanguage();
        const uncategorizedChatsText = selectedChats.map(c => `- ${c.id} | "${c.title}"`).join('\n');
        const existingStructureText = convertDataToTextStructure(foldersData);

        let specificRules = `2. Create a deep and logical structure with up to 3 levels of depth (Category -> Topic -> Project). Create broad, high-level categories as top-level folders. For example: Sviluppo (F:) -> Estensioni Chrome (SF:) -> Progetto Folders (SSF:).`;
        if (useExistingOnly) {
            specificRules += `2. **CRITICAL**: You MUST NOT create new folders. You can ONLY use folder names that are present in the 'existing_structure' provided. If a chat does not fit into any existing folder, simply omit it from your response.`;
        }

        const prompt = `You are an expert file organizer. Your task is to categorize a list of chat titles into a logical, hierarchical folder structure, based on an existing structure.
**RULES:**
1. Your response MUST be plain text, following the format demonstrated below. DO NOT use JSON or markdown.
${specificRules}
3. Use the following prefixes for each line, respecting the indentation:
   - \`F: Folder Name\` for a top-level folder (level 1).
   - \`  SF: Sub-Folder Name\` for a second-level folder (level 2, indent with 2 spaces).
   - \`    SSF: Sub-Sub-Folder Name\` for a third-level folder (level 3, indent with 4 spaces).
   - \`      C: chat_id | "Chat Title"\` for a chat (level 4, indent with 6 spaces).
4. **CRITICAL:** Use the exact \`chat_id\` provided for each chat. Do not modify it.
5. **CRITICAL:** Include the full, original "Chat Title" in double quotes, exactly as it was provided to you.
6. If an existing folder from \`existing_structure\` is a good fit, use its exact name to promote merging.
7. You MUST categorize every chat from the \`uncategorized_chats\` list. Be specific with level 3 folders to group very similar chats.
8. Generate all folder names in the following language: ${lang}.

**DATA:**
- existing_structure:
${existingStructureText}

- uncategorized_chats:
${uncategorizedChatsText}

Now, provide the formatted text response. Your response MUST ONLY contain the structure for the chats from the 'uncategorized_chats' list. Do not include any other chats or folders from the 'existing_structure' in your output.`;

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const apiErrorMessage = errorData.error?.message || response.statusText;
                throw new Error(`API Error: ${response.status} ${apiErrorMessage}`);
            }

            const result = await response.json();
            const aiTextResponse = result.candidates[0].content.parts[0].text;

            const { structure, errors, categorizedChatIds } = parseAiTextResponse(aiTextResponse, selectedChats);

            // --- MODIFICA v4.7.0: Gestione chat non classificate per il default folder PRIMA della preview ---
            if (useExistingOnly) {
                const unclassifiedChats = selectedChats.filter(chat => !categorizedChatIds.has(chat.id));
                if (unclassifiedChats.length > 0) {
                    // Cerca se esiste già nella struttura proposta dall'AI (potrebbe averlo creato l'AI stessa se ha ignorato l'istruzione, ma qui lo forziamo)
                    let defaultFolder = structure.find(f => f.name === defaultFolderName && f.type === 'folder');
                    if (!defaultFolder) {
                        defaultFolder = {
                            id: GFE_PREFIX + 'folder-default-' + Date.now(),
                            type: 'folder', name: defaultFolderName, children: [], collapsed: false
                        };
                        structure.unshift(defaultFolder);
                    }

                    unclassifiedChats.forEach(chat => {
                        defaultFolder.children.push({
                            type: 'chatmark',
                            id: GFE_PREFIX + 'chatmark-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                            chatId: chat.id,
                            title: chat.title
                        });
                    });
                }
            }

            // per ora non serve, non ho attivato lo spinner
            //hideLoadingSpinner(); // Nasconde lo spinner
            // nascondo invece la notifica
            document.querySelectorAll('.gfe-notification').forEach(n => n.remove());

            if (structure.length === 0 && errors.length > 0 && !useExistingOnly) {
                showGFENotification(getMessage("organizeError"));
                return;
            }

            // --- MODIFICA v4.7.0: Mostra Preview invece di applicare subito ---
            showPreviewModal(structure, async (finalStructure) => {
                if (finalStructure && finalStructure.length > 0) {
                    safeMerge(foldersData, finalStructure);
                    await saveFolders();
                    rerenderWithCurrentQuery();

                    if (errors.length > 0) {
                        showGFENotification(getMessage("organizeParseError"), 5000);
                    } else {
                        showGFENotification(getMessage("organizeSuccess"));
                    }
                    setTimeout(focusOnFoldersPanel, 100);
                }
            });

        } catch (error) {
            // per ora non serve, non ho attivato lo spinner
            //hideLoadingSpinner();
            // nascondo invece la notifica
            document.querySelectorAll('.gfe-notification').forEach(n => n.remove());

            console.error("GFE: Errore durante l'organizzazione con IA:", error);
            showGFENotification(`${getMessage("organizeError")}: ${error.message}`, 7000);
        }
    }

    async function handleOrganizeWithAI() {
        if (isDataStale) return;
        await loadAllRecentChats();
        const uncategorizedChats = getUncategorizedChats();

        if (uncategorizedChats.length === 0) {
            showGFENotification(getMessage("noUncategorizedChats"));
            return;
        }

        showChatSelectionModal(uncategorizedChats, (selectedChats, useExistingOnly, defaultFolderName) => {
            if (selectedChats.length > 0) {
                executeOrganizeWithAI(selectedChats, useExistingOnly, defaultFolderName);
            }
        });
    }

    // NUOVA FUNZIONE PER LA PULIZIA DEGLI ORFANI

    function findAllChatmarks(items) {
        let chatmarks = [];
        function traverse(nodes) {
            nodes.forEach(node => {
                if (node.type === 'chatmark') {
                    chatmarks.push(node);
                } else if (node.type === 'folder' && node.children) {
                    traverse(node.children);
                }
            });
        }
        traverse(items);
        return chatmarks;
    }

    function removeChatmarksByIds(items, idsToDeleteSet) {
        return items.filter(item => {
            if (item.type === 'chatmark') {
                return !idsToDeleteSet.has(item.id);
            }
            if (item.type === 'folder' && item.children) {
                item.children = removeChatmarksByIds(item.children, idsToDeleteSet);
            }
            return true;
        });
    }

    async function handleCleanupOrphans() {
        if (isDataStale) return;

        // 1) disabilitare momentaneoamente l'opzione "Nascondi chat organizzate dai recenti" e memorizzare questa informazione
        const wasHideOrganizedActive = hideOrganizedChats;
        if (wasHideOrganizedActive) {
            hideOrganizedChats = false;
            applyVisibilityFilters();
        }

        // 2) espandere le chat recenti se sono collassate e memorizzare questa informazione
        const recentsHeader = document.querySelector('.title-container.gfe-recents');
        const wasRecentsCollapsed = recentsHeader && recentsHeader.classList.contains('gfe-collapsed');
        if (wasRecentsCollapsed) {
            recentsHeader.click();
            // Attende che l'animazione di apertura si completi per far apparire il DOM delle chat
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 3) caricare tutte le chat
        await loadAllRecentChats();

        // 4) memorizzare l'elenco delle chat esistenti
        const recentChatElements = document.querySelectorAll('.conversations-container a[data-test-id="conversation"]');
        const existingChatIds = new Set();
        recentChatElements.forEach(el => {
            const chatId = getChatIdFromNode(el);
            if (chatId) {
                existingChatIds.add(chatId);
            }
        });

        // 5) collassare le chat recenti se erano collassate all'inizio
        if (wasRecentsCollapsed && recentsHeader && !recentsHeader.classList.contains('gfe-collapsed')) {
            recentsHeader.click();
        }

        // 6) ripristinare l'opzione "Nascondi chat organizzate dai recenti" se era presente all'inizio
        if (wasHideOrganizedActive) {
            hideOrganizedChats = true;
            applyVisibilityFilters();
        }

        const allChatmarks = findAllChatmarks(foldersData);
        const orphans = allChatmarks.filter(chatmark => !existingChatIds.has(chatmark.chatId));

        if (orphans.length === 0) {
            showGFENotification(getMessage("noOrphansFound"));
            return;
        }
        showOrphanSelectionModal(orphans);
    }


    // --- GESTIONE SINCRONIZZAZIONE E STATO "STALE" ---

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            // --- MODIFICA RICHIESTA: Gestione real-time impostazioni ---
            if (changes.hideOrganizedChats) {
                hideOrganizedChats = changes.hideOrganizedChats.newValue;
                applyVisibilityFilters();
            }
            if (changes.updatePageTitle) {
                const oldVal = updatePageTitle;
                updatePageTitle = changes.updatePageTitle.newValue;
                // Se disabilitato da remoto, ripristina titolo
                if (oldVal && !updatePageTitle && defaultPageTitle) {
                    document.title = defaultPageTitle;
                } else if (!oldVal && updatePageTitle) {
                    // Se abilitato da remoto, applica subito
                    const cleanUrl = window.location.href.split('?')[0].split('#')[0];
                    const urlMatch = cleanUrl.match(/\/([a-f0-9]{16,})$/);
                    const activeChatId = urlMatch ? 'c_' + urlMatch[1] : null;
                    if (activeChatId) handleTitleUpdate(activeChatId);
                }
            }
            if (changes.pageTitlePrefix) {
                pageTitlePrefix = changes.pageTitlePrefix.newValue;
                // Riapplica il titolo con il nuovo prefisso se l'opzione è attiva
                if (updatePageTitle) {
                    const cleanUrl = window.location.href.split('?')[0].split('#')[0];
                    const urlMatch = cleanUrl.match(/\/([a-f0-9]{16,})$/);
                    const activeChatId = urlMatch ? 'c_' + urlMatch[1] : null;
                    if (activeChatId) handleTitleUpdate(activeChatId);
                }
            }
            // --- FINE MODIFICA ---

            if (changes.lastUpdateId) {
                const newUpdateId = changes.lastUpdateId.newValue;
                if (newUpdateId && (localUpdateId === null || newUpdateId > localUpdateId)) {
                    console.log("GFE: Dati esterni rilevati. Attivazione modalità read-only.");
                    enterStaleMode();
                }
            }
        }
    });

    async function handleInitialChatHighlight() {
        if (isInitialHighlightDone) return;
        await updateActiveChatmarkHighlight();
        isInitialHighlightDone = true;
    }

    function observeActiveChat() {
        if (gfeActiveChatObserver) gfeActiveChatObserver.disconnect();

        const mainContent = document.querySelector('main');
        if (!mainContent) {
            return;
        }

        gfeActiveChatObserver = new MutationObserver(() => {
            setTimeout(updateActiveChatmarkHighlight, 100);
        });

        gfeActiveChatObserver.observe(document.body, { childList: true, subtree: true });

        // Esegue le logica di caricamento completo solo al primo avvio
        handleInitialChatHighlight();
    }

    // --- MODIFICA v4.9.1: Controllo Notifica Aggiornamento Semplificato ---
    async function checkUpdateNotification() {
        const result = await chrome.storage.local.get(['gfe_show_update_modal']);
        if (result.gfe_show_update_modal) {
            showGFENotification(getMessage("updateDetectedNotification"), 10000);
            await chrome.storage.local.remove(['gfe_show_update_modal', 'gfe_previous_version']);
        }
    }

    function observeRecentChats() {
        if (gfeRecentChatsObserver) gfeRecentChatsObserver.disconnect();
        const chatListContainer = document.querySelector('.conversations-container');
        if (!chatListContainer) return;

        chatListContainer.querySelectorAll('a[data-test-id="conversation"]').forEach(node => {
            makeRecentChatDraggable(node);
        });

        applyVisibilityFilters();

        gfeRecentChatsObserver = new MutationObserver((mutations) => {
            let needsFilter = false;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches('a[data-test-id="conversation"]')) {
                            makeRecentChatDraggable(node);
                            needsFilter = true;
                        }
                        node.querySelectorAll('a[data-test-id="conversation"]').forEach(el => {
                            makeRecentChatDraggable(el);
                            needsFilter = true;
                        });
                    }
                });
            });
            if (needsFilter) applyVisibilityFilters();
        });
        gfeRecentChatsObserver.observe(chatListContainer, { childList: true, subtree: true });
    }

    // --- Funzione di controllo compatibilità ---
    function checkCriticalSelectors() {
        // Skip check on share pages (no sidebar)
        if (window.location.href.includes('/share')) return;

        // 1. Check main container
        const chatContainer = document.querySelector('.conversations-container');
        if (!chatContainer) {
            // When there are no conversations (fresh account) the sidebar may be absent.
            // This is not a blocking incompatibility — log an informational message and continue.
            console.info('No blocking modal: Gemini chat sidebar/history empty or missing (normal)');
            return;
        }

        // 2. Check if we can find ANY chat items. 
        // Note: This relies on the assumption that a user usually has at least one recent chat.
        // If the list is truly empty, this might be a false positive, but it's safe to warn.
        // To reduce false positives on fresh accounts, we might check if there are OTHER elements looking like list items but not matching our selector.
        // For now, we just check if our selector returns valid nodes when there seems to be content.

        // Simple heuristic: if container has children but our selector finds nothing
        if (chatContainer.children.length > 0) {
            const foundChats = chatContainer.querySelectorAll('a[data-test-id="conversation"]');
            if (foundChats.length === 0) {
                // Double check: maybe they are still divs? 
                // If they are divs, Google reverted or changed something else.
                // In any case, our MAIN selector failed.
                console.warn('GFE Compatibility Check Failed: No chat items found with selector a[data-test-id="conversation"], but container is not empty.');
                showIncompatibilityModal();
            }
        }
    }

    async function initializeApp() {
        setTimeout(checkCriticalSelectors, 2000);

        if (!dataLoaded) {
            await loadData();
            dataLoaded = true;
            checkUpdateNotification();
        }
        const gemHeader = document.querySelector('.gems-list-container .title-container');
        createCollapsiblePanel(gemHeader, 'gem', 'gem');

        // *** LOGICA PER 'MY STUFF' ***
        const myStuffButton = document.querySelector('side-nav-entry-button[data-test-id="my-stuff-side-nav-entry-button"]');
        if (myStuffButton && !myStuffButton.classList.contains(GFE_PREFIX + 'modified')) {
            // Applichiamo la modifica direttamente al pulsante Angular, non al container padre
            createCollapsiblePanel(myStuffButton, 'my-stuff', 'my-stuff');
            myStuffButton.classList.add('title-container');
        }

        const recentsHeader = document.querySelector('conversations-list .title-container');
        if (recentsHeader && !recentsHeader.classList.contains('gfe-modified')) {
            createCollapsiblePanel(recentsHeader, 'recents', 'recents');
            if (!document.getElementById(GFE_PREFIX + 'folders-panel')) {
                const foldersPanel = document.createElement('div');
                foldersPanel.id = GFE_PREFIX + 'folders-panel';
                const foldersHeaderElement = recentsHeader.cloneNode(true);
                foldersHeaderElement.className = 'title-container ' + GFE_PREFIX + 'modified';
                foldersHeaderElement.querySelector('h1').textContent = getMessage("foldersTitle");
                foldersHeaderElement.querySelector('.gfe-header-actions').remove();
                foldersHeaderElement.classList.remove(GFE_PREFIX + 'recents', GFE_PREFIX + 'collapsed');

                const foldersActions = document.createElement('div');
                foldersActions.className = 'gfe-header-actions';

                const syncBtn = document.createElement('button');
                syncBtn.id = GFE_PREFIX + 'sync-btn';
                syncBtn.title = getMessage("syncButtonTitle");
                syncBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
                syncBtn.style.display = 'none'; // Nascosto di default

                const addFolderBtn = document.createElement('button');
                addFolderBtn.id = GFE_PREFIX + 'add-folder-btn';
                addFolderBtn.title = getMessage("newFolder");
                addFolderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

                const toggleSearchBtn = document.createElement('button');
                toggleSearchBtn.id = GFE_PREFIX + 'toggle-search-btn';
                toggleSearchBtn.title = getMessage("search");
                toggleSearchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

                const moreActionsBtn = document.createElement('button');
                moreActionsBtn.id = GFE_PREFIX + 'more-actions-btn';
                moreActionsBtn.title = getMessage("moreActions");
                moreActionsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>`;

                const foldersCollapseBtn = document.createElement('div');
                foldersCollapseBtn.className = 'gfe-collapse-button';
                foldersCollapseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;

                foldersActions.appendChild(syncBtn);
                foldersActions.appendChild(toggleSearchBtn);
                foldersActions.appendChild(addFolderBtn);
                foldersActions.appendChild(moreActionsBtn);
                foldersActions.appendChild(foldersCollapseBtn);
                foldersHeaderElement.appendChild(foldersActions);

                if (panelsState.folders) foldersPanel.classList.add(GFE_PREFIX + 'collapsed');
                const searchContainer = document.createElement('div');
                searchContainer.className = 'gfe-search-container gfe-hidden';
                const searchInput = document.createElement('input');
                searchInput.type = 'search';
                searchInput.id = GFE_PREFIX + 'search-input';
                searchInput.placeholder = getMessage('searchPlaceholder');
                searchContainer.appendChild(searchInput);
                const foldersContent = document.createElement('div');
                foldersContent.id = GFE_PREFIX + 'folders-content';
                foldersPanel.appendChild(foldersHeaderElement);
                foldersPanel.appendChild(searchContainer);
                foldersPanel.appendChild(foldersContent);
                recentsHeader.parentNode.insertBefore(foldersPanel, recentsHeader);

                foldersHeaderElement.addEventListener('click', async (e) => {
                    if (e.target.closest('button')) return;
                    panelsState.folders = foldersPanel.classList.toggle(GFE_PREFIX + 'collapsed');
                    await saveNonCriticalData('panelsState', panelsState);
                });

                syncBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    forceDataReload();
                });

                addFolderBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleAddFolder();
                });

                moreActionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isAlreadyOpen = moreActionsBtn.classList.contains('gfe-menu-open');
                    closeAllContextMenus();
                    if (isAlreadyOpen) return;

                    moreActionsBtn.classList.add('gfe-menu-open');
                    const rect = moreActionsBtn.getBoundingClientRect();
                    const contextMenu = document.createElement('div');
                    contextMenu.className = 'gfe-folder-context-menu';
                    contextMenu.id = GFE_PREFIX + 'more-actions-menu-container';
                    contextMenu.style.top = `${rect.bottom + 4}px`;
                    contextMenu.style.left = `${rect.left}px`;

                    contextMenu.innerHTML = `
                    <button data-action="import" ${isDataStale ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>${getMessage("importData")}</span>
                    </button>
                    <button data-action="export">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        <span>${getMessage("exportData")}</span>
                    </button>
                    <button data-action="settings">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        <span>${getMessage("settings")}</span>
                    </button>
                    <button data-action="cleanup-orphans" ${isDataStale ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"></line><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"></line></svg>
                        <span>${getMessage("cleanupOrphans")}</span>
                    </button>
                `;
                    document.body.appendChild(contextMenu);

                    contextMenu.querySelector('[data-action="import"]').addEventListener('click', () => {
                        closeAllContextMenus();
                        handleImportData();
                    });
                    contextMenu.querySelector('[data-action="export"]').addEventListener('click', () => {
                        closeAllContextMenus();
                        handleExportData();
                    });
                    contextMenu.querySelector('[data-action="cleanup-orphans"]').addEventListener('click', () => {
                        closeAllContextMenus();
                        handleCleanupOrphans();
                    });
                    contextMenu.querySelector('[data-action="settings"]').addEventListener('click', () => {
                        closeAllContextMenus();
                        showSettingsModal();
                    });

                    updateAIMenuVisibility();
                });

                toggleSearchBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const isOpening = searchContainer.classList.contains('gfe-hidden');
                    searchContainer.classList.toggle('gfe-hidden');

                    if (isOpening) {
                        if (foldersPanel.classList.contains(GFE_PREFIX + 'collapsed')) {
                            foldersPanel.classList.remove(GFE_PREFIX + 'collapsed');
                            panelsState.folders = false;
                            await saveNonCriticalData('panelsState', panelsState);
                        }
                        searchInput.focus();
                    } else {
                        searchInput.value = '';
                        renderFolders();
                    }
                });
                searchInput.addEventListener('input', (e) => {
                    renderFolders(e.target.value);
                });
                renderFolders();
                observeRecentChats();
                observeActiveChat();
                if (!window.gfeGlobalListener) {
                    window.addEventListener('click', () => {
                        if (!isAddModeActive) closeAllContextMenus();
                    });
                    window.gfeGlobalListener = true;
                }
            }
        }
    }

    const observer = new MutationObserver(() => {
        initializeApp();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });


    // content.js - ESTRUCTURA CORREGIDA Y UNIFICADA

    // ============================================================================
    // MODULO 1: GEMINI CHAT NAVIGATOR
    // ============================================================================
    (function () {
        console.log("Iniciando Gemini Navigator...");

        let sidebar;
        let promptCounter = 0;
        const PROMPT_SELECTOR = 'user-query-content .query-text';

        function debounce(func, delay) {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }

        function createSidebar() {
            if (document.getElementById('gemini-chat-navigator-sidebar')) return;

            sidebar = document.createElement('div');
            sidebar.id = 'gemini-chat-navigator-sidebar';
            sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>Navigator</h2>
                <button id="toggle-sidebar-btn" title="Toggle">‹</button>
            </div>
            <ul id="gemini-nav-list"></ul>
        `;
            document.body.appendChild(sidebar);

            sidebar.addEventListener('mouseenter', () => sidebar.classList.contains('collapsed') && sidebar.classList.add('peek'));
            sidebar.addEventListener('mouseleave', () => sidebar.classList.contains('collapsed') && sidebar.classList.remove('peek'));

            document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
                sidebar.classList.remove('peek');
                sidebar.classList.toggle('collapsed');
                const isCollapsed = sidebar.classList.contains('collapsed');
                document.getElementById('toggle-sidebar-btn').textContent = isCollapsed ? '›' : '‹';
                chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
            });
        }

        function updateNavigation() {
            const navList = document.getElementById('gemini-nav-list');
            if (!navList) return;

            const prompts = document.querySelectorAll(PROMPT_SELECTOR);
            navList.innerHTML = '';
            promptCounter = 0;

            prompts.forEach(promptEl => {
                promptCounter++;
                const anchorEl = promptEl.closest('user-query') || promptEl;
                if (!anchorEl.id) anchorEl.id = `gemini-prompt-${promptCounter}`;

                let linkText = promptEl.textContent.trim().split('\n')[0];
                if (linkText.length > 50) linkText = linkText.substring(0, 50) + '...';
                if (!linkText) return;

                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `#${anchorEl.id}`;
                link.innerHTML = `<span class="prompt-number">${promptCounter}.</span> <span class="prompt-text">${linkText}</span>`;

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.getElementById(anchorEl.id);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        const container = target.querySelector('.user-query-container') || target;
                        container.classList.add('highlight-prompt');
                        setTimeout(() => container.classList.remove('highlight-prompt'), 1500);
                    }
                });

                listItem.appendChild(link);
                navList.appendChild(listItem);
            });
        }

        const debouncedUpdate = debounce(updateNavigation, 500);

        function initNavigator() {
            createSidebar();
            chrome.storage.local.get('sidebarCollapsed', (data) => {
                if (data.sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    document.getElementById('toggle-sidebar-btn').textContent = '›';
                }
            });
            debouncedUpdate();

            // Observer específico para el Navigator
            const navObserver = new MutationObserver((mutations) => {
                const hasNewContent = mutations.some(m =>
                    m.type === 'childList' &&
                    Array.from(m.addedNodes).some(n => n.nodeType === 1 && n.querySelector && n.querySelector(PROMPT_SELECTOR))
                );
                if (hasNewContent) debouncedUpdate();
            });

            navObserver.observe(document.body, { childList: true, subtree: true });
        }

        // Esperar a que cargue la interfaz
        const navInterval = setInterval(() => {
            if (document.querySelector(PROMPT_SELECTOR)) {
                clearInterval(navInterval);
                initNavigator();
            }
        }, 1000);
    })()
};
