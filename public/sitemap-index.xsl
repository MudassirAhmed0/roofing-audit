<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" indent="yes" encoding="UTF-8"/>
<xsl:template match="/">
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>Sitemap Index — Roofing Audit</title>
  <style>
    *{margin:0;box-sizing:border-box}
    body{font-family:'Geist',system-ui,sans-serif;background:#1c1917;color:#fafaf9;padding:3rem 2rem;min-height:100vh}
    .c{max-width:720px;margin:0 auto}
    .b{display:flex;align-items:center;gap:.5rem;margin-bottom:2rem}
    .bd{width:8px;height:8px;border-radius:2px;background:#d97706}
    .bn{font-size:.875rem;font-weight:600;letter-spacing:-.02em}
    h1{font-size:1.5rem;font-weight:700;letter-spacing:-.03em;margin-bottom:.5rem}
    .st{font-size:.8125rem;color:#78716c;margin-bottom:2.5rem}
    .ct{color:#d97706}
    .list{display:flex;flex-direction:column;gap:1px;border:1px solid #3f3f46;border-radius:2px;overflow:hidden}
    .row{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;background:#292524}
    .row:hover{background:#3f3f46}
    a{color:#d97706;text-decoration:none;font-size:.875rem;font-weight:500}
    a:hover{text-decoration:underline;color:#b45309}
    .ar{color:#57534e}
  </style>
</head>
<body>
  <div class="c">
    <div class="b"><div class="bd"/><span class="bn">Roofing Audit</span></div>
    <h1>Sitemap Index</h1>
    <p class="st"><span class="ct"><xsl:value-of select="count(s:sitemapindex/s:sitemap)"/></span> sitemaps</p>
    <div class="list">
      <xsl:for-each select="s:sitemapindex/s:sitemap">
        <div class="row">
          <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
          <span class="ar">→</span>
        </div>
      </xsl:for-each>
    </div>
  </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
