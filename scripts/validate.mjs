import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifestPath = 'gemini/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest must use Manifest V3.');
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('Manifest version must be semver.');
if (!existsSync(`gemini/${manifest.background.service_worker}`)) throw new Error('Background service worker is missing.');
for (const script of manifest.content_scripts.flatMap((entry) => entry.js)) {
  if (!existsSync(`gemini/${script}`)) throw new Error(`Missing content script: ${script}`);
}
if (!existsSync('gemini/src/ui/pages/options.html')) throw new Error('Options page is missing.');
if (!existsSync('.github/workflows/release.yml')) throw new Error('Release workflow is missing.');

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory() && !path.includes('/assets/lib')) files.push(...await findJavaScriptFiles(path));
    else if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name) && !path.includes('/assets/lib')) files.push(path);
  }
  return files;
}

const jsFiles = await findJavaScriptFiles('.');
for (const file of jsFiles) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(`Validated manifest, ${jsFiles.length} JavaScript files, options page, and release workflow.`);
