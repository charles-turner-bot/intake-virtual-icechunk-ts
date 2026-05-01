export interface VirtualChunkModel {
  url_prefix: string;
  store_type: string;
  open_kwargs?: Record<string, unknown>;
}

export interface CatalogSidecar {
  id?: string;
  version?: string;
  store: string;
  description?: string | null;
  title?: string | null;
  last_updated?: string | null;
  storage_options?: Record<string, unknown>;
  xarray_kwargs?: Record<string, unknown>;
  virtual_chunk_model: VirtualChunkModel;
}

export interface CatalogEntryMetadata {
  key: string;
  attrs: Record<string, unknown>;
}

export interface CatalogRecord extends Record<string, unknown> {
  key: string;
}

export interface CatalogSearchQuery {
  [key: string]: unknown;
}

export interface IcechunkCatalogOptions {
  storageOptions?: Record<string, unknown>;
  sidecar?: CatalogSidecar;
  entries?: CatalogEntryMetadata[];
}
