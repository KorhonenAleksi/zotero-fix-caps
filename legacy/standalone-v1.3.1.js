// Zotero: Fix ALL-CAPS and sentence-case titles, and ALL-CAPS author names,
// for selected items. Standalone version of the Zotero Fix Caps plugin (v1.3.1).
//
// Usage: Select items in Zotero, then Tools → Developer → Run JavaScript,
// paste this in, and click Run. Use this when you don't want to install the
// plugin, or to run a one-off variant of the rules.

var items = Zotero.getActiveZoteroPane().getSelectedItems();

// Small words kept lowercase in title case (except first/last position or
// immediately after a subtitle separator). Edit to taste.
const SMALL = /^(a|an|and|as|at|but|by|en|for|if|in|is|of|on|or|the|to|v\.?|via|vs\.?|with|without|over|under|from|into|onto)$/i;

function isAllCaps(s) {
    return s && /\p{Lu}/u.test(s) && s === s.toUpperCase() && s !== s.toLowerCase();
}

function toTitleCase(str) {
    const lower = str.toLowerCase();
    const tokens = lower.split(/(\s+|[-–—:;])/);
    let firstIdx = -1, lastIdx = -1;
    const afterSubtitle = new Set();
    let pendingSubtitle = false;
    tokens.forEach((t, i) => {
        if (/^[:;—–]$/.test(t)) { pendingSubtitle = true; return; }
        if (/\p{L}/u.test(t)) {
            if (firstIdx < 0) firstIdx = i;
            lastIdx = i;
            if (pendingSubtitle) { afterSubtitle.add(i); pendingSubtitle = false; }
        }
    });
    return tokens.map((t, i) => {
        if (!/\p{L}/u.test(t)) return t;
        const forceCap = i === firstIdx || i === lastIdx || afterSubtitle.has(i);
        if (!forceCap && SMALL.test(t)) return t;
        return t.replace(/^([^\p{L}]*)(\p{L})/u, (_, pre, ch) => pre + ch.toUpperCase());
    }).join('');
}

function toProperCase(str) {
    if (!str) return str;
    let s = str.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
    s = s.replace(/\bMc(\p{L})/gu, (_, ch) => 'Mc' + ch.toUpperCase());
    s = s.replace(/\bMac(\p{L}\p{L})/gu, (m, rest) => 'Mac' + rest.charAt(0).toUpperCase() + rest.slice(1));
    return s;
}

function looksLikeSentenceCase(str) {
    if (!str) return false;
    const tokens = str.split(/(\s+|[:;—–])/);
    let foundFirst = false;
    let isFirstOfSegment = true;
    let content = 0, lower = 0;
    for (const t of tokens) {
        if (!/\p{L}/u.test(t)) {
            if (/^[:;—–]$/.test(t)) isFirstOfSegment = true;
            continue;
        }
        if (!foundFirst) {
            if (!/^\p{Lu}/u.test(t)) return false;
            foundFirst = true;
            isFirstOfSegment = false;
            continue;
        }
        if (isFirstOfSegment) { isFirstOfSegment = false; continue; }
        const clean = t.replace(/[^\p{L}]/gu, '');
        if (!clean || SMALL.test(clean)) continue;
        content++;
        if (/^\p{Ll}/u.test(t)) lower++;
    }
    if (content < 1) return false;
    return lower === content;
}

function shouldRewriteTitle(str) {
    return isAllCaps(str) || looksLikeSentenceCase(str);
}

let titleFixed = 0, creatorFixed = 0, itemsTouched = 0;
for (const item of items) {
    let dirty = false;
    const title = item.getField('title');
    if (shouldRewriteTitle(title)) {
        const next = toTitleCase(title);
        if (next !== title) { item.setField('title', next); titleFixed++; dirty = true; }
    }
    const creators = item.getCreators();
    for (let i = 0; i < creators.length; i++) {
        const c = creators[i];
        if (isAllCaps(c.lastName))  { creators[i].lastName  = toProperCase(c.lastName);  creatorFixed++; dirty = true; }
        if (isAllCaps(c.firstName)) { creators[i].firstName = toProperCase(c.firstName); creatorFixed++; dirty = true; }
    }
    if (dirty) { item.setCreators(creators); await item.saveTx(); itemsTouched++; }
}

return `Items updated: ${itemsTouched}. Titles fixed: ${titleFixed}. Creator names fixed: ${creatorFixed}.`;
