export { extractAttributes, filterEntries, keyToPath, matchesQuery } from "./catalog-logic.js";
export { IcechunkCatalog } from "./core.js";
export { loadSidecarFromFile, loadSidecarFromUrl, sidecarUrlForStore } from "./sidecar.js";
export type {
  CatalogEntryMetadata,
  CatalogSearchQuery,
  CatalogSidecar,
  IcechunkCatalogOptions,
  VirtualChunkModel,
} from "./types.js";
