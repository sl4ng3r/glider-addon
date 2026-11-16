export const GUIDE_PAGE_KEYS = Object.freeze([
  "windglider.guide.page1",
  "windglider.guide.page2",
  "windglider.guide.page3",
]);

export function guideDestination(currentPage, selection) {
  if (selection === 0) return Math.max(0, currentPage - 1);
  if (selection === 1) return Math.min(GUIDE_PAGE_KEYS.length - 1, currentPage + 1);
  return null;
}
