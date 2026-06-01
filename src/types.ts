/**
 * Describes how virtual chunk references should be resolved for a catalog.
 */
export interface VirtualChunkModel {
  /** Prefix prepended when resolving referenced chunk locations. */
  url_prefix: string;
  /** Backend identifier for the referenced chunk store, e.g. `s3`. */
  store_type: string;
  /** Optional backend-specific open options carried through from the sidecar. */
  open_kwargs?: Record<string, unknown>;
}

/**
 * JSON sidecar metadata describing an Icechunk-backed catalog.
 */
export interface CatalogSidecar {
  id?: string;
  version?: string;
  /** Backing Icechunk repository URL or path. */
  store: string;
  description?: string | null;
  title?: string | null;
  last_updated?: string | null;
  /** Optional store open options embedded in the sidecar metadata. */
  storage_options?: Record<string, unknown>;
  xarray_kwargs?: Record<string, unknown>;
  /** Virtual chunk resolution metadata for downstream readers. */
  virtual_chunk_model: VirtualChunkModel;
}

/**
 * Metadata reconstructed for one top-level group treated as a catalog entry.
 */
export interface CatalogEntryMetadata {
  /** Logical entry key, typically the top-level group name. */
  key: string;
  /** Group attributes used for discovery and filtering. */
  attrs: Record<string, unknown>;
}

/**
 * Plain object view of a catalog entry for rendering or tabular display.
 */
export interface CatalogRecord extends Record<string, unknown> {
  key: string;
}

/**
 * Conjunctive equality query over entry attributes.
 *
 * Scalar values require exact equality. Array values are treated as
 * "match any of these candidate values".
 */
export interface CatalogSearchQuery {
  [key: string]: unknown;
}

/**
 * Options used when constructing or opening an {@link IcechunkCatalog}.
 */
export interface IcechunkCatalogOptions {
  /** Optional store open options to keep alongside the catalog instance. */
  storageOptions?: Record<string, unknown>;
  sidecar?: CatalogSidecar;
  /** Precomputed entries for tests, fixtures, or external indexing flows. */
  entries?: CatalogEntryMetadata[];
}
