import { describe, expect, it } from "vitest";
import {
  creatorLabel,
  FieldChange,
  formatChangeList,
  logRow,
} from "../../src/core/changes";

describe("creatorLabel", () => {
  it("joins personal names as Last, First", () => {
    expect(creatorLabel({ lastName: "BOJE", firstName: "DM" })).toBe(
      "BOJE, DM",
    );
  });

  it("uses the single field for organisations and missing first names", () => {
    expect(
      creatorLabel({ lastName: "WORLD BANK", firstName: "", fieldMode: 1 }),
    ).toBe("WORLD BANK");
    expect(creatorLabel({ lastName: "PLATO" })).toBe("PLATO");
  });
});

describe("formatChangeList", () => {
  const title: FieldChange = {
    field: "title",
    from: "ORGANIZATIONAL IDENTITY",
    to: "Organizational Identity",
  };
  const name: FieldChange = {
    field: "creator",
    from: "SMITH, JOHN",
    to: "Smith, John",
  };

  it("shows titles before and after, names on one line", () => {
    expect(formatChangeList([title, name])).toBe(
      "• ORGANIZATIONAL IDENTITY\n    → Organizational Identity\n" +
        "• SMITH, JOHN  →  Smith, John",
    );
  });

  it("caps the list", () => {
    const list = formatChangeList(
      Array.from({ length: 20 }, () => name),
      15,
    );
    expect(list.split("\n")).toHaveLength(16);
    expect(list.endsWith("…and 5 more changes")).toBe(true);
  });
});

describe("logRow", () => {
  it("writes a CSV line, quoting fields with commas", () => {
    expect(
      logRow("2026-10-22T20:00:00.000Z", "1/FABMF6UZ", {
        field: "creator",
        from: "BOJE, DM",
        to: "Boje, DM",
      }),
    ).toBe('2026-10-22T20:00:00.000Z,1/FABMF6UZ,creator,"BOJE, DM","Boje, DM"');
  });
});
