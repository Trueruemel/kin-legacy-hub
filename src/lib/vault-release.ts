/**
 * The one place that decides whether a vault entry is released.
 *
 * Both `vaultMediaUrl` and `vaultStory` gate on this. Keeping the rule in a single,
 * tested function prevents the two call sites from drifting apart — a drift would mean
 * that sealed content could reach storage or the AI gateway. Row Level Security and
 * storage policies remain the authoritative guard; this is the application-level
 * mirror of the same rule.
 */

export type VaultReleaseFields = Readonly<{
  release_rule?: string | null;
  release_on?: string | null;
  released?: boolean | null;
  /** Optional moment after which an open entry closes again. */
  access_expires_at?: string | null;
}>;

/**
 * Released when the rule is `immediate`, when the entry was released explicitly, or
 * when an `on_date` rule has a parseable date that is not in the future. Everything
 * else — unknown rules, missing or unparseable dates — stays sealed.
 */
export function isReleased(entry: VaultReleaseFields, now: number = Date.now()): boolean {
  // An expiry, once past, closes the entry again whatever the release rule says.
  if (entry.access_expires_at) {
    const expiresAt = new Date(entry.access_expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  }
  if (entry.release_rule === "immediate") return true;
  if (entry.released === true) return true;
  if (entry.release_rule !== "on_date" || !entry.release_on) return false;
  const releaseAt = new Date(entry.release_on).getTime();
  return Number.isFinite(releaseAt) && releaseAt <= now;
}
