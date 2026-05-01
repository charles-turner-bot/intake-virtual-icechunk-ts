import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSidecarFromFile, loadSidecarFromUrl, sidecarUrlForStore } from "../src/sidecar.js";

describe("sidecarUrlForStore", () => {
  it("builds a sidecar URL for a local-ish store path", () => {
    expect(sidecarUrlForStore("/tmp/demo.icechunk")).toBe("/tmp/demo.icechunk/_intake_demo.json");
  });

  it("strips trailing slashes before building the sidecar URL", () => {
    expect(sidecarUrlForStore("s3://bucket/demo.icechunk///")).toBe("s3://bucket/demo.icechunk/_intake_demo.json");
  });

  it("does not require a .icechunk suffix", () => {
    expect(sidecarUrlForStore("https://example.com/catalog-store")).toBe(
      "https://example.com/catalog-store/_intake_catalog-store.json",
    );
  });

  it("handles nested remote URLs", () => {
    expect(sidecarUrlForStore("https://example.com/path/to/demo.icechunk")).toBe(
      "https://example.com/path/to/demo.icechunk/_intake_demo.json",
    );
  });
});

describe("loadSidecarFromFile", () => {
  it("loads valid sidecar JSON from disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ivic-ts-"));
    const file = join(dir, "catalog.json");
    await writeFile(file, JSON.stringify({ store: "https://example.com/demo.icechunk", virtual_chunk_model: { url_prefix: "s3://bucket/", store_type: "s3" } }));

    await expect(loadSidecarFromFile(file)).resolves.toMatchObject({
      store: "https://example.com/demo.icechunk",
    });
  });

  it("rejects malformed JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ivic-ts-"));
    const file = join(dir, "catalog.json");
    await writeFile(file, "{ definitely not json }");

    await expect(loadSidecarFromFile(file)).rejects.toThrow();
  });
});

describe("loadSidecarFromUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads JSON via fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ store: "https://example.com/demo.icechunk", virtual_chunk_model: { url_prefix: "s3://bucket/", store_type: "s3" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadSidecarFromUrl("https://example.com/catalog.json")).resolves.toMatchObject({
      store: "https://example.com/demo.icechunk",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/catalog.json", undefined);
  });

  it("passes RequestInit through to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ store: "https://example.com/demo.icechunk", virtual_chunk_model: { url_prefix: "s3://bucket/", store_type: "s3" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const init = { headers: { Authorization: "Bearer token" } };
    await loadSidecarFromUrl("https://example.com/catalog.json", init);

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/catalog.json", init);
  });

  it("throws a useful error on non-OK responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }),
    );

    await expect(loadSidecarFromUrl("https://example.com/missing.json")).rejects.toThrow(
      "Failed to load sidecar from https://example.com/missing.json: 404 Not Found",
    );
  });
});
