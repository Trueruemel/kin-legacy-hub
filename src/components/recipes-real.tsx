import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChefHat, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { PhotoCropper } from "@/components/photo-cropper";
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
import { supabase } from "@/integrations/supabase/client";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/file-upload";
import { createRecipe, deleteRecipe, listRecipes } from "@/lib/recipes.functions";

export function RealRecipes({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listRecipes);
  const create = useServerFn(createRecipe);
  const remove = useServerFn(deleteRecipe);

  const [open, setOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    attributedTo: "",
    ingredients: "",
    instructions: "",
  });

  const recipes = useQuery({
    queryKey: ["recipes", familyId],
    queryFn: () => list({ data: { familyId } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["recipes", familyId] });

  const createMutation = useMutation({
    mutationFn: async () => {
      let storagePath: string | undefined;
      if (photo) {
        if (photo.size > MAX_UPLOAD_BYTES) {
          throw new Error(`Photos must be under ${formatBytes(MAX_UPLOAD_BYTES)}.`);
        }
        const path = `${familyId}/recipes/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("memories")
          .upload(path, photo, { contentType: photo.type, upsert: false });
        if (error) throw new Error(error.message);
        storagePath = path;
      }
      return create({
        data: {
          familyId,
          title: form.title.trim(),
          ingredients: form.ingredients
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          instructions: form.instructions
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(form.attributedTo.trim() ? { attributedTo: form.attributedTo.trim() } : {}),
          ...(storagePath ? { storagePath } : {}),
        },
      });
    },
    onSuccess: () => {
      setOpen(false);
      setPhoto(null);
      setForm({ title: "", description: "", attributedTo: "", ingredients: "", instructions: "" });
      void invalidate();
      toast.success("Recipe saved to the family kitchen.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (recipeId: string) => remove({ data: { familyId, recipeId } }),
    onSuccess: () => {
      void invalidate();
      toast.success("Recipe removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = recipes.data ?? [];

  return (
    <>
      <PageHeader
        title="Family Recipes"
        description="The dishes that made your kitchen smell like home — written down before they're lost."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add recipe
          </Button>
        }
      />

      {recipes.isLoading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading recipes…</Card>
      )}

      {!recipes.isLoading && rows.length === 0 && (
        <Card className="p-10 text-center">
          <ChefHat className="mx-auto size-8 text-gold" />
          <p className="mt-3 text-sm text-muted-foreground">
            No recipes yet. Start with the one everyone asks for.
          </p>
        </Card>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden p-0">
            {recipe.photoUrl ? (
              <img
                src={recipe.photoUrl}
                alt={recipe.title}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                <ChefHat className="size-8 text-muted-foreground" />
              </div>
            )}
            <div className="p-5">
              <h3 className="font-display text-lg font-semibold">{recipe.title}</h3>
              {recipe.attributedTo && (
                <p className="mt-1 text-xs text-gold">from {recipe.attributedTo}</p>
              )}
              {recipe.description && (
                <p className="mt-2 text-sm text-muted-foreground">{recipe.description}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {recipe.ingredients.length} ingredients · {recipe.instructions.length} steps
              </p>
              {recipe.ingredients.length > 0 && (
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground/85">
                  {recipe.ingredients.slice(0, 5).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(recipe.id)}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <PhotoCropper
        file={pendingFile}
        open={pendingFile !== null}
        aspect={4 / 3}
        title="Crop the recipe photo"
        onCancel={() => setPendingFile(null)}
        onCropped={(cropped) => {
          setPhoto(cropped);
          setPendingFile(null);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a family recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="rc-title">Dish</Label>
              <Input
                id="rc-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Grandma's almond cake"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-attributed">Whose recipe is it?</Label>
              <Input
                id="rc-attributed"
                value={form.attributedTo}
                onChange={(e) => setForm({ ...form, attributedTo: e.target.value })}
                placeholder="Maria, my grandmother"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-description">The story behind it</Label>
              <Textarea
                id="rc-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-20"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-ingredients">Ingredients (one per line)</Label>
              <Textarea
                id="rc-ingredients"
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                className="min-h-28 font-mono text-sm"
                placeholder={"200g ground almonds\n4 eggs\n180g sugar"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-instructions">Steps (one per line)</Label>
              <Textarea
                id="rc-instructions"
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="min-h-28 font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-photo">Photo</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="rc-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setPendingFile(file);
                    e.target.value = "";
                  }}
                />
                {photo && (
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-gold">
                    <ImagePlus className="size-3.5" /> cropped
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || form.title.trim().length < 2}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Save recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
