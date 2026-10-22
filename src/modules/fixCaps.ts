import { fixCreator, fixTitle } from "../core/casing";
import {
  creatorLabel,
  FieldChange,
  formatChangeList,
  LOG_HEADER,
  logRow,
} from "../core/changes";
import { getString } from "../utils/locale";

const MENU_ID = "fixcaps-item-menu";
// Zotero may namespace the ID; keep the one it returns for unregistering.
let registeredMenuID: string | false = false;

export const LOG_FILE = "fix-caps-log.csv";

export function registerItemMenu() {
  // No separator: Zotero groups plugin items under its own separator and
  // rejects the whole registration if a top-level separator is included.
  registeredMenuID = Zotero.MenuManager.registerMenu({
    menuID: MENU_ID,
    pluginID: addon.data.config.addonID,
    target: "main/library/item",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${addon.data.config.addonRef}-menuitem-fix-caps`,
        onCommand: (_event, context) => {
          fixItems(context.items ?? []).catch((e) => Zotero.logError(e));
        },
      },
    ],
  });
  if (!registeredMenuID) {
    Zotero.logError(new Error("Fix Caps: item menu registration was rejected"));
  }
}

export function unregisterItemMenu() {
  if (registeredMenuID) Zotero.MenuManager.unregisterMenu(registeredMenuID);
  registeredMenuID = false;
}

interface ItemPlan {
  item: Zotero.Item;
  title: string | null;
  creators: _ZoteroTypes.Item.Creator[] | null;
  changes: FieldChange[];
}

function planItem(item: Zotero.Item): ItemPlan | null {
  const changes: FieldChange[] = [];
  const oldTitle = item.getField("title") as string;
  const title = fixTitle(oldTitle);
  if (title !== null)
    changes.push({ field: "title", from: oldTitle, to: title });

  let creatorsChanged = false;
  const creators = item.getCreators().map((c) => {
    const result = fixCreator(c);
    if (result.changed) {
      creatorsChanged = true;
      changes.push({
        field: "creator",
        from: creatorLabel(c),
        to: creatorLabel(result.creator),
      });
    }
    return result.creator;
  });

  if (!changes.length) return null;
  return { item, title, creators: creatorsChanged ? creators : null, changes };
}

async function fixItems(selected: Zotero.Item[]) {
  const plans = selected
    .filter(
      (item) =>
        item.isRegularItem() && Zotero.Libraries.isEditable(item.libraryID),
    )
    .map(planItem)
    .filter((p): p is ItemPlan => p !== null);

  if (!plans.length) {
    showResult(
      getString("fix-caps-none", { args: { count: selected.length } }),
    );
    return;
  }

  const changes = plans.flatMap((p) => p.changes);
  const titles = changes.filter((c) => c.field === "title").length;
  const names = changes.length - titles;

  const ps = Services.prompt;
  // The gecko typings mark these constants optional; they always exist.
  const flags =
    ps.BUTTON_POS_0! * ps.BUTTON_TITLE_IS_STRING! +
    ps.BUTTON_POS_1! * ps.BUTTON_TITLE_CANCEL!;
  const choice = ps.confirmEx(
    Zotero.getMainWindow() as unknown as mozIDOMWindowProxy,
    getString("fix-caps-confirm-title"),
    [
      getString("fix-caps-confirm-intro", {
        args: { items: plans.length, titles, names },
      }),
      "",
      formatChangeList(changes),
      "",
      getString("fix-caps-confirm-note"),
    ].join("\n"),
    flags,
    getString("fix-caps-confirm-button", { args: { count: plans.length } }),
    "",
    "",
    // An empty checkbox label hides the checkbox
    "",
    { value: false },
  );
  if (choice !== 0) return;

  // Log before changing anything, so every change can be reverted by hand.
  await appendToLog(plans);

  for (const plan of plans) {
    if (plan.title !== null) plan.item.setField("title", plan.title);
    if (plan.creators) plan.item.setCreators(plan.creators);
    await plan.item.saveTx();
  }

  showResult(
    getString("fix-caps-result", {
      args: { items: plans.length, titles, names },
    }),
  );
}

async function appendToLog(plans: ItemPlan[]) {
  const path = PathUtils.join(Zotero.DataDirectory.dir, LOG_FILE);
  const changedAt = new Date().toISOString();
  const rows = plans.flatMap((p) =>
    p.changes.map((c) => logRow(changedAt, p.item.libraryKey, c)),
  );
  if (!(await IOUtils.exists(path))) rows.unshift(LOG_HEADER);
  await IOUtils.writeUTF8(path, rows.join("\n") + "\n", {
    mode: "appendOrCreate",
  });
}

function showResult(text: string) {
  new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: 5000,
  })
    .createLine({ text, type: "success" })
    .show();
}
