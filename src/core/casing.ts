/**
 * Pure casing rules for titles and creator names. No Zotero dependency, so
 * everything here is unit-tested in Node (test/unit/casing.test.ts).
 */

// Kept lowercase in title case, except as the first or last word or right
// after a subtitle separator. Casual academic style: "is" stays lowercase.
const SMALL = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "en",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "of",
  "on",
  "onto",
  "or",
  "over",
  "the",
  "to",
  "under",
  "v",
  "v.",
  "via",
  "vs",
  "vs.",
  "with",
  "without",
]);

// Restored when re-casing an ALL-CAPS title or organisation name, which
// otherwise would turn "DNA" into "Dna". Keyed by the upper-case form.
// Deliberately excludes acronyms that are also ordinary words ("IT", "AIDS").
const ACRONYMS = new Map(
  [
    "AI",
    "B2B",
    "B2C",
    "CEO",
    "CEOs",
    "CFO",
    "CFOs",
    "CSR",
    "CTO",
    "DNA",
    "ESG",
    "EU",
    "GDP",
    "HR",
    "HRM",
    "ICT",
    "IPO",
    "IPOs",
    "M&A",
    "MBA",
    "MBAs",
    "MNC",
    "MNCs",
    "MNE",
    "MNEs",
    "NGO",
    "NGOs",
    "OECD",
    "R&D",
    "RBV",
    "SME",
    "SMEs",
    "TMT",
    "TMTs",
    "UK",
    "UN",
    "US",
    "USA",
    "USSR",
    "WWI",
    "WWII",
  ].map((a) => [a.toUpperCase(), a]),
);

// Surname particles kept lowercase ("van der Berg", "de la Cruz").
const PARTICLES = new Set([
  "af",
  "av",
  "da",
  "das",
  "de",
  "del",
  "della",
  "den",
  "der",
  "di",
  "dos",
  "du",
  "la",
  "le",
  "ter",
  "ten",
  "van",
  "von",
  "zu",
]);

// Only these get the "MacX" capital. A blanket Mac rule breaks common names
// like Machado, Macey or Macon ("MacHado").
const MAC_NAMES = new Set([
  "macalister",
  "macarthur",
  "macaulay",
  "maccarthy",
  "maccormick",
  "macdonald",
  "macdougall",
  "macduff",
  "macewan",
  "macfarlane",
  "macgillivray",
  "macgregor",
  "macinnes",
  "macintosh",
  "macintyre",
  "maciver",
  "mackay",
  "mackenzie",
  "mackinnon",
  "mackintosh",
  "maclachlan",
  "maclaren",
  "maclean",
  "macleod",
  "macmahon",
  "macmanus",
  "macmillan",
  "macnamara",
  "macneil",
  "macpherson",
  "macqueen",
]);

const ROMAN = /^(?=[IVX]{2,}$)X{0,3}(IX|IV|V?I{0,3})$/;
const NAME_SUFFIXES = new Set(["II", "III", "IV"]);
const SUBTITLE_SEP = /^[:;—–]$/;
// Splits a token into leading punctuation, the word, trailing punctuation.
const AFFIX = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;

export function isAllCaps(s: string | null | undefined): boolean {
  return (
    !!s && /\p{Lu}/u.test(s) && s === s.toUpperCase() && s !== s.toLowerCase()
  );
}

function lettersOnly(s: string): string {
  return s.replace(/[^\p{L}]/gu, "");
}

// Upper-cases the first character only when it is a letter, so "1990s" and
// "(the" are handled: digits are never followed by a forced capital.
function capitalizeFirst(word: string): string {
  return word.replace(/^(\p{L})/u, (ch) => ch.toUpperCase());
}

function endsSegment(token: string): boolean {
  return SUBTITLE_SEP.test(token) || /[?!]$/.test(token);
}

/**
 * Title case. ALL-CAPS input is lower-cased first (keeping known acronyms and
 * Roman numerals); other input keeps its existing capitals, so "DNA" or
 * "U.S." in a sentence-case title survive.
 */
export function toTitleCase(str: string): string {
  const fromAllCaps = isAllCaps(str);
  const base = fromAllCaps ? str.toLowerCase() : str;
  const tokens = base.split(/(\s+|[-–—:;])/);

  let firstIdx = -1;
  let lastIdx = -1;
  const afterSubtitle = new Set<number>();
  let pendingSubtitle = false;
  tokens.forEach((t, i) => {
    if (SUBTITLE_SEP.test(t)) {
      pendingSubtitle = true;
      return;
    }
    if (/\p{L}/u.test(t)) {
      if (firstIdx < 0) firstIdx = i;
      lastIdx = i;
      if (pendingSubtitle) afterSubtitle.add(i);
      pendingSubtitle = /[?!]$/.test(t);
    }
  });

  return tokens
    .map((t, i) => {
      if (!/\p{L}/u.test(t)) return t;
      const [, pre, word, post] = t.match(AFFIX)!;
      const upper = word.toUpperCase();
      if (fromAllCaps && ACRONYMS.has(upper)) {
        return pre + ACRONYMS.get(upper) + post;
      }
      if (fromAllCaps && ROMAN.test(upper)) return pre + upper + post;
      const forceCap = i === firstIdx || i === lastIdx || afterSubtitle.has(i);
      if (!forceCap && SMALL.has(lettersOnly(word).toLowerCase())) {
        return pre + word.toLowerCase() + post;
      }
      return pre + capitalizeFirst(word) + post;
    })
    .join("");
}

/**
 * Whether a title looks like sentence case. Splits at subtitle separators
 * (: ; — – and ? or !) so the first word of each segment may be capitalized.
 * Conservative: any capitalized content word mid-segment (a proper noun) means
 * the title is left alone. Fully upper-case tokens ("DNA", "U.S.") are
 * treated as acronyms and ignored.
 */
export function looksLikeSentenceCase(str: string | null | undefined): boolean {
  if (!str) return false;
  const tokens = str.split(/(\s+|[:;—–])/);
  let foundFirst = false;
  let isFirstOfSegment = true;
  let content = 0;
  let lower = 0;
  for (const t of tokens) {
    if (!/\p{L}/u.test(t)) {
      if (SUBTITLE_SEP.test(t)) isFirstOfSegment = true;
      continue;
    }
    const segmentEnds = endsSegment(t);
    if (!foundFirst) {
      if (!/^[^\p{L}]*\p{Lu}/u.test(t)) return false;
      foundFirst = true;
      isFirstOfSegment = segmentEnds;
      continue;
    }
    if (isFirstOfSegment) {
      isFirstOfSegment = segmentEnds;
      continue;
    }
    isFirstOfSegment = segmentEnds;
    const clean = lettersOnly(t);
    if (!clean || SMALL.has(clean.toLowerCase()) || isAllCaps(clean)) continue;
    content++;
    if (/^[^\p{L}]*\p{Ll}/u.test(t)) lower++;
  }
  return content >= 1 && lower === content;
}

export function shouldRewriteTitle(str: string | null | undefined): boolean {
  return isAllCaps(str) || looksLikeSentenceCase(str);
}

/** The re-cased title, or null when the title should be left as it is. */
export function fixTitle(title: string | null | undefined): string | null {
  if (!title || !shouldRewriteTitle(title)) return null;
  const next = toTitleCase(title);
  return next === title ? null : next;
}

export type NameField = "first" | "last";

const VOWELS = /[AEIOUY]/;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

// "J.", "J.R.", "J.-P." — every letter run is a single letter.
function isDottedInitials(token: string): boolean {
  return (
    token.includes(".") &&
    token
      .split(/[.\-‐]/)
      .filter(Boolean)
      .every((part) => lettersOnly(part).length <= 1)
  );
}

function properCaseWord(token: string): string {
  let s = token
    .toLowerCase()
    .replace(/(^|[\s\-'’.])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
  s = s.replace(/^Mc(\p{L})/u, (_, ch) => "Mc" + ch.toUpperCase());
  if (MAC_NAMES.has(lettersOnly(token).toLowerCase())) {
    s = s.replace(/^Mac(\p{L})/u, (_, ch) => "Mac" + ch.toUpperCase());
  }
  return s;
}

function properCaseNameToken(
  token: string,
  index: number,
  count: number,
  field: NameField,
): string {
  const bare = token.replace(/[.,]+$/, "");
  const lower = bare.toLowerCase();
  if (isDottedInitials(token)) return token;
  if (index > 0 && NAME_SUFFIXES.has(bare)) return token;
  if (index > 0 && (lower === "jr" || lower === "sr")) {
    return properCaseWord(token);
  }
  // Web of Science style "JR" / "RK" in the first-name field: run-together
  // initials. Only consonant runs, so real short names ("BO", "AMY") still
  // get re-cased.
  if (
    field === "first" &&
    /^\p{Lu}{2,3}$/u.test(bare) &&
    !VOWELS.test(stripDiacritics(bare))
  ) {
    return token;
  }
  const isParticle =
    PARTICLES.has(lower) && (field === "last" ? index < count - 1 : index > 0);
  if (isParticle) return token.toLowerCase();
  return properCaseWord(token);
}

/** Proper case for an ALL-CAPS personal name part; other input is returned unchanged. */
export function toProperCaseName(str: string, field: NameField): string {
  if (!isAllCaps(str)) return str;
  const parts = str.split(/(\s+)/);
  const words = parts.filter((p) => p.trim());
  let wordIndex = 0;
  return parts
    .map((p) => {
      if (!p.trim()) return p;
      return properCaseNameToken(p, wordIndex++, words.length, field);
    })
    .join("");
}

/** ALL-CAPS single-field (organisation) name. One-word names are left alone as likely acronyms ("OECD", "NBER"). */
export function toOrganizationCase(str: string): string {
  if (!isAllCaps(str) || !/\s/.test(str.trim())) return str;
  return toTitleCase(str);
}

export interface CreatorLike {
  firstName?: string;
  lastName?: string;
  /** 1 = single-field name (organisation), stored in lastName. */
  fieldMode?: number;
}

/**
 * Re-cases one creator. Returns the updated creator and how many name parts
 * changed (0 when nothing did).
 */
export function fixCreator<T extends CreatorLike>(
  creator: T,
): { creator: T; changed: number } {
  const next = { ...creator };
  let changed = 0;
  if (creator.fieldMode === 1) {
    const name = toOrganizationCase(creator.lastName ?? "");
    if (name !== (creator.lastName ?? "")) {
      next.lastName = name;
      changed++;
    }
    return { creator: next, changed };
  }
  for (const [key, field] of [
    ["lastName", "last"],
    ["firstName", "first"],
  ] as const) {
    const value = creator[key];
    if (!value) continue;
    const fixed = toProperCaseName(value, field);
    if (fixed !== value) {
      next[key] = fixed;
      changed++;
    }
  }
  return { creator: next, changed };
}
