#!/usr/bin/env node
/**
 * Regenerates lib/generated/wichitaMap.ts from real geometry.
 *
 * Source: US Census Bureau TIGER/Line 2023 shapefiles (public domain, no
 * attribution required, no API key). Downloaded fresh from
 * www2.census.gov and cached in .cache/tiger/ so a re-run does not
 * re-fetch ~8MB of shapefiles it already has.
 *
 * Sedgwick County is FIPS 20173, Butler County is FIPS 20015, Kansas is
 * state FIPS 20. Four layers:
 *   AREAWATER    (county)  the Arkansas and Little Arkansas as filled channels
 *   LINEARWATER  (county)  the same two rivers where they narrow past the
 *                          edge of the mapped channel polygon
 *   PRISECROADS  (state)   I-135, I-235, US-54/Kellogg, K-96, the Turnpike
 *   PLACE        (state)   the Wichita municipal boundary
 *
 * Everything is clipped to lon -97.65/-97.05, lat 37.48/37.86, simplified
 * with mapshaper, and reprojected into SVG path data with the same true
 * equirectangular projection ServiceAreaMap.tsx uses for the seven towns
 * in content/site.json, so geometry and town dots land in the same place
 * for the same coordinate.
 *
 * No school district layer, no shaded area: this file emits paths only,
 * never a fill keyed to anything but "this is where the water is."
 *
 * Run with: node scripts/build-map-geometry.mjs
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache", "tiger");
const WORK_DIR = path.join(CACHE_DIR, "work");
const OUT_FILE = path.join(ROOT, "lib", "generated", "wichitaMap.ts");
const MAPSHAPER = path.join(ROOT, "node_modules", ".bin", "mapshaper");

const YEAR = "2023";
const SEDGWICK = "20173";
const BUTLER = "20015";
const STATE = "20";

const BBOX = { lonMin: -97.65, latMin: 37.48, lonMax: -97.05, latMax: 37.86 };
const BBOX_ARG = `${BBOX.lonMin},${BBOX.latMin},${BBOX.lonMax},${BBOX.latMax}`;

const SOURCES = [
  { name: `tl_${YEAR}_${SEDGWICK}_areawater`, layer: "AREAWATER" },
  { name: `tl_${YEAR}_${BUTLER}_areawater`, layer: "AREAWATER" },
  { name: `tl_${YEAR}_${SEDGWICK}_linearwater`, layer: "LINEARWATER" },
  { name: `tl_${YEAR}_${BUTLER}_linearwater`, layer: "LINEARWATER" },
  { name: `tl_${YEAR}_${STATE}_prisecroads`, layer: "PRISECROADS" },
  { name: `tl_${YEAR}_${STATE}_place`, layer: "PLACE" },
];

/** Highway categories, matched by FULLNAME against what TIGER actually
 * ships for these roads in this clip. Kellogg carries the US-54 and
 * US-400 designations concurrently through Wichita and changes its
 * FULLNAME by segment (Kellogg St / Kellogg Ave / US Hwy 54); the
 * Turnpike is signed I-35 through this stretch and also carries its own
 * name. Verified against the actual clipped attribute table, not assumed. */
const ROAD_CATEGORIES = [
  { id: "i135", label: "I-135", test: /^I- ?135$/ },
  { id: "i235", label: "I-235", test: /^I- ?235$/ },
  { id: "kellogg", label: "US-54 / Kellogg", test: /Kellogg|US Hwy 54|US Hwy 400/i },
  { id: "k96", label: "K-96", test: /State Hwy 96|K.?96 Hwy/i },
  { id: "turnpike", label: "Kansas Turnpike", test: /Kansas Tpke|^I- ?35$/ },
];

function log(msg) {
  console.log(`[build-map-geometry] ${msg}`);
}

function download(name, layer) {
  const zipPath = path.join(CACHE_DIR, `${name}.zip`);
  if (existsSync(zipPath)) return zipPath;
  const url = `https://www2.census.gov/geo/tiger/TIGER${YEAR}/${layer}/${name}.zip`;
  log(`downloading ${url}`);
  const res = execFileSync("curl", ["-sS", "--fail", "--max-time", "60", url]);
  writeFileSync(zipPath, res);
  return zipPath;
}

function unzip(zipPath, name) {
  const dir = path.join(WORK_DIR, name);
  if (existsSync(path.join(dir, `${name}.shp`))) return dir;
  mkdirSync(dir, { recursive: true });
  execFileSync("unzip", ["-oq", zipPath, "-d", dir]);
  return dir;
}

function mapshaperTo(args, outFile) {
  execFileSync(MAPSHAPER, args, { cwd: WORK_DIR, stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(readFileSync(path.join(WORK_DIR, outFile), "utf8"));
}

function forceRing(coords) {
  return coords;
}

/** Flattens a Polygon/MultiPolygon feature list into an array of rings
 * (each ring an array of [lon, lat] pairs), dropping the inner/outer
 * distinction: this map never fills a water polygon with anything but a
 * flat "this is water" tone, so ring winding order does not matter. */
function ringsOf(features) {
  const rings = [];
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") {
      for (const r of g.coordinates) rings.push(forceRing(r));
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) for (const r of poly) rings.push(forceRing(r));
    }
  }
  return rings;
}

/** Flattens a LineString/MultiLineString feature list into an array of
 * lines (each an array of [lon, lat] pairs). */
function linesOf(features) {
  const lines = [];
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "LineString") lines.push(g.coordinates);
    else if (g.type === "MultiLineString") for (const l of g.coordinates) lines.push(l);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Projection. A true equirectangular projection (Plate Carrée scaled by
// cos(latitude) at the clip's center), not an independent-axis stretch: the
// two rivers and the highway grid only look like Wichita if a degree of
// longitude and a degree of latitude are drawn in their actual real-world
// ratio rather than each being stretched to fill a box on its own.
//
// This exact formula is written into the generated file below (PROJECT_SRC)
// so the module's own project() function and the paths built here can never
// drift apart: there is one copy of the arithmetic, used twice.
// ---------------------------------------------------------------------------

const LAT_CENTER = (BBOX.latMin + BBOX.latMax) / 2;
const COS_LAT = Math.cos((LAT_CENTER * Math.PI) / 180);
const SPAN_LON = (BBOX.lonMax - BBOX.lonMin) * COS_LAT;
const SPAN_LAT = BBOX.latMax - BBOX.latMin;

// World box in projected units, then scaled to a round pixel width. Height
// follows from the real aspect ratio instead of being chosen separately.
const VIEW_W = 900;
const VIEW_H = Math.round((VIEW_W * SPAN_LAT) / SPAN_LON);
const SCALE = VIEW_W / SPAN_LON;

const PROJECT_SRC = `
  const lonAdj = (lon - ${BBOX.lonMin}) * ${COS_LAT};
  const latAdj = ${BBOX.latMax} - lat;
  return { x: lonAdj * ${SCALE}, y: latAdj * ${SCALE} };
`;
const project = new Function("lon", "lat", PROJECT_SRC);

function fmt(n) {
  return Math.round(n * 10) / 10;
}

function ringPath(ring) {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  return `M${pts.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join("L")}Z`;
}

function linePath(line) {
  const pts = line.map(([lon, lat]) => project(lon, lat));
  return `M${pts.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join("L")}`;
}

function multiPath(paths) {
  return paths.join(" ");
}

/**
 * Finds where the Arkansas and Little Arkansas actually meet, so the
 * downtown skyline silhouette can anchor on the real confluence instead of
 * a remembered or estimated coordinate. Computed as the midpoint of the
 * closest pair of vertices between the two rivers' AREAWATER polygons,
 * which is a good approximation of a confluence for two channels wide
 * enough to be mapped as polygons rather than centerlines. Data-derived,
 * not drawn from memory, the same rule the rest of this file follows.
 */
function findConfluence(riverAreaFeatures) {
  const arkansas = riverAreaFeatures.filter((f) => f.properties.FULLNAME === "Arkansas Riv");
  const little = riverAreaFeatures.filter((f) => f.properties.FULLNAME === "Little Arkansas Riv");
  let best = null;
  let bestDist = Infinity;
  const ringsOfFeature = (f) => (f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat(1));
  for (const a of arkansas) {
    for (const ring of ringsOfFeature(a)) {
      for (const [alon, alat] of ring) {
        for (const l of little) {
          for (const lring of ringsOfFeature(l)) {
            for (const [llon, llat] of lring) {
              const d = (alon - llon) ** 2 + (alat - llat) ** 2;
              if (d < bestDist) {
                bestDist = d;
                best = { lon: (alon + llon) / 2, lat: (alat + llat) / 2 };
              }
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error("Could not locate an Arkansas / Little Arkansas confluence in the clipped data.");
  return best;
}

function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(WORK_DIR, { recursive: true });

  for (const s of SOURCES) {
    const zip = download(s.name, s.layer);
    unzip(zip, s.name);
  }

  const sedgwickWater = path.join(WORK_DIR, `tl_${YEAR}_${SEDGWICK}_areawater`, `tl_${YEAR}_${SEDGWICK}_areawater.shp`);
  const butlerWater = path.join(WORK_DIR, `tl_${YEAR}_${BUTLER}_areawater`, `tl_${YEAR}_${BUTLER}_areawater.shp`);
  const sedgwickLine = path.join(WORK_DIR, `tl_${YEAR}_${SEDGWICK}_linearwater`, `tl_${YEAR}_${SEDGWICK}_linearwater.shp`);
  const butlerLine = path.join(WORK_DIR, `tl_${YEAR}_${BUTLER}_linearwater`, `tl_${YEAR}_${BUTLER}_linearwater.shp`);
  const roadsShp = path.join(WORK_DIR, `tl_${YEAR}_${STATE}_prisecroads`, `tl_${YEAR}_${STATE}_prisecroads.shp`);
  const placeShp = path.join(WORK_DIR, `tl_${YEAR}_${STATE}_place`, `tl_${YEAR}_${STATE}_place.shp`);

  log("filtering + clipping + simplifying river channels (AREAWATER)");
  const riverArea = mapshaperTo(
    [
      "-i",
      sedgwickWater,
      butlerWater,
      "combine-files",
      "-merge-layers",
      "force",
      "-filter",
      '!!FULLNAME && FULLNAME.indexOf("Arkansas") > -1',
      "-clip",
      `bbox=${BBOX_ARG}`,
      "-simplify",
      "12%",
      "keep-shapes",
      "-o",
      "format=geojson",
      "precision=0.00001",
      "force",
      "river-area.json",
    ],
    "river-area.json",
  );

  log("filtering + clipping river centerlines (LINEARWATER)");
  const riverLine = mapshaperTo(
    [
      "-i",
      sedgwickLine,
      butlerLine,
      "combine-files",
      "-merge-layers",
      "force",
      "-filter",
      '!!FULLNAME && FULLNAME.indexOf("Arkansas") > -1',
      "-clip",
      `bbox=${BBOX_ARG}`,
      "-simplify",
      "20%",
      "keep-shapes",
      "-o",
      "format=geojson",
      "precision=0.00001",
      "force",
      "river-line.json",
    ],
    "river-line.json",
  );

  log("clipping + simplifying primary/secondary roads (PRISECROADS)");
  const roadsAll = mapshaperTo(
    [
      "-i",
      roadsShp,
      "-clip",
      `bbox=${BBOX_ARG}`,
      "-simplify",
      "15%",
      "keep-shapes",
      "-o",
      "format=geojson",
      "precision=0.00001",
      "force",
      "roads.json",
    ],
    "roads.json",
  );

  log("filtering + simplifying the Wichita municipal boundary (PLACE)");
  const wichitaPlace = mapshaperTo(
    [
      "-i",
      placeShp,
      "-filter",
      'NAME=="Wichita"',
      "-clip",
      `bbox=${BBOX_ARG}`,
      "-simplify",
      "8%",
      "keep-shapes",
      "-o",
      "format=geojson",
      "precision=0.00001",
      "force",
      "wichita-place.json",
    ],
    "wichita-place.json",
  );

  // --- build path data -----------------------------------------------------

  const riverAreaPaths = ringsOf(riverArea.features).map(ringPath);
  const riverLinePaths = linesOf(riverLine.features).map(linePath);

  const roads = ROAD_CATEGORIES.map((cat) => {
    const feats = roadsAll.features.filter((f) => cat.test.test(f.properties.FULLNAME || ""));
    const d = multiPath(linesOf(feats).map(linePath));
    return { id: cat.id, label: cat.label, d, segments: feats.length };
  });

  const boundaryPaths = ringsOf(wichitaPlace.features).map(ringPath);

  const confluenceLonLat = findConfluence(riverArea.features);
  const confluence = project(confluenceLonLat.lon, confluenceLonLat.lat);
  log(`confluence at ${confluenceLonLat.lon.toFixed(5)}, ${confluenceLonLat.lat.toFixed(5)} -> (${confluence.x.toFixed(1)}, ${confluence.y.toFixed(1)})`);

  for (const r of roads) {
    if (r.segments === 0) {
      throw new Error(`No PRISECROADS segments matched "${r.label}" (${r.test}) inside the clip bbox.`);
    }
  }
  if (riverAreaPaths.length === 0) throw new Error("No AREAWATER Arkansas River polygons found in the clip.");
  if (boundaryPaths.length === 0) throw new Error("No PLACE boundary found for Wichita in the clip.");

  // --- write the generated module ------------------------------------------

  const totalBytes = Buffer.byteLength(
    riverAreaPaths.join("") + riverLinePaths.join("") + roads.map((r) => r.d).join("") + boundaryPaths.join(""),
    "utf8",
  );
  log(`path data: ${(totalBytes / 1024).toFixed(1)}KB`);

  mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  const banner = `/**
 * GENERATED FILE. Do not hand-edit.
 *
 * Produced by scripts/build-map-geometry.mjs from US Census Bureau
 * TIGER/Line ${YEAR} shapefiles (public domain): Sedgwick County (20173) and
 * Butler County (20015) AREAWATER and LINEARWATER for the Arkansas and
 * Little Arkansas rivers, Kansas (20) PRISECROADS for I-135, I-235,
 * US-54/Kellogg, K-96 and the Turnpike, and Kansas (20) PLACE for the
 * Wichita municipal boundary. Clipped to lon ${BBOX.lonMin}/${BBOX.lonMax},
 * lat ${BBOX.latMin}/${BBOX.latMax} and simplified with mapshaper.
 *
 * Path data is ${(totalBytes / 1024).toFixed(1)}KB.
 *
 * project() below is the single true equirectangular projection (Plate
 * Carrée scaled by cos(latitude) at this bbox's center) used both to build
 * these paths and, at runtime, to place the seven towns in
 * content/site.json on the same ground. Do not replace it with an
 * independent-axis stretch: that is what distorts the rivers into
 * something that does not read as this city.
 *
 * Regenerate with: node scripts/build-map-geometry.mjs
 */

export const VIEW_W = ${VIEW_W};
export const VIEW_H = ${VIEW_H};

export const BOUNDS = {
  lonMin: ${BBOX.lonMin},
  lonMax: ${BBOX.lonMax},
  latMin: ${BBOX.latMin},
  latMax: ${BBOX.latMax},
};

/**
 * Where the Arkansas and the Little Arkansas actually meet, in this
 * module's coordinate space: the midpoint of the closest pair of vertices
 * between the two rivers' AREAWATER polygons (see findConfluence in the
 * build script). This is what the downtown skyline silhouette anchors on,
 * so it sits where the real confluence is rather than an eyeballed spot.
 */
export const CONFLUENCE = ${JSON.stringify(confluence)};

/** Projects a lon/lat pair into this module's SVG coordinate space. */
export function project(lon: number, lat: number): { x: number; y: number } {
  ${PROJECT_SRC.trim()}
}

/** Filled river channels, from AREAWATER. One path per polygon ring. */
export const RIVER_AREA_PATHS: string[] = ${JSON.stringify(riverAreaPaths)};

/** River centerlines where the channel narrows past the mapped polygon,
 * from LINEARWATER. */
export const RIVER_LINE_PATHS: string[] = ${JSON.stringify(riverLinePaths)};

export type RoadPath = { id: string; label: string; d: string };

/** I-135, I-235, US-54/Kellogg, K-96 and the Turnpike, from PRISECROADS. */
export const ROAD_PATHS: RoadPath[] = ${JSON.stringify(
    roads.map((r) => ({ id: r.id, label: r.label, d: r.d })),
    null,
    2,
  )};

/** The Wichita municipal boundary, from PLACE: one closed polygon ring per
 * piece of the city limit. Whether and how this is painted (stroke, a flat
 * uniform fill, or both) is a fair-housing-checked styling decision made
 * where it is used, not here; see ServiceAreaMap.tsx. */
export const MUNICIPAL_BOUNDARY_PATHS: string[] = ${JSON.stringify(boundaryPaths)};
`;

  writeFileSync(OUT_FILE, banner);
  log(`wrote ${path.relative(ROOT, OUT_FILE)}`);
}

main();
