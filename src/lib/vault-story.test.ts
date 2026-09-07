import { describe, expect, it } from "vitest";

import { VAULT_STORY_GATEWAY_URL, writeVaultStory, type VaultStoryInput } from "./vault-story";

type Captured = { url: string; init: RequestInit; body: Record<string, unknown> };

function fakeFetch(respond: (captured: Captured) => Response | Promise<Response>): {
  fetchImpl: typeof fetch;
  calls: Captured[];
} {
  const calls: Captured[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const captured: Captured = {
      url: String(url),
      init: init ?? {},
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    };
    calls.push(captured);
    return respond(captured);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

const INPUT: VaultStoryInput = {
  title: "Emmas Brief an Karl",
  sealedByName: "Emma Jensen",
  recipientNames: ["Karl Jensen", "Lars"],
  source:
    "Lieber Karl, als wir in der Norderstraße 12 wohnten, rief Oma Grete oft an (0461 123456). Emma.",
  familyNames: ["Oma Grete", "Anna-Lena Müller"],
};

const SECRETS = [
  "Emma",
  "Karl",
  "Jensen",
  "Lars",
  "Grete",
  "Anna-Lena",
  "Müller",
  "Norderstraße 12",
  "0461 123456",
];

describe("writeVaultStory — what leaves the server", () => {
  it("sends no known name, address or phone number to the gateway", async () => {
    const { fetchImpl, calls } = fakeFetch(() => okResponse("[PERSON_1] schrieb an [PERSON_2]."));
    await writeVaultStory(INPUT, { apiKey: "test-key", fetchImpl });

    expect(calls).toHaveLength(1);
    const outbound = JSON.stringify(calls[0]!.body);
    for (const secret of SECRETS) expect(outbound).not.toContain(secret);
    expect(outbound).toContain("[PERSON_1]");
    expect(outbound).toContain("[ADDRESS_1]");
    expect(outbound).toContain("[PHONE_1]");
  });

  it("tells the model to keep placeholders verbatim", async () => {
    const { fetchImpl, calls } = fakeFetch(() => okResponse("x"));
    await writeVaultStory(INPUT, { apiKey: "test-key", fetchImpl });
    const messages = calls[0]!.body["messages"] as { role: string; content: string }[];
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).toMatch(/\[PERSON_1\]/);
    expect(messages[0]!.content).toMatch(/unchanged|verbatim|exactly/i);
  });

  it("puts the API key only in the Authorization header, never in the body", async () => {
    const { fetchImpl, calls } = fakeFetch(() => okResponse("x"));
    await writeVaultStory(INPUT, { apiKey: "sk-secret-123", fetchImpl });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-secret-123");
    expect(JSON.stringify(calls[0]!.body)).not.toContain("sk-secret-123");
    expect(calls[0]!.url).toBe(VAULT_STORY_GATEWAY_URL);
  });

  it("caps the source text at 6000 characters after pseudonymisation", async () => {
    const { fetchImpl, calls } = fakeFetch(() => okResponse("x"));
    await writeVaultStory(
      { ...INPUT, source: "Emma Jensen ".repeat(2000) },
      { apiKey: "k", fetchImpl },
    );
    const messages = calls[0]!.body["messages"] as { role: string; content: string }[];
    expect(messages[1]!.content.length).toBeLessThanOrEqual(6000 + 200);
    expect(messages[1]!.content).not.toContain("Emma");
  });
});

describe("writeVaultStory — what comes back", () => {
  it("restores placeholders in the story so the family reads real names", async () => {
    const { fetchImpl } = fakeFetch(() =>
      okResponse("[PERSON_1] schrieb [PERSON_2] aus der [ADDRESS_1]. [PERSON_4] kam vorbei."),
    );
    const result = await writeVaultStory(INPUT, { apiKey: "k", fetchImpl });
    expect(result).toEqual({
      story: "Emma Jensen schrieb Karl Jensen aus der Norderstraße 12. Oma Grete kam vorbei.",
    });
  });

  it("maps 429 to rate_limited without reading the body", async () => {
    const { fetchImpl } = fakeFetch(() => new Response("slow down", { status: 429 }));
    expect(await writeVaultStory(INPUT, { apiKey: "k", fetchImpl })).toEqual({
      failure: "rate_limited",
    });
  });

  it("maps other non-ok statuses to unavailable", async () => {
    for (const status of [400, 401, 500, 503]) {
      const { fetchImpl } = fakeFetch(() => new Response("nope", { status }));
      expect(await writeVaultStory(INPUT, { apiKey: "k", fetchImpl })).toEqual({
        failure: "unavailable",
      });
    }
  });

  it("maps an empty or malformed answer to empty", async () => {
    const empty = fakeFetch(() => okResponse("   "));
    expect(await writeVaultStory(INPUT, { apiKey: "k", fetchImpl: empty.fetchImpl })).toEqual({
      failure: "empty",
    });
    const malformed = fakeFetch(() => new Response("{}", { status: 200 }));
    expect(await writeVaultStory(INPUT, { apiKey: "k", fetchImpl: malformed.fetchImpl })).toEqual({
      failure: "empty",
    });
    const notJson = fakeFetch(() => new Response("<html>", { status: 200 }));
    expect(await writeVaultStory(INPUT, { apiKey: "k", fetchImpl: notJson.fetchImpl })).toEqual({
      failure: "empty",
    });
  });

  it("maps a network failure to unavailable instead of throwing", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await writeVaultStory(INPUT, { apiKey: "k", fetchImpl })).toEqual({
      failure: "unavailable",
    });
  });
});
