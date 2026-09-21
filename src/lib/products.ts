/**
 * Single source of truth for what the archive sells. Both the pages and the
 * server functions read from here so a price or a size can never drift apart.
 */

export const EXTRA_STORAGE = {
  /** Human-readable price id, stable across test and live. */
  priceId: "extra_storage_30gb_monthly",
  name: "30 GB extra storage",
  priceLabel: "$3.99",
  intervalLabel: "per month",
  gigabytes: 30,
} as const;

export const BASE_STORAGE_GB = 5;

export const DONATION = {
  minCents: 100,
  maxCents: 500000,
  presets: [5, 10, 25, 50],
  label: "Support us contribution",
} as const;

/** Statuses that still grant the extra room the family paid for. */
export const PAYING_STATUSES = ["active", "trialing", "past_due"] as const;

export function formatGb(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 0.1) return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
  return `${gb.toFixed(1)} GB`;
}
