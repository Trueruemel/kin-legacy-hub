import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Areas, MemberVisibilityRow } from "@/lib/sharing.functions";
import { listMemberVisibility, setMemberVisibility } from "@/lib/sharing.functions";

const AREAS: { key: keyof Areas; label: string }[] = [
  { key: "tree", label: "Tree" },
  { key: "photos", label: "Photos" },
  { key: "events", label: "Events" },
];

/** Owners and stewards decide what each relative can see. */
export function MemberVisibility({ familyId, canAdmin }: { familyId: string; canAdmin: boolean }) {
  const load = useServerFn(listMemberVisibility);
  const save = useServerFn(setMemberVisibility);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");

  const rows = useQuery({
    queryKey: ["member-visibility", familyId],
    queryFn: () => load({ data: { familyId } }),
  });

  const update = useMutation({
    mutationFn: (input: { memberUserId: string; areas: Areas }) =>
      save({ data: { familyId, ...input } }),
    onSuccess: async () => {
      setStatus("Sharing settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["member-visibility", familyId] });
    },
    onError: (error: unknown) =>
      setStatus(error instanceof Error ? error.message : "Could not save the sharing settings."),
  });

  const members: MemberVisibilityRow[] = rows.data ?? [];

  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-semibold text-primary dark:text-gold">
        Who can see what
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {canAdmin
          ? "Switch the family tree, photos and calendar on or off for each relative. Owners and stewards always see everything."
          : "This is what each relative can see. Only an owner or steward can change it."}
      </p>

      {rows.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading sharing settings…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <Card key={member.userId} className="flex flex-wrap items-center gap-4 p-4">
              <Avatar className="size-10 ring-2 ring-gold/25">
                {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
                <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{member.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="capitalize">
                    {member.role}
                  </Badge>
                  {member.isMe && <Badge variant="outline">You</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                {AREAS.map((area) => {
                  const id = `vis-${member.userId}-${area.key}`;
                  return (
                    <div key={area.key} className="flex min-h-11 items-center gap-2">
                      <Switch
                        id={id}
                        checked={member.areas[area.key]}
                        disabled={!canAdmin || member.locked || update.isPending}
                        onCheckedChange={(checked) =>
                          update.mutate({
                            memberUserId: member.userId,
                            areas: { ...member.areas, [area.key]: checked },
                          })
                        }
                      />
                      <Label htmlFor={id} className="text-xs">
                        {area.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">No relatives have joined yet.</p>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
        {status}
      </p>
    </section>
  );
}
