import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Selling a house in the Wichita area with Alexander Colón, At Home Wichita Real Estate.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("sell", "What your house is worth, with the comparable sales attached");
}
