import { IcechunkStore, type IcechunkStoreOptions, type NodeSnapshot } from "icechunk-js";
import { open as openZarr, type Group } from "zarrita";
import { extractAttributes, filterEntries, keyToPath } from "./catalog-logic.js";
import { loadSidecarFromFile, loadSidecarFromUrl, sidecarUrlForStore } from "./sidecar.js";
import type {
  CatalogEntryMetadata,
  CatalogRecord,
  CatalogSearchQuery,
  CatalogSidecar,
  IcechunkCatalogOptions,
} from "./types.js";

export interface OpenDatasetOptions extends IcechunkStoreOptions {
  attrs?: boolean;
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

  private static async loadEntriesFromStore(storeUrl: string): Promise<CatalogEntryMetadata[]> {
    const store = await IcechunkStore.open(storeUrl);

    return store
      .listChildren("/")
      .map((key) => {
        const node = store.getNode(keyToPath(key));
        if (!node || node.nodeData.type !== "group") {
          return null;
        }

        return {
          key,
          attrs: extractAttributes(store.getMetadata(node.path)),
        } satisfies CatalogEntryMetadata;
      })
      .filter((entry): entry is CatalogEntryMetadata => entry !== null);
  }

  static async openFromSidecarFile(path: string, options: Omit<IcechunkCatalogOptions, "sidecar"> = {}): Promise<IcechunkCatalog> {
    const sidecar = await loadSidecarFromFile(path);
    const entries = options.entries ?? (await IcechunkCatalog.loadEntriesFromStore(sidecar.store));
    return new IcechunkCatalog(sidecar, { ...options, entries });
  }

  static async openFromStore(storeUrl: string, options: Omit<IcechunkCatalogOptions, "sidecar"> & { fetchInit?: RequestInit } = {}): Promise<IcechunkCatalog> {
    const sidecar = await loadSidecarFromUrl(sidecarUrlForStore(storeUrl), options.fetchInit);
    const entries = options.entries ?? (await IcechunkCatalog.loadEntriesFromStore(sidecar.store));
    return new IcechunkCatalog(sidecar, { ...options, entries });
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

  has(key: string): boolean {
    return this.entries.some((entry) => entry.key === key);
  }

  getEntry(key: string): CatalogEntryMetadata | undefined {
    return this.entries.find((entry) => entry.key === key);
  }

  records(): CatalogRecord[] {
    return this.entries.map((entry) => ({
      key: entry.key,
      ...entry.attrs,
    }));
  }

  toRecords(): CatalogRecord[] {
    return this.records();
  }

  search(query: CatalogSearchQuery): IcechunkCatalog {
    if (Object.keys(query).length === 0) {
      return this;
    }
    return new IcechunkCatalog(this.sidecar, {
      storageOptions: this.storageOptions,
      entries: filterEntries(this.entries, query),
    });
  }

  async openStore(options: IcechunkStoreOptions = {}): Promise<IcechunkStore> {
    return IcechunkStore.open(this.storeUrl, options);
  }

  async loadEntryMetadata(): Promise<CatalogEntryMetadata[]> {
    return this.entries;
  }

  async openGroup(key: string): Promise<NodeSnapshot> {
    const store = await this.openStore();
    const node = store.getNode(keyToPath(key));

    if (!node || node.nodeData.type !== "group") {
      throw new Error(`No group entry found for key: ${key}`);
    }

    return node;
  }

  async openDataset(key: string, options: OpenDatasetOptions = {}): Promise<Group<IcechunkStore>> {
    const { attrs, ...storeOptions } = options;
    const store = await this.openStore(storeOptions);
    const path = keyToPath(key);
    const node = store.getNode(path);

    if (!node || node.nodeData.type !== "group") {
      throw new Error(`No group entry found for key: ${key}`);
    }

    return openZarr(store.resolve(node.path), {
      kind: "group",
      attrs,
      signal: options.signal,
    });
  }
}
