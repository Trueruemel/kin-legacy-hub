import { RealSettings } from "@/components/settings-real";
import { useActiveFamily } from "@/hooks/use-active-family";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, HardDrive, Moon, Shield, Sun } from "lucide-react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { families, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Eternal — Memories" },
      {
        name: "description",
        content: "Manage your profile, family plan, privacy and notification preferences.",
      },
      { property: "og:title", content: "Settings — Eternal — Memories" },
      {
        property: "og:description",
        content: "Profile, plan, storage and privacy controls for your family archive.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { family, loading } = useActiveFamily();
  if (loading) {
    return (
      <AppLayout>
        <p className="py-24 text-center text-sm text-muted-foreground">Loading your settings…</p>
      </AppLayout>
    );
  }
  if (family) {
    return (
      <AppLayout>
        <RealSettings />
      </AppLayout>
    );
  }
  return <DemoSettingsPage />;
}

function DemoSettingsPage() {
  const user = userById(useAppStore((s) => s.currentUserId));
  const familyId = useAppStore((s) => s.activeFamilyId);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const family = families.find((f) => f.id === familyId)!;
  const storagePct = Math.round((family.storageUsedGB / family.storageQuotaGB) * 100);

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Demo settings — changes are local to this session."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold">Your profile</h2>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" defaultValue={user.displayName} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user.email} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" defaultValue={user.bio} className="min-h-24" />
            </div>
            <Button onClick={() => toast.success("Profile saved")}>Save changes</Button>
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

          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">Family plan</h2>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{family.name}</p>
              <Badge className="capitalize">
                <Crown className="mr-1 size-3" />
                {family.subscription}
              </Badge>
            </div>
            <div className="mt-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm">
                <HardDrive className="size-4" /> {family.storageUsedGB} GB of{" "}
                {family.storageQuotaGB} GB used
              </p>
              <Progress value={storagePct} />
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/upgrade">Add extra storage</Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">Privacy &amp; notifications</h2>
            <Separator className="my-4" />
            <div className="space-y-4 text-sm">
              {[
                ["Invite-only family archive", true],
                ["Email me about new memories", true],
                ["Birthday reminders", true],
                ["Allow relatives to tag me", false],
              ].map(([label, on]) => (
                <div key={label as string} className="flex items-center justify-between gap-4">
                  <span>{label as string}</span>
                  <Switch defaultChecked={on as boolean} aria-label={label as string} />
                </div>
              ))}
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="size-3" /> Prototype data — nothing leaves this browser.
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
