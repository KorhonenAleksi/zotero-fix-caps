fix-caps-none = Nothing to fix in the { $count } selected items.
fix-caps-confirm-title = Fix Caps
fix-caps-confirm-intro = { $items ->
        [one] 1 item will change
       *[other] { $items } items will change
    } ({ $titles } titles, { $names } names):
fix-caps-confirm-note = Only titles and author names are changed (and SAGE's "EXPRESS:" label is removed from titles). Every change is saved to fix-caps-log.csv in your Zotero data folder.
fix-caps-confirm-button = { $count ->
        [one] Fix 1 item
       *[other] Fix { $count } items
    }
fix-caps-result = Items updated: { $items } · Titles fixed: { $titles } · Names fixed: { $names }
