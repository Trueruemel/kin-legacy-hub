import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Plus, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addPerson, addRelationship, listTree, setPersonPhoto, type TreePerson } from "@/lib/tree.functions";
import { PhotoCropper } from "@/components/photo-cropper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { lifeDates } from "@/lib/format";

function fullName(p: TreePerson) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function RealTree({ familyId, canEdit }: { familyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listTree);
  const create = useServerFn(addPerson);
  const link = useServerFn(addRelationship);
  const savePhoto = useServerFn(setPersonPhoto);
  const [photoTarget, setPhotoTarget] = useState<TreePerson | null>(null);
  const [pendingPortrait, setPendingPortrait] = useState<File | null>(null);
  const portraitInput = useRef<HTMLInputElement | null>(null);

  const portraitMutation = useMutation({
    mutationFn: async ({ person, file }: { person: TreePerson; file: File }) => {
      const path = `${familyId}/portraits/${person.id}-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error(error.message);
      return savePhoto({ data: { personId: person.id, storagePath: path, mime: "image/jpeg" } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tree", familyId] });
      toast.success("Portrait updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tree = useQuery({ queryKey: ["tree", familyId], queryFn: () => list({ data: { familyId } }) });
  const persons = tree.data?.persons ?? [];
  const relationships = tree.data?.relationships ?? [];

  const [personOpen, setPersonOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    deathDate: "",
    birthPlace: "",
    bio: "",
  });
  const [linkForm, setLinkForm] = useState({ from: "", to: "", type: "parent" as "parent" | "partner" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tree", familyId] });

  const personMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          familyId,
          firstName: form.firstName.trim(),
          ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
          ...(form.birthDate ? { birthDate: form.birthDate } : {}),
          ...(form.deathDate ? { deathDate: form.deathDate } : {}),
          ...(form.birthPlace.trim() ? { birthPlace: form.birthPlace.trim() } : {}),
          ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
        },
      }),
    onSuccess: () => {
      setPersonOpen(false);
      setForm({ firstName: "", lastName: "", birthDate: "", deathDate: "", birthPlace: "", bio: "" });
      void invalidate();
      toast.success("Added to your family tree.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkMutation = useMutation({
    mutationFn: () =>
      link({
        data: { familyId, fromPersonId: linkForm.from, toPersonId: linkForm.to, type: linkForm.type },
      }),
    onSuccess: () => {
      setLinkOpen(false);
      setLinkForm({ from: "", to: "", type: "parent" });
      void invalidate();
      toast.success("Relationship saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const childrenOf = (id: string) =>
    relationships
      .filter((r) => r.type === "parent" && r.fromPersonId === id)
      .map((r) => persons.find((p) => p.id === r.toPersonId))
      .filter((p): p is TreePerson => !!p);

  const partnersOf = (id: string) =>
    relationships
      .filter((r) => r.type === "partner" && (r.fromPersonId === id || r.toPersonId === id))
      .map((r) => persons.find((p) => p.id === (r.fromPersonId === id ? r.toPersonId : r.fromPersonId)))
      .filter((p): p is TreePerson => !!p);

  const roots = persons.filter(
    (p) => !relationships.some((r) => r.type === "parent" && r.toPersonId === p.id),
  );

  const renderPerson = (person: TreePerson, depth: number): React.ReactNode => {
    const kids = childrenOf(person.id);
    return (
      <li key={person.id} className="space-y-2">
        <Card className="card-lift p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar className="size-10 border border-gold/30">
              {person.photoUrl && <AvatarImage src={person.photoUrl} alt={fullName(person)} />}
              <AvatarFallback>{fullName(person).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="font-display text-lg font-semibold">{fullName(person)}</p>
            <Badge variant="secondary">{lifeDates(person.birthDate ?? "", person.deathDate ?? undefined)}</Badge>
            {partnersOf(person.id).map((partner) => (
              <Badge key={partner.id} variant="outline">
                with {fullName(partner)}
              </Badge>
            ))}
          </div>
          {person.birthPlace && (
            <p className="mt-1 text-xs text-muted-foreground">Born in {person.birthPlace}</p>
          )}
          {person.bio && <p className="mt-2 text-sm text-muted-foreground">{person.bio}</p>}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 px-0"
              disabled={portraitMutation.isPending}
              onClick={() => {
                setPhotoTarget(person);
                portraitInput.current?.click();
              }}
            >
              {person.photoUrl ? "Replace portrait" : "Add portrait"}
            </Button>
          )}
        </Card>
        {kids.length > 0 && (
          <ul className="ml-6 space-y-2 border-l border-gold/30 pl-4">
            {kids.map((child) => renderPerson(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <input
        ref={portraitInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setPendingPortrait(file);
        }}
      />
      <PhotoCropper
        file={pendingPortrait}
        open={pendingPortrait !== null}
        aspect={1}
        title="Crop this portrait"
        onCancel={() => {
          setPendingPortrait(null);
          setPhotoTarget(null);
        }}
        onCropped={(cropped) => {
          setPendingPortrait(null);
          if (photoTarget) portraitMutation.mutate({ person: photoTarget, file: cropped });
          setPhotoTarget(null);
        }}
      />
      <PageHeader
        title="Family Tree"
        description={
          tree.isLoading
            ? "Loading your family tree…"
            : `${persons.length} people, ${relationships.length} recorded relationships.`
        }
      />

      {canEdit && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPersonOpen(true)}>
            <UserPlus className="size-4" /> Add a person
          </Button>
          <Button size="sm" variant="outline" disabled={persons.length < 2} onClick={() => setLinkOpen(true)}>
            <Link2 className="size-4" /> Connect two people
          </Button>
        </div>
      )}

      {!tree.isLoading && persons.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Your tree is still empty. Start with the oldest generation you know.
        </Card>
      )}

      <ul className="space-y-3">{roots.map((p) => renderPerson(p, 0))}</ul>

      <Dialog open={personOpen} onOpenChange={setPersonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add a person</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tp-first">First name</Label>
                <Input
                  id="tp-first"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="tp-last">Last name</Label>
                <Input
                  id="tp-last"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="tp-birth">Born</Label>
                <Input
                  id="tp-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="tp-death">Died (optional)</Label>
                <Input
                  id="tp-death"
                  type="date"
                  value={form.deathDate}
                  onChange={(e) => setForm((f) => ({ ...f, deathDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tp-place">Birthplace</Label>
              <Input
                id="tp-place"
                value={form.birthPlace}
                onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tp-bio">A few words</Label>
              <Textarea
                id="tp-bio"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.firstName.trim() || personMutation.isPending}
              onClick={() => personMutation.mutate()}
            >
              <Plus className="size-4" /> Add person
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Connect two people</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="tr-type">Relationship</Label>
              <select
                id="tr-type"
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={linkForm.type}
                onChange={(e) =>
                  setLinkForm((f) => ({ ...f, type: e.target.value as "parent" | "partner" }))
                }
              >
                <option value="parent">Parent → child</option>
                <option value="partner">Partners</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tr-from">{linkForm.type === "parent" ? "Parent" : "Person"}</Label>
              <select
                id="tr-from"
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={linkForm.from}
                onChange={(e) => setLinkForm((f) => ({ ...f, from: e.target.value }))}
              >
                <option value="">Choose…</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="tr-to">{linkForm.type === "parent" ? "Child" : "Partner"}</Label>
              <select
                id="tr-to"
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={linkForm.to}
                onChange={(e) => setLinkForm((f) => ({ ...f, to: e.target.value }))}
              >
                <option value="">Choose…</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!linkForm.from || !linkForm.to || linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
            >
              Save relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
