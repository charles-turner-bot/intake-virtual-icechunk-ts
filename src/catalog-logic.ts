import type { CatalogEntryMetadata, CatalogSearchQuery } from "./types.js";

/**
 * Returns true when an attribute object satisfies every term in the query.
 *
 * Query values may be scalars for exact equality or arrays of acceptable
 * candidate values.
 */
export function matchesQuery(attrs: Record<string, unknown>, query: CatalogSearchQuery): boolean {
  return Object.entries(query).every(([key, value]) => {
    const attr = attrs[key];
    return Array.isArray(value) ? value.includes(attr) : attr === value;
  });
}

/**
 * Extracts a plain attributes object from Zarr-style metadata.
 *
 * Metadata without an object-valued `attributes` field is treated as having no
 * searchable attributes.
 */
export function extractAttributes(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && "attributes" in metadata) {
    const attrs = (metadata as { attributes?: unknown }).attributes;
    if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
      return attrs as Record<string, unknown>;
    }
  }
  return {};
}

/**
 * Normalises a logical entry key into the absolute-style path shape expected by
 * `icechunk-js` node lookups.
 */
export function keyToPath(key: string): string {
  return key.startsWith("/") ? key : `/${key}`;
}

/**
 * Filters catalog entries using the same conjunctive matching rules as
 * {@link matchesQuery}.
 */
export function filterEntries(entries: CatalogEntryMetadata[], query: CatalogSearchQuery): CatalogEntryMetadata[] {
  if (Object.keys(query).length === 0) {
    return entries;
  }

  return entries.filter((entry) => matchesQuery(entry.attrs, query));
}
