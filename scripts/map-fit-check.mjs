/**
 * Shared between scripts/audit-map-fit.mjs (the real, permanent audit) and
 * the negative test in scripts/audit-negative.mjs (which proves this can
 * actually fail, by feeding it a deliberately long fake town name).
 */
import { labelExtent } from "./map-label-metrics.mjs";

/**
 * Checks whether every town's label extent sits inside a map's viewBox.
 * `map` needs only `project`, `VIEW_W` and `VIEW_H`, so this works against
 * either the real generated module or a small stand-in used by a test.
 */
export function checkMapFit(towns, map) {
  const { project, VIEW_W, VIEW_H } = map;
  const violations = [];
  for (const t of towns) {
    const p = project(t.lon, t.lat);
    const ext = labelExtent(t);
    if (p.x - ext.left < 0) {
      violations.push(`${t.name}: label runs ${(ext.left - p.x).toFixed(0)} units past the left edge`);
    }
    if (p.x + ext.right > VIEW_W) {
      violations.push(`${t.name}: label runs ${(p.x + ext.right - VIEW_W).toFixed(0)} units past the right edge`);
    }
    if (p.y - ext.top < 0) {
      violations.push(`${t.name}: label runs ${(ext.top - p.y).toFixed(0)} units past the top edge`);
    }
    if (p.y + ext.bottom > VIEW_H) {
      violations.push(`${t.name}: label runs ${(p.y + ext.bottom - VIEW_H).toFixed(0)} units past the bottom edge`);
    }
  }
  return { ok: violations.length === 0, violations };
}
