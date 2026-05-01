import { readFile } from "node:fs/promises";
import type { CatalogSidecar } from "./types.js";

function intakeCatFilename(storeUrl: string): string {
  const trimmed = storeUrl.replace(/\/+$/, "");
  const tail = trimmed.split("/").at(-1) ?? trimmed;
  const stem = tail.replace(/\.icechunk$/, "");
  return `_intake_${stem}.json`;
}

export function sidecarUrlForStore(storeUrl: string): string {
  const trimmed = storeUrl.replace(/\/+$/, "");
  return `${trimmed}/${intakeCatFilename(storeUrl)}`;
}

export async function loadSidecarFromFile(path: string): Promise<CatalogSidecar> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as CatalogSidecar;
}

export async function loadSidecarFromUrl(url: string, init?: RequestInit): Promise<CatalogSidecar> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to load sidecar from ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as CatalogSidecar;
}
