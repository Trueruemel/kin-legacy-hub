import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChefHat,
  Home,
  Images,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Moon,
  Search,
  Settings,
  Sun,
  UserPlus,
  Users,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { InstallAppButton } from "@/components/install-app";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeTime } from "@/lib/format";
import {
  albums,
  events as allEvents,
  families,
  memories as allMemories,
  recipes as allRecipes,
  userById,
  users,
  vaultItems,
} from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useActiveFamily } from "@/hooks/use-active-family";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { ensureProfile } from "@/lib/family.functions";

const navItems = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/tree", label: "Family Tree", icon: Users2 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/gallery", label: "Media Gallery", icon: Images },
  { to: "/vault", label: "Legacy Vault", icon: LockKeyhole },
  { to: "/recipes", label: "Family Recipes", icon: ChefHat },
  { to: "/forums", label: "Forums", icon: BookOpen },
  { to: "/members", label: "Members", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const mobileNav = navItems.slice(0, 5);

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const familyId = useAppStore((s) => s.activeFamilyId);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const people = users
      .filter((u) => u.familyId === familyId && u.displayName.toLowerCase().includes(q))
      .slice(0, 4)
      .map((u) => ({ kind: "Person", label: u.displayName, to: `/profile/${u.id}` }));
    const mems = allMemories
      .filter((m) => m.familyId === familyId && m.text.toLowerCase().includes(q))
      .slice(0, 3)
      .map((m) => ({ kind: "Memory", label: m.text.slice(0, 62) + "…", to: "/feed" }));
    const evs = allEvents
      .filter((e) => e.familyId === familyId && e.title.toLowerCase().includes(q))
      .slice(0, 3)
      .map((e) => ({ kind: "Event", label: e.title, to: `/events/${e.id}` }));
    const vault = vaultItems
      .filter((v) => v.familyId === familyId && v.title.toLowerCase().includes(q))
      .slice(0, 2)
      .map((v) => ({ kind: "Vault", label: v.title, to: "/vault" }));
    const recs = allRecipes
      .filter((r) => r.familyId === familyId && r.title.toLowerCase().includes(q))
      .slice(0, 2)
      .map((r) => ({ kind: "Recipe", label: r.title, to: "/recipes" }));
    const albs = albums
      .filter((a) => a.familyId === familyId && a.name.toLowerCase().includes(q))
      .slice(0, 2)
      .map((a) => ({ kind: "Album", label: a.name, to: "/gallery" }));
    return [...people, ...mems, ...evs, ...vault, ...recs, ...albs].slice(0, 8);
  }, [query, familyId]);

  return (
    <div className="relative hidden flex-1 md:block md:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories, people, events…"
        aria-label="Search the family archive"
        className="pl-9"
      />
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.label}`}
              onClick={() => {
                setQuery("");
                void navigate({ to: r.to });
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {r.kind}
              </Badge>
              <span className="truncate text-popover-foreground">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationsRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu onOpenChange={(open) => open && unread > 0 && markRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-gold-foreground">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.slice(0, 8).map((n) => {
          const actor = userById(n.actorId);
          return (
            <DropdownMenuItem key={n.id} className="items-start gap-3 py-2.5">
              <Avatar className="size-8">
                <AvatarImage src={actor.avatarUrl} alt="" />
                <AvatarFallback>{actor.firstName[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-xs leading-relaxed">
                <span className="font-medium">{actor.displayName}</span> {n.text}
                <span className="mt-0.5 block text-muted-foreground">{relativeTime(n.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InviteDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
        size="sm"
      >
        <UserPlus className="mr-2 size-4" />
        Invite Family Member
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Invite a family member</DialogTitle>
          <DialogDescription>
            They'll receive a private invitation link. Only invited relatives can ever see this archive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input id="invite-email" type="email" placeholder="aunt.vivian@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-rel">Relationship</Label>
            <Input id="invite-rel" placeholder="Aunt, cousin, grandchild…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gold text-gold-foreground hover:bg-gold/90"
            onClick={() => {
              setOpen(false);
              toast.success("Invitation sent");
            }}
          >
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Makes sure the signed-in user has a readable profile name. */
function useEnsureProfile() {
  const ensure = useServerFn(ensureProfile);
  const { signedIn } = useAuth();
  useEffect(() => {
    if (!signedIn) return;
    void ensure({ data: {} }).catch(() => undefined);
  }, [signedIn, ensure]);
}

function FamilySwitcher() {
  useEnsureProfile();
  const { family: realFamily, families: realFamilies, setFamily: setRealFamily } = useActiveFamily();
  const activeFamilyId = useAppStore((s) => s.activeFamilyId);
  const setFamily = useAppStore((s) => s.setFamily);
  const family = families.find((f) => f.id === activeFamilyId)!;
  const memberCount = users.filter((u) => u.familyId === activeFamilyId).length;

  if (realFamily) {
    return (
      <div className="space-y-2 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 text-left" aria-label="Switch family">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 font-display text-base font-semibold text-gold">
                {realFamily.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold">{realFamily.name}</span>
                <span className="block text-xs capitalize text-muted-foreground">{realFamily.role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Your families</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {realFamilies.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onSelect={() => {
                  setRealFamily(f.id);
                  if (f.id !== realFamily.id) toast.success(`Switched to ${f.name}`);
                }}
              >
                <span className="flex-1 truncate">{f.name}</span>
                {f.id === realFamily.id && <Badge variant="secondary">Active</Badge>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 text-left" aria-label="Switch family">
            <img
              src={family.coverPhotoUrl}
              alt=""
              loading="lazy"
              className="size-10 rounded-lg object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-semibold">{family.name}</span>
              <span className="block text-xs text-muted-foreground">{memberCount} members</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Your families</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {families.map((f) => (
            <DropdownMenuItem
              key={f.id}
              onSelect={() => {
                setFamily(f.id);
                if (f.id !== activeFamilyId) toast.success(`Switched to ${f.name}`);
              }}
            >
              <img src={f.coverPhotoUrl} alt="" loading="lazy" className="size-6 rounded object-cover" />
              <span className="flex-1 truncate">{f.name}</span>
              {f.id === activeFamilyId && <Badge variant="secondary">Active</Badge>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <InviteDialog />
    </div>
  );
}

function SidebarNav() {
  return (
    <nav aria-label="Main" className="space-y-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        >
          <Icon className="size-4.5 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function UserMenu() {
  const user = userById(useAppStore((s) => s.currentUserId));
  const { user: authUser } = useAuth();
  const { family: realFamily } = useActiveFamily();
  const displayName = realFamily ? (authUser?.email?.split("@")[0] ?? "You") : user.displayName;
  const roleLabel = realFamily ? realFamily.role : user.role.replace("_", " ");
  const navigate = useNavigate();
  const signOut = useAppStore((s) => s.signOut);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left lg:block">
            <span className="block text-sm font-medium leading-tight">{displayName}</span>
            <span className="block text-xs capitalize text-muted-foreground">{roleLabel}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => void navigate({ to: "/profile/$userId", params: { userId: user.id } })}>
          My profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: "/settings" })}>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            void supabase.auth.signOut().finally(() => void navigate({ to: "/" }));
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const toggle = useAppStore((s) => s.toggleTheme);
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border py-6 text-xs text-muted-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Eternal Memories</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-3">
          {["About", "Privacy", "Terms", "Help", "Contact"].map((l) => (
            <span key={l} className="cursor-default transition-colors hover:text-foreground">
              {l}
            </span>
          ))}
        </nav>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1"><LockKeyhole className="size-3" /> Private</span>
        <span className="inline-flex items-center gap-1"><Users className="size-3" /> Family-Governed</span>
        <span className="inline-flex items-center gap-1"><Bell className="size-3" /> Secure</span>
        <span className="inline-flex items-center gap-1"><Users2 className="size-3" /> Generational</span>
      </p>
    </footer>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AppLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const switching = useAppStore((s) => s.switching);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
          <Link to="/feed" className="shrink-0 text-primary dark:text-gold">
            <Wordmark />
          </Link>
          <div className="flex flex-1 justify-center">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-0.5">
            <InstallAppButton className="mr-1 hidden sm:inline-flex" />
            <ThemeToggle />
            <Link to="/messages" aria-label="Messages">
              <Button variant="ghost" size="icon" className="relative">
                <MessageCircle className="size-5" />
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-gold-foreground">
                  3
                </span>
              </Button>
            </Link>
            <NotificationsMenu />
            <Separator orientation="vertical" className="mx-1 h-8" />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className={cn("mx-auto flex max-w-[1600px] gap-6 px-4 pb-24 pt-6 lg:pb-6")}>
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-22 space-y-4">
            <SidebarNav />
            <FamilySwitcher />
          </div>
        </aside>

        <main className={cn("min-w-0 flex-1", !wide && "mx-auto w-full")}>
          {switching ? <SwitchingSkeleton /> : children}
          <SiteFooter />
        </main>
      </div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur lg:hidden"
      >
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: "text-primary dark:text-gold" }}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function SwitchingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading family">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
