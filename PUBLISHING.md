# Publishing & versioning

Publishing is a **pull request to this repo** — both listing a collection the first time and adding a new version later. There is no separate "release" step.

| Act | What it is | How often |
|---|---|---|
| **List a collection** | A PR adding `publishers/<ns>/<name>.yaml` with its first version | once |
| **Publish a version** | A PR appending an entry to that file's `versions` array | every version |

A *version* carries its own source — `git` (clone a repo at a ref) or `url` (download a hosted `opencollection.yml`). Different versions of the same collection may use different types.

Namespaces (`ns`) are allocated **manually** — first-come, first-served — by maintainer review. Pick a lowercase slug and open a PR; a maintainer confirms it.

---

## From the Bruno app (one flow)

1. **Discover** (globe icon) → **Publish**.
2. **Select** — pick a collection open in your workspace. Bruno reads its git remote and prefills the **repo** + **subdir**, suggests a namespace, and checks the catalog: *Listed* or *Not listed yet*.
3. **Version** — set the **version** label and choose the source **type**:
   - **git** — confirm repo / ref / subdir.
   - **url** — paste the artifact URL (a hosted `opencollection.yml`).
   Optionally include a **hash** for integrity.
4. **Open registry PR** — the app commits the entry (new `publishers/<ns>/<name>.yaml`, or an appended version) and opens the PR. If your token can write here it branches directly; otherwise it **forks** and opens the PR from the fork. A maintainer reviews and merges.
5. **Done** — PR URL. On merge, the registry server projects the change into its store; install counts are measured server-side.

---

## From the CLI (equivalent)

### First listing
```bash
git clone https://github.com/gopu-bruno/bruno-registry && cd bruno-registry
NS=<your-slug>            # e.g. stripe
mkdir -p publishers/$NS
$EDITOR publishers/$NS/<name>.yaml   # see schema/ + the example in CONTRIBUTING.md
git checkout -b add-$NS-<name>
git add publishers/$NS/<name>.yaml
git commit -m "Add $NS/<name> collection"
git push -u origin add-$NS-<name>
gh pr create --base main --title "Add $NS/<name>"
```

**No write access here?** Use fork-and-PR (the normal open-source path):
```bash
gh repo fork gopu-bruno/bruno-registry --clone
# ...edit publishers/<ns>/<name>.yaml, commit on a branch, push to YOUR fork...
gh pr create --repo gopu-bruno/bruno-registry --base main --head <you>:add-<ns>-<name> --title "Add <ns>/<name>"
```

### A new version
Edit the same file and append to `versions` — git or url:
```yaml
  - version: 1.1.0
    source:
      url: https://cdn.example.com/<ns>/<name>/1.1.0/opencollection.yml
      type: url
    hash: sha256-…
```
Commit, push, open a PR. On merge, `1.1.0` becomes the latest (derived by semver).

---

## What happens on merge

There is **no `index.json`** and nothing to rebuild in this repo. On merge to `main`, the [registry server](https://github.com/usebruno/bruno) (`bruno-registry-server`) receives a webhook, re-reads the changed `publishers/**/*.yaml` files, validates them, and updates its projection store. The website and the Bruno app read that server's HTTP API.

> Nothing runs on install. The client resolves the chosen version's `source` and fetches the `opencollection.yml` (clone for `git`, download for `url`), writing native `.bru` files into the workspace. Install counts are recorded and served by the registry server — this repo measures nothing.
