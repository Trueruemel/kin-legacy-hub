import { describe, expect, it } from "vitest";

import { isUtcIsoString, toUtcIsoString } from "./utc";

describe("toUtcIsoString", () => {
  it("returns the exact RFC 3339 UTC representation with a trailing Z", () => {
    expect(toUtcIsoString(new Date("2026-09-07T15:00:00.000Z"))).toBe("2026-09-07T15:00:00.000Z");
  });

  it("normalises an offset timestamp to UTC instead of keeping local time", () => {
    // 17:00 at +02:00 is 15:00 UTC — the evidence record must carry the UTC value.
    expect(toUtcIsoString(new Date("2026-09-07T17:00:00.000+02:00"))).toBe(
      "2026-09-07T15:00:00.000Z",
    );
  });

  it("always yields millisecond precision", () => {
    expect(toUtcIsoString(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("rejects an invalid Date instead of producing 'Invalid Date'", () => {
    expect(() => toUtcIsoString(new Date("not a date"))).toThrow(/invalid date/i);
  });

  it("rejects values that are not Date instances", () => {
    expect(() => toUtcIsoString("2026-09-07T15:00:00.000Z" as unknown as Date)).toThrow(
      /Date instance/i,
    );
    expect(() => toUtcIsoString(1_757_257_200_000 as unknown as Date)).toThrow(/Date instance/i);
  });
});

describe("isUtcIsoString", () => {
  it("accepts the canonical format only", () => {
    expect(isUtcIsoString("2026-09-07T15:00:00.000Z")).toBe(true);
  });

  it.each([
    ["missing Z", "2026-09-07T15:00:00.000"],
    ["explicit offset", "2026-09-07T17:00:00.000+02:00"],
    ["lower-case z", "2026-09-07T15:00:00.000z"],
    ["no milliseconds", "2026-09-07T15:00:00Z"],
    ["date only", "2026-09-07"],
    ["impossible calendar date", "2026-02-30T00:00:00.000Z"],
    ["epoch millis as string", "1757257200000"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(isUtcIsoString(value)).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isUtcIsoString(new Date() as unknown as string)).toBe(false);
    expect(isUtcIsoString(undefined as unknown as string)).toBe(false);
  });
});
