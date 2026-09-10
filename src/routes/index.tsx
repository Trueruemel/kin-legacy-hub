import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  LockKeyhole,
  Menu,
  Mic,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useState } from "react";

import { Wordmark } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import { useParallax } from "@/hooks/use-parallax";
import { BETA_LOCKED } from "@/lib/access";
import {
  AUTH_COPY,
  BRAND,
  DEFAULT_PROMPT_ID,
  FAMILY_JOURNEY,
  FIRST_STEPS,
  MEMORY_PROMPTS,
  TRUST_POINTS,
} from "@/lib/eternal-copy";
import { photo, photoPool } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eternal Memories — Capture a story while you can still ask it" },
      {
        name: "description",
        content:
          "A calm, private place for your family's voices, photographs, names and the details that make them matter. Start with one question.",
      },
      {
        property: "og:title",
        content: "Eternal Memories — Capture a story while you can still ask it",
      },
      {
        property: "og:description",
        content: "Start with one question. Build a living family archive at your own pace.",
      },
    ],
  }),
  component: LandingPage,
});

/** Where the primary CTA lands after sign-in. The auth route validates `next`. */
export function createMemoryNext(promptId: string): string {
  return `/create-memory?prompt=${encodeURIComponent(promptId)}`;
}

const STEP_ICONS: Record<(typeof FIRST_STEPS)[number]["label"], LucideIcon> = {
  Capture: Mic,
  "Give context": Sparkles,
  "Pass it on": Heart,
};

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-em", label: "Why EM" },
  { href: "#privacy", label: "Privacy" },
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const [promptId, setPromptId] = useState<string>(DEFAULT_PROMPT_ID);
  const [menuOpen, setMenuOpen] = useState(false);
  const navId = useId();
  const promptLegendId = useId();
  // Hero photograph: scale/opacity reveal on enter, plus a gentle parallax
  // (one rAF-throttled scroll listener; off under prefers-reduced-motion).
  const heroImage = useInView<HTMLImageElement>();
  useParallax(heroImage.ref, 0.2);

  const startWithQuestion = () => {
    void navigate({ to: "/auth", search: { next: createMemoryNext(promptId) } });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:text-gold-foreground"
      >
        Skip to content
      </a>

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <header className="absolute inset-x-0 top-0 z-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 sm:px-8 lg:px-10">
          <Link
            to="/"
            aria-label="Eternal Memories home"
            className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Wordmark variant="dark" />
          </Link>

          <button
            type="button"
            className="ml-auto inline-flex size-11 items-center justify-center rounded-md border border-white/25 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={navId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>

          <nav
            id={navId}
            aria-label="Primary"
            className={cn(
              "basis-full lg:ml-auto lg:flex lg:basis-auto lg:items-center lg:gap-7",
              menuOpen ? "block" : "hidden",
            )}
          >
            <ul className="flex flex-col gap-1 rounded-xl border border-white/15 bg-navy-deep/95 p-2 text-sm font-medium lg:flex-row lg:items-center lg:gap-7 lg:border-0 lg:bg-transparent lg:p-0">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-white/85 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:px-0"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/demo"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-white/85 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:px-0"
                >
                  Explore demo
                </Link>
              </li>
              <li className="lg:hidden">
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-white/85 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>

          <Button
            className="hidden min-h-11 bg-gold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90 focus-visible:ring-2 focus-visible:ring-white lg:inline-flex"
            onClick={startWithQuestion}
          >
            {BRAND.primaryCta} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* -------------------------------------------------------------- */}
        {/* Hero                                                            */}
        {/* -------------------------------------------------------------- */}
        <section
          className="grid bg-navy-deep text-white lg:min-h-[720px] lg:grid-cols-[48%_52%]"
          aria-labelledby="hero-title"
        >
          <div className="relative z-10 flex items-center px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:ml-auto lg:max-w-2xl lg:pr-14">
            <Reveal effect="fade">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                <span className="h-px w-10 bg-gold" aria-hidden="true" />A living archive for the
                people you love
              </p>
              <h1
                id="hero-title"
                className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              >
                Capture a story while you can still{" "}
                <em className="font-normal text-gold">ask it.</em>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/80">
                A calm, private place for your family&apos;s voices, photographs, names, and the
                details that make them matter.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button
                  size="lg"
                  className="min-h-12 bg-gold px-5 text-base text-gold-foreground shadow-xl shadow-gold/20 hover:bg-gold/90 focus-visible:ring-2 focus-visible:ring-white"
                  onClick={startWithQuestion}
                >
                  {BRAND.primaryCta} <ArrowRight aria-hidden="true" />
                </Button>
                <Link
                  to="/demo"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-white transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {BRAND.secondaryCta} <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <ul className="mt-14 flex flex-wrap gap-5 text-xs text-white/75">
                <li className="inline-flex items-center gap-2">
                  <LockKeyhole className="size-4 text-gold" aria-hidden="true" /> Private by default
                </li>
                <li className="inline-flex items-center gap-2">
                  <UsersRound className="size-4 text-gold" aria-hidden="true" /> Invite-only access
                </li>
              </ul>
            </Reveal>
          </div>

          <div className="relative min-h-[320px] overflow-hidden sm:min-h-[430px] lg:min-h-[720px]">
            {/* 120% tall and shifted up so the parallax never exposes the container edge. */}
            <img
              ref={heroImage.ref}
              data-inview={heroImage.inView ? "true" : "false"}
              src={photo(photoPool[0]!, 1600)}
              alt="Four generations of a family gathered around a long table at a reunion"
              className="reveal-zoom absolute inset-x-0 -top-[20%] h-[120%] w-full object-cover [--reveal-opacity:0.85]"
              width={1600}
              height={1067}
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/30 to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 via-transparent to-transparent"
              aria-hidden="true"
            />
            <p className="absolute bottom-8 right-6 hidden items-center gap-3 font-display text-base italic text-white/90 sm:flex lg:bottom-12 lg:right-8">
              <span className="h-px w-10 bg-gold" aria-hidden="true" />
              Every family has a story worth hearing.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Three steps                                                     */}
        {/* -------------------------------------------------------------- */}
        <section
          id="how-it-works"
          className="scroll-mt-20 bg-secondary px-5 py-20 sm:px-8 lg:px-10 lg:py-32"
          aria-labelledby="journey-title"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:text-gold">
                A simple beginning
              </p>
              <Reveal
                as="h2"
                effect="wipe"
                id="journey-title"
                className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-5xl"
              >
                Capture. Give context. Pass it on.
              </Reveal>
              <Reveal
                as="p"
                effect="fade"
                delay={120}
                className="mt-5 text-base leading-7 text-foreground/80"
              >
                The value isn&apos;t in storing more. It&apos;s in making the memories you already
                have easier to understand, find, and share.
              </Reveal>
            </div>
            <Reveal as="ol" effect="fade" delay={200} className="mt-14 grid gap-4 md:grid-cols-3">
              {FIRST_STEPS.map(({ number, label, title, body }) => {
                const Icon = STEP_ICONS[label];
                return (
                  <li
                    key={number}
                    className="rounded-2xl border border-border bg-background p-7 shadow-sm motion-safe:transition-transform motion-safe:hover:-translate-y-1"
                  >
                    <div className="mb-9 flex items-center justify-between">
                      <span className="font-display text-2xl text-foreground/45" aria-hidden="true">
                        {number}
                      </span>
                      <span className="grid size-11 place-items-center rounded-full bg-gold/15 text-primary dark:text-gold">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-gold">
                      {label}
                    </p>
                    <h3 className="mt-2 font-display text-2xl sm:text-3xl">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-foreground/80">{body}</p>
                  </li>
                );
              })}
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Why Eternal Memories exists                                     */}
        {/* -------------------------------------------------------------- */}
        <section
          id="why-em"
          className="scroll-mt-20 bg-primary px-5 py-20 text-primary-foreground sm:px-8 lg:px-10 lg:py-28"
          aria-labelledby="origin-title"
        >
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[80px_minmax(0,600px)_1fr] lg:gap-14">
            <div
              className="grid size-14 place-items-center rounded-full border border-gold/50 text-gold"
              aria-hidden="true"
            >
              <Heart className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                Why Eternal Memories exists
              </p>
              <Reveal
                as="h2"
                effect="wipe"
                id="origin-title"
                className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-5xl"
              >
                The story behind a photograph deserves to be asked for.
              </Reveal>
              <Reveal
                as="p"
                effect="fade"
                delay={120}
                className="mt-6 max-w-xl text-base leading-7 text-primary-foreground/80"
              >
                Eternal Memories began with a simple observation: a photograph can sit in a drawer
                for decades, while the voice, the names and the small details around it are rarely
                written down — not from neglect, but because nobody thought to ask.
              </Reveal>
              <Reveal
                as="p"
                effect="fade"
                delay={200}
                className="mt-4 max-w-xl text-base leading-7 text-primary-foreground/80"
              >
                We believe families should be able to start earlier, in their own words and in their
                own time. The family stays in control. We simply make the first question easier to
                ask.
              </Reveal>
              <a
                className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                href="#privacy"
              >
                Read our approach to privacy <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="hidden self-center text-center lg:block" aria-hidden="true">
              <span className="font-display text-9xl text-white/10">EM</span>
              <span className="block text-xs uppercase tracking-[0.16em] text-gold">
                made for passing on
              </span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* First-memory preview                                            */}
        {/* -------------------------------------------------------------- */}
        <section
          id="start"
          className="bg-background px-5 py-20 sm:px-8 lg:px-10 lg:py-32"
          aria-labelledby="start-title"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:text-gold">
              Your first memory
            </p>
            <div className="grid items-start gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-24">
              <div>
                <Reveal
                  as="h2"
                  effect="wipe"
                  id="start-title"
                  className="max-w-xl font-display text-3xl font-semibold leading-tight sm:text-5xl"
                >
                  {BRAND.reassurance}
                </Reveal>
                <Reveal
                  as="p"
                  effect="fade"
                  delay={120}
                  className="mt-6 max-w-lg text-lg leading-8 text-foreground/80"
                >
                  Begin with one question. The rest of your family archive can grow around it, at
                  your pace.
                </Reveal>
                <Reveal
                  as="ol"
                  effect="fade"
                  delay={200}
                  className="mt-8 space-y-3 text-sm text-foreground/80"
                >
                  {[
                    "Choose a question.",
                    "Answer it in writing or in your own voice.",
                    "Add a name, a date, a place, and why it matters.",
                    "It is saved privately, for the people you invite.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-gold/20 text-xs font-semibold text-primary dark:text-gold"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </Reveal>
              </div>

              <Reveal
                as="form"
                effect="fade"
                delay={160}
                className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-navy-deep/10 sm:p-8"
                onSubmit={(event) => {
                  event.preventDefault();
                  startWithQuestion();
                }}
              >
                <fieldset>
                  <legend
                    id={promptLegendId}
                    className="font-display text-2xl font-semibold text-foreground"
                  >
                    Choose a question
                  </legend>
                  <p className="mt-1 text-sm text-foreground/75">
                    No plan comparison. No perfect words required.
                  </p>
                  <div className="mt-5 grid gap-2">
                    {MEMORY_PROMPTS.map((prompt) => {
                      const selected = promptId === prompt.id;
                      return (
                        <label
                          key={prompt.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                            selected
                              ? "border-gold bg-gold/10"
                              : "border-border hover:border-gold/60",
                          )}
                        >
                          <input
                            type="radio"
                            name="prompt"
                            value={prompt.id}
                            checked={selected}
                            onChange={() => setPromptId(prompt.id)}
                            className="mt-1 size-4 shrink-0 accent-[var(--gold)]"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-foreground">
                              {prompt.title}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-foreground/75">
                              {prompt.question}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="min-h-11 flex-1">
                    Continue with this question <ArrowRight aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 border-border"
                    onClick={startWithQuestion}
                  >
                    <Mic aria-hidden="true" /> Record an answer
                  </Button>
                </div>
                <p className="mt-4 flex items-start gap-2 text-xs text-foreground/75">
                  <LockKeyhole
                    className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-gold"
                    aria-hidden="true"
                  />
                  You sign in first. Your first memory stays private until you choose to share it.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Family journey                                                  */}
        {/* -------------------------------------------------------------- */}
        <section
          className="bg-background px-5 py-20 sm:px-8 lg:px-10 lg:py-32"
          aria-labelledby="stages-title"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:text-gold">
                  The family journey
                </p>
                <Reveal
                  as="h2"
                  effect="wipe"
                  id="stages-title"
                  className="mt-4 font-display text-3xl font-semibold sm:text-5xl"
                >
                  A place to begin. Room to grow.
                </Reveal>
              </div>
              <Reveal
                as="p"
                effect="fade"
                delay={120}
                className="text-base leading-7 text-foreground/80"
              >
                Start with one story today. Add photographs, voices, context, and shared rituals as
                your family&apos;s archive takes shape.
              </Reveal>
            </div>
            <Reveal
              as="ol"
              effect="fade"
              delay={200}
              className="mt-14 grid border-y border-border md:grid-cols-5"
            >
              {FAMILY_JOURNEY.map(({ number, name, detail }, index) => (
                <li
                  key={number}
                  tabIndex={0}
                  data-journey-card
                  className={cn(
                    "group relative border-b border-border p-5 md:border-b-0 md:border-r",
                    // Hover and keyboard focus behave identically: lift, scale, lighter
                    // surface, shadow. Stacked above neighbours so the scaled card is
                    // never clipped by the next cell.
                    "transition duration-200 ease-out",
                    "hover:z-10 hover:-translate-y-[3px] hover:scale-[1.06] hover:bg-card hover:shadow-xl hover:shadow-navy-deep/15",
                    "focus-visible:z-10 focus-visible:-translate-y-[3px] focus-visible:scale-[1.06] focus-visible:bg-card focus-visible:shadow-xl focus-visible:shadow-navy-deep/15",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    // Reduced motion: no movement, only a short colour transition.
                    "motion-reduce:transition-colors motion-reduce:duration-150",
                    "motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:hover:shadow-none",
                    "motion-reduce:focus-visible:translate-y-0 motion-reduce:focus-visible:scale-100 motion-reduce:focus-visible:shadow-none",
                    index === 0 && "border-t-4 border-t-gold bg-secondary md:border-l",
                  )}
                >
                  <span className="text-xs font-semibold tracking-[0.14em] text-primary dark:text-gold">
                    {number}
                  </span>
                  <span className="mt-8 block font-display text-2xl font-semibold">{name}</span>
                  <span className="mt-2 block text-xs leading-5 text-foreground/75">{detail}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto mt-7 size-4 text-primary dark:text-gold",
                      "transition duration-200 ease-out",
                      "group-hover:translate-x-[3px] group-hover:text-gold",
                      "group-focus-visible:translate-x-[3px] group-focus-visible:text-gold",
                      "motion-reduce:transition-colors motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0",
                    )}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </Reveal>
            <Reveal
              effect="fade"
              className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-secondary p-7 sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-gold">
                  Explore the demo family
                </p>
                <h3 className="mt-2 font-display text-2xl">
                  See how one memory becomes part of a bigger story.
                </h3>
              </div>
              <Button asChild className="min-h-11">
                <Link to="/demo">
                  Open demo archive <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Privacy & trust                                                 */}
        {/* -------------------------------------------------------------- */}
        <section
          id="privacy"
          className="scroll-mt-20 bg-card px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
          aria-labelledby="trust-title"
        >
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_.8fr] lg:gap-24">
            <div>
              <span
                className="mb-6 grid size-12 place-items-center rounded-full bg-gold/15 text-primary dark:text-gold"
                aria-hidden="true"
              >
                <ShieldCheck className="size-6" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:text-gold">
                Built around your family&apos;s control
              </p>
              <Reveal
                as="h2"
                effect="wipe"
                id="trust-title"
                className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-5xl"
              >
                Private by default. Clear by design.
              </Reveal>
              <Reveal
                as="p"
                effect="fade"
                delay={120}
                className="mt-6 max-w-xl text-base leading-7 text-foreground/80"
              >
                For memories this personal, trust can&apos;t be a footnote. Here is what the archive
                does today — and nothing it doesn&apos;t.
              </Reveal>
              {BETA_LOCKED && (
                <p className="mt-6 max-w-xl rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm leading-6 text-foreground">
                  {AUTH_COPY.closedPreview}
                </p>
              )}
              <h3 id="accessibility" className="mt-10 scroll-mt-20 font-display text-xl">
                Accessibility
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/80">
                Eternal Memories is built to be used with a keyboard, a screen reader, at 200% zoom
                and on a phone. Where it falls short, we want to hear about it — the youngest and
                the oldest in a family should both find their way around.
              </p>
            </div>
            <Reveal as="ul" effect="fade" delay={200} className="border-t border-border lg:mt-16">
              {TRUST_POINTS.map(({ title, text }) => (
                <li key={title} className="flex gap-4 border-b border-border py-5">
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-primary dark:text-gold"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="mt-1 block text-sm leading-6 text-foreground/75">{text}</span>
                  </span>
                </li>
              ))}
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="bg-navy-deep px-5 py-14 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3 md:items-center">
            <Wordmark variant="dark" />
            <p className="max-w-xs text-sm text-white/75">
              A calm place for the stories that make a family.
            </p>
            <div className="flex flex-wrap items-center gap-4 md:justify-end">
              <span className="font-display text-lg italic text-gold">{BRAND.tagline}</span>
              <Button
                className="min-h-11 bg-gold text-gold-foreground hover:bg-gold/90 focus-visible:ring-2 focus-visible:ring-white"
                onClick={startWithQuestion}
              >
                {BRAND.primaryCta} <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
          <nav
            aria-label="Footer"
            className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>© 2026 Eternal Memories</span>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <Link
                  to="/auth"
                  className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#accessibility"
                  className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Accessibility
                </a>
              </li>
              <li>
                <Link
                  to="/demo"
                  className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Demo
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="inline-flex min-h-11 items-center hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Support us
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
