/**
 * Shared between scripts/build-map-geometry.mjs, which sizes the map's
 * viewBox padding from this, and scripts/audit-map-fit.mjs, which
 * independently re-checks every label still fits. One formula, not two
 * that can drift apart: a fix or a tuning change here changes what both
 * the generator and the auditor agree "fits" means.
 *
 * The town list (content/site.json) is a file a client edits directly. The
 * map's viewBox is generated once and only changes when someone re-runs
 * scripts/build-map-geometry.mjs by hand. A town added, renamed, or
 * lengthened in content/site.json does not trigger a regeneration, so the
 * padding baked into the last generated map can go stale the moment
 * someone edits the town list, which is exactly what audit-map-fit.mjs
 * exists to catch.
 *
 * This is an advance-width estimate, not a real text measurement: it runs
 * at build time and in a plain Node audit script, neither of which has a
 * DOM or a canvas to measure real glyph widths, and the map component
 * itself must stay free of any post-paint measurement pass that would
 * shift the first frame. 0.6em per character is a deliberately generous
 * average for Inter at the weights these labels render at (500 to 800);
 * real mixed-case names with spaces run narrower than this for almost any
 * character, so this over-estimates on purpose rather than measuring
 * tight.
 */

export const CHAR_WIDTH_EM = 0.6;

/**
 * The largest font size and label offset a given town's mark can ever
 * actually render at. The anchor town (Wichita) always renders at its own
 * fixed, largest size regardless of selection; every other town reaches
 * the "selected" size the moment a visitor clicks it, so that, not its
 * quiet resting size, is every other town's worst case. Mirrors the
 * ternaries in ServiceAreaMap.tsx (isAnchor ? ... : isOn ? ... : ...).
 */
export function worstCaseMark(town) {
  return town.anchor ? { fontSize: 30, aboveDot: 34 } : { fontSize: 27, aboveDot: 30 };
}

/**
 * How far a town's label can reach past its own dot, as non-negative
 * distances [left, right, top, bottom] in the map's own coordinate units.
 * Horizontal reach is the full label width on both sides, not half of it:
 * the label can render start-, middle- or end-anchored depending where the
 * dot falls (see labelAnchor in ServiceAreaMap.tsx), so the safe bound is
 * "the whole label could land on either side", not an average case.
 */
export function labelExtent(town) {
  const { fontSize, aboveDot } = worstCaseMark(town);
  const width = town.name.length * CHAR_WIDTH_EM * fontSize;
  return {
    left: width,
    right: width,
    // The label's own text sits above "aboveDot" (its baseline offset from
    // the dot); the glyphs themselves rise further above that baseline,
    // roughly 0.8 of the font size for a typeface like this at these
    // weights.
    top: aboveDot + fontSize * 0.8,
    // The dot, its halo and (when selected) its ring extend a little below
    // center; a fixed allowance covers all three without needing to
    // duplicate their exact radii here.
    bottom: 26,
  };
}
