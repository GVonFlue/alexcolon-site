import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

/**
 * The default card, used by every route that does not define its own. See
 * lib/og.tsx for why this exists at all: Alex's primary action is a text
 * message, so the link preview is the first thing most people see.
 */
export const alt = "Alexander Colón, At Home Wichita Real Estate. Straight answers about buying and selling in the Wichita area.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("home");
}
