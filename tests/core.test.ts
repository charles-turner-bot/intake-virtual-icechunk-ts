import { beforeEach, describe, expect, it, vi } from "vitest";
import { open as openZarr } from "zarrita";

import { IcechunkCatalog } from "../src/core.js";
import type { CatalogEntryMetadata, CatalogSidecar } from "../src/types.js";

vi.mock("zarrita", () => ({
  open: vi.fn(),
}));

const sidecar: CatalogSidecar = {
  id: "demo-catalog",
  store: "https://example.com/demo.icechunk",
  virtual_chunk_model: {
    url_prefix: "s3://demo-bucket/",
    store_type: "s3",
  },
};

const entries: CatalogEntryMetadata[] = [
  { key: "dataset-a", attrs: { source_id: "BCC-ESM1", experiment_id: "historical" } },
  { key: "dataset-b", attrs: { source_id: "BCC-ESM1", experiment_id: "ssp585", members: ["r1i1p1f1"] } },
  { key: "dataset-c", attrs: { source_id: "ACCESS-CM2", experiment_id: "historical", note: null } },
];

describe("IcechunkCatalog search semantics", () => {
  beforeEach(() => {
    vi.mocked(openZarr).mockReset();
  });

  it("reuses injected entries when opening from a sidecar file", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.id).toBe("demo-catalog");
    expect(catalog.keys()).toEqual(["dataset-a", "dataset-b", "dataset-c"]);
  });

  it("exposes plain JS records for rendering", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.records()).toEqual([
      { key: "dataset-a", source_id: "BCC-ESM1", experiment_id: "historical" },
      { key: "dataset-b", source_id: "BCC-ESM1", experiment_id: "ssp585", members: ["r1i1p1f1"] },
      { key: "dataset-c", source_id: "ACCESS-CM2", experiment_id: "historical", note: null },
    ]);
    expect(catalog.toRecords()).toEqual(catalog.records());
  });

  it("filters entries with search()", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.search({ source_id: "BCC-ESM1" }).keys()).toEqual(["dataset-a", "dataset-b"]);
    expect(catalog.search({ experiment_id: "historical" }).keys()).toEqual(["dataset-a", "dataset-c"]);
    expect(catalog.search({ source_id: "BCC-ESM1", experiment_id: "ssp585" }).keys()).toEqual(["dataset-b"]);
    expect(catalog.search({ source_id: "BCC-ESM1" }).records()).toEqual([
      { key: "dataset-a", source_id: "BCC-ESM1", experiment_id: "historical" },
      { key: "dataset-b", source_id: "BCC-ESM1", experiment_id: "ssp585", members: ["r1i1p1f1"] },
    ]);
  });

  it("returns itself for an empty query", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.search({})).toBe(catalog);
  });

  it("returns an empty filtered catalog for unknown query fields", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.search({ nonsense: "nope" }).keys()).toEqual([]);
    expect(catalog.search({ nonsense: "nope" }).records()).toEqual([]);
  });

  it("supports key lookup helpers", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.has("dataset-a")).toBe(true);
    expect(catalog.has("dataset-z")).toBe(false);
    expect(catalog.getEntry("dataset-c")).toEqual(entries[2]);
  });

  it("opens a selected group via the store handoff", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });
    const getNode = vi.fn().mockReturnValue({ path: "/dataset-a", nodeData: { type: "group" } });
    catalog.openStore = vi.fn().mockResolvedValue({ getNode } as never);

    await expect(catalog.openGroup("dataset-a")).resolves.toEqual({
      path: "/dataset-a",
      nodeData: { type: "group" },
    });
    expect(getNode).toHaveBeenCalledWith("/dataset-a");
  });

  it("throws when openGroup cannot find a group", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });
    catalog.openStore = vi.fn().mockResolvedValue({ getNode: vi.fn().mockReturnValue(null) } as never);

    await expect(catalog.openGroup("dataset-missing")).rejects.toThrow("No group entry found for key: dataset-missing");
  });

  it("throws when openGroup resolves to a non-group node", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });
    catalog.openStore = vi.fn().mockResolvedValue({
      getNode: vi.fn().mockReturnValue({ path: "/dataset-a", nodeData: { type: "array" } }),
    } as never);

    await expect(catalog.openGroup("dataset-a")).rejects.toThrow("No group entry found for key: dataset-a");
  });

  it("opens a selected dataset by handing the scoped store to zarrita", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });
    const scopedStore = { scoped: true };
    const group = { kind: "group", path: "/dataset-a" };
    const store = {
      getNode: vi.fn().mockReturnValue({ path: "/dataset-a", nodeData: { type: "group" } }),
      resolve: vi.fn().mockReturnValue(scopedStore),
    };
    vi.mocked(openZarr).mockResolvedValue(group as never);
    catalog.openStore = vi.fn().mockResolvedValue(store as never);

    await expect(catalog.openDataset("dataset-a")).resolves.toBe(group);
    expect(catalog.openStore).toHaveBeenCalledWith({});
    expect(store.getNode).toHaveBeenCalledWith("/dataset-a");
    expect(store.resolve).toHaveBeenCalledWith("/dataset-a");
    expect(openZarr).toHaveBeenCalledWith(scopedStore, {
      kind: "group",
      attrs: undefined,
      signal: undefined,
    });
  });

  it("passes dataset open options through to icechunk-js and zarrita", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });
    const signal = new AbortController().signal;
    const store = {
      getNode: vi.fn().mockReturnValue({ path: "/dataset-a", nodeData: { type: "group" } }),
      resolve: vi.fn().mockReturnValue({ scoped: true }),
    };
    vi.mocked(openZarr).mockResolvedValue({ kind: "group" } as never);
    catalog.openStore = vi.fn().mockResolvedValue(store as never);

    await catalog.openDataset("dataset-a", { branch: "dev", attrs: false, signal });

    expect(catalog.openStore).toHaveBeenCalledWith({ branch: "dev", signal });
    expect(openZarr).toHaveBeenCalledWith({ scoped: true }, { kind: "group", attrs: false, signal });
  });

  it("throws when openDataset cannot find a group", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });
    catalog.openStore = vi.fn().mockResolvedValue({
      getNode: vi.fn().mockReturnValue({ path: "/dataset-a", nodeData: { type: "array" } }),
      resolve: vi.fn(),
    } as never);

    await expect(catalog.openDataset("dataset-a")).rejects.toThrow("No group entry found for key: dataset-a");
    expect(openZarr).not.toHaveBeenCalled();
  });
});
