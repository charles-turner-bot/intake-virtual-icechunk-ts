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
