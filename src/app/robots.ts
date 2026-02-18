import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/portfolio",
          "/chat",
          "/profile",
          "/onboarding",
          "/transactions",
          "/fiscal",
          "/retirement",
          "/achievements",
          "/billing",
          "/api/",
          "/callback",
        ],
      },
    ],
    sitemap: "https://wealthpilot.ca/sitemap.xml",
  };
}
