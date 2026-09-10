import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ---- module doubles: no network, no router, no toasts ---------------- */

const navigate = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const getUser = vi.fn();
const getSession = vi.fn();
const signOut = vi.fn();
const signInWithOAuth = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
const search = vi.hoisted(() => ({ value: {} as { next?: string; denied?: boolean } }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({
    ...opts,
    useSearch: () => search.value,
  }),
  useNavigate: () => navigate,
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => <a {...rest}>{children}</a>,
}));

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword, signUp, getUser, getSession, signOut } },
}));

vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth } },
}));

const { AuthPage, sanitizeNext } = await import("./auth");

beforeEach(() => {
  vi.clearAllMocks();
  search.value = {};
  getSession.mockResolvedValue({ data: { session: null } });
  getUser.mockResolvedValue({ data: { user: { email: "dev1@eternalmemorys.enterprises" } } });
  signInWithPassword.mockResolvedValue({ error: null });
  signUp.mockResolvedValue({ error: null });
});

describe("login form — rendering", () => {
  it("shows an accessible email and password field plus a submit button", async () => {
    render(<AuthPage />);
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeInTheDocument();
  });

  it("marks both credential fields as required", () => {
    render(<AuthPage />);
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  it("uses the correct input types and autocomplete hints", () => {
    render(<AuthPage />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
  });
});

describe("login form — submission", () => {
  it("does not call the backend when the form is empty (native validation blocks it)", async () => {
    render(<AuthPage />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with the typed credentials", async () => {
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText("Email"), "dev1@eternalmemorys.enterprises");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "dev1@eternalmemorys.enterprises",
        password: "correct-horse",
      }),
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/onboarding" }));
  });

  it("surfaces a backend error and does not navigate", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText("Email"), "dev1@eternalmemorys.enterprises");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Invalid login credentials"));
    expect(navigate).not.toHaveBeenCalledWith({ to: "/onboarding" });
  });

  it("signs the user back out when they are outside the closed preview", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "stranger@example.com" } } });
    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText("Email"), "stranger@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "whatever");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/auth", search: { denied: true } }),
    );
  });

  it("keeps the Google button working through the shared post-auth check", async () => {
    signInWithOAuth.mockResolvedValue({ redirected: true });
    render(<AuthPage />);
    await userEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith("google", expect.anything()));
  });
});

describe("sign-up tab", () => {
  it("creates the account with the display name", async () => {
    render(<AuthPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Create account" }));
    await userEvent.type(screen.getByLabelText("Your name"), "Tristan");
    await userEvent.type(screen.getByLabelText("Email"), "dev2@eternalmemorys.enterprises");
    await userEvent.type(screen.getByLabelText("Password"), "long-enough-pass");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(signUp.mock.calls[0]?.[0].options.data).toEqual({ display_name: "Tristan" });
  });
});

describe("first-memory handoff (?next=/create-memory)", () => {
  it("lands on the first-memory route after sign-in instead of the onboarding default", async () => {
    search.value = { next: "/create-memory?prompt=still-see" };
    const location = { href: "", origin: "http://localhost" };
    vi.stubGlobal("location", location);

    render(<AuthPage />);
    await userEvent.type(screen.getByLabelText("Email"), "dev1@eternalmemorys.enterprises");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(location.href).toBe("/create-memory?prompt=still-see"));
    expect(navigate).not.toHaveBeenCalledWith({ to: "/onboarding" });
    vi.unstubAllGlobals();
  });

  it("keeps the sign-up confirmation link on the same internal next path", async () => {
    search.value = { next: "/create-memory" };
    vi.stubGlobal("location", { href: "", origin: "http://localhost" });

    render(<AuthPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Create account" }));
    await userEvent.type(screen.getByLabelText("Your name"), "Tristan");
    await userEvent.type(screen.getByLabelText("Email"), "dev2@eternalmemorys.enterprises");
    await userEvent.type(screen.getByLabelText("Password"), "long-enough-pass");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(signUp.mock.calls[0]?.[0].options.emailRedirectTo).toBe(
      "http://localhost/create-memory",
    );
    vi.unstubAllGlobals();
  });

  it("shows the closed-preview note so nobody mistakes it for open registration", () => {
    render(<AuthPage />);
    expect(screen.getByText(/closed preview/i)).toBeInTheDocument();
  });
});

describe("redirect-target sanitising (open-redirect guard)", () => {
  it("accepts in-app paths", () => {
    expect(sanitizeNext("/feed")).toBe("/feed");
  });

  it("rejects absolute and protocol-relative targets", () => {
    expect(sanitizeNext("https://evil.example")).toBeNull();
    expect(sanitizeNext("//evil.example")).toBeNull();
    expect(sanitizeNext(42)).toBeNull();
    expect(sanitizeNext(undefined)).toBeNull();
  });
});
