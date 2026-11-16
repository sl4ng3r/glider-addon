import { ActionFormData } from "@minecraft/server-ui";
import { GUIDE_PAGE_KEYS, guideDestination } from "./guide-book.js";

const openGuides = new Set();

export async function showGuideBook(player) {
  if (openGuides.has(player.id)) return;
  openGuides.add(player.id);
  try {
    let pageIndex = 0;
    while (player.isValid) {
      const response = await new ActionFormData()
        .title({ rawtext: [{ translate: "windglider.guide.title" }, { text: ` (${pageIndex + 1}/${GUIDE_PAGE_KEYS.length})` }] })
        .body({ translate: GUIDE_PAGE_KEYS[pageIndex] })
        .button({ translate: "windglider.guide.previous" })
        .button({ translate: "windglider.guide.next" })
        .button({ translate: "windglider.guide.close" })
        .show(player);
      if (response.canceled) break;
      const nextPage = guideDestination(pageIndex, response.selection);
      if (nextPage === null) break;
      pageIndex = nextPage;
    }
  } catch (error) {
    console.warn(`[windglider] guide book could not be shown: ${error}`);
  } finally {
    openGuides.delete(player.id);
  }
}
