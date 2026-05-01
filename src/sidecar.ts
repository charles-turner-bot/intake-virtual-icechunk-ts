import { readFile } from "node:fs/promises";
import type { CatalogSidecar } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidSidecar(source: string, field: string, expected: string): Error {
  return new Error(`Invalid catalog sidecar from ${source}: ${field} must be ${expected}`);
}

function assertOptionalString(value: unknown, source: string, field: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw invalidSidecar(source, field, "a string");
  }
}

function assertOptionalNullableString(value: unknown, source: string, field: string): void {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw invalidSidecar(source, field, "a string or null");
  }
}

function assertOptionalRecord(value: unknown, source: string, field: string): void {
  if (value !== undefined && !isRecord(value)) {
    throw invalidSidecar(source, field, "an object");
  }
}

function assertCatalogSidecar(value: unknown, source: string): asserts value is CatalogSidecar {
  if (!isRecord(value)) {
    throw invalidSidecar(source, "root", "an object");
  }

  if (typeof value.store !== "string") {
    throw invalidSidecar(source, "store", "a string");
  }

  const virtualChunkModel = value.virtual_chunk_model;
  if (!isRecord(virtualChunkModel)) {
    throw invalidSidecar(source, "virtual_chunk_model", "an object");
  }
  if (typeof virtualChunkModel.url_prefix !== "string") {
    throw invalidSidecar(source, "virtual_chunk_model.url_prefix", "a string");
  }
  if (typeof virtualChunkModel.store_type !== "string") {
    throw invalidSidecar(source, "virtual_chunk_model.store_type", "a string");
  }
  assertOptionalRecord(virtualChunkModel.open_kwargs, source, "virtual_chunk_model.open_kwargs");

  assertOptionalString(value.id, source, "id");
  assertOptionalString(value.version, source, "version");
  assertOptionalString(value.last_updated, source, "last_updated");
  assertOptionalNullableString(value.description, source, "description");
  assertOptionalNullableString(value.title, source, "title");
  assertOptionalRecord(value.storage_options, source, "storage_options");
  assertOptionalRecord(value.xarray_kwargs, source, "xarray_kwargs");
}

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
  const sidecar: unknown = JSON.parse(raw);
  assertCatalogSidecar(sidecar, path);
  return sidecar;
}

export async function loadSidecarFromUrl(url: string, init?: RequestInit): Promise<CatalogSidecar> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to load sidecar from ${url}: ${response.status} ${response.statusText}`);
  }
  const sidecar: unknown = await response.json();
  assertCatalogSidecar(sidecar, url);
  return sidecar;
}
