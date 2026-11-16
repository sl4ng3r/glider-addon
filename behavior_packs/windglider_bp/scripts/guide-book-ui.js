import { ActionFormData } from "@minecraft/server-ui";
import { guideBody } from "./guide-book.js";

const openGuides = new Set();

export async function showGuideBook(player) {
  if (openGuides.has(player.id)) return;
  openGuides.add(player.id);
  try {
    if (!player.isValid) return;
    await new ActionFormData()
      .title({ translate: "windglider.guide.title" })
      .body(guideBody())
      .button({ translate: "windglider.guide.close" })
      .show(player);
  } catch (error) {
    console.warn(`[windglider] guide book could not be shown: ${error}`);
  } finally {
    openGuides.delete(player.id);
  }
}
