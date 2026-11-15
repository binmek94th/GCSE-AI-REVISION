import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "StudyCedo",
        short_name: "StudyCedo",
        description: SITE_DESCRIPTION,
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#7c3aed",
        icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
    };
}
