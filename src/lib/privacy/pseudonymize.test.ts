import { describe, expect, it } from "vitest";

import { PLACEHOLDER_PATTERN, createPseudonymizer } from "./pseudonymize";

const FAMILY = ["Emma Jensen", "Karl Jensen", "Anna-Lena Müller", "Lars", "Oma Grete"];

function make(names: readonly string[] = FAMILY) {
  return createPseudonymizer(names);
}

describe("createPseudonymizer — known names", () => {
  it("replaces a full name with a stable placeholder", () => {
    const p = make();
    expect(p.apply("Emma Jensen hat den Brief geschrieben.")).toBe(
      "[PERSON_1] hat den Brief geschrieben.",
    );
  });

  it("uses the same placeholder for every occurrence of the same name", () => {
    const p = make();
    const out = p.apply("Emma Jensen kam. Später ging Emma Jensen wieder.");
    expect(out).toBe("[PERSON_1] kam. Später ging [PERSON_1] wieder.");
  });

  it("maps first and last name parts to derived placeholders of the same person", () => {
    const p = make();
    expect(p.apply("Emma winkte. Frau Jensen lachte.")).toBe(
      "[PERSON_1_FIRST] winkte. Frau [PERSON_1_LAST] lachte.",
    );
  });

  it("is case-insensitive", () => {
    const p = make();
    expect(p.apply("EMMA JENSEN und emma jensen")).toBe("[PERSON_1] und [PERSON_1]");
  });

  it("handles the German genitive and English possessive", () => {
    const p = make();
    expect(p.apply("Emmas Brief und Karl's Uhr und Omas Rezept")).toBe(
      "[PERSON_1_FIRST]s Brief und [PERSON_2_FIRST]'s Uhr und Omas Rezept",
    );
  });

  it("keeps the title-like part of a name when only the whole name is known", () => {
    // "Oma Grete": "Oma" is a role word, "Grete" is the name. Both parts map to the
    // same person; the role word alone is too generic and is left untouched.
    const p = make();
    expect(p.apply("Oma Grete backt. Grete singt. Oma schläft.")).toBe(
      "[PERSON_5] backt. [PERSON_5_LAST] singt. Oma schläft.",
    );
  });

  it("matches hyphenated and accented names", () => {
    const p = make();
    expect(p.apply("Anna-Lena Müller kam mit Müllers Hund.")).toBe(
      "[PERSON_3] kam mit [PERSON_3_LAST]s Hund.",
    );
  });

  it("does not match inside other words", () => {
    const p = make();
    expect(p.apply("Larsson ist nicht Lars. Emmanuel auch nicht Emma.")).toBe(
      "Larsson ist nicht [PERSON_4]. Emmanuel auch nicht [PERSON_1_FIRST].",
    );
  });

  it("prefers the longest match when names overlap", () => {
    const p = createPseudonymizer(["Karl", "Karl Heinz Jensen"]);
    expect(p.apply("Karl Heinz Jensen und Karl")).toBe("[PERSON_2] und [PERSON_1]");
  });

  it("ignores empty, whitespace-only and one-letter names", () => {
    const p = createPseudonymizer(["", "  ", "A", "Emma"]);
    expect(p.apply("A und Emma")).toBe("A und [PERSON_1]");
  });

  it("de-duplicates names that differ only in case or spacing", () => {
    const p = createPseudonymizer(["Emma Jensen", "emma  jensen", "EMMA JENSEN"]);
    expect(p.apply("Emma Jensen")).toBe("[PERSON_1]");
  });

  it("does not treat name parts shorter than three characters as standalone", () => {
    const p = createPseudonymizer(["Bo Li"]);
    expect(p.apply("Bo Li kam. Bo blieb. Li ging.")).toBe("[PERSON_1] kam. Bo blieb. Li ging.");
  });

  it("escapes regex metacharacters in names", () => {
    const p = createPseudonymizer(["O'Brien (Sr.)"]);
    expect(p.apply("Mr O'Brien (Sr.) arrived")).toBe("Mr [PERSON_1] arrived");
  });
});

describe("createPseudonymizer — patterns", () => {
  it("replaces e-mail addresses", () => {
    const p = make();
    expect(p.apply("Schreib an emma.jensen@example.com oder karl@mail.de")).toBe(
      "Schreib an [EMAIL_1] oder [EMAIL_2]",
    );
  });

  it("replaces phone numbers in common German and international formats", () => {
    const p = make();
    expect(p.apply("Ruf an: 0461 123456, +49 171 2345678 oder (040) 12 34 56 78")).toBe(
      "Ruf an: [PHONE_1], [PHONE_2] oder [PHONE_3]",
    );
  });

  it("does not mistake years, amounts or short numbers for phone numbers", () => {
    const p = make();
    expect(p.apply("Im Jahr 1987 kostete es 12,50 Euro. Wir waren 3 Tage dort.")).toBe(
      "Im Jahr 1987 kostete es 12,50 Euro. Wir waren 3 Tage dort.",
    );
  });

  it("replaces IBANs", () => {
    const p = make();
    expect(p.apply("Konto DE89 3704 0044 0532 0130 00 und DE89370400440532013000")).toBe(
      "Konto [IBAN_1] und [IBAN_2]",
    );
  });

  it("replaces full calendar dates but keeps bare years", () => {
    const p = make();
    expect(p.apply("Geboren am 03.05.1952, gestorben 2021-11-30, Hochzeit 1975.")).toBe(
      "Geboren am [DATE_1], gestorben [DATE_2], Hochzeit 1975.",
    );
  });

  it("replaces street addresses with house numbers", () => {
    const p = make();
    expect(p.apply("Wir wohnten in der Norderstraße 12 und später am Holm 3a.")).toBe(
      "Wir wohnten in der [ADDRESS_1] und später am [ADDRESS_2].",
    );
  });
});

describe("createPseudonymizer — restore", () => {
  it("restores every placeholder to the original text", () => {
    const p = make();
    const input =
      "Emma Jensen (emma@example.com, 0461 123456) schrieb Karl am 03.05.1952 aus der Norderstraße 12.";
    const out = p.apply(input);
    expect(out).not.toContain("Emma");
    expect(out).not.toContain("Karl");
    expect(out).not.toContain("example.com");
    expect(p.restore(out)).toBe(input);
  });

  it("restores derived placeholders to the matching name part and keeps suffixes", () => {
    const p = make();
    const input = "Emmas Brief lag bei Jensens.";
    expect(p.restore(p.apply(input))).toBe(input);
  });

  it("restores placeholders the model may have re-used in new sentences", () => {
    const p = make();
    p.apply("Emma Jensen und Karl Jensen");
    expect(p.restore("[PERSON_1] umarmte [PERSON_2]. [PERSON_1_FIRST] weinte.")).toBe(
      "Emma Jensen umarmte Karl Jensen. Emma weinte.",
    );
  });

  it("leaves unknown placeholders untouched instead of guessing", () => {
    const p = make();
    p.apply("Emma Jensen");
    expect(p.restore("[PERSON_9] und [THING_1]")).toBe("[PERSON_9] und [THING_1]");
  });

  it("restores case-variant occurrences to their first-seen spelling", () => {
    const p = make();
    const out = p.apply("emma jensen");
    expect(p.restore(out)).toBe("Emma Jensen");
  });
});

describe("createPseudonymizer — leak checks", () => {
  it("exposes no mapping, only apply/restore", () => {
    const p = make();
    expect(Object.keys(p).sort()).toEqual(["apply", "restore"]);
    expect(JSON.stringify(p)).toBe("{}");
  });

  it("leaves no known name in a long mixed text", () => {
    const p = make();
    const text = `Liebe Emma,
als Karl und ich 1975 in der Norderstraße 12 wohnten, kam Oma Grete jeden Sonntag.
Anna-Lena Müller (anna@example.org, +49 40 1234567) brachte Kuchen. Lars war noch klein.
Emmas erster Schultag war am 01.08.1981. Dein Karl.`;
    const out = p.apply(text);
    for (const fragment of [
      "Emma",
      "Karl",
      "Grete",
      "Anna-Lena",
      "Müller",
      "Lars",
      "example.org",
      "1234567",
      "Norderstraße 12",
      "01.08.1981",
    ]) {
      expect(out).not.toContain(fragment);
    }
    expect(out).toContain("1975");
    expect(p.restore(out)).toBe(text);
  });

  it("every placeholder matches the published pattern", () => {
    const p = make();
    const out = p.apply(
      "Emma Jensen, emma@example.com, 0461 123456, DE89370400440532013000, 03.05.1952",
    );
    const placeholders = out.match(/\[[A-Z_0-9]+\]/g) ?? [];
    expect(placeholders.length).toBe(5);
    for (const ph of placeholders) expect(ph).toMatch(PLACEHOLDER_PATTERN);
  });
});
