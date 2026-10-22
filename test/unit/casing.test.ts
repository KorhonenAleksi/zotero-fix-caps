import { describe, expect, it } from "vitest";
import {
  fixCreator,
  fixTitle,
  isAllCaps,
  looksLikeSentenceCase,
  toOrganizationCase,
  toProperCaseName,
  toTitleCase,
} from "../../src/core/casing";

describe("isAllCaps", () => {
  it("needs at least one upper-case letter and no lower-case ones", () => {
    expect(isAllCaps("ORGANIZATIONAL IDENTITY")).toBe(true);
    expect(isAllCaps("ÅSTRÖM")).toBe(true);
    expect(isAllCaps("Organizational identity")).toBe(false);
    expect(isAllCaps("1990")).toBe(false);
    expect(isAllCaps("")).toBe(false);
  });
});

describe("toTitleCase", () => {
  it("title-cases ALL-CAPS titles with small words lowercase", () => {
    expect(
      toTitleCase(
        "STRATEGY AND STRUCTURE: CHAPTERS IN THE HISTORY OF THE INDUSTRIAL ENTERPRISE",
      ),
    ).toBe(
      "Strategy and Structure: Chapters in the History of the Industrial Enterprise",
    );
  });

  it("capitalizes the first word after a subtitle separator", () => {
    expect(
      toTitleCase("Context, time, and change: a historical approach"),
    ).toBe("Context, Time, and Change: A Historical Approach");
  });

  it("treats ? and ! as ending a segment", () => {
    expect(toTitleCase("WHY DO FIRMS FAIL? A REVIEW (1990–2020)")).toBe(
      "Why Do Firms Fail? A Review (1990–2020)",
    );
  });

  it("keeps small words carrying punctuation lowercase (v1.3.3 fix)", () => {
    expect(toTitleCase("THE PRICE OF, AND (THE) VALUE OF FIRMS")).toBe(
      "The Price of, and (the) Value of Firms",
    );
  });

  it("restores known acronyms in ALL-CAPS titles", () => {
    expect(toTitleCase("THE ROLE OF DNA IN FIRMS")).toBe(
      "The Role of DNA in Firms",
    );
    expect(toTitleCase("CEO SUCCESSION AND R&D: EVIDENCE FROM THE US")).toBe(
      "CEO Succession and R&D: Evidence from the US",
    );
    expect(toTitleCase("WHY CEOS LEAVE")).toBe("Why CEOs Leave");
  });

  it("keeps Roman numerals upper-case", () => {
    expect(toTitleCase("BUSINESS AFTER WORLD WAR II")).toBe(
      "Business After World War II",
    );
  });

  it("does not capitalize letters after digits", () => {
    expect(toTitleCase("Firms in the 1990s and beyond")).toBe(
      "Firms in the 1990s and Beyond",
    );
  });

  it("keeps existing capitals in sentence-case input", () => {
    expect(toTitleCase("DNA folding in firms")).toBe("DNA Folding in Firms");
    expect(toTitleCase("Decline in the U.S. auto industry")).toBe(
      "Decline in the U.S. Auto Industry",
    );
  });
});

describe("looksLikeSentenceCase", () => {
  it("accepts sentence case with capitalized segment starts", () => {
    expect(
      looksLikeSentenceCase(
        "Context, time, and change: Historical approaches to entrepreneurship research",
      ),
    ).toBe(true);
  });

  it("rejects titles with proper nouns mid-clause", () => {
    expect(looksLikeSentenceCase("Theories of attention by John Smith")).toBe(
      false,
    );
  });

  it("ignores acronyms when deciding", () => {
    expect(
      looksLikeSentenceCase("Organizational decline in the U.S. auto industry"),
    ).toBe(true);
  });

  it("rejects titles with no content word to judge", () => {
    expect(looksLikeSentenceCase("Strategy")).toBe(false);
    expect(looksLikeSentenceCase("strategy as practice")).toBe(false);
  });
});

describe("fixTitle", () => {
  it("returns null when nothing should change", () => {
    expect(fixTitle("Strategy as Practice")).toBeNull();
    expect(fixTitle("Theories of attention by John Smith")).toBeNull();
    expect(fixTitle("")).toBeNull();
    expect(fixTitle(undefined)).toBeNull();
  });

  it("returns the re-cased title otherwise", () => {
    expect(fixTitle("ORGANIZATIONAL IDENTITY")).toBe("Organizational Identity");
    expect(fixTitle("Strategy as practice")).toBe("Strategy as Practice");
  });
});

describe("toProperCaseName", () => {
  it("proper-cases ordinary names", () => {
    expect(toProperCaseName("SMITH", "last")).toBe("Smith");
    expect(toProperCaseName("JEAN-PAUL", "first")).toBe("Jean-Paul");
    expect(toProperCaseName("ÅSTRÖM", "last")).toBe("Åström");
  });

  it("handles O' and Mc prefixes", () => {
    expect(toProperCaseName("O'NEIL", "last")).toBe("O'Neil");
    expect(toProperCaseName("D'ANGELO", "last")).toBe("D'Angelo");
    expect(toProperCaseName("MCDONALD", "last")).toBe("McDonald");
  });

  it("only applies MacX to known Mac surnames", () => {
    expect(toProperCaseName("MACDONALD", "last")).toBe("MacDonald");
    expect(toProperCaseName("MACHADO", "last")).toBe("Machado");
    expect(toProperCaseName("MACEY", "last")).toBe("Macey");
    expect(toProperCaseName("MACK", "last")).toBe("Mack");
  });

  it("keeps dotted initials, joined or spaced", () => {
    expect(toProperCaseName("J.", "first")).toBe("J.");
    expect(toProperCaseName("J. R.", "first")).toBe("J. R.");
    expect(toProperCaseName("J.R.", "first")).toBe("J.R.");
    expect(toProperCaseName("J.-P.", "first")).toBe("J.-P.");
    expect(toProperCaseName("JOHN R.", "first")).toBe("John R.");
  });

  it("keeps undotted consonant initials in the first-name field", () => {
    expect(toProperCaseName("JR", "first")).toBe("JR");
    expect(toProperCaseName("RK", "first")).toBe("RK");
    // Short real names still get re-cased
    expect(toProperCaseName("BO", "first")).toBe("Bo");
    expect(toProperCaseName("AMY", "first")).toBe("Amy");
  });

  it("handles generational suffixes", () => {
    expect(toProperCaseName("SMITH JR.", "last")).toBe("Smith Jr.");
    expect(toProperCaseName("SMITH, JR.", "last")).toBe("Smith, Jr.");
    expect(toProperCaseName("JOHN JR", "first")).toBe("John Jr");
    expect(toProperCaseName("MARTIN LUTHER KING JR.", "last")).toBe(
      "Martin Luther King Jr.",
    );
    expect(toProperCaseName("SMITH III", "last")).toBe("Smith III");
    expect(toProperCaseName("JOHN II", "first")).toBe("John II");
  });

  it("lower-cases surname particles", () => {
    expect(toProperCaseName("VAN DER BERG", "last")).toBe("van der Berg");
    expect(toProperCaseName("DE LA CRUZ", "last")).toBe("de la Cruz");
    expect(toProperCaseName("VON NEUMANN", "last")).toBe("von Neumann");
    expect(toProperCaseName("LUDWIG VAN", "first")).toBe("Ludwig van");
    // A lone particle-like surname is a name, not a particle
    expect(toProperCaseName("DE", "last")).toBe("De");
  });

  it("leaves names that are not ALL-CAPS untouched", () => {
    expect(toProperCaseName("DiMaggio", "last")).toBe("DiMaggio");
    expect(toProperCaseName("van der Berg", "last")).toBe("van der Berg");
  });
});

describe("toOrganizationCase", () => {
  it("title-cases multi-word ALL-CAPS organisations, keeping acronyms", () => {
    expect(toOrganizationCase("NATIONAL BUREAU OF ECONOMIC RESEARCH")).toBe(
      "National Bureau of Economic Research",
    );
    expect(toOrganizationCase("OECD DIRECTORATE FOR EDUCATION")).toBe(
      "OECD Directorate for Education",
    );
  });

  it("leaves one-word names alone as likely acronyms", () => {
    expect(toOrganizationCase("NBER")).toBe("NBER");
  });
});

describe("fixCreator", () => {
  it("fixes both name parts and counts the changes", () => {
    const { creator, changed } = fixCreator({
      firstName: "JOHN",
      lastName: "SMITH",
      fieldMode: 0,
    });
    expect(creator).toEqual({
      firstName: "John",
      lastName: "Smith",
      fieldMode: 0,
    });
    expect(changed).toBe(2);
  });

  it("does not count parts whose re-cased form is identical (v1.3.3 fix)", () => {
    const { changed } = fixCreator({ firstName: "J.", lastName: "Smith" });
    expect(changed).toBe(0);
  });

  it("uses organisation rules for single-field names", () => {
    const { creator, changed } = fixCreator({
      firstName: "",
      lastName: "WORLD HEALTH ORGANIZATION",
      fieldMode: 1,
    });
    expect(creator.lastName).toBe("World Health Organization");
    expect(changed).toBe(1);
  });

  it("does not mutate its input", () => {
    const input = { firstName: "JOHN", lastName: "SMITH" };
    fixCreator(input);
    expect(input.firstName).toBe("JOHN");
  });
});
