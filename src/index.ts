export { extractAttributes, filterEntries, keyToPath, matchesQuery } from "./catalog-logic.js";
export { IcechunkCatalog } from "./core.js";
export { loadSidecarFromFile, loadSidecarFromUrl, sidecarUrlForStore } from "./sidecar.js";
export type {
  CatalogEntryMetadata,
  CatalogRecord,
  CatalogSearchQuery,
  CatalogSidecar,
  IcechunkCatalogOptions,
  VirtualChunkModel,
} from "./types.js";
export type { OpenDatasetOptions } from "./core.js";
