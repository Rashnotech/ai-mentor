import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rashnotech Learning Platform",
    short_name: "Rashnotech",
    description: "Project-based technology learning, mentorship, and career development.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1f2e",
    theme_color: "#2563eb",
    icons: [{ src: "/mylogo.png", sizes: "any", type: "image/png" }],
  }
}
