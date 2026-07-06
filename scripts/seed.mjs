// One-off seed: writes a few starter collection/<provider>/<owner>/<name>.json entries.
// These are the registry's source of truth. After seeding, more collections —
// and more versions of existing ones — are added via pull request.
//
// Every field here is authored identity/metadata + one or more versioned
// sources. No usage stats are stored; install counts come from a public API.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Each version points at a real Bruno collection (opencollection.yml + .yml
// requests) hosted in the bruno-collections repo under its own subdir.
const HOST_REPO = 'https://github.com/gopu-bruno/bruno-collections';

const COLLECTIONS = [
  { ns: 'github:stripe', name: 'stripe-api', title: 'Stripe API', summary: 'Payments, customers and webhooks for the Stripe REST API.', category: 'payments', featured: true },
  { ns: 'github:github', name: 'rest-api', title: 'GitHub REST API', summary: 'Core endpoints of the GitHub REST API.', category: 'devops', featured: true },
  { ns: 'github:openai', name: 'openai-api', title: 'OpenAI API', summary: 'Chat completions and models for the OpenAI API.', category: 'ai', featured: true },
];

const entryFor = (c) => {
  const owner = c.ns.split(':')[1];
  const entry = { ns: c.ns, name: c.name, title: c.title, summary: c.summary, category: c.category };
  if (c.featured) entry.featured = true;
  entry.versions = [
    { version: '1.0.0', type: 'git', source: { url: HOST_REPO, subdir: `${owner}-${c.name}`, ref: 'main' } },
  ];
  return entry;
};

const run = async () => {
  for (const c of COLLECTIONS) {
    const [provider, owner] = c.ns.split(':');
    const file = join(ROOT, 'collection', provider, owner, `${c.name}.json`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(entryFor(c), null, 2) + '\n');
    console.log('seeded', `${c.ns}/${c.name}`);
  }
  console.log(`\n${COLLECTIONS.length} collections seeded.`);
};

run();
