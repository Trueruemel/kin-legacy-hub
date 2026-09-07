import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { FamilyInvites } from "@/components/family-invites";
import { MemberVisibility } from "@/components/member-visibility";
import { useActiveFamily } from "@/hooks/use-active-family";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lifeDates } from "@/lib/format";
import { users } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFamilyMembers } from "@/lib/members.functions";

const generationLabels: Record<number, string> = {
  1: "First generation",
  2: "Second generation",
  3: "Third generation",
  4: "Fourth generation",
};

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "Family Members — Eternal — Memories" },
      {
        name: "description",
        content: "Everyone in the family, grouped by generation, with roles and life dates.",
      },
      { property: "og:title", content: "Family Members — Eternal — Memories" },
      { property: "og:description", content: "Browse the whole family, generation by generation." },
    ],
  }),
  component: MembersPage,
});

function RealMembers({ familyId }: { familyId: string }) {
  const load = useServerFn(listFamilyMembers);
  const members = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => load({ data: { familyId } }),
  });
  const rows = members.data ?? [];

  return (
    <>
      <PageHeader
        title="Family Members"
        description={`${rows.length} ${rows.length === 1 ? "person has" : "people have"} joined this family archive.`}
      />
      {members.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((member) => (
            <Card key={member.userId} className="flex h-full items-start gap-3 p-4">
              <Avatar className="size-14 ring-2 ring-gold/25">
                {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold leading-tight">{member.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="capitalize">
                    {member.role}
                  </Badge>
                  {member.isMe && <Badge variant="outline">You</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function MembersPage() {
  const { family } = useActiveFamily();

  return (
    <AppLayout>
      {family && (
        <FamilyInvites
          familyId={family.id}
          familyName={family.name}
          canAdmin={family.role === "owner" || family.role === "steward"}
        />
      )}

      {family ? (
        <>
          <RealMembers familyId={family.id} />
          <div className="mt-10">
            <MemberVisibility
              familyId={family.id}
              canAdmin={family.role === "owner" || family.role === "steward"}
            />
          </div>
        </>
      ) : (
        <DemoMembers />
      )}
    </AppLayout>
  );
}

function LegacyMembers() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const members = users
    .filter((u) => u.familyId === familyId)
    .filter(
      (u) =>
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.relationshipToViewer.toLowerCase().includes(q),
    );
  const generations = [...new Set(members.map((m) => m.generation))].sort((a, b) => a - b);

  return (
    <>
      <PageHeader
        title="Family Members"
        description={`${members.length} people across ${generations.length} generations.`}
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or relation"
          aria-label="Search members"
          className="pl-9"
        />
      </div>

      <div className="space-y-10">
        {generations.map((gen) => (
          <section key={gen}>
            <h2 className="mb-3 font-display text-xl font-semibold text-primary dark:text-gold">
              {generationLabels[gen] ?? `Generation ${gen}`}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members
                .filter((m) => m.generation === gen)
                .map((member) => (
                  <Link key={member.id} to="/profile/$userId" params={{ userId: member.id }}>
                    <Card className="card-lift flex h-full items-start gap-3 p-4">
                      <Avatar className="size-14 ring-2 ring-gold/25">
                        <AvatarImage src={member.avatarUrl} alt="" />
                        <AvatarFallback>{member.firstName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-display text-lg font-semibold leading-tight">
                          {member.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.relationshipToViewer}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lifeDates(member.birthDate, member.deathDate)}
                        </p>
                        {member.location && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {member.location}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="capitalize">
                            {member.role.replace("_", " ")}
                          </Badge>
                          {member.status !== "living" && (
                            <Badge variant="outline" className="capitalize">
                              {member.status.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

const DemoMembers = LegacyMembers;
