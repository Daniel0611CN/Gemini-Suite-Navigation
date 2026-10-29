import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('gemini/src/content/common/organization.js', 'utf8');
const context = { console, location: { href: 'https://gemini.google.com/app/test' }, localStorage: { getItem: () => null, setItem() {} } };
vm.runInNewContext(source, context);
const api = context.GeminiOrganization;

test('normalizes settings and organization items', () => {
  const data = api.normalize({ settings: { theme: 'dark' }, items: { x: { title: 'Chat', tags: ['work'] } } });
  assert.equal(data.version, 2);
  assert.equal(data.settings.theme, 'dark');
  assert.deepEqual(data.items.x.tags, ['work']);
  assert.equal(data.settings.protectFavorites, true);
});

test('queries favorites and sorts by title', () => {
  const result = api.query({
    a: { title: 'Zeta', favorite: true, tags: ['work'], lastOpened: 1 },
    b: { title: 'Alpha', favorite: false, tags: ['home'], lastOpened: 2 }
  }, 'work', 'title', 'favorites');
  assert.equal(Array.from(result, (item) => item.title).join(','), 'Zeta');
});

test('rejects invalid imports', async () => {
  await assert.rejects(() => api.importData({ version: 1, items: {} }), /invalid|unsupported/i);
});
