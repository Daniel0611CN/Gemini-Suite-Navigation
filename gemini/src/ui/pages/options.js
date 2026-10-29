(function () {
  const $ = (id) => document.getElementById(id);
  const set = (id, value) => { $(id).checked = Boolean(value); };

  async function load() {
    const data = await GeminiOrganization.read();
    const settings = data.settings;
    $('theme').value = settings.theme;
    set('confirmBulkDelete', settings.confirmBulkDelete);
    set('protectFavorites', settings.protectFavorites);
    set('showRecent', settings.showRecent);
    $('toggleSidebar').value = settings.shortcuts.toggleSidebar;
    $('focusSearch').value = settings.shortcuts.focusSearch;
    set('geminiDomain', settings.compatibleDomains.gemini);
    set('aistudioDomain', settings.compatibleDomains.aistudio);
  }

  $('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = await GeminiOrganization.read();
    data.settings = {
      ...data.settings,
      theme: $('theme').value,
      confirmBulkDelete: $('confirmBulkDelete').checked,
      protectFavorites: $('protectFavorites').checked,
      showRecent: $('showRecent').checked,
      shortcuts: { toggleSidebar: $('toggleSidebar').value.trim(), focusSearch: $('focusSearch').value.trim() },
      compatibleDomains: { gemini: $('geminiDomain').checked, aistudio: $('aistudioDomain').checked }
    };
    await GeminiOrganization.write(data);
    $('status').textContent = 'Settings saved locally.';
    setTimeout(() => { $('status').textContent = ''; }, 2500);
  });

  $('export').addEventListener('click', async () => {
    GeminiOrganization.download(await GeminiOrganization.exportData());
    $('backup-status').textContent = 'Backup exported.';
  });

  $('import').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!confirm('Importing replaces current local organization data. Continue?')) return;
      await GeminiOrganization.importData(await file.text());
      await load();
      $('backup-status').textContent = 'Backup imported.';
    } catch (error) {
      console.error(error);
      $('backup-status').textContent = 'Import failed: invalid backup file.';
    } finally {
      event.target.value = '';
    }
  });

  load().catch((error) => {
    console.error('[Gemini Suite Navigation] Settings could not load.', error);
    $('status').textContent = 'Settings could not load.';
  });
})();
