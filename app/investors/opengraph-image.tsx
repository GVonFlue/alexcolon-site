import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Investment property analysis in the Wichita area with Alexander Colón, At Home Wichita Real Estate.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("investors", "Send an address and get the numbers worked, including when they do not work");
}
