# Zotero Fix Caps

A Zotero 9/10 plugin that fixes inconsistent casing on selected items in one
right-click: ALL-CAPS and sentence-case titles become title case, and ALL-CAPS
author names become proper case.

Select items, right-click, and pick **Fix Caps (title & authors)**. A pop-up
reports how many items, titles and names changed. Only fields that match the
rules below are touched, so it is safe to run on a whole collection.

## What it changes

**Titles**, when they are

- entirely upper-case (`ORGANIZATIONAL IDENTITY` → `Organizational Identity`), or
- sentence case (`Context, time, and change: Historical approaches to
entrepreneurship research`). Segments split at `:` `;` `—` `–` `?` `!`.

Small words (`a, an, and, as, at, but, by, for, from, in, is, of, on, or, the,
to, via, vs., with` …) stay lowercase except first, last, or after a subtitle
separator. ALL-CAPS titles keep common acronyms (`DNA`, `CEO`, `R&D`, `US`,
`M&A`, `SMEs` …) and Roman numerals (`WORLD WAR II`). Sentence-case titles keep
whatever capitals they already have (`DNA`, `U.S.`).

**Creators**, when a name part is entirely upper-case:

- `O'NEIL` → `O'Neil`, `MCDONALD` → `McDonald`, `MACDONALD` → `MacDonald`
  (Mac only for known Mac surnames, so `MACHADO` → `Machado`)
- surname particles lowercase: `VAN DER BERG` → `van der Berg`
- initials kept: `J.R.`, `J.-P.`, and run-together consonant initials in the
  first-name field (`JR`, `RK`, as exported by Web of Science)
- suffixes: `SMITH JR.` → `Smith Jr.`, `SMITH III` → `Smith III`
- single-field (organisation) names get title case; one-word ones (`OECD`) are
  left alone as likely acronyms

## Known limitations

- Acronyms outside the built-in list are re-cased in ALL-CAPS titles
  (`THE ROLE OF RNA` → `The Role of Rna`), and `IT` is never treated as an
  acronym.
- Run-together initials that contain a vowel (`AJ`, `EB`) can't be told apart
  from short names (`Al`, `Bo`) and are re-cased.
- Internal capitals in ALL-CAPS surnames can't be recovered (`DIMAGGIO` →
  `Dimaggio`).
- Titles with a proper noun mid-clause are not detected as sentence case and
  are left untouched — deliberately conservative.

## Install

Download the `.xpi` from the
[releases](https://github.com/KorhonenAleksi/zotero-fix-caps/releases), then in
Zotero: Tools → Plugins → gear icon → Install Plugin From File…

2.0 uses a new plugin ID (`fixcaps@korhonenaleksi.github.io`; 1.x was
`fixcaps@aleksi.zotero`), so Zotero treats it as a separate plugin. Remove a 1.x
install first, or you get two Fix Caps menu items.

## Development

```sh
npm install
npm test            # unit tests for the pure core (src/core), runs in Node
npm run build       # → build/zotero-fix-caps.xpi
npm start           # hot-reload into a separate dev Zotero profile (needs .env, see .env.example)
```

Layout: `src/core/casing.ts` holds all casing rules as pure TypeScript with no
Zotero dependency and is unit-tested. `src/modules/fixCaps.ts` is the thin
Zotero adapter (menu + item updates). `legacy/` keeps the pre-2.0 hand-zipped
plugin for reference.

Built on [windingwind/zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template). Licensed AGPL-3.0-or-later.
