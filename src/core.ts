import { IcechunkStore, type NodeSnapshot } from "icechunk-js";
import { extractAttributes, filterEntries, keyToPath } from "./catalog-logic.js";
import { loadSidecarFromFile, loadSidecarFromUrl, sidecarUrlForStore } from "./sidecar.js";
import type {
  CatalogEntryMetadata,
  CatalogRecord,
  CatalogSearchQuery,
  CatalogSidecar,
  IcechunkCatalogOptions,
} from "./types.js";

/**
 * Minimal read-side catalog facade over top-level groups in an Icechunk store.
 *
 * The current implementation reconstructs catalog entries from group metadata
 * at open time, then provides lightweight search and handoff helpers.
 */
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

  /**
   * Opens a catalog from a local sidecar JSON file.
   *
   * Unless `entries` are supplied explicitly, top-level group metadata is read
   * from the referenced Icechunk store and treated as the catalog index.
   */
  static async openFromSidecarFile(path: string, options: Omit<IcechunkCatalogOptions, "sidecar"> = {}): Promise<IcechunkCatalog> {
    const sidecar = await loadSidecarFromFile(path);
    const entries = options.entries ?? (await IcechunkCatalog.loadEntriesFromStore(sidecar.store));
    return new IcechunkCatalog(sidecar, { ...options, entries });
  }

  /**
   * Opens a catalog by resolving the conventional sidecar URL from a store URL.
   *
   * `fetchInit` is only used for the sidecar fetch. Store opening continues to
   * use the current `icechunk-js` defaults.
   */
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

  /** Returns the logical keys for the catalog's current entry view. */
  keys(): string[] {
    return this.entries.map((entry) => entry.key);
  }

  /** Returns true when the current view contains the requested entry key. */
  has(key: string): boolean {
    return this.entries.some((entry) => entry.key === key);
  }

  /** Returns the reconstructed metadata for one entry, if present. */
  getEntry(key: string): CatalogEntryMetadata | undefined {
    return this.entries.find((entry) => entry.key === key);
  }

  /**
   * Returns the current catalog view as plain objects suitable for rendering or
   * lightweight tabular handling.
   */
  records(): CatalogRecord[] {
    return this.entries.map((entry) => ({
      key: entry.key,
      ...entry.attrs,
    }));
  }

  /** Alias for {@link records}. */
  toRecords(): CatalogRecord[] {
    return this.records();
  }

  /**
   * Returns a filtered catalog view using conjunctive exact-match semantics.
   *
   * An empty query returns the current catalog instance unchanged.
   */
  search(query: CatalogSearchQuery): IcechunkCatalog {
    if (Object.keys(query).length === 0) {
      return this;
    }
    return new IcechunkCatalog(this.sidecar, {
      storageOptions: this.storageOptions,
      entries: filterEntries(this.entries, query),
    });
  }

  /**
   * Opens the backing Icechunk store.
   *
   * Callers may pass explicit open options here; stored sidecar/storage options
   * are retained on the catalog instance for downstream consumers but are not
   * merged automatically yet.
   */
  async openStore(options: Record<string, unknown> = {}): Promise<IcechunkStore> {
    return IcechunkStore.open(this.storeUrl, options as never);
  }

  /** Resolves the current entry metadata array. */
  async loadEntryMetadata(): Promise<CatalogEntryMetadata[]> {
    return this.entries;
  }

  /**
   * Opens a selected top-level group and returns the underlying node snapshot.
   */
  async openGroup(key: string): Promise<NodeSnapshot> {
    const store = await this.openStore();
    const node = store.getNode(keyToPath(key));

    if (!node || node.nodeData.type !== "group") {
      throw new Error(`No group entry found for key: ${key}`);
    }

    return node;
  }

  /**
   * Stub for future dataset materialisation.
   *
   * Discovery and selection work today, but a stable TS-facing dataset API has
   * not been designed yet.
   */
  async openDataset(_key: string): Promise<never> {
    throw new Error(
      "openDataset() is a stub for now. Entry discovery/search now works by reconstructing from group metadata, but dataset materialisation semantics still need to be designed for TS consumers."
    );
  }
}
