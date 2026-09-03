import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "VA loan home buying in the Wichita area with Alexander Colón, At Home Wichita Real Estate.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage("veterans", "Buying with a VA loan when the timeline is not yours to set");
}
