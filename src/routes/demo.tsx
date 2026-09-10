import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChefHat,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  Mic,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import {
  DEMO_FAMILY,
  DEMO_GENERATIONS,
  DEMO_MEMORIES,
  DEMO_QUOTE,
  type DemoMemory,
} from "@/lib/demo-data";
import { BRAND } from "@/lib/eternal-copy";

/**
 * Public, fictional demo archive.
 *
 * Deliberately has no Supabase import, no server function and no app state:
 * every word and picture comes from `src/lib/demo-data.ts`.
 */
export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Explore the demo archive — Eternal Memories" },
      {
        name: "description",
        content:
          "Walk through a fictional Eternal Memories family archive: a voice story, a photograph and a recipe, each with the names, dates and places that give it meaning.",
      },
      { property: "og:title", content: "Explore the demo archive — Eternal Memories" },
      {
        property: "og:description",
        content: "A fictional four-generation family archive, entirely made up for this demo.",
      },
    ],
  }),
  component: DemoArchivePage,
});

const KIND_ICONS: Record<DemoMemory["kind"], LucideIcon> = {
  audio: Mic,
  photo: ImageIcon,
  recipe: ChefHat,
};

export function DemoArchivePage() {
  const cover = useInView<HTMLImageElement>();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:text-gold-foreground"
      >
        Skip to content
      </a>

      <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 sm:px-8 lg:px-10">
        <Link
          to="/"
          aria-label="Eternal Memories home"
          className="inline-flex min-h-11 items-center rounded-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gold"
        >
          <Wordmark />
        </Link>
        <p className="ml-auto inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-xs font-semibold text-foreground">
          <span className="size-2 rounded-full bg-gold" aria-hidden="true" />
          {DEMO_FAMILY.label}
        </p>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to home
        </Link>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-10"
      >
        {/* Archive cover ------------------------------------------------- */}
        <section
          className="relative overflow-hidden rounded-3xl bg-navy-deep text-white shadow-xl shadow-navy-deep/15"
          aria-labelledby="demo-title"
        >
          <img
            ref={cover.ref}
            data-inview={cover.inView ? "true" : "false"}
            src={DEMO_FAMILY.coverUrl}
            alt={DEMO_FAMILY.coverAlt}
            className="reveal-zoom absolute inset-0 size-full object-cover [--reveal-opacity:0.3]"
            width={1600}
            height={1067}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/80 to-navy-deep/40"
            aria-hidden="true"
          />
          <Reveal effect="fade" className="relative px-6 py-14 sm:px-12 lg:px-20 lg:py-20">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              <LockKeyhole className="size-4" aria-hidden="true" /> Private family archive preview
            </p>
            <h1
              id="demo-title"
              className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl"
            >
              {DEMO_FAMILY.name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">{DEMO_FAMILY.intro}</p>
            <ul className="mt-8 flex flex-wrap gap-5 text-xs text-white/80">
              <li className="inline-flex items-center gap-2">
                <UsersRound className="size-4 text-gold" aria-hidden="true" />
                {DEMO_FAMILY.generations} generations
              </li>
              <li className="inline-flex items-center gap-2">
                <CalendarDays className="size-4 text-gold" aria-hidden="true" />
                Since {DEMO_FAMILY.since}
              </li>
              <li className="inline-flex items-center gap-2">
                <LockKeyhole className="size-4 text-gold" aria-hidden="true" /> Invite-only
              </li>
            </ul>
            <p className="mt-8 max-w-2xl rounded-lg border border-white/20 bg-white/5 p-3 text-xs leading-5 text-white/80">
              Everything on this page is invented for the demo: the Johnsons, their dates, their
              recipe and their recordings. No real family&apos;s content is shown here.
            </p>
          </Reveal>
        </section>

        {/* Generations ---------------------------------------------------- */}
        <section className="py-16 lg:py-20" aria-labelledby="generations-title">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-gold">
            Who is in the archive
          </p>
          <Reveal
            as="h2"
            effect="wipe"
            id="generations-title"
            className="mt-3 font-display text-3xl font-semibold sm:text-4xl"
          >
            Four generations, one table
          </Reveal>
          <Reveal
            as="ol"
            effect="fade"
            delay={150}
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {DEMO_GENERATIONS.map((generation, index) => (
              <li
                key={generation.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <span className="text-xs font-semibold tracking-[0.14em] text-primary dark:text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-4 block text-xs uppercase tracking-wide text-foreground/70">
                  {generation.label}
                </span>
                <span className="mt-1 block font-display text-xl font-semibold">
                  {generation.people}
                </span>
                <span className="mt-2 block text-xs text-foreground/75">{generation.years}</span>
              </li>
            ))}
          </Reveal>
        </section>

        {/* Memories ------------------------------------------------------ */}
        <section className="pb-16 lg:pb-20" aria-labelledby="memories-title">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-gold">
                A living collection
              </p>
              <Reveal
                as="h2"
                effect="wipe"
                id="memories-title"
                className="mt-3 font-display text-3xl font-semibold sm:text-5xl"
              >
                Recent memories
              </Reveal>
            </div>
            <Reveal
              as="p"
              effect="fade"
              delay={120}
              className="max-w-sm text-sm leading-6 text-foreground/75"
            >
              Each memory keeps the question it answers, who it is about, when and where it happened
              — the context that makes it findable later.
            </Reveal>
          </div>

          <Reveal as="ul" effect="fade" delay={200} className="mt-9 grid gap-5 md:grid-cols-3">
            {DEMO_MEMORIES.map((memory) => {
              const Icon = KIND_ICONS[memory.kind];
              return (
                <li
                  key={memory.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-navy-deep/5"
                >
                  <MemoryVisual memory={memory} />
                  <div className="flex flex-1 flex-col p-6">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary dark:text-gold">
                      <Icon className="size-4" aria-hidden="true" /> {memory.kindLabel}
                    </p>
                    <h3 className="mt-2 font-display text-2xl leading-tight">{memory.title}</h3>
                    <p className="mt-4 text-sm leading-6 text-foreground/80">{memory.excerpt}</p>
                    <dl className="mt-5 grid gap-2 text-xs text-foreground/75">
                      <div className="flex items-start gap-2">
                        <dt className="sr-only">About</dt>
                        <UsersRound
                          className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-gold"
                          aria-hidden="true"
                        />
                        <dd>{memory.person}</dd>
                      </div>
                      <div className="flex items-start gap-2">
                        <dt className="sr-only">When</dt>
                        <CalendarDays
                          className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-gold"
                          aria-hidden="true"
                        />
                        <dd>{memory.date}</dd>
                      </div>
                      <div className="flex items-start gap-2">
                        <dt className="sr-only">Where</dt>
                        <MapPin
                          className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-gold"
                          aria-hidden="true"
                        />
                        <dd>{memory.place}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </Reveal>
        </section>

        {/* Quote --------------------------------------------------------- */}
        <Reveal
          as="figure"
          effect="fade"
          className="flex gap-6 border-l-4 border-gold bg-secondary px-6 py-10 sm:px-12"
        >
          <span
            className="font-display text-6xl leading-none text-primary dark:text-gold"
            aria-hidden="true"
          >
            “
          </span>
          <div>
            <blockquote className="max-w-3xl font-display text-2xl leading-tight sm:text-4xl">
              {DEMO_QUOTE.text}
            </blockquote>
            <figcaption className="mt-5 text-xs text-foreground/75">
              — {DEMO_QUOTE.attribution}
            </figcaption>
          </div>
        </Reveal>

        {/* Next steps ---------------------------------------------------- */}
        <Reveal
          as="section"
          effect="fade"
          className="mt-16 grid gap-6 rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center"
          aria-labelledby="demo-cta-title"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Your family archive can start small
            </p>
            <Reveal
              as="h2"
              effect="wipe"
              id="demo-cta-title"
              className="mt-3 font-display text-3xl sm:text-4xl"
            >
              Begin with one question.
            </Reveal>
            <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80">
              Capture one answer today. Add the rest when you&apos;re ready. Signing in comes first;
              nothing is saved from this demo page.
            </p>
          </div>
          <Button
            asChild
            className="min-h-11 shrink-0 bg-gold text-gold-foreground hover:bg-gold/90 focus-visible:ring-2 focus-visible:ring-white"
          >
            <Link to="/auth" search={{ next: "/create-memory" }}>
              {BRAND.primaryCta} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </Reveal>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-border px-5 py-6 text-xs text-foreground/75 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span>Demo content is entirely fictional. Nothing on this page is stored.</span>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center font-semibold text-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gold"
        >
          Return to Eternal Memories
        </Link>
      </footer>
    </div>
  );
}

function MemoryVisual({ memory }: { memory: DemoMemory }) {
  const image = useInView<HTMLImageElement>();
  if (memory.kind === "photo" && memory.imageUrl) {
    return (
      <img
        ref={image.ref}
        data-inview={image.inView ? "true" : "false"}
        src={memory.imageUrl}
        alt={memory.imageAlt ?? ""}
        className="reveal-zoom h-44 w-full object-cover"
        loading="lazy"
        width={1200}
        height={800}
      />
    );
  }
  if (memory.kind === "audio") {
    return (
      <div className="grid h-44 place-items-center bg-gold/30">
        <div className="flex items-center gap-3 rounded-full bg-navy-deep/85 px-4 py-2 text-white">
          <span className="grid size-9 place-items-center rounded-full bg-gold text-gold-foreground">
            <Mic className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm">
            Voice recording · {memory.duration}
            <span className="block text-[11px] text-white/75">Transcript below (demo)</span>
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-44 place-items-center bg-secondary">
      <ChefHat className="size-10 text-primary dark:text-gold" aria-hidden="true" />
    </div>
  );
}
