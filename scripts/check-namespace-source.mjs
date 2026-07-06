// Namespace / source-owner match (PR-scoped).
//
// For every collection/<provider>/<owner>/<name>.json a PR adds or edits, each
// version's source.url must be owned by the same <owner> as the namespace/path.
// i.e. github:acme must source its content from github.com/acme/… — the listing's
// namespace has to match where its content actually lives.
//
// This is PR-scoped (only the changed files) on purpose: existing entries are
// grandfathered, and build-index.mjs still validates the whole tree's path-identity
// (folder <-> ns/name). Pure string comparison — no GitHub API, no token.
//
// Owner is parsed from git hosts we recognise (github/gitlab/bitbucket, incl. the
// raw.githubusercontent CDN). A source on a host we can't attribute to an owner
// (an arbitrary CDN) is reported and skipped rather than failed.
//
// env: FILES_FILE (newline-separated changed paths). Exits non-zero on mismatch.
import fs from 'node:fs';

const filesFile = process.env.FILES_FILE;
let paths = [];
if (filesFile && fs.existsSync(filesFile)) {
  paths = fs.readFileSync(filesFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
}
if (!paths.length) { console.log('No changed collection files — nothing to check.'); process.exit(0); }

function pathOwner(p) {
  const s = p.split('/');
  if (s[0] !== 'collection' || s.length < 4) return null;
  return { provider: s[1], owner: s[2] };
}

// Owner segment of a source URL, for hosts we can attribute; else null.
function sourceOwner(url) {
  const u = String(url || '');
  let m = u.match(/raw\.githubusercontent\.com\/([^/]+)\//i);      // raw CDN
  if (m) return m[1];
  m = u.match(/(?:github|gitlab|bitbucket)\.com[/:]([^/]+)\/[^/]+/i); // repo url or scp-style
  if (m) return m[1];
  return null;
}

const violations = [];
for (const p of paths) {
  const po = pathOwner(p);
  if (!po) continue;
  let entry;
  try { entry = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; } // deleted / unreadable
  const versions = Array.isArray(entry.versions) ? entry.versions : [];
  for (const v of versions) {
    const url = v && v.source && v.source.url;
    const so = sourceOwner(url);
    if (so == null) {
      console.log(`•  ${p}: version ${v && v.version}: source host not attributable to an owner (${url}) — skipped`);
      continue;
    }
    if (so.toLowerCase() !== po.owner.toLowerCase()) {
      violations.push(`✗  ${p}: namespace owner "${po.owner}" ≠ source owner "${so}"  (${url})`);
    } else {
      console.log(`✓  ${p}: version ${v && v.version}: source owner "${so}" matches namespace`);
    }
  }
}

if (violations.length) {
  console.error('\nNamespace / source-owner check failed:\n');
  for (const v of violations) console.error('  ' + v);
  console.error('\nThe namespace owner must match the owner of every version\'s source.url —');
  console.error('e.g. "github:acme" must source from github.com/acme/… (or its raw CDN).');
  process.exit(1);
}
console.log('\nNamespace / source-owner OK.');
