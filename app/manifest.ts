import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "made.class — School OS",
    short_name: "made.class",
    description: "Attendance, fees and parent communication for Indian schools.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBFAF6",
    theme_color: "#17191E",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
