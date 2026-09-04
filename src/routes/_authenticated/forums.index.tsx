import { RealForums } from "@/components/forums-real";
import { useActiveFamily } from "@/hooks/use-active-family";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageSquare, Search, Sparkles, Utensils } from "lucide-react";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/format";
import { forumCategories, forumThreads, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/forums/")({
  head: () => ({
    meta: [
      { title: "Family Forums — Eternal — Memories" },
      { name: "description", content: "Recipes, traditions, genealogy research and advice from the elders." },
      { property: "og:title", content: "Family Forums — Eternal — Memories" },
      { property: "og:description", content: "The family knowledge base: recipes, traditions, research and advice." },
    ],
  }),
  component: ForumsPage,
});

const icons = { utensils: Utensils, sparkles: Sparkles, search: Search, heart: Heart } as const;

function ForumsPage() {
  const { family, loading } = useActiveFamily();
  if (loading) {
    return (
      <AppLayout>
        <p className="py-24 text-center text-sm text-muted-foreground">Loading conversations…</p>
      </AppLayout>
    );
  }
  if (family) {
    return (
      <AppLayout>
        <RealForums familyId={family.id} />
      </AppLayout>
    );
  }
  return <DemoForumsPage />;
}


function DemoForumsPage() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const categories = forumCategories.filter((c) => c.familyId === familyId);

  return (
    <AppLayout>
      <PageHeader
        title="Family Forums"
        description="Where the knowledge lives: recipes, traditions, research and hard-won advice."
      />

      <div className="space-y-8">
        {categories.map((category) => {
          const Icon = icons[category.icon];
          const threads = forumThreads.filter((t) => t.categoryId === category.id);
          return (
            <section key={category.id}>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold">{category.name}</h2>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>
              <Card className="divide-y divide-border p-0">
                {threads.map((thread) => {
                  const author = userById(thread.authorId);
                  const last = thread.posts.at(-1)!;
                  return (
                    <Link
                      key={thread.id}
                      to="/forums/$threadId"
                      params={{ threadId: thread.id }}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-accent"
                    >
                      <Avatar className="size-9">
                        <AvatarImage src={author.avatarUrl} alt="" />
                        <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{thread.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          Started by {author.displayName} · last reply {relativeTime(last.createdAt)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="size-3.5" /> {thread.posts.length}
                      </span>
                    </Link>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>
    </AppLayout>
  );
}
