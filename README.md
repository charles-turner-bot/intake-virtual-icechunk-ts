# intake-virtual-icechunk-ts

Read-side TypeScript scaffold for an intake-style Icechunk catalog, built on top of [`icechunk-js`](https://github.com/EarthyScience/icechunk-js).

## Scope

This repo is intentionally narrow:

- **read side only**
- sidecar loading
- minimal catalog/search facade
- reconstructing entry metadata from top-level group metadata
- opening an `IcechunkStore` from sidecar metadata

Not implemented yet:

- builder / write path
- rich dataframe-like metadata APIs
- full parity with Python `intake-virtual-icechunk`
- notebook/display niceties

## Install

```bash
npm install intake-virtual-icechunk-ts
```

For local development in this repo:

```bash
npm install
npm test
npm run coverage
npm run build
```

## Use

```ts
import { IcechunkCatalog } from "intake-virtual-icechunk-ts";

const catalog = await IcechunkCatalog.openFromStore("https://example.com/my-catalog.icechunk");
const rows = catalog.records();
const historical = catalog.search({ experiment_id: "historical" }).toRecords();

console.log(catalog.storeUrl);
console.log(rows);
console.log(historical);
```

## Design notes

This is a scaffold, not a finished port. Anything that depends on authoritative
catalog metadata or richer search semantics is intentionally stubbed behind a
small interface so it can evolve without painting us into a corner.

The test setup currently starts with the cheap stuff first:

- pure catalog helper functions under Vitest
- in-memory catalog/search semantics tests
- coverage reporting via Vitest
- CI running typecheck, coverage, and build on every push/PR

The intended catalog skin is deliberately simple: the catalog can expose its
current view as an array of plain JS objects via `records()` / `toRecords()`,
which can then be rendered in the browser however you like.

## Treating XR/Zarr groups like intake catalogs

The core idea here is that an Icechunk repository can expose many logical
datasets as separate Zarr groups, and those groups can be made to behave a bit
like entries in an `intake` catalog.

On the Python side, `intake-virtual-icechunk` leans on that idea already:

- the Icechunk store is the backing repository
- each group is a logical dataset entry
- catalog-level metadata points you at the store
- group-level metadata is what drives discovery, filtering, and selection

This TypeScript port is aiming at the same read-side shape.

In other words, the job of the catalog layer is not to invent a new storage
model. It is to provide a thin discovery and selection facade over a collection
of groups that already exist inside one Icechunk repository.

That means a likely long-term flow looks something like:

1. open a catalog sidecar
2. resolve the backing Icechunk repository
3. treat groups within that repository as catalog entries
4. search/filter those entries using stored metadata
5. hand the selected group off to a lower-level reader for actual array access

This is useful because it lets us preserve the nice mental model people already
have from `intake-esm`:

- a catalog contains many candidate datasets
- filtering narrows the set
- selecting one entry gives you something dataset-like
- the underlying data can still live in object storage and be read lazily

For this TS version, we are explicitly taking the same path as the current
Python implementation: **reconstruct entry metadata from top-level group
metadata on read**.

That means the catalog layer assumes:

- each top-level group is one logical catalog entry
- the group's Zarr metadata contains the attributes needed for discovery/search
- catalogs stay small enough that enumerating groups eagerly is acceptable

If that assumption stops being true later, this repo can still grow a persisted
index/manifest path. But for now the architecture is deliberately simple:
**make groups function like catalog entries, not just raw paths in a store**.
