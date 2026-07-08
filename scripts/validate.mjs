// Validate every publishers/<ns>/<name>.yaml entry. This is what PR CI runs —
// there is no index.json to build: the registry server (bruno-registry-server)
// projects these files into its own store on merge. Kept self-contained (only
// js-yaml) so the catalog repo has no dependency on the app monorepo.
//
//   node scripts/validate.mjs
//
// Namespace allocation is MANUAL (first-come, first-served, maintainer review) —
// there is no automated ownership check. This script only checks that each entry
// is well-formed and that its path matches its ns/name.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PUBLISHERS_DIR = join(ROOT, 'publishers');

const REQUIRED = ['ns', 'name', 'title', 'category', 'summary', 'type', 'versions'];
const ENTRY_TYPES = ['collection'];
const SOURCE_TYPES = ['git', 'url'];
const VERSION_TRACKING = ['git-tags', 'manual'];
const CATEGORIES = ['payments', 'ai', 'auth', 'devops', 'comms', 'data', 'storage', 'productivity'];
const NS_RE = /^[a-z0-9-]+$/;
const NAME_RE = /^[a-z0-9-]+$/;
const SEMVER_RE = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const isYaml = (name) => name.endsWith('.yaml') || name.endsWith('.yml');

async function walk(dir, rel = '') {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const d of entries) {
    const childRel = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...(await walk(join(dir, d.name), childRel)));
    else if (isYaml(d.name)) out.push(childRel);
  }
  return out;
}

function validate(entry, relPath) {
  const where = `publishers/${relPath}`;
  for (const k of REQUIRED) {
    const v = entry[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) {
      throw new Error(`${where}: missing required field "${k}"`);
    }
  }
  if (!NS_RE.test(entry.ns)) throw new Error(`${where}: ns "${entry.ns}" must be a lowercase slug (a-z, 0-9, -)`);
  if (!NAME_RE.test(entry.name)) throw new Error(`${where}: name "${entry.name}" must be a lowercase slug (a-z, 0-9, -)`);
  if (!ENTRY_TYPES.includes(entry.type)) throw new Error(`${where}: type "${entry.type}" must be one of ${ENTRY_TYPES.join(', ')}`);
  if (!CATEGORIES.includes(entry.category)) throw new Error(`${where}: unknown category "${entry.category}" (valid: ${CATEGORIES.join(', ')})`);
  const tracking = entry['version-tracking'];
  if (tracking !== undefined && !VERSION_TRACKING.includes(tracking)) {
    throw new Error(`${where}: version-tracking must be one of ${VERSION_TRACKING.join(', ')}`);
  }

  // Path-identity: publishers/<ns>/<name>.yaml must agree with the entry fields.
  const [ns, file] = relPath.split('/');
  const name = (file || '').replace(/\.ya?ml$/, '');
  if (entry.ns !== ns) throw new Error(`${where}: ns "${entry.ns}" doesn't match folder "${ns}"`);
  if (entry.name !== name) throw new Error(`${where}: name "${entry.name}" doesn't match filename "${name}"`);

  if (!Array.isArray(entry.versions) || !entry.versions.length) {
    throw new Error(`${where}: "versions" must be a non-empty array`);
  }
  for (const v of entry.versions) {
    if (!v || !v.version) throw new Error(`${where}: a version is missing "version"`);
    if (!SEMVER_RE.test(v.version)) throw new Error(`${where}: version "${v.version}" must be semver (e.g. 1.0.0)`);
    if (!SOURCE_TYPES.includes(v.type)) throw new Error(`${where}: version ${v.version} has invalid type "${v.type}" (valid: ${SOURCE_TYPES.join(', ')})`);
    if (!v.source || typeof v.source !== 'object') throw new Error(`${where}: version ${v.version} is missing "source"`);
    if (!v.source.url) throw new Error(`${where}: version ${v.version} is missing source.url`);
  }
}

async function main() {
  const files = await walk(PUBLISHERS_DIR);
  if (!files.length) throw new Error('No collections found under publishers/.');
  for (const rel of files) {
    let entry;
    try {
      entry = yaml.load(await readFile(join(PUBLISHERS_DIR, rel), 'utf8'));
    } catch (e) {
      throw new Error(`Invalid YAML in publishers/${rel}: ${e.message}`);
    }
    validate(entry, rel);
  }
  console.log(`✓ ${files.length} collection(s) valid.`);
}

main().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
