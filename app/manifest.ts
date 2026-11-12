import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Far But Together",
    short_name: "Far But Together",
    description:
      "A shared space for couples who live apart: daily check-ins, visit countdowns, and more.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eaf1f7",
    theme_color: "#bfddf2",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
