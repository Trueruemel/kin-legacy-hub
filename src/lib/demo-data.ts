/**
 * Fictitious demo archive shown on the public `/demo` route.
 *
 * Everything in this file is invented for the demo. It never touches the
 * database or private storage: names, dates and quotes are made up, and the
 * only images are the same public stock photographs the mock data already uses.
 */
import { photo, photoPool } from "./mock-data";

export const DEMO_FAMILY = {
  name: "The Johnson family archive",
  label: "Fictitious demo archive",
  since: 1948,
  generations: 4,
  intro:
    "One family's stories, photographs, recipes, and the details that help them stay close across generations.",
  coverUrl: photo(photoPool[0]!, 1600),
  coverAlt: "Four generations of a family gathered around a long table at a reunion",
} as const;

export type DemoGeneration = {
  label: string;
  people: string;
  years: string;
};

export const DEMO_GENERATIONS: readonly DemoGeneration[] = [
  { label: "First generation", people: "Robert & Helen Johnson", years: "1925 – 2018" },
  { label: "Second generation", people: "Margaret, David & Susan", years: "born 1955 – 1962" },
  { label: "Third generation", people: "Emily, James, Sarah & Michael", years: "born 1980 – 1992" },
  { label: "Fourth generation", people: "Lily, Noah & Ava", years: "born 2012 – 2019" },
] as const;

export type DemoMemory = {
  id: string;
  kind: "audio" | "photo" | "recipe";
  kindLabel: string;
  title: string;
  person: string;
  date: string;
  place: string;
  /** Short text alternative for audio, or the story behind a photo / recipe. */
  excerpt: string;
  /** Only for photo memories — a public stock image, never a private file. */
  imageUrl?: string;
  imageAlt?: string;
  /** Only for audio memories — a fictitious duration so the card reads as a recording. */
  duration?: string;
};

export const DEMO_MEMORIES: readonly DemoMemory[] = [
  {
    id: "treehouse",
    kind: "audio",
    kindLabel: "Audio story",
    title: "The summer we built the treehouse",
    person: "Margaret Johnson-Thompson",
    date: "Recorded 3 May 2024 · about July 1968",
    place: "Lake Simcoe, Ontario",
    duration: "4:12",
    excerpt:
      "“Dad drew the plan on the back of a seed packet. We had one hammer between the three of us and argued about it all summer. It is still standing — I checked last year.”",
  },
  {
    id: "sunday-lunch",
    kind: "photo",
    kindLabel: "Photograph",
    title: "Sunday lunch at the old house",
    person: "Helen Johnson, with Robert and the children",
    date: "4 October 1975",
    place: "Withrow Avenue, Toronto",
    imageUrl: photo(photoPool[1]!, 1200),
    imageAlt: "A family sharing a meal around a kitchen table in warm afternoon light",
    excerpt:
      "Helen cooked for eleven people every Sunday. The chair with the cracked back was Robert's and nobody else was allowed to sit in it.",
  },
  {
    id: "apple-cake",
    kind: "recipe",
    kindLabel: "Recipe & story",
    title: "Mum's apple cake",
    person: "Eleanor Johnson, written down by Susan",
    date: "A family recipe, first baked around 1950",
    place: "Halifax, Nova Scotia",
    excerpt:
      "Six apples, never five. Brown the butter first — that is the part everyone forgets. Helen learned it from her mother and taught it to every grandchild who could hold a whisk.",
  },
] as const;

export const DEMO_QUOTE = {
  text: "We don't just keep the photograph. We keep the story that makes it ours.",
  attribution: "The Johnson family archive (fictional)",
} as const;
