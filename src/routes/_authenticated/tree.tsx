import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lifeDates } from "@/lib/format";
import { relationships, users } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RealTree } from "@/components/tree-real";
import { useActiveFamily } from "@/hooks/use-active-family";

export const Route = createFileRoute("/_authenticated/tree")({
  head: () => ({
    meta: [
      { title: "Family Tree — Eternal — Memories" },
      {
        name: "description",
        content:
          "An interactive four-generation family tree with every branch and story connected.",
      },
      { property: "og:title", content: "Family Tree — Eternal — Memories" },
      {
        property: "og:description",
        content: "Explore four generations of your family on one living canvas.",
      },
    ],
  }),
  component: TreePage,
});

const NODE_W = 168;
const NODE_H = 78;
const GEN_GAP = 150;
const H_GAP = 34;

function TreePage() {
  const { family, loading } = useActiveFamily();
  if (loading) {
    return (
      <AppLayout wide>
        <p className="py-24 text-center text-sm text-muted-foreground">Loading your family tree…</p>
      </AppLayout>
    );
  }
  if (family) {
    return (
      <AppLayout wide>
        <RealTree familyId={family.id} canEdit={family.role !== "viewer"} />
      </AppLayout>
    );
  }
  return <DemoTree />;
}

function DemoTree() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);

  const familyUsers = useMemo(() => users.filter((u) => u.familyId === familyId), [familyId]);

  const layout = useMemo(() => {
    const generations = [...new Set(familyUsers.map((u) => u.generation))].sort((a, b) => a - b);
    const positions = new Map<string, { x: number; y: number; user: User }>();
    let maxWidth = 0;
    generations.forEach((gen, gi) => {
      const row = familyUsers.filter((u) => u.generation === gen);
      const rowWidth = row.length * NODE_W + (row.length - 1) * H_GAP;
      maxWidth = Math.max(maxWidth, rowWidth);
      row.forEach((user, i) => {
        positions.set(user.id, {
          x: i * (NODE_W + H_GAP) - rowWidth / 2,
          y: gi * GEN_GAP,
          user,
        });
      });
    });
    return {
      positions,
      width: maxWidth + 120,
      height: generations.length * GEN_GAP + NODE_H,
      generations,
    };
  }, [familyUsers]);

  const edges = relationships.filter(
    (r) => layout.positions.has(r.from) && layout.positions.has(r.to),
  );

  const highlighted = selected
    ? new Set(
        edges
          .filter((e) => e.from === selected.id || e.to === selected.id)
          .flatMap((e) => [e.from, e.to]),
      )
    : null;

  return (
    <AppLayout wide>
      <PageHeader
        title="Family Tree"
        description={`${familyUsers.length} people across ${layout.generations.length} generations. Click anyone to see their story.`}
        action={
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Reset zoom"
              onClick={() => setZoom(1)}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-auto bg-linear-to-b from-muted/40 to-background p-6">
          <svg
            role="img"
            aria-label="Interactive family tree"
            viewBox={`${-layout.width / 2} -40 ${layout.width} ${layout.height + 80}`}
            style={{ width: `${100 * zoom}%` }}
            className="mx-auto h-auto min-w-[640px] transition-[width] duration-300"
          >
            {edges.map((edge) => {
              const a = layout.positions.get(edge.from)!;
              const b = layout.positions.get(edge.to)!;
              const active = highlighted?.has(edge.from) && highlighted.has(edge.to);
              if (edge.type === "spouse") {
                return (
                  <line
                    key={edge.id}
                    x1={a.x + NODE_W / 2}
                    y1={a.y + NODE_H / 2}
                    x2={b.x + NODE_W / 2}
                    y2={b.y + NODE_H / 2}
                    stroke="var(--gold)"
                    strokeWidth={active ? 3 : 2}
                    strokeDasharray="6 5"
                    opacity={highlighted && !active ? 0.15 : 0.75}
                  />
                );
              }
              const x1 = a.x + NODE_W / 2;
              const y1 = a.y + NODE_H;
              const x2 = b.x + NODE_W / 2;
              const y2 = b.y;
              const mid = (y1 + y2) / 2;
              return (
                <path
                  key={edge.id}
                  d={`M${x1} ${y1} V${mid} H${x2} V${y2}`}
                  fill="none"
                  stroke="currentColor"
                  className="text-primary dark:text-gold"
                  strokeWidth={active ? 3 : 1.6}
                  opacity={highlighted && !active ? 0.12 : 0.5}
                />
              );
            })}

            {[...layout.positions.values()].map(({ x, y, user }) => {
              const dim = highlighted && !highlighted.has(user.id) && selected?.id !== user.id;
              return (
                <g
                  key={user.id}
                  transform={`translate(${x} ${y})`}
                  className="cursor-pointer"
                  opacity={dim ? 0.3 : 1}
                  onClick={() => setSelected(user)}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    className={cn(
                      "fill-card stroke-border",
                      selected?.id === user.id && "stroke-gold",
                    )}
                    strokeWidth={selected?.id === user.id ? 3 : 1.5}
                  />
                  {user.status === "deceased" && (
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      className="fill-muted"
                      opacity={0.5}
                    />
                  )}
                  <clipPath id={`clip-${user.id}`}>
                    <circle cx={32} cy={NODE_H / 2} r={20} />
                  </clipPath>
                  <image
                    href={user.avatarUrl}
                    x={12}
                    y={NODE_H / 2 - 20}
                    width={40}
                    height={40}
                    clipPath={`url(#clip-${user.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <text x={62} y={30} className="fill-foreground text-[12px] font-semibold">
                    {user.firstName} {user.lastName.split("-")[0]}
                  </text>
                  <text x={62} y={46} className="fill-muted-foreground text-[10px]">
                    {lifeDates(user.birthDate, user.deathDate)}
                  </text>
                  <text x={62} y={61} className="fill-muted-foreground text-[10px]">
                    {user.relationshipToViewer}
                  </text>
                </g>
              );
            })}
          </svg>
        </Card>

        <aside className="space-y-4">
          {selected ? (
            <Card className="p-5">
              <img
                src={selected.avatarUrl}
                alt={selected.displayName}
                className="size-20 rounded-full object-cover ring-2 ring-gold/40"
              />
              <h2 className="mt-3 font-display text-xl font-semibold">{selected.displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {lifeDates(selected.birthDate, selected.deathDate)} ·{" "}
                {selected.relationshipToViewer}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary">Generation {selected.generation}</Badge>
                <Badge variant={selected.status === "deceased" ? "outline" : "secondary"}>
                  {selected.status === "deceased" ? "In memoriam" : "Living"}
                </Badge>
              </div>
              <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-foreground/85">
                {selected.bio}
              </p>
              <Link to="/profile/$userId" params={{ userId: selected.id }}>
                <Button className="mt-4 w-full">View full profile</Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="font-display text-lg font-semibold">Select a family member</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Click any card in the tree to see their life dates, relationships and story.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Legend</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-8 bg-gold" /> Marriage
              </li>
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-8 bg-primary dark:bg-gold/60" /> Parent → child
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded bg-muted" /> Passed away
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </AppLayout>
  );
}
