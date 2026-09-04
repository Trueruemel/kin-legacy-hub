import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Images, Plus, Send, Users2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PhotoCropper } from "@/components/photo-cropper";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { addMediaItem } from "@/lib/gallery.functions";
import { createFamily, ensureProfile, listMyFamilies } from "@/lib/family.functions";
import { createInvite } from "@/lib/invites.functions";
import { addPerson } from "@/lib/tree.functions";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({
    meta: [
      { title: "Family setup — Eternal — Memories" },
      {
        name: "description",
        content:
          "Create your family archive in three steps: name the family, invite relatives, add the first people and photos.",
      },
      { property: "og:title", content: "Family setup — Eternal — Memories" },
      {
        property: "og:description",
        content: "Three guided steps to open your family's private archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetupWizard;
});

const STEPS = ["Your family", "People & invites", "First photos"] as const;

function SetupWizard() {
  const navigate = useNavigate();
  const ensure = useServerFn(ensureProfile);
  const list = useServerFn(listMyFamilies);
  const create = useServerFn(createFamily);
  const invite = useServerFn(createInvite);
  const person = useServerFn(addPerson);
  const media = useServerFn(addMediaItem);

  const [step, setStep] = useState(0);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [description, setDescription] = useState("");

  const profile = useQuery({
    queryKey: ["setup-profile"],
    queryFn: async () => {
      const me = await ensure({ data: {} });
      const families = await list();
      return { me, families };
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: { name: familyName.trim(), ...(description.trim() ? { description: description.trim() } : {}) },
      }),
    onSuccess: (result) => {
      setFamilyId(result.id);
      if (typeof window !== "undefined") window.localStorage.setItem("em.activeFamilyId", result.id);
      setStep(1);
      toast.success("Your family archive is open. Now bring your people in.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Step 2 — invites
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"steward" | "member" | "viewer">("member");
  const [invited, setInvited] = useState<{ email: string; link: string }[]>([]);
  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { familyId: familyId!, email: email.trim(), role } }),
    onSuccess: (result) => {
      const link = `${window.location.origin}/invite/${result.token}`;
      setInvited((prev) => [{ email: result.email, link }, ...prev]);
      setEmail("");
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      toast.success("Invite created — the link is copied to your clipboard.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Step 2 — first people in the tree
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const personMutation = useMutation({
    mutationFn: () =>
      person({
        data: {
          familyId: familyId!,
          firstName: firstName.trim(),
          ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
          ...(birthDate ? { birthDate } : {}),
        },
      }),
    onSuccess: () => {
      setPeople((prev) => [[firstName, lastName].filter(Boolean).join(" "), ...prev]);
      setFirstName("");
      setLastName("");
      setBirthDate("");
      toast.success("Added to your family tree.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Step 3 — photos
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const upload = async (file: File) => {
    if (!familyId) return;
    setUploading(true);
    try {
      const id = crypto.randomUUID();
      const path = `${familyId}/gallery/${id}/${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (error) throw new Error(error.message);
      await media({
        data: {
          familyId,
          caption: file.name.replace(/\.[a-z0-9]+$/i, ""),
          storagePath: path,
          mime: file.type || "image/jpeg",
          uploadedByName: profile.data?.me.displayName ?? "Family member",
        },
      });
      setPhotos((prev) => [file.name, ...prev]);
      toast.success("Photo archived.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const existing = profile.data?.families ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-3xl font-semibold">Set up your family archive</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Three steps: name your family, bring your relatives in, and archive the first photos. Nobody sees
        the tree before you are ready.
      </p>

      <ol className="mt-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <Badge variant={i === step ? "default" : i < step ? "secondary" : "outline"}>
              {i < step ? <Check className="mr-1 size-3" /> : null}
              {i + 1}. {label}
            </Badge>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="mt-6 p-6">
          {existing.length > 0 && (
            <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              You already belong to {existing.map((f) => f.name).join(", ")}. Creating another family opens a
              second, separate archive.
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="setup-name">Family name</Label>
              <Input
                id="setup-name"
                required
                minLength={2}
                placeholder="The Johnson Family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-desc">A line about your family (optional)</Label>
              <Textarea
                id="setup-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create family & continue"}
            </Button>
          </form>
        </Card>
      )}

      {step === 1 && familyId && (
        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Send className="size-4 text-gold" /> Invite relatives
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each invite is bound to that email address and expires on its own.
            </p>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
            >
              <Input
                type="email"
                required
                placeholder="aunt@example.com"
                className="min-w-52 flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="steward">Steward</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={inviteMutation.isPending}>
                Invite
              </Button>
            </form>
            {invited.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {invited.map((i) => (
                  <li key={i.email} className="rounded-lg border border-border p-3">
                    <span className="font-medium">{i.email}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{i.link}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Users2 className="size-4 text-gold" /> Add the first people
            </h2>
            <form
              className="mt-4 grid gap-2 sm:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                personMutation.mutate();
              }}
            >
              <Input
                required
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <Button type="submit" disabled={personMutation.isPending}>
                <Plus className="size-4" /> Add
              </Button>
            </form>
            {people.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">In the tree: {people.join(", ")}</p>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)}>Continue to photos</Button>
          </div>
        </div>
      )}

      {step === 2 && familyId && (
        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Images className="size-4 text-gold" /> Archive the first photos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Photos are stored privately — only your family can open them.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPending(file);
              }}
            />
            <Button className="mt-4" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "Uploading…" : "Choose a photo"}
            </Button>
            {photos.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Archived: {photos.join(", ")}</p>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => void navigate({ to: "/dashboard" })}>Open our archive</Button>
          </div>
        </div>
      )}

      <PhotoCropper
        file={pending}
        open={!!pending}
        aspect={4 / 3}
        title="Crop this photo"
        onCancel={() => setPending(null)}
        onCropped={(cropped) => {
          setPending(null);
          void upload(cropped);
        }}
      />
    </div>
  );
}
