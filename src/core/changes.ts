/**
 * Confirmation text and log rows for planned casing changes. Pure, so it is
 * unit-tested in Node (test/unit/changes.test.ts).
 */

import type { CreatorLike } from "./casing";

export interface FieldChange {
  field: "title" | "creator";
  from: string;
  to: string;
}

/** "Last, First", or the single-field name for organisations. */
export function creatorLabel(creator: CreatorLike): string {
  const last = creator.lastName ?? "";
  const first = creator.firstName ?? "";
  return creator.fieldMode === 1 || !first ? last : `${last}, ${first}`;
}

function shorten(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

/**
 * Lines for the confirmation dialog, capped at `limit` changes with a final
 * "…and N more changes". Titles get two lines (before, after).
 */
export function formatChangeList(changes: FieldChange[], limit = 15): string {
  const lines = changes
    .slice(0, limit)
    .map((c) =>
      c.field === "title"
        ? `• ${shorten(c.from, 70)}\n    → ${shorten(c.to, 70)}`
        : `• ${c.from}  →  ${c.to}`,
    );
  if (changes.length > limit) {
    lines.push(`…and ${changes.length - limit} more changes`);
  }
  return lines.join("\n");
}

export const LOG_HEADER = "changed_at,library_key,field,old_value,new_value";

function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One CSV line for the change log, so any change can be reverted by hand. */
export function logRow(
  changedAt: string,
  libraryKey: string,
  change: FieldChange,
): string {
  return [changedAt, libraryKey, change.field, change.from, change.to]
    .map(csvField)
    .join(",");
}
