import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useActiveFamily } from "@/hooks/use-active-family";
import { supabase } from "@/integrations/supabase/client";
import { listFamilyMembers } from "@/lib/members.functions";
import {
  getMyProfile,
  removeMember,
  updateFamily,
  updateMemberRole,
  updateMyProfile,
} from "@/lib/profile.functions";
import { useAppStore } from "@/lib/store";

const ROLES = ["owner", "steward", "member", "viewer"] as const;

export function RealSettings() {
  const queryClient = useQueryClient();
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const { family } = useActiveFamily();

  const loadProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const saveFamily = useServerFn(updateFamily);
  const setRole = useServerFn(updateMemberRole);
  const kick = useServerFn(removeMember);
  const members = useServerFn(listFamilyMembers);

  const profile = useQuery({ queryKey: ["my-profile"], queryFn: () => loadProfile() });
  const memberList = useQuery({
    queryKey: ["members", family?.id],
    queryFn: () => members({ data: { familyId: family!.id } }),
    enabled: !!family,
  });

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.displayName ?? "");
      setEmail(profile.data.email ?? "");
    }
  }, [profile.data]);

  useEffect(() => {
    if (family) setFamilyName(family.name);
  }, [family]);

  const profileMutation = useMutation({
    mutationFn: () => saveProfile({ data: { displayName: displayName.trim() } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profile saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Check both inboxes to confirm your new email address."),
    onError: (e: Error) => toast.error(e.message),
  });

  const familyMutation = useMutation({
    mutationFn: () => saveFamily({ data: { familyId: family!.id, name: familyName.trim() } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-families"] });
      toast.success("Family archive renamed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: (typeof ROLES)[number] }) =>
      setRole({ data: { familyId: family!.id, ...vars } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", family?.id] });
      toast.success("Role updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => kick({ data: { familyId: family!.id, userId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", family?.id] });
      toast.success("Member removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canAdmin = family?.role === "owner" || family?.role === "steward";

  return (
    <>
      <PageHeader title="Settings" description="Your profile, sign-in email and family archive." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold">Your profile</h2>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="set-name">Display name</Label>
              <Input
                id="set-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your family knows you"
              />
            </div>
            <Button
              disabled={profileMutation.isPending || displayName.trim().length < 1}
              onClick={() => profileMutation.mutate()}
            >
              {profileMutation.isPending ? "Saving…" : "Save profile"}
            </Button>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="set-email">Sign-in email</Label>
              <Input
                id="set-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Changing this sends a confirmation link to both your old and new address.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={
                emailMutation.isPending || !email.includes("@") || email === (profile.data?.email ?? "")
              }
              onClick={() => emailMutation.mutate()}
            >
              {emailMutation.isPending ? "Sending…" : "Change email"}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">Appearance</h2>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                <span>{theme === "dark" ? "Evening (dark)" : "Daylight (light)"}</span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                aria-label="Toggle dark mode"
              />
            </div>
          </Card>

          {family && (
            <Card className="p-6">
              <h2 className="font-display text-xl font-semibold">Family archive</h2>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="set-family">Name</Label>
                  <Input
                    id="set-family"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    disabled={!canAdmin}
                  />
                </div>
                {canAdmin && (
                  <Button
                    variant="outline"
                    disabled={familyMutation.isPending || familyName.trim().length < 2}
                    onClick={() => familyMutation.mutate()}
                  >
                    {familyMutation.isPending ? "Saving…" : "Rename archive"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  You are {family.role} of this archive.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {family && (
        <Card className="mt-6 p-6">
          <h2 className="font-display text-xl font-semibold">Members</h2>
          <Separator className="my-4" />
          {memberList.isLoading && <p className="text-sm text-muted-foreground">Loading members…</p>}
          <div className="divide-y divide-border">
            {(memberList.data ?? []).map((member) => (
              <div key={member.userId} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1 font-medium">
                  {member.name}{member.isMe ? " (you)" : ""}
                </span>
                {canAdmin ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      roleMutation.mutate({
                        userId: member.userId,
                        role: value as (typeof ROLES)[number],
                      })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                )}
                {canAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(member.userId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
