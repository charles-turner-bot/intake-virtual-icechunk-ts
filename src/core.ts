import { IcechunkStore } from "icechunk-js";
import { loadSidecarFromFile, loadSidecarFromUrl, sidecarUrlForStore } from "./sidecar.js";
import type {
  CatalogEntryMetadata,
  CatalogSearchQuery,
  CatalogSidecar,
  IcechunkCatalogOptions,
} from "./types.js";

function matchesQuery(attrs: Record<string, unknown>, query: CatalogSearchQuery): boolean {
  return Object.entries(query).every(([key, value]) => {
    const attr = attrs[key];
    return Array.isArray(value) ? value.includes(attr) : attr === value;
  });
}

export class IcechunkCatalog {
  readonly sidecar: CatalogSidecar;
  readonly storeUrl: string;
  readonly storageOptions: Record<string, unknown>;
  readonly entries: CatalogEntryMetadata[];

  private constructor(sidecar: CatalogSidecar, options: IcechunkCatalogOptions = {}) {
    this.sidecar = sidecar;
    this.storeUrl = sidecar.store;
    this.storageOptions = options.storageOptions ?? sidecar.storage_options ?? {};
    this.entries = options.entries ?? [];
  }

  static async openFromSidecarFile(path: string, options: Omit<IcechunkCatalogOptions, "sidecar"> = {}): Promise<IcechunkCatalog> {
    const sidecar = await loadSidecarFromFile(path);
    return new IcechunkCatalog(sidecar, options);
  }

  static async openFromStore(storeUrl: string, options: Omit<IcechunkCatalogOptions, "sidecar"> & { fetchInit?: RequestInit } = {}): Promise<IcechunkCatalog> {
    const sidecar = await loadSidecarFromUrl(sidecarUrlForStore(storeUrl), options.fetchInit);
    return new IcechunkCatalog(sidecar, options);
  }

  get id(): string | undefined {
    return this.sidecar.id;
  }

  get virtualChunkModel(): CatalogSidecar["virtual_chunk_model"] {
    return this.sidecar.virtual_chunk_model;
  }

  keys(): string[] {
    return this.entries.map((entry) => entry.key);
  }

  search(query: CatalogSearchQuery): IcechunkCatalog {
    if (Object.keys(query).length === 0) {
      return this;
    }
    return new IcechunkCatalog(this.sidecar, {
      storageOptions: this.storageOptions,
      entries: this.entries.filter((entry) => matchesQuery(entry.attrs, query)),
    });
  }

  async openStore(options: Record<string, unknown> = {}): Promise<IcechunkStore> {
    return IcechunkStore.open(this.storeUrl, options as never);
  }

  async loadEntryMetadata(): Promise<CatalogEntryMetadata[]> {
    throw new Error(
      "loadEntryMetadata() is not implemented yet. This needs either authoritative catalog metadata or a deliberate metadata traversal strategy."
    );
  }

  async openDataset(_key: string): Promise<never> {
    throw new Error(
      "openDataset() is a stub for now. The low-level Icechunk read path exists, but dataset materialisation semantics still need to be designed for TS consumers."
    );
  }
}
