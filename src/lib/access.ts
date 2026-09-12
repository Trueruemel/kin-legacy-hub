/**
 * Sign-up gate.
 *
 * The archive is now open: anyone may create an account with their email
 * address and enter after confirming it. The allowlist below is kept only so
 * the closed preview can be switched back on by flipping BETA_LOCKED.
 *
 * Emails are not secrets — this was only ever a UX gate on top of RLS, not a
 * security boundary: every table is still protected by row level security.
 */
export const BETA_LOCKED = false;

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
