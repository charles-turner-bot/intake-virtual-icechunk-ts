import { readFile } from "node:fs/promises";
import type { CatalogSidecar } from "./types.js";

/**
 * Computes the conventional intake sidecar filename for a store URL/path.
 */
function intakeCatFilename(storeUrl: string): string {
  const trimmed = storeUrl.replace(/\/+$/, "");
  const tail = trimmed.split("/").at(-1) ?? trimmed;
  const stem = tail.replace(/\.icechunk$/, "");
  return `_intake_${stem}.json`;
}

/**
 * Builds the conventional sidecar location for an Icechunk store.
 *
 * For a store ending in `demo.icechunk`, this resolves to a sibling file named
 * `_intake_demo.json` within that store path.
 */
export function sidecarUrlForStore(storeUrl: string): string {
  const trimmed = storeUrl.replace(/\/+$/, "");
  return `${trimmed}/${intakeCatFilename(storeUrl)}`;
}

/**
 * Loads and parses a catalog sidecar JSON file from the local filesystem.
 */
export async function loadSidecarFromFile(path: string): Promise<CatalogSidecar> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as CatalogSidecar;
}

/**
 * Loads and parses a catalog sidecar JSON document via `fetch`.
 */
export async function loadSidecarFromUrl(url: string, init?: RequestInit): Promise<CatalogSidecar> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to load sidecar from ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as CatalogSidecar;
}
