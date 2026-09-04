export function relativeTime(iso: string, from: Date = new Date()): string {
  const diff = from.getTime() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 35) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.max(1, Math.round(days / 365))}y ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function lifeDates(birthDate: string, deathDate?: string): string {
  const birth = new Date(birthDate).getFullYear();
  return deathDate ? `${birth} – ${new Date(deathDate).getFullYear()}` : `${birth} – Present`;
}

export function age(birthDate: string, deathDate?: string): number {
  const end = deathDate ? new Date(deathDate) : new Date();
  const start = new Date(birthDate);
  let years = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) years -= 1;
  return years;
}

export function countdown(targetIso: string, from: Date = new Date()): string {
  const diff = new Date(targetIso).getTime() - from.getTime();
  if (diff <= 0) return "Unlocked";
  const days = Math.floor(diff / 86_400_000);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}mo remaining`;
  if (days > 30) return `${months}mo ${days % 30}d remaining`;
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h remaining`;
}

export function daysUntil(dateIso: string, from: Date = new Date()): number {
  const target = new Date(dateIso);
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

export function nextBirthday(birthDate: string, from: Date = new Date()): Date {
  const b = new Date(birthDate);
  const next = new Date(from.getFullYear(), b.getMonth(), b.getDate());
  if (next.getTime() < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) {
    next.setFullYear(from.getFullYear() + 1);
  }
  return next;
}

/** Simulated network latency so the prototype feels like a real product. */
export const delay = (ms = 400 + Math.random() * 400) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
