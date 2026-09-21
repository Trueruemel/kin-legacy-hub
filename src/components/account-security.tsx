import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";

/** Change your password, or close your account for good. */
export function AccountSecurity() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const deleteFn = useServerFn(deleteMyAccount);

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("You need to be signed in.");
      if (newPassword.length < 8) {
        throw new Error("Please choose a password with at least 8 characters.");
      }
      // Confirm the person at the keyboard knows the current password before
      // replacing it.
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (checkError) throw new Error("That current password is not right.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Your password has been changed.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closeAccount = useMutation({
    mutationFn: async () => {
      const result = await deleteFn();
      if ("blocked" in result) throw new Error(result.blocked);
      return result;
    },
    onSuccess: async () => {
      toast.success("Your account has been closed.");
      await supabase.auth.signOut();
      window.location.href = "/";
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Card className="mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">Password</h2>
        <Separator className="my-4" />
        <div className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby="new-password-hint"
            />
            <p id="new-password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
          <Button
            className="justify-self-start"
            disabled={!currentPassword || !newPassword || changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isPending ? "Changing…" : "Change password"}
          </Button>
        </div>
      </Card>

      <Card className="mt-6 border-destructive/40 p-6">
        <h2 className="font-display text-xl font-semibold">Close your account</h2>
        <Separator className="my-4" />
        <p className="max-w-xl text-sm text-muted-foreground">
          This removes your sign-in for good and cannot be undone. Memories you added stay with your
          family. If you are the only owner of a family, make someone else an owner first.
        </p>
        <div className="mt-4 grid max-w-md gap-2">
          <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>
        <Button
          variant="destructive"
          className="mt-4"
          disabled={confirmText !== "DELETE" || closeAccount.isPending}
          onClick={() => closeAccount.mutate()}
        >
          {closeAccount.isPending ? "Closing…" : "Close my account"}
        </Button>
      </Card>
    </>
  );
}
