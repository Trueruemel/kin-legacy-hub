import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFamily, ensureProfile, listMyFamilies } from "@/lib/family.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  // The guided wizard replaces the old single-step form.
  beforeLoad: () => {
    throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Create your family archive — Eternal — Memories" },
      {
        name: "description",
        content:
          "Name your family and open a private, permanent archive for photos, stories and legacy messages.",
      },
      { property: "og:title", content: "Create your family archive" },
      {
        property: "og:description",
        content: "Set up the private space where your family's history lives.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const ensure = useServerFn(ensureProfile);
  const list = useServerFn(listMyFamilies);
  const create = useServerFn(createFamily);

  const families = useQuery({
    queryKey: ["my-families"],
    queryFn: async () => {
      await ensure({ data: {} });
      return list();
    },
  });

  const mutation = useMutation({
    mutationFn: (input: { name: string; description?: string }) => create({ data: input }),
    onSuccess: () => {
      toast.success("Your family archive is ready.");
      void navigate({ to: "/feed" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Create your family archive</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything you add lives inside this family and is visible only to the relatives you invite.
      </p>

      {families.data && families.data.length > 0 && (
        <Card className="mt-6 p-4">
          <p className="text-sm font-medium">You already belong to:</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {families.data.map((f) => (
              <li key={f.id}>
                {f.name} · {f.role}
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full" variant="outline" onClick={() => void navigate({ to: "/feed" })}>
            Open the archive
          </Button>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ name, ...(description ? { description } : {}) });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="family-name">Family name</Label>
            <Input
              id="family-name"
              required
              minLength={2}
              placeholder="The Johnson Family"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="family-desc">A line about your family (optional)</Label>
            <Textarea
              id="family-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create family archive"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
