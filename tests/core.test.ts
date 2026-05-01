import { describe, expect, it } from "vitest";

import { IcechunkCatalog } from "../src/core.js";
import type { CatalogEntryMetadata, CatalogSidecar } from "../src/types.js";

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
  { key: "dataset-b", attrs: { source_id: "BCC-ESM1", experiment_id: "ssp585" } },
  { key: "dataset-c", attrs: { source_id: "ACCESS-CM2", experiment_id: "historical" } },
];

describe("IcechunkCatalog search semantics", () => {
  it("reuses injected entries when opening from a sidecar file", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.id).toBe("demo-catalog");
    expect(catalog.keys()).toEqual(["dataset-a", "dataset-b", "dataset-c"]);
  });

  it("filters entries with search()", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.search({ source_id: "BCC-ESM1" }).keys()).toEqual(["dataset-a", "dataset-b"]);
    expect(catalog.search({ experiment_id: "historical" }).keys()).toEqual(["dataset-a", "dataset-c"]);
    expect(catalog.search({ source_id: "BCC-ESM1", experiment_id: "ssp585" }).keys()).toEqual(["dataset-b"]);
  });

  it("supports key lookup helpers", async () => {
    const catalog = await IcechunkCatalog.openFromSidecarFile("tests/fixtures/catalog-sidecar.json", { entries });

    expect(catalog.has("dataset-a")).toBe(true);
    expect(catalog.has("dataset-z")).toBe(false);
    expect(catalog.getEntry("dataset-c")).toEqual(entries[2]);
  });
});
