/**
 * Public-facing copy for Eternal Memories.
 *
 * Kept in one place so the homepage, the demo archive and the first-memory
 * flow speak with one voice. Calm, concrete, dignified — the family is the
 * main character; the product is a tool and a companion.
 */

export const BRAND = {
  name: "Eternal Memories",
  tagline: "Capture a story while you can still ask it.",
  primaryCta: "Start with one question",
  secondaryCta: "Explore the demo archive",
  /** The only product promise on the page: one small first action. */
  reassurance: "You do not need to organise everything today.",
} as const;

/** A question someone can answer in a few minutes. `id` is stable and URL-safe. */
export type MemoryPrompt = {
  id: string;
  title: string;
  question: string;
};

export const MEMORY_PROMPTS: readonly MemoryPrompt[] = [
  {
    id: "still-see",
    title: "A story I still remember",
    question: "What is a family moment you can still see clearly?",
  },
  {
    id: "ordinary-day",
    title: "The way it used to be",
    question: "What did an ordinary day look like when you were growing up?",
  },
  {
    id: "pass-on",
    title: "Something worth passing on",
    question: "What would you want the next generation to understand?",
  },
  {
    id: "their-voice",
    title: "Someone I want remembered",
    question: "Who in your family should the youngest ones know about, and why?",
  },
] as const;

export const DEFAULT_PROMPT_ID = MEMORY_PROMPTS[0]!.id;

export function findPrompt(id: string | null | undefined): MemoryPrompt {
  return MEMORY_PROMPTS.find((p) => p.id === id) ?? MEMORY_PROMPTS[0]!;
}

/** The three steps a family takes with its first memory. */
export const FIRST_STEPS = [
  {
    number: "01",
    label: "Capture",
    title: "Start with one voice.",
    body: "Ask one question, record an answer, or add a photograph with the story behind it.",
  },
  {
    number: "02",
    label: "Give context",
    title: "Make it findable.",
    body: "Add a name, a date, a place, and the small details that help someone understand later.",
  },
  {
    number: "03",
    label: "Pass it on",
    title: "Keep it close.",
    body: "Invite the people you trust and build a living archive your family can return to.",
  },
] as const;

/** The longer family journey — where the archive can grow, at its own pace. */
export const FAMILY_JOURNEY = [
  { number: "01", name: "Capture", detail: "One answer, voice, or memory" },
  { number: "02", name: "Give context", detail: "Names, places, dates, meaning" },
  { number: "03", name: "Preserve", detail: "Photos, letters, existing media" },
  { number: "04", name: "Deepen", detail: "Connected family stories" },
  { number: "05", name: "Pass on", detail: "Shared rituals and heirlooms" },
] as const;

/**
 * Only claims that the current product actually keeps.
 * No encryption or security promises that are not verified in the codebase.
 */
export const TRUST_POINTS = [
  {
    title: "Invite-only access",
    text: "Nobody joins a family archive without an invitation from that family.",
  },
  {
    title: "Your family controls who sees what",
    text: "Visibility of the tree, photos and events is set per relative — not a public feed.",
  },
  {
    title: "Private files, short-lived links",
    text: "Photos and recordings live in private storage and are opened through expiring links.",
  },
  {
    title: "Export and deletion explained",
    text: "We tell you how your family can take its archive with it. No hidden lock-in.",
  },
] as const;

export const AUTH_COPY = {
  signInTitle: "Sign in to your family archive.",
  signUpTitle: "Create your private family archive.",
  footnote: "Your family controls who can see what.",
  closedPreview:
    "Eternal Memories is in a closed preview. The accounts we prepared can sign in today; open registration follows once the beta opens.",
} as const;
