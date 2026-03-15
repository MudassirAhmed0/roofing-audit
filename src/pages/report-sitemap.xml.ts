import type { APIRoute } from "astro";
import { reports } from "../data/reports";

// Reports are synced manually via sync-reports.mjs. Update this date
// when new reports are added or existing ones change.
const REPORTS_LAST_SYNCED = "2026-03-09";

export const GET: APIRoute = async ({ site }) => {
  const siteUrl =
    import.meta.env.SITE_URL ||
    site?.href?.replace(/\/$/, "") ||
    "https://roofingaudit.co";

  const urls = [
    { loc: `${siteUrl}/reports/`, lastmod: REPORTS_LAST_SYNCED },
    ...reports.map((r) => ({
      loc: `${siteUrl}/report/${r.slug}/`,
      lastmod: REPORTS_LAST_SYNCED,
    })),
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
