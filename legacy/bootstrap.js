// Zotero Fix Caps plugin (Zotero 7+, tested as a target through 9)
// Adds a "Fix Caps" menu item to the item right-click menu that normalizes
// ALL-CAPS titles, sentence-case titles, and all-caps creator names on
// selected items.
//
// v1.3.2 — fix the persistence-across-restart bug. On Zotero launch, the
// main window's onMainWindowLoad fires before its <popup id="zotero-itemmenu">
// is actually attached to the DOM. v1.3.1's addMenu checked once, found
// nothing, logged "menu not found", and silently returned — the menu would
// only appear after reinstalling (where the DOM is already built) and would
// be missing on every fresh Zotero start. v1.3.2 polls for the element to
// appear (up to 10s) before giving up, which lets the menu attach reliably
// at cold startup.
//
// v1.3.3 — three fixes:
//  - toTitleCase: small words carrying punctuation ("of,", "(the") were
//    escaping the small-word check and getting capitalized; now the check
//    strips non-letters first, matching looksLikeSentenceCase.
//  - shutdown race: disabling the plugin while addMenu's 10s poller was
//    still waiting could re-add the menu after removeMenu ran; a
//    shuttingDown flag now aborts pending pollers.
//  - creators whose proper-cased form is identical to the original (e.g.
//    single-initial names) no longer trigger a save or inflate the
//    "names fixed" count.

var MENU_ID = 'zotero-fixcaps-menuitem';
var SEP_ID  = 'zotero-fixcaps-separator';

// Set during shutdown so in-flight addMenu pollers abort instead of
// re-attaching the menu after removeMenu has run.
var shuttingDown = false;

// ---- text utilities ----------------------------------------------------------

// Small words to keep lowercase in title case (except first/last position).
// Edit this list to taste — e.g., add "are", "be" if you want to lowercase them too.
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
        // Strip punctuation before the small-word test so "of," and "(the"
        // still count as small words (same normalization as
        // looksLikeSentenceCase).
        const clean = t.replace(/[^\p{L}]/gu, '');
        if (!forceCap && clean && SMALL.test(clean)) return t;
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

// Decide whether a title looks like sentence case. Splits at subtitle
// separators (: ; — –) so the first word of each segment is allowed to be
// capitalized ("Context, time, and change: Historical approaches..." still
// counts as sentence case). Conservative: any capitalized non-small content
// word that ISN'T at the start of a segment kills the heuristic, so titles
// with proper nouns mid-clause are left alone.
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
        if (isFirstOfSegment) {
            isFirstOfSegment = false;
            continue;
        }
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

// ---- core action -------------------------------------------------------------

async function fixCaps(window) {
    const pane = window.ZoteroPane;
    const items = pane.getSelectedItems().filter(it => it.isRegularItem && it.isRegularItem());
    if (!items.length) {
        window.alert('No items selected.');
        return;
    }

    let titleFixed = 0, creatorFixed = 0, itemsTouched = 0;
    for (const item of items) {
        let dirty = false;
        const title = item.getField('title');
        if (shouldRewriteTitle(title)) {
            const next = toTitleCase(title);
            if (next !== title) {
                item.setField('title', next);
                titleFixed++;
                dirty = true;
            }
        }
        const creators = item.getCreators();
        for (let i = 0; i < creators.length; i++) {
            const c = creators[i];
            if (isAllCaps(c.lastName)) {
                const next = toProperCase(c.lastName);
                if (next !== c.lastName) { creators[i].lastName = next; creatorFixed++; dirty = true; }
            }
            if (isAllCaps(c.firstName)) {
                const next = toProperCase(c.firstName);
                if (next !== c.firstName) { creators[i].firstName = next; creatorFixed++; dirty = true; }
            }
        }
        if (dirty) {
            item.setCreators(creators);
            await item.saveTx();
            itemsTouched++;
        }
    }

    try {
        const pw = new Zotero.ProgressWindow({ closeOnClick: true });
        pw.changeHeadline('Fix Caps');
        pw.addDescription(`Items updated: ${itemsTouched}\nTitles fixed: ${titleFixed}\nCreator names fixed: ${creatorFixed}`);
        pw.show();
        pw.startCloseTimer(4000);
    } catch (e) {
        window.alert(`Fix Caps — items: ${itemsTouched}, titles: ${titleFixed}, names: ${creatorFixed}`);
    }
}

// ---- menu wiring -------------------------------------------------------------

// Wait for an element id to appear in a document. Resolves with the element
// once it exists, or null after the timeout. Needed because Zotero's main
// window fires onMainWindowLoad before <popup id="zotero-itemmenu"> is
// actually in the DOM at cold startup — that race was the bug fixed in 1.3.2.
function waitForElement(doc, id, { timeoutMs = 10000, intervalMs = 100 } = {}) {
    return new Promise(resolve => {
        const existing = doc.getElementById(id);
        if (existing) return resolve(existing);
        let elapsed = 0;
        const view = doc.defaultView;
        if (!view || !view.setInterval) return resolve(null);
        const handle = view.setInterval(() => {
            if (shuttingDown) {
                view.clearInterval(handle);
                resolve(null);
                return;
            }
            const el = doc.getElementById(id);
            if (el) {
                view.clearInterval(handle);
                resolve(el);
                return;
            }
            elapsed += intervalMs;
            if (elapsed >= timeoutMs) {
                view.clearInterval(handle);
                resolve(null);
            }
        }, intervalMs);
    });
}

async function addMenu(window) {
    try {
        const doc = window.document;
        if (doc.getElementById(MENU_ID)) return;

        const itemMenu = await waitForElement(doc, 'zotero-itemmenu');
        if (!itemMenu) {
            Zotero.debug('Fix Caps: zotero-itemmenu did not appear within 10s; giving up for this window');
            return;
        }
        // The plugin may have been disabled while we were polling — don't
        // re-attach a menu that removeMenu just cleaned up.
        if (shuttingDown) return;
        // Re-check in case a concurrent invocation (startup + onMainWindowLoad)
        // attached the menu while we were waiting.
        if (doc.getElementById(MENU_ID)) return;

        const sep = doc.createXULElement('menuseparator');
        sep.id = SEP_ID;
        itemMenu.appendChild(sep);

        const item = doc.createXULElement('menuitem');
        item.id = MENU_ID;
        item.setAttribute('label', 'Fix Caps (title & authors)');
        item.addEventListener('command', () => fixCaps(window));
        itemMenu.appendChild(item);
        Zotero.debug('Fix Caps: menu item added');
    } catch (e) {
        Zotero.logError(e);
    }
}

function removeMenu(window) {
    try {
        for (const id of [MENU_ID, SEP_ID]) {
            const el = window.document.getElementById(id);
            if (el) el.remove();
        }
    } catch (e) {}
}

// ---- plugin lifecycle --------------------------------------------------------

function install() {}
function uninstall() {}

async function startup({ id, version, rootURI }, reason) {
    shuttingDown = false;
    await Zotero.initializationPromise;
    // Belt-and-suspenders: also attach to any already-open main windows in case
    // onMainWindowLoad isn't invoked for them at install time. addMenu is now
    // async and polls for zotero-itemmenu, so it's safe to call before the
    // window's DOM is fully built — the menu will attach as soon as the
    // element appears (fire-and-forget).
    try {
        const wins = (Zotero.getMainWindows && Zotero.getMainWindows()) || [];
        for (const win of wins) addMenu(win);
    } catch (e) {
        Zotero.logError(e);
    }
}

function shutdown() {
    shuttingDown = true;
    try {
        const wins = (Zotero.getMainWindows && Zotero.getMainWindows()) || [];
        for (const win of wins) removeMenu(win);
    } catch (e) {}
}

function onMainWindowLoad({ window }) {
    addMenu(window);
}

function onMainWindowUnload({ window }) {
    removeMenu(window);
}
