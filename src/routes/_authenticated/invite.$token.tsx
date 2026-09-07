import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole, Users } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { acceptInvite, previewInvite } from "@/lib/invites.functions";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({
    meta: [
      { title: "Family invitation — Eternal — Memories" },
      {
        name: "description",
        content: "Accept your invitation and join your family's private archive.",
      },
      { property: "og:title", content: "Family invitation — Eternal — Memories" },
      {
        property: "og:description",
        content: "Someone kept a place for you in their family archive.",
      },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const preview = useServerFn(previewInvite);
  const accept = useServerFn(acceptInvite);

  const query = useQuery({
    queryKey: ["invite", token],
    queryFn: () => preview({ data: { token } }),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => accept({ data: { token } }),
    onSuccess: (result) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("em.activeFamilyId", result.familyId);
      }
      toast.success("Welcome to the family.");
      void navigate({ to: "/feed" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invite = query.data;
  const blocked =
    invite && (invite.accepted || invite.expired || !invite.emailMatches)
      ? invite.accepted
        ? "This invitation has already been used."
        : invite.expired
          ? "This invitation has expired. Ask for a new one."
          : `This invitation was sent to ${invite.email}. Sign in with that address to join.`
      : null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg py-10">
        <Card className="p-8 text-center">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking your invitation…</p>
          ) : !invite ? (
            <>
              <LockKeyhole className="mx-auto size-8 text-gold" />
              <h1 className="mt-3 font-display text-2xl font-semibold">Invitation not found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This link is not valid. Ask the family to send a new invitation.
              </p>
            </>
          ) : (
            <>
              <Users className="mx-auto size-8 text-gold" />
              <h1 className="mt-3 font-display text-2xl font-semibold">{invite.familyName}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You were invited to join as <span className="capitalize">{invite.role}</span>.
              </p>
              {blocked ? (
                <p className="mt-6 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-sm">
                  {blocked}
                </p>
              ) : (
                <Button
                  className="mt-6 bg-gold text-gold-foreground hover:bg-gold/90"
                  disabled={join.isPending}
                  onClick={() => join.mutate()}
                >
                  {join.isPending ? "Joining…" : "Join this family"}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
