// Namespace ownership check — GitHub-native.
//
// A publish is just a PR, so we decide "who may claim/edit a namespace" here, at
// PR time. For every changed collection/github/<owner>/<name>.json, the PR author
// must control <owner> on GitHub:
//   • it is their own login (personal namespace), or
//   • they are a PUBLIC member of the <owner> organisation.
//
// The namespace IS the path (path-identity is enforced by build-index.mjs), so
// checking the path's <owner> segment also prevents editing or repointing someone
// else's listing — you can't touch collection/github/<owner>/… without controlling
// <owner>.
//
// Scope & limits:
//   • Only the `github` provider is verified here. gitlab / bitbucket / etc. can't
//     be checked with a GitHub token, so they're reported and left to maintainer
//     review (they don't fail this job).
//   • Only PUBLIC org membership is visible to the Actions token, so a private
//     org member is a false negative. A maintainer can override any case by adding
//     the `ownership-approved` label to the PR (handled in the workflow).
//
// Inputs (env): ACTOR (PR author login), FILES_FILE (newline-separated changed
// paths), GITHUB_TOKEN. Exits non-zero on any unauthorised github namespace.
import fs from 'node:fs';

const actor = (process.env.ACTOR || '').trim().toLowerCase();
const token = process.env.GITHUB_TOKEN;
const filesFile = process.env.FILES_FILE;

if (!actor) {
  console.error('No PR author (ACTOR) provided.');
  process.exit(1);
}

let paths = [];
if (filesFile && fs.existsSync(filesFile)) {
  paths = fs.readFileSync(filesFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
}
if (!paths.length) {
  console.log('No changed collection files — nothing to verify.');
  process.exit(0);
}

// collection/<provider>/<owner>/<name>.json -> { provider, owner }, else null.
function nsFromPath(p) {
  const seg = p.split('/');
  if (seg[0] !== 'collection' || seg.length < 4 || !seg[seg.length - 1].endsWith('.json')) return null;
  return { provider: seg[1], owner: seg[2] };
}

async function gh(url) {
  return fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'bruno-registry-ownership-check',
      'x-github-api-version': '2022-11-28',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

// Decide once per owner; cache the verdict.
const cache = new Map();
async function controls(owner) {
  const key = owner.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let verdict;
  if (key === actor) {
    verdict = { ok: true, reason: 'personal namespace (login matches owner)' };
  } else {
    const res = await gh(`https://api.github.com/orgs/${owner}/public_members/${actor}`);
    if (res.status === 204) verdict = { ok: true, reason: `public member of org "${owner}"` };
    else if (res.status === 404) verdict = { ok: false, reason: `not the owner and not a public member of "${owner}" (or "${owner}" is not an org, or membership is private)` };
    else verdict = { ok: false, reason: `membership lookup returned HTTP ${res.status}` };
  }
  cache.set(key, verdict);
  return verdict;
}

const violations = [];
const seen = new Set();
for (const p of paths) {
  const ns = nsFromPath(p);
  if (!ns) continue;
  if (ns.provider !== 'github') {
    console.log(`•  ${p}: provider "${ns.provider}" — GitHub-native check N/A; defer to maintainer review`);
    continue;
  }
  const dedup = `${ns.provider}/${ns.owner}`;
  const { ok, reason } = await controls(ns.owner);
  if (ok) {
    if (!seen.has(dedup)) console.log(`✓  ${dedup}: "${process.env.ACTOR}" — ${reason}`);
  } else {
    violations.push(`✗  ${p}: "${process.env.ACTOR}" does not control github namespace "${ns.owner}" — ${reason}`);
  }
  seen.add(dedup);
}

if (violations.length) {
  console.error('\nNamespace ownership check failed:\n');
  for (const v of violations) console.error('  ' + v);
  console.error('\nTo publish under a GitHub namespace you must own the user account or be a');
  console.error('public member of the organisation. If this is a private-membership or an');
  console.error('approved exception, a maintainer can add the "ownership-approved" label to bypass.');
  process.exit(1);
}
console.log('\nOwnership OK.');
