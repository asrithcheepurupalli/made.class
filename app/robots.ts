import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://made.class";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // app screens are auth-gated; keep crawlers on the marketing surface
        disallow: ["/today", "/attendance", "/fees", "/students", "/notices", "/outbox", "/settings", "/my-class", "/diary", "/collect", "/dues"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
