/**
 * Closed beta gate.
 *
 * While the app is online on the public domain, only the four developer /
 * demo accounts (plus the owner account) may enter the app. Everyone else is
 * shown a friendly "closed beta" notice on the sign-in page.
 *
 * Emails are not secrets — this is a UX gate on top of RLS, not a security
 * boundary: every table is still protected by row level security.
 */
export const BETA_LOCKED = true;

export const BETA_ALLOWLIST = [
  "tpyycc2001@gmail.com",
  "dev1@eternalmemorys.enterprises",
  "dev2@eternalmemorys.enterprises",
  "dev3@eternalmemorys.enterprises",
  "dev4@eternalmemorys.enterprises",
] as const;

export function isBetaAllowed(email: string | null | undefined): boolean {
  if (!BETA_LOCKED) return true;
  if (!email) return false;
  return BETA_ALLOWLIST.includes(email.trim().toLowerCase() as (typeof BETA_ALLOWLIST)[number]);
}
