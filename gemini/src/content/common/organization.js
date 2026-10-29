(function () {
  const STORAGE_KEY = 'gsn-organization-v2';
  const DEFAULTS = {
    version: 2,
    settings: {
      theme: 'auto',
      confirmBulkDelete: true,
      protectFavorites: true,
      sidebarCollapsed: false,
      showRecent: true,
      compatibleDomains: { gemini: true, aistudio: true },
      shortcuts: { toggleSidebar: 'Alt+Shift+G', focusSearch: 'Alt+Shift+F' }
    },
    items: {}
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const storage = () => globalThis.chrome?.storage?.local;

  async function read() {
    if (storage()) {
      const result = await storage().get(STORAGE_KEY);
      return normalize(result[STORAGE_KEY]);
    }
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (error) {
      console.error('[Gemini Suite Navigation] Could not read local organization data.', error);
      return clone(DEFAULTS);
    }
  }

  async function write(data) {
    const normalized = normalize(data);
    if (storage()) await storage().set({ [STORAGE_KEY]: normalized });
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function normalize(value) {
    const data = value && typeof value === 'object' ? value : {};
    return {
      ...clone(DEFAULTS),
      ...data,
      settings: {
        ...clone(DEFAULTS).settings,
        ...(data.settings || {}),
        shortcuts: { ...clone(DEFAULTS).settings.shortcuts, ...(data.settings?.shortcuts || {}) },
        compatibleDomains: { ...clone(DEFAULTS).settings.compatibleDomains, ...(data.settings?.compatibleDomains || {}) }
      },
      items: data.items && typeof data.items === 'object' ? data.items : {}
    };
  }

  function keyFor(title, url = location.href) {
    return `${url.split('#')[0]}::${title.trim().replace(/\s+/g, ' ').slice(0, 240)}`;
  }

  async function updateItem(key, patch) {
    const data = await read();
    const current = data.items[key] || { title: key.split('::').pop(), tags: [], favorite: false, lastOpened: 0 };
    data.items[key] = { ...current, ...patch, tags: Array.isArray(patch.tags) ? [...new Set(patch.tags)] : current.tags };
    await write(data);
    return data.items[key];
  }

  async function touch(key, title, url = location.href) {
    return updateItem(key, { title, url, lastOpened: Date.now() });
  }

  async function toggleFavorite(key, title, url) {
    const data = await read();
    const current = data.items[key] || { title, tags: [], favorite: false };
    return updateItem(key, { title, url, favorite: !current.favorite, lastOpened: current.lastOpened || Date.now() });
  }

  async function toggleTag(key, tag, title, url) {
    const data = await read();
    const current = data.items[key] || { title, tags: [], favorite: false };
    const tags = new Set(current.tags || []);
    tags.has(tag) ? tags.delete(tag) : tags.add(tag);
    return updateItem(key, { title, url, tags: [...tags] });
  }

  function query(items, text = '', sort = 'recent', filter = 'all') {
    const normalized = text.trim().toLowerCase();
    return Object.entries(items || {})
      .map(([key, item]) => ({ key, ...item }))
      .filter((item) => filter !== 'favorites' || item.favorite)
      .filter((item) => !normalized || `${item.title} ${(item.tags || []).join(' ')}`.toLowerCase().includes(normalized))
      .sort((a, b) => sort === 'title'
        ? a.title.localeCompare(b.title)
        : (b.lastOpened || 0) - (a.lastOpened || 0));
  }

  async function exportData() {
    return clone(await read());
  }

  async function importData(value) {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 2 || !parsed.items || typeof parsed.items !== 'object') {
      throw new Error('Unsupported or invalid Gemini Suite Navigation backup.');
    }
    return write(parsed);
  }

  function download(value, filename = `gemini-suite-navigation-backup-${new Date().toISOString().slice(0, 10)}.json`) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  globalThis.GeminiOrganization = Object.freeze({
    STORAGE_KEY, DEFAULTS, read, write, normalize, keyFor, touch, toggleFavorite, toggleTag,
    query, exportData, importData, download
  });
})();
