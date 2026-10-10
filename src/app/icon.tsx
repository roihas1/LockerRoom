import { renderAppIcon } from "@/lib/og/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(size.width);
}
