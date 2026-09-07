import { describe, expect, it } from "vitest";

import { isReleased } from "./vault-release";

const NOW = new Date("2026-09-07T12:00:00.000Z").getTime();

describe("isReleased — the single sealed/released invariant", () => {
  it("treats release_rule 'immediate' as released regardless of other fields", () => {
    expect(isReleased({ release_rule: "immediate", release_on: null, released: false }, NOW)).toBe(
      true,
    );
  });

  it("treats an explicitly released entry as released", () => {
    expect(
      isReleased({ release_rule: "on_date", release_on: "2099-01-01", released: true }, NOW),
    ).toBe(true);
  });

  it("releases an on_date entry once the date has been reached", () => {
    expect(
      isReleased({ release_rule: "on_date", release_on: "2026-09-07", released: false }, NOW),
    ).toBe(true);
    expect(
      isReleased({ release_rule: "on_date", release_on: "2020-01-01", released: false }, NOW),
    ).toBe(true);
  });

  it("keeps an on_date entry sealed before the date", () => {
    expect(
      isReleased({ release_rule: "on_date", release_on: "2026-09-08", released: false }, NOW),
    ).toBe(false);
    expect(
      isReleased({ release_rule: "on_date", release_on: "2099-12-31", released: false }, NOW),
    ).toBe(false);
  });

  it("keeps an on_date entry without a date sealed", () => {
    expect(isReleased({ release_rule: "on_date", release_on: null, released: false }, NOW)).toBe(
      false,
    );
    expect(isReleased({ release_rule: "on_date", release_on: "", released: false }, NOW)).toBe(
      false,
    );
  });

  it("keeps an entry with an unknown rule sealed unless explicitly released", () => {
    expect(isReleased({ release_rule: "manual", release_on: null, released: false }, NOW)).toBe(
      false,
    );
    expect(isReleased({ release_rule: "manual", release_on: null, released: true }, NOW)).toBe(
      true,
    );
  });

  it("keeps an entry with an unparseable date sealed", () => {
    expect(
      isReleased({ release_rule: "on_date", release_on: "not-a-date", released: false }, NOW),
    ).toBe(false);
  });

  it("treats null/undefined fields as sealed", () => {
    expect(isReleased({ release_rule: null, release_on: null, released: null }, NOW)).toBe(false);
    expect(isReleased({}, NOW)).toBe(false);
  });

  it("defaults the reference time to now", () => {
    expect(isReleased({ release_rule: "on_date", release_on: "2000-01-01", released: false })).toBe(
      true,
    );
    expect(isReleased({ release_rule: "on_date", release_on: "2999-01-01", released: false })).toBe(
      false,
    );
  });
});
