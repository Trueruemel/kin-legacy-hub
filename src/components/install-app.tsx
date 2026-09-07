import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Install button for the home-screen app. Uses the browser install prompt when
 * available and falls back to short manual instructions (iOS / Safari).
 */
export function InstallAppButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Install app",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
  label?: string;
}) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [howTo, setHowTo] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const run = async () => {
    if (!prompt) {
      setHowTo(true);
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  return (
    <>
      <Button variant={variant} size={size} className={cn(className)} onClick={run}>
        <Download className="size-4" />
        {label}
      </Button>

      <Dialog open={howTo} onOpenChange={setHowTo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Add Eternal — Memories to your device
            </DialogTitle>
            <DialogDescription>
              No download, no ZIP — the app installs straight from this page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">iPhone / iPad (Safari)</p>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                Tap <Share className="size-4" /> Share → “Add to Home Screen”.
              </p>
            </div>
            <div>
              <p className="font-medium">Android (Chrome)</p>
              <p className="mt-1 text-muted-foreground">
                Menu (⋮) → “Install app” / “Add to Home screen”.
              </p>
            </div>
            <div>
              <p className="font-medium">Laptop (Chrome / Edge)</p>
              <p className="mt-1 text-muted-foreground">
                Click the install icon at the right end of the address bar, or menu → “Install
                Eternal — Memories”.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
