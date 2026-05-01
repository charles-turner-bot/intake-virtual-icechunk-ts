# intake-virtual-icechunk-ts

Read-side TypeScript scaffold for an intake-style Icechunk catalog, built on top of [`icechunk-js`](https://github.com/EarthyScience/icechunk-js).

## Scope

This repo is intentionally narrow:

- **read side only**
- sidecar loading
- minimal catalog/search facade
- opening an `IcechunkStore` from sidecar metadata

Not implemented yet:

- builder / write path
- rich dataframe-like metadata APIs
- full parity with Python `intake-virtual-icechunk`
- notebook/display niceties

## Install

```bash
npm install
```

## Use

```ts
import { IcechunkCatalog } from "./dist/index.js";

const catalog = await IcechunkCatalog.openFromStore("https://example.com/my-catalog.icechunk");

console.log(catalog.storeUrl);
console.log(catalog.virtualChunkModel);
```

## Design notes

This is a scaffold, not a finished port. Anything that depends on authoritative
catalog metadata or richer search semantics is intentionally stubbed behind a
small interface so it can evolve without painting us into a corner.

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

What is still intentionally unresolved here is **where the authoritative entry
metadata should live**.

There are a few viable options:

- reconstruct from group metadata
- persist an explicit catalog index/manifest
- use a hybrid approach where the sidecar points to richer catalog metadata

For now, this repo keeps that part lightweight and stub-friendly, but the broad
architecture is: **make groups function like catalog entries, not just raw
paths in a store**.
