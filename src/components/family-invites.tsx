import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Mail, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { formatDate } from "@/lib/format";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites.functions";

const inviteLink = (token: string) =>
  typeof window === "undefined" ? `/invite/${token}` : `${window.location.origin}/invite/${token}`;

export function FamilyInvites({
  familyId,
  familyName,
  canAdmin,
}: {
  familyId: string;
  familyName: string;
  canAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listInvites);
  const create = useServerFn(createInvite);
  const revoke = useServerFn(revokeInvite);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"steward" | "member" | "viewer">("member");

  const invites = useQuery({
    queryKey: ["invites", familyId],
    queryFn: () => list({ data: { familyId } }),
  });

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy — select the link manually.");
    }
  };

  /** Opens the user's mail app with a ready-made invitation. */
  const mailTo = (to: string, token: string) => {
    const subject = `You are invited to the ${familyName} family archive`;
    const body = [
      `Hi,`,
      ``,
      `I would like you to join our private family archive "${familyName}" on Eternal — Memories.`,
      ``,
      `Open this personal link, create your account and you are in:`,
      inviteLink(token),
      ``,
      `The link is valid for 30 days and only works with this email address.`,
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const invite = useMutation({
    mutationFn: () => create({ data: { familyId, email: email.trim(), role } }),
    onSuccess: async (result) => {
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: ["invites", familyId] });
      await copy(result.token);
      toast.success(
        result.reused
          ? `${result.email} already had an open invite — link copied again.`
          : `${result.email} is invited to ${familyName}.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invites", familyId] });
      toast.success("Invitation withdrawn.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!canAdmin) return null;
  const rows = invites.data ?? [];

  return (
    <Card className="mb-8 p-5">
      <div className="flex items-center gap-2">
        <Mail className="size-4 text-gold" />
        <h2 className="font-display text-lg font-semibold">Invite the family</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite by email address. Everyone gets a personal link that only works for that address —
        and only until they join.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="inv-email">Email address</Label>
          <Input
            id="inv-email"
            type="email"
            placeholder="grandma@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger id="inv-role" className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="steward">Steward</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-gold text-gold-foreground hover:bg-gold/90"
          disabled={invite.isPending || !email.trim()}
          onClick={() => invite.mutate()}
        >
          {invite.isPending ? "Inviting…" : "Send invite"}
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {invites.isLoading && <p className="text-sm text-muted-foreground">Loading invitations…</p>}
        {!invites.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No invitations yet.</p>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{row.email}</span>
            <Badge variant="secondary" className="capitalize">
              {row.role}
            </Badge>
            <Badge variant={row.accepted ? "default" : "outline"}>
              {row.accepted ? "joined" : `expires ${formatDate(row.expiresAt)}`}
            </Badge>
            {!row.accepted && (
              <>
                <Button variant="ghost" size="sm" onClick={() => void copy(row.token)}>
                  <Copy className="size-4" /> Copy link
                </Button>
                <Button variant="ghost" size="sm" onClick={() => mailTo(row.email, row.token)}>
                  <Mail className="size-4" /> Send by email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Withdraw invitation</span>
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
