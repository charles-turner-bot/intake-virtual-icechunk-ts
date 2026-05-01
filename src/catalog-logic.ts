import type { CatalogEntryMetadata, CatalogSearchQuery } from "./types.js";

export function matchesQuery(attrs: Record<string, unknown>, query: CatalogSearchQuery): boolean {
  return Object.entries(query).every(([key, value]) => {
    const attr = attrs[key];
    return Array.isArray(value) ? value.includes(attr) : attr === value;
  });
}

export function extractAttributes(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && "attributes" in metadata) {
    const attrs = (metadata as { attributes?: unknown }).attributes;
    if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
      return attrs as Record<string, unknown>;
    }
  }
  return {};
}

export function keyToPath(key: string): string {
  return key.startsWith("/") ? key : `/${key}`;
}

export function filterEntries(entries: CatalogEntryMetadata[], query: CatalogSearchQuery): CatalogEntryMetadata[] {
  if (Object.keys(query).length === 0) {
    return entries;
  }

  return entries.filter((entry) => matchesQuery(entry.attrs, query));
}
