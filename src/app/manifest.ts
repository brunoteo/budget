import type { MetadataRoute } from "next";
import { copy } from "@/lib/copy";

const TERRA_500 = "#bb5a3c";   // culori formatHex of oklch(0.581 0.133 38)
const CLAY_50   = "#fcf5f0";   // culori formatHex of oklch(0.974 0.010 60)

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: copy.app.title,
    short_name: copy.app.shortName,
    description: copy.app.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: CLAY_50,
    theme_color: TERRA_500,
    lang: "it",
    icons: [
      { src: "/icon-192.png",      sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png",      sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-mask-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
