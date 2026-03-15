import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const siteUrl =
    import.meta.env.SITE_URL ||
    site?.href?.replace(/\/$/, "") ||
    "https://roofingaudit.co";

  const blogPosts = await getCollection("blog");
  const sortedPosts = blogPosts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  const urls: { loc: string; lastmod: string }[] = [];

  // Blog index only (no pagination pages)
  urls.push({
    loc: `${siteUrl}/blog/`,
    lastmod: sortedPosts[0]?.data.date.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
  });

  // Individual blog posts
  for (const post of sortedPosts) {
    urls.push({
      loc: `${siteUrl}/blog/${post.id.replace(/\.md$/, "")}/`,
      lastmod: (post.data.lastModified || post.data.date).toISOString().split("T")[0],
    });
  }

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
