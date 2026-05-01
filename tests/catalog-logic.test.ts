import { describe, expect, it } from "vitest";

import { extractAttributes, filterEntries, keyToPath, matchesQuery } from "../src/catalog-logic.js";
import type { CatalogEntryMetadata } from "../src/types.js";

describe("keyToPath", () => {
  it("adds a leading slash when missing", () => {
    expect(keyToPath("dataset-a")).toBe("/dataset-a");
  });

  it("preserves an existing leading slash", () => {
    expect(keyToPath("/dataset-a")).toBe("/dataset-a");
  });
});

describe("extractAttributes", () => {
  it("returns the attributes object when present", () => {
    expect(extractAttributes({ attributes: { experiment_id: "historical" } })).toEqual({
      experiment_id: "historical",
    });
  });

  it("returns an empty object when attributes are absent", () => {
    expect(extractAttributes({ zarr_format: 3 })).toEqual({});
  });

  it("returns an empty object for malformed attributes", () => {
    expect(extractAttributes({ attributes: ["nope"] })).toEqual({});
  });
});

describe("matchesQuery", () => {
  const attrs = {
    source_id: "BCC-ESM1",
    experiment_id: "historical",
    realm: "ocean",
  };

  it("matches scalar queries", () => {
    expect(matchesQuery(attrs, { source_id: "BCC-ESM1" })).toBe(true);
  });

  it("matches list queries", () => {
    expect(matchesQuery(attrs, { experiment_id: ["ssp585", "historical"] })).toBe(true);
  });

  it("fails when any query term does not match", () => {
    expect(matchesQuery(attrs, { source_id: "BCC-ESM1", realm: "atmos" })).toBe(false);
  });
});

describe("filterEntries", () => {
  const entries: CatalogEntryMetadata[] = [
    { key: "dataset-a", attrs: { source_id: "BCC-ESM1", experiment_id: "historical" } },
    { key: "dataset-b", attrs: { source_id: "BCC-ESM1", experiment_id: "ssp585" } },
    { key: "dataset-c", attrs: { source_id: "ACCESS-CM2", experiment_id: "historical" } },
  ];

  it("returns all entries for an empty query", () => {
    expect(filterEntries(entries, {})).toEqual(entries);
  });

  it("filters entries by scalar query", () => {
    expect(filterEntries(entries, { source_id: "BCC-ESM1" }).map((entry) => entry.key)).toEqual([
      "dataset-a",
      "dataset-b",
    ]);
  });

  it("filters entries by list-valued query", () => {
    expect(filterEntries(entries, { experiment_id: ["historical"] }).map((entry) => entry.key)).toEqual([
      "dataset-a",
      "dataset-c",
    ]);
  });

  it("applies multiple query terms conjunctively", () => {
    expect(
      filterEntries(entries, { source_id: "BCC-ESM1", experiment_id: "ssp585" }).map((entry) => entry.key),
    ).toEqual(["dataset-b"]);
  });
});
