# Adding a collection

Publishing to the registry is a pull request. GitHub is the review layer; namespaces are allocated **manually** (first-come, first-served) during review — there is no automated ownership check.

1. Add a file at `publishers/<ns>/<name>.yaml`. Your `ns` is your **publisher slug** (a lowercase `a-z0-9-` name, e.g. `stripe`) and maps to the folder; `<name>` is the collection. Example — `publishers/anthropic/claude-api.yaml`:

```yaml
ns: anthropic
name: claude-api
title: Claude Messages API
summary: Anthropic Messages API with tool use and prompt caching.
type: collection
category: ai
version-tracking: git-tags

versions:
  - version: 1.0.0
    type: git
    source:
      url: https://github.com/anthropics/bruno-collections
      subdir: claude-api
      ref: claude-api@1.0.0
```

2. **Required fields:** `ns`, `name`, `title`, `summary` (one line), `type` (`collection`), `category`, `versions` (at least one). Optional `version-tracking`: `git-tags` or `manual`. Valid categories: `payments`, `ai`, `auth`, `devops`, `comms`, `data`, `storage`, `productivity`. See [the schema](schema/collection.schema.json).

3. Open a PR. CI (`npm run validate`) checks your entry parses, matches its path, and has valid versions. On merge, the registry server projects the change into its store and your collection appears on the find page — there is no `index.json` to rebuild.

> **Don't set `verified` / `official` / `featured`.** These are editorial flags maintainers add during review — leave them out of your entry.

# Versions

A collection's `versions` array is the source of truth. Each version is **independently sourced**, so different versions can come from different places:

```yaml
versions:
  - version: 1.0.0
    type: git
    source:
      url: https://github.com/you/collections
      subdir: my-api
      ref: my-api@1.0.0
  - version: 1.1.0
    type: url
    source:
      url: https://cdn.example.com/my-api/1.1.0/opencollection.yml
    hash: sha256-q1Mng3dGfP6mWj5kc3PqV0i8x0Qk2bq1bH8rXjYwZ0E=
```

| Field | Required | Notes |
|---|---|---|
| `version` | yes | Semver `major.minor.patch` (optional `-prerelease`). The **latest** shown is derived by semver precedence — order in the array doesn't matter. |
| `type` | yes | `git` or `url`. |
| `source` | yes | Always `{ url }`. For `git` the `url` is the repo to clone (may add `ref?`, `subdir?`); for `url` it's a direct download of the `opencollection.yml` artifact. |
| `hash` | no | SHA-256 of the resolved artifact, SRI-style `sha256-<base64>`. The client verifies it after download — recommended especially for `url` sources. |

**Publishing a new version = a PR that appends an object to `versions`.**

> Install counts are measured by the registry server keyed by `ns/name` — they are never authored in these files.
