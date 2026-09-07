import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EvidenceEventV1 } from "./evidence/contracts";
import type { EvidenceTransport } from "./evidence/server";
import { createServerEvidenceEmitter } from "./evidence/server";
import { SAFE_ERROR_MESSAGES } from "./safe-error";
import {
  VAULT_STORY_MESSAGES,
  runVaultStoryFlow,
  type VaultStoryEntry,
  type VaultStoryFlowDeps,
} from "./vault-story-flow";

const CORRELATION = "0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f";
const NOW = Date.parse("2026-09-07T12:00:00.000Z");
const ENTRY_ID = "5b1d9e1a-2c3d-4e5f-8a9b-0c1d2e3f4a5b";

const RELEASED_ENTRY: VaultStoryEntry = {
  family_id: "fam-42",
  title: "Emmas Brief",
  content: "Lieber Karl, …",
  transcript: null,
  sealed_by_name: "Emma Jensen",
  recipient_names: ["Karl Jensen"],
  release_rule: "on_date",
  release_on: "2026-01-01",
  released: false,
};

class Capture implements EvidenceTransport {
  events: EvidenceEventV1[] = [];
  async emit(e: EvidenceEventV1) {
    this.events.push(e);
  }
}

type Harness = {
  deps: VaultStoryFlowDeps;
  transport: Capture;
  calls: { writeStory: number; loadFamilyNames: number; loadEntry: number };
};

function harness(overrides: Partial<VaultStoryFlowDeps> = {}): Harness {
  const transport = new Capture();
  const calls = { writeStory: 0, loadFamilyNames: 0, loadEntry: 0 };
  const deps: VaultStoryFlowDeps = {
    isEnabled: () => true,
    loadEntry: async () => {
      calls.loadEntry += 1;
      return { entry: RELEASED_ENTRY, error: null };
    },
    apiKey: () => "k",
    loadFamilyNames: async () => {
      calls.loadFamilyNames += 1;
      return ["Oma Grete"];
    },
    writeStory: async () => {
      calls.writeStory += 1;
      return { story: "Emma Jensen schrieb Karl Jensen." };
    },
    evidence: createServerEvidenceEmitter(transport),
    correlationId: () => CORRELATION,
    now: () => NOW,
    ...overrides,
  };
  return { deps, transport, calls };
}

async function fails(deps: VaultStoryFlowDeps): Promise<string> {
  try {
    await runVaultStoryFlow(ENTRY_ID, deps);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected the flow to throw");
}

// recordEvidence is fire-and-forget; let the microtask queue drain before asserting.
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("runVaultStoryFlow — guards in order", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("is off by default: rejects before touching the database or the gateway", async () => {
    const h = harness({ isEnabled: () => false });
    expect(await fails(h.deps)).toBe(VAULT_STORY_MESSAGES.notConfigured);
    await settle();
    expect(h.calls).toEqual({ writeStory: 0, loadFamilyNames: 0, loadEntry: 0 });
    expect(h.transport.events).toHaveLength(1);
    expect(h.transport.events[0]).toMatchObject({
      eventName: "vault_story_rejected",
      outcome: "rejected",
      correlationId: CORRELATION,
      attributes: { errorCategory: "configuration", httpStatus: 503 },
    });
  });

  it("maps a database error to a safe user text and emits nothing", async () => {
    const h = harness({
      loadEntry: async () => ({
        entry: null,
        error: { code: "42501", message: "permission denied for table vault_entries" },
      }),
    });
    const message = await fails(h.deps);
    expect(message).toBe(SAFE_ERROR_MESSAGES.authentication);
    expect(message).not.toContain("vault_entries");
    await settle();
    expect(h.transport.events).toHaveLength(0);
    expect(h.calls.writeStory).toBe(0);
  });

  it("rejects a missing entry with a 404 evidence event", async () => {
    const h = harness({ loadEntry: async () => ({ entry: null, error: null }) });
    expect(await fails(h.deps)).toBe(VAULT_STORY_MESSAGES.missing);
    await settle();
    expect(h.transport.events[0]!.attributes).toEqual({
      errorCategory: "validation",
      httpStatus: 404,
    });
    expect(h.calls.writeStory).toBe(0);
  });

  it("refuses a sealed entry before any name lookup or gateway call", async () => {
    const sealed: VaultStoryEntry = { ...RELEASED_ENTRY, release_on: "2099-01-01" };
    const h = harness({ loadEntry: async () => ({ entry: sealed, error: null }) });
    expect(await fails(h.deps)).toBe(VAULT_STORY_MESSAGES.sealed);
    await settle();
    expect(h.transport.events[0]!.attributes).toEqual({
      errorCategory: "validation",
      httpStatus: 403,
    });
    expect(h.calls.loadFamilyNames).toBe(0);
    expect(h.calls.writeStory).toBe(0);
  });

  it("refuses an entry without text", async () => {
    const empty: VaultStoryEntry = { ...RELEASED_ENTRY, content: "", transcript: null };
    const h = harness({ loadEntry: async () => ({ entry: empty, error: null }) });
    expect(await fails(h.deps)).toBe(VAULT_STORY_MESSAGES.noText);
    await settle();
    expect(h.transport.events[0]!.attributes).toEqual({
      errorCategory: "validation",
      httpStatus: 422,
    });
    expect(h.calls.writeStory).toBe(0);
  });

  it("stops when no API key is configured — after the entry checks, before any names are loaded", async () => {
    const h = harness({ apiKey: () => undefined });
    expect(await fails(h.deps)).toBe(VAULT_STORY_MESSAGES.notConfigured);
    expect(h.calls.loadFamilyNames).toBe(0);
    expect(h.calls.writeStory).toBe(0);
  });

  it("fails closed when the family name list cannot be loaded", async () => {
    const h = harness({ loadFamilyNames: async () => null });
    expect(await fails(h.deps)).toBe(VAULT_STORY_MESSAGES.unavailable);
    await settle();
    expect(h.calls.writeStory).toBe(0);
    // No "requested" event either: the request never entered the AI path.
    expect(h.transport.events.map((e) => e.eventName)).toEqual([]);
  });
});

describe("runVaultStoryFlow — the AI path", () => {
  it("emits requested and completed around a successful story", async () => {
    let tick = NOW;
    const h = harness({ now: () => (tick += 250) });
    const result = await runVaultStoryFlow(ENTRY_ID, h.deps);
    await settle();
    expect(result).toEqual({ story: "Emma Jensen schrieb Karl Jensen." });
    expect(h.transport.events.map((e) => e.eventName)).toEqual([
      "vault_story_requested",
      "vault_story_completed",
    ]);
    expect(h.transport.events[1]!.attributes).toEqual({ durationMs: 250 });
    for (const event of h.transport.events) {
      expect(event.correlationId).toBe(CORRELATION);
      expect(JSON.stringify(event)).not.toMatch(/Emma|Karl|Grete|Brief|fam-42|5b1d9e1a/);
    }
  });

  it("passes author, recipients, joined source and the family names to the story writer", async () => {
    let received: Parameters<VaultStoryFlowDeps["writeStory"]>[0] | undefined;
    const withTranscript: VaultStoryEntry = { ...RELEASED_ENTRY, transcript: "…Transkript…" };
    const h = harness({
      loadEntry: async () => ({ entry: withTranscript, error: null }),
      writeStory: async (input) => {
        received = input;
        return { story: "x" };
      },
    });
    await runVaultStoryFlow(ENTRY_ID, h.deps);
    expect(received).toEqual({
      title: "Emmas Brief",
      sealedByName: "Emma Jensen",
      recipientNames: ["Karl Jensen"],
      source: "Lieber Karl, …\n\n…Transkript…",
      familyNames: ["Oma Grete"],
    });
  });

  it.each([
    ["rate_limited", VAULT_STORY_MESSAGES.rateLimited],
    ["unavailable", VAULT_STORY_MESSAGES.unavailable],
    ["empty", VAULT_STORY_MESSAGES.empty],
  ] as const)(
    "maps writer failure %s to the stable user text without a completed event",
    async (failure, text) => {
      const h = harness({ writeStory: async () => ({ failure }) });
      expect(await fails(h.deps)).toBe(text);
      await settle();
      expect(h.transport.events.map((e) => e.eventName)).toEqual(["vault_story_requested"]);
    },
  );

  it("never lets an evidence transport failure break the product path", async () => {
    const exploding: EvidenceTransport = {
      async emit() {
        throw new Error("transport down");
      },
    };
    const h = harness({ evidence: createServerEvidenceEmitter(exploding) });
    await expect(runVaultStoryFlow(ENTRY_ID, h.deps)).resolves.toEqual({
      story: "Emma Jensen schrieb Karl Jensen.",
    });
  });
});
