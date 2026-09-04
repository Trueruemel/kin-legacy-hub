import { RealRecipes } from "@/components/recipes-real";
import { useActiveFamily } from "@/hooks/use-active-family";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Plus, Printer, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { recipes as allRecipes, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import type { Recipe } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/recipes")({
  head: () => ({
    meta: [
      { title: "Family Recipes — Eternal — Memories" },
      { name: "description", content: "Handwritten family recipes with the stories behind each one." },
      { property: "og:title", content: "Family Recipes — Eternal — Memories" },
      { property: "og:description", content: "The dishes that make your family a family, written down at last." },
    ],
  }),
  component: RecipesPage,
});

function RecipesPage() {
  const { family, loading } = useActiveFamily();
  if (loading) {
    return (
      <AppLayout>
        <p className="py-24 text-center text-sm text-muted-foreground">Opening the family kitchen…</p>
      </AppLayout>
    );
  }
  if (family) {
    return (
      <AppLayout>
        <RealRecipes familyId={family.id} />
      </AppLayout>
    );
  }
  return <DemoRecipesPage />;
}


function DemoRecipesPage() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const recipes = allRecipes.filter((r) => r.familyId === familyId);
  const [open, setOpen] = useState<Recipe | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Family Recipes"
        description="Every card, every disputed measurement, every origin story."
        action={
          <Button onClick={() => toast.success("Recipe draft started")}>
            <Plus className="size-4" /> Add recipe
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => {
          const author = userById(recipe.authorId);
          return (
            <Card
              key={recipe.id}
              className="card-lift cursor-pointer overflow-hidden p-0"
              onClick={() => setOpen(recipe)}
            >
              <img src={recipe.photoUrl} alt={recipe.title} loading="lazy" className="aspect-4/3 w-full object-cover" />
              <div className="p-4">
                <h2 className="font-display text-lg font-semibold">{recipe.title}</h2>
                <p className="text-xs text-muted-foreground">From {author.displayName}</p>
                <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{recipe.originStory}</p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="secondary"><Clock className="mr-1 size-3" />{recipe.minutes} min</Badge>
                  <Badge variant="secondary"><Users className="mr-1 size-3" />Serves {recipe.servings}</Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{open.title}</DialogTitle>
              </DialogHeader>
              <img src={open.photoUrl} alt={open.title} className="aspect-16/9 w-full rounded-lg object-cover" />
              <p className="rounded-lg bg-muted/60 p-4 text-sm italic leading-relaxed text-foreground/85">
                {open.originStory}
              </p>
              <div className="grid gap-6 sm:grid-cols-[14rem_1fr]">
                <div>
                  <h3 className="font-display text-lg font-semibold">Ingredients</h3>
                  <Separator className="my-2" />
                  <ul className="space-y-1.5 text-sm text-foreground/90">
                    {open.ingredients.map((ing) => (
                      <li key={ing}>· {ing}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Method</h3>
                  <Separator className="my-2" />
                  <ol className="space-y-2 text-sm leading-relaxed text-foreground/90">
                    {open.steps.map((step, i) => (
                      <li key={step} className="flex gap-2">
                        <span className="font-display font-semibold text-gold">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <Button variant="outline" onClick={() => toast.success("Recipe card sent to printer")}>
                <Printer className="size-4" /> Print recipe card
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
