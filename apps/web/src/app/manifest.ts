import type { MetadataRoute } from "next";

/** PWA manifest: "Add to Home Screen" makes Dhaga a standalone phone app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dhaga — every thread, remembered",
    short_name: "Dhaga",
    description:
      "A private, open-source personal CRM for remembering context, searching your network, and following up.",
    start_url: "/app",
    display: "standalone",
    background_color: "#101112",
    theme_color: "#101112",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
