import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
  const siteUrl =
    import.meta.env.SITE_URL ||
    site?.href?.replace(/\/$/, "") ||
    "https://roofingaudit.co";

  const urls = [
    { loc: `${siteUrl}/`, lastmod: "2026-03-13" },
    { loc: `${siteUrl}/about/`, lastmod: "2026-03-07" },
    { loc: `${siteUrl}/privacy/`, lastmod: "2026-01-15" },
    { loc: `${siteUrl}/terms/`, lastmod: "2026-01-15" },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
