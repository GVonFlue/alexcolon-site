import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Buying a house in the Wichita area with Alexander Colón, At Home Wichita Real Estate.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("buy", "What buying here costs, before anyone runs your credit");
}
