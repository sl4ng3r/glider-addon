export const GUIDE_SECTION_KEYS = Object.freeze([
  ["windglider.guide.gliding.title", "windglider.guide.gliding.body"],
  ["windglider.guide.updraft.title", "windglider.guide.updraft.body"],
]);

export function guideBody() {
  return {
    rawtext: [
      { translate: GUIDE_SECTION_KEYS[0][0] },
      { text: "\n" },
      { translate: GUIDE_SECTION_KEYS[0][1] },
      { text: "\n\n" },
      { translate: GUIDE_SECTION_KEYS[1][0] },
      { text: "\n" },
      { translate: GUIDE_SECTION_KEYS[1][1] },
    ],
  };
}
