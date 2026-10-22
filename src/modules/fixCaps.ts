import { fixCreator, fixTitle } from "../core/casing";
import { getString } from "../utils/locale";

const MENU_ID = "fixcaps-item-menu";

export function registerItemMenu() {
  Zotero.MenuManager.registerMenu({
    menuID: MENU_ID,
    pluginID: addon.data.config.addonID,
    target: "main/library/item",
    menus: [
      { menuType: "separator" },
      {
        menuType: "menuitem",
        l10nID: `${addon.data.config.addonRef}-menuitem-fix-caps`,
        onCommand: (_event, context) => {
          fixItems(context.items ?? []).catch((e) => Zotero.logError(e));
        },
      },
    ],
  });
}

export function unregisterItemMenu() {
  Zotero.MenuManager.unregisterMenu(MENU_ID);
}

async function fixItems(selected: Zotero.Item[]) {
  const items = selected.filter((item) => item.isRegularItem());
  let titles = 0;
  let names = 0;
  let touched = 0;

  for (const item of items) {
    let dirty = false;
    const title = fixTitle(item.getField("title") as string);
    if (title !== null) {
      item.setField("title", title);
      titles++;
      dirty = true;
    }
    let creatorsChanged = 0;
    const creators = item.getCreators().map((c) => {
      const result = fixCreator(c);
      creatorsChanged += result.changed;
      return result.creator;
    });
    if (creatorsChanged) {
      item.setCreators(creators);
      names += creatorsChanged;
      dirty = true;
    }
    if (dirty) {
      await item.saveTx();
      touched++;
    }
  }

  new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: 4000,
  })
    .createLine({
      text: getString("fix-caps-result", {
        args: { items: touched, titles, names },
      }),
      type: "success",
    })
    .show();
}
