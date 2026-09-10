import { describe, expect, it } from "vitest";

import {
  buildMemoryDescription,
  createMemoryInputSchema,
  memoryKindFor,
  memoryRecordingPath,
  memoryStoragePathBelongsTo,
  splitPersonName,
} from "./memory";

const FAMILY = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_FAMILY = "9b2a1c44-6d1e-4a1f-8c2d-5e6f7a8b9c0d";
const MEMORY = "5b1d9e1a-2c3d-4e5f-8a9b-0c1d2e3f4a5b";

const base = {
  familyId: FAMILY,
  promptId: "still-see",
  question: "What is a family moment you can still see clearly?",
  title: "A story I still remember",
  story: "Dad drew the plan on the back of a seed packet.",
};

describe("createMemoryInputSchema", () => {
  it("accepts a plain written answer", () => {
    expect(createMemoryInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty answer without a recording", () => {
    const result = createMemoryInputSchema.safeParse({ ...base, story: "   " });
    expect(result.success).toBe(false);
  });

  it("requires a written note next to a recording (text alternative)", () => {
    const recording = {
      path: `${FAMILY}/memories/${MEMORY}/answer.webm`,
      mime: "audio/webm",
      size: 1024,
    };
    expect(createMemoryInputSchema.safeParse({ ...base, story: "", recording }).success).toBe(
      false,
    );
    expect(createMemoryInputSchema.safeParse({ ...base, recording }).success).toBe(true);
  });

  it("only accepts ISO dates and a uuid family id", () => {
    expect(createMemoryInputSchema.safeParse({ ...base, happenedOn: "18.07.1968" }).success).toBe(
      false,
    );
    expect(createMemoryInputSchema.safeParse({ ...base, happenedOn: "1968-07-18" }).success).toBe(
      true,
    );
    expect(createMemoryInputSchema.safeParse({ ...base, familyId: "fam_johnson" }).success).toBe(
      false,
    );
  });
});

describe("memoryStoragePathBelongsTo", () => {
  it("accepts the family's own memories folder", () => {
    expect(
      memoryStoragePathBelongsTo(FAMILY, memoryRecordingPath(FAMILY, MEMORY, "voice note.webm")),
    ).toBe(true);
  });

  it("rejects other families, other folders and path tricks", () => {
    expect(memoryStoragePathBelongsTo(FAMILY, `${OTHER_FAMILY}/memories/${MEMORY}/a.webm`)).toBe(
      false,
    );
    expect(memoryStoragePathBelongsTo(FAMILY, `${FAMILY}/vault/${MEMORY}/a.webm`)).toBe(false);
    expect(memoryStoragePathBelongsTo(FAMILY, `${FAMILY}/memories/${MEMORY}/../x.webm`)).toBe(
      false,
    );
    expect(memoryStoragePathBelongsTo(FAMILY, `${FAMILY}/memories/not-a-uuid/a.webm`)).toBe(false);
  });
});

describe("memoryRecordingPath", () => {
  it("sanitises the file name", () => {
    expect(memoryRecordingPath(FAMILY, MEMORY, "my answer (final).webm")).toBe(
      `${FAMILY}/memories/${MEMORY}/my_answer_final_.webm`,
    );
  });
});

describe("memoryKindFor / buildMemoryDescription / splitPersonName", () => {
  it("marks voice answers as audio and text answers as story", () => {
    expect(memoryKindFor({})).toBe("story");
    expect(memoryKindFor({ recording: { path: "x/y/z", mime: "audio/webm", size: 1 } })).toBe(
      "audio",
    );
  });

  it("keeps question, answer and meaning readable in one description", () => {
    expect(buildMemoryDescription({ ...base, meaning: "Because he never said it out loud." })).toBe(
      "Q: What is a family moment you can still see clearly?\n\nDad drew the plan on the back of a seed packet.\n\nWhy it matters: Because he never said it out loud.",
    );
    expect(buildMemoryDescription({ ...base, meaning: "  " })).not.toContain("Why it matters");
  });

  it("splits a display name into first and last name", () => {
    expect(splitPersonName("Helen")).toEqual({ firstName: "Helen", lastName: null });
    expect(splitPersonName("  Helen   Johnson (née Wright) ")).toEqual({
      firstName: "Helen",
      lastName: "Johnson (née Wright)",
    });
  });
});
