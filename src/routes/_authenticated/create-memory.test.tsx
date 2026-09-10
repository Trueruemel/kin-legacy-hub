import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ---- module doubles: no router, no backend, no toasts ------------------ */

const search = vi.hoisted(() => ({ value: {} as { prompt?: string } }));
const createMemory = vi.fn();
const listMemoryPeople = vi.fn();
const createInvite = vi.fn();
const activeFamily = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({
    ...opts,
    options: opts,
    useSearch: () => search.value,
  }),
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn() }) } },
}));

vi.mock("@/hooks/use-active-family", () => ({ useActiveFamily: () => activeFamily() }));

vi.mock("@/lib/memory.functions", () => ({ createMemory, listMemoryPeople }));
vi.mock("@/lib/invites.functions", () => ({ createInvite }));

const { CreateMemoryPage, Route } = await import("./create-memory");

const FAMILY = {
  id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  name: "The Jensen family",
  description: null,
  role: "member" as const,
  isDemo: false,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateMemoryPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  search.value = {};
  activeFamily.mockReturnValue({ family: FAMILY, families: [FAMILY], loading: false });
  listMemoryPeople.mockResolvedValue([
    { id: "6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", name: "Helen Jensen" },
  ]);
  createMemory.mockResolvedValue({
    id: "5b1d9e1a-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    kind: "story",
    personId: null,
  });
});

describe("search validation", () => {
  const validate = Route.options.validateSearch as (s: Record<string, unknown>) => {
    prompt?: string;
  };

  it("keeps only known prompt ids", () => {
    expect(validate({ prompt: "pass-on" })).toEqual({ prompt: "pass-on" });
    expect(validate({ prompt: "<script>" })).toEqual({});
    expect(validate({ prompt: 42 })).toEqual({});
    expect(validate({})).toEqual({});
  });
});

describe("family resolution", () => {
  it("sends people without a family to the setup wizard instead of saving anything", () => {
    activeFamily.mockReturnValue({ family: null, families: [], loading: false });
    renderPage();
    expect(screen.getByRole("link", { name: /Set up your family archive/ })).toHaveAttribute(
      "href",
      "/setup",
    );
    expect(createMemory).not.toHaveBeenCalled();
  });

  it("blocks viewers from writing while still showing the page", () => {
    activeFamily.mockReturnValue({
      family: { ...FAMILY, role: "viewer" },
      families: [],
      loading: false,
    });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(/viewer/);
    expect(screen.getByRole("button", { name: /Answer this question/ })).toBeDisabled();
  });
});

describe("first-memory flow", () => {
  it("walks question → answer → context → save with exactly one server write", async () => {
    search.value = { prompt: "pass-on" };
    renderPage();

    // Step 1: the question from the homepage is preselected.
    expect(screen.getByRole("radio", { name: /Something worth passing on/ })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Answer this question/ }));

    // Step 2: the question is the heading; an answer is required.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "What would you want the next generation to understand?",
    );
    expect(screen.getByRole("button", { name: /Add context/ })).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText("Your answer"),
      "That showing up for each other is the whole point.",
    );
    await userEvent.click(screen.getByRole("button", { name: /Add context/ }));

    // Step 3: context is optional; pick a person from the tree and a date.
    await userEvent.selectOptions(
      await screen.findByLabelText("Who is this memory about?"),
      "6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    );
    await userEvent.type(screen.getByLabelText("When did it happen?"), "1968-07-18");
    await userEvent.type(screen.getByLabelText("Where?"), "Lake Simcoe");
    await userEvent.click(screen.getByRole("button", { name: "Save this memory" }));

    await waitFor(() => expect(createMemory).toHaveBeenCalledTimes(1));
    expect(createMemory).toHaveBeenCalledWith({
      data: {
        familyId: FAMILY.id,
        promptId: "pass-on",
        question: "What would you want the next generation to understand?",
        title: "Something worth passing on",
        story: "That showing up for each other is the whole point.",
        happenedOn: "1968-07-18",
        place: "Lake Simcoe",
        personId: "6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      },
    });

    // Step 4: success, and only now the optional invitation.
    expect(await screen.findByText(/is in your family archive/)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /Invite someone, when you are ready/ }),
    ).toBeVisible();
    expect(createInvite).not.toHaveBeenCalled();
  });

  it("surfaces a server refusal without pretending it saved", async () => {
    createMemory.mockRejectedValue(new Error("You are not a member of this family archive."));
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Answer this question/ }));
    await userEvent.type(screen.getByLabelText("Your answer"), "A short answer.");
    await userEvent.click(screen.getByRole("button", { name: /Add context/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save this memory" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("You are not a member of this family archive."),
    );
    expect(screen.queryByText(/is in your family archive/)).not.toBeInTheDocument();
  });

  it("only lets owners and stewards create invites after success", async () => {
    activeFamily.mockReturnValue({
      family: { ...FAMILY, role: "owner" },
      families: [],
      loading: false,
    });
    createInvite.mockResolvedValue({ token: "tok-123", email: "aunt@example.com", reused: false });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Answer this question/ }));
    await userEvent.type(screen.getByLabelText("Your answer"), "A short answer.");
    await userEvent.click(screen.getByRole("button", { name: /Add context/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save this memory" }));
    await screen.findByText(/is in your family archive/);

    await userEvent.type(
      screen.getByLabelText("Email address of the relative you want to invite"),
      "aunt@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create invite link" }));
    await waitFor(() =>
      expect(createInvite).toHaveBeenCalledWith({
        data: { familyId: FAMILY.id, email: "aunt@example.com", role: "member" },
      }),
    );
  });
});
