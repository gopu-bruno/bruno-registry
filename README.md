# bruno-registry

A **git catalog** of [Bruno](https://usebruno.com) / OpenCollection API collections — one file per collection, each version independently sourced (`git` or `url`).

- Each collection is one file: [`publishers/<ns>/<name>.yaml`](publishers/) — `ns` is a free-form **publisher slug** (e.g. `stripe`) that maps to the first folder. It lists the collection's **versions**, each pointing at a `git` repo or a `url` artifact, plus display metadata and `type: collection`.
- There is **no `index.json`**. The [registry server](https://github.com/usebruno/bruno) (`bruno-registry-server`) projects this catalog into its own store on merge and serves it over an HTTP API — that API is what the website and the Bruno app read.
- **Namespaces are allocated manually** — first-come, first-served, by maintainer review. There is no automated ownership check.
- **Install counts** are measured by the server, never stored in this repo.
- Adding a collection *or a new version* is a **pull request** editing a file under `publishers/`.

## Local development

```bash
npm install
npm run validate   # validate every publishers/**/*.yaml (what PR CI runs)
```

## Adding a collection

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: add `publishers/<ns>/<name>.yaml` matching [the schema](schema/collection.schema.json) and open a PR.

```yaml
ns: stripe
name: stripe-api
title: Stripe Payment API
summary: Official Stripe Payment API Collection
type: collection
category: payments
version-tracking: git-tags

versions:
  - version: 1.0.0
    source:
      url: https://github.com/stripe/stripe-bruno-collection
      type: git
      subdir: payment-api
      ref: stripe-payment-api@1.0.0
    hash: e8d7790d6f9aae24cbe28275f995ff47d1b2ade0
```
