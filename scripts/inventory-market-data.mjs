/**
 * Market Data Inventory — Run BEFORE building market pages.
 *
 * Queries creative-axe PostgreSQL and reports:
 * 1. Leads per city/state (total + deep audited)
 * 2. Cities crossing 10+ threshold
 * 3. Aggregate stats per qualifying city
 * 4. State + national rollups
 * 5. Gap frequency analysis (from enrichment booleans + deep audit gapSummary)
 * 6. Sub-niche distribution
 * 7. Website quality score simulation
 *
 * Usage: export $(cat .env | xargs) && node scripts/inventory-market-data.mjs
 */

import pgPkg from "pg";
const { Client } = pgPkg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: DATABASE_URL env var is required");
  process.exit(1);
}

const CITY_THRESHOLD = 10;
const STATE_THRESHOLD = 20;

// ── Helpers ─────────────────────────────────────────────────────────
function pct(n, total) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function avg(sum, count) {
  if (!count) return 0;
  return Math.round((sum / count) * 10) / 10;
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function rpad(str, len) {
  return String(str).padStart(len);
}

// ── Website Quality Score (simplified) ──────────────────────────────
// Uses direct enrichment columns (available for all enriched leads)
function calcSimplifiedScore(row) {
  let score = 0;
  if (row.has_ssl) score += 15;
  if (row.has_online_booking) score += 15;
  if (row.has_reviews_displayed) score += 15;
  if (row.has_clear_cta) score += 10;
  if (row.has_contact_form) score += 10;
  if (row.is_mobile_responsive) score += 10;
  if (row.has_meta_seo) score += 10;
  if (row.page_speed_seconds !== null && row.page_speed_seconds <= 3) score += 15;
  return score;
}

// ── Website Quality Score (full, from deep audit) ───────────────────
function calcDeepScore(audit) {
  if (!audit) return null;
  let score = 0;

  // Speed (0-20)
  const speed = audit.pageSpeedSeconds ?? 20;
  score += Math.max(0, 20 - Math.max(0, (speed - 2) * 2));

  // Trust (0-20)
  if (audit.hasSsl) score += 5;
  if (audit.httpRedirectsToHttps) score += 5;
  if (audit.hasLicenseNumber) score += 5;
  if (audit.hasReviewsOnSite) score += 5;

  // Lead Capture (0-25)
  if (audit.hasClearCtaAboveFold) score += 5;
  if (audit.hasClickToCall) score += 5;
  if (audit.hasBookingWidget) score += 5;
  if (audit.hasContactForm) score += 5;
  if (audit.hasAfterHoursCapture) score += 5;

  // SEO (0-15)
  if (audit.hasMetaTitle && audit.hasMetaDescription) score += 5;
  if (audit.hasLocalBusinessSchema) score += 5;
  if (audit.hasXmlSitemap) score += 5;

  // Content (0-10)
  if ((audit.serviceAreaPageCount ?? 0) > 0) score += 5;
  if (audit.hasAboutPage) score += 5;

  // Mobile (0-10)
  // isMobileResponsive check — deep audit checks viewport meta
  const hasMobileViewport = audit.isMobileResponsive ?? true; // most sites have it
  if (hasMobileViewport) score += 5;
  if (audit.hasStickyContactOnMobile) score += 5;

  return Math.round(score);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to database.\n");

  // ─── 1. Total counts ──────────────────────────────────────────────
  const totalRes = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE niche_audit IS NOT NULL) as deep_audited,
      COUNT(*) FILTER (WHERE status = 'enriched' OR status = 'contacted' OR status = 'closed') as enriched
    FROM leads
    WHERE category = 'house_cleaning'
  `);
  const totals = totalRes.rows[0];
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    MARKET DATA INVENTORY");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`  Total cleaning leads:     ${totals.total}`);
  console.log(`  Enriched:             ${totals.enriched}`);
  console.log(`  Deep audited:         ${totals.deep_audited}`);
  console.log();

  // ─── 2. By state ──────────────────────────────────────────────────
  const stateRes = await client.query(`
    SELECT
      state,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE niche_audit IS NOT NULL) as deep_audited,
      AVG(page_speed_seconds) FILTER (WHERE page_speed_seconds IS NOT NULL) as avg_speed,
      COUNT(*) FILTER (WHERE has_ssl = true)::float / NULLIF(COUNT(*), 0) as ssl_rate,
      COUNT(*) FILTER (WHERE has_online_booking = true)::float / NULLIF(COUNT(*), 0) as booking_rate,
      COUNT(*) FILTER (WHERE has_reviews_displayed = true)::float / NULLIF(COUNT(*), 0) as reviews_rate,
      COUNT(*) FILTER (WHERE has_clear_cta = true)::float / NULLIF(COUNT(*), 0) as cta_rate,
      COUNT(*) FILTER (WHERE has_contact_form = true)::float / NULLIF(COUNT(*), 0) as form_rate,
      COUNT(*) FILTER (WHERE is_mobile_responsive = true)::float / NULLIF(COUNT(*), 0) as mobile_rate,
      COUNT(*) FILTER (WHERE has_meta_seo = true)::float / NULLIF(COUNT(*), 0) as seo_rate
    FROM leads
    WHERE category = 'house_cleaning' AND state IS NOT NULL
    GROUP BY state
    ORDER BY total DESC
  `);

  console.log("─── STATES ────────────────────────────────────────────────────\n");
  console.log(`  ${pad("State", 8)} ${rpad("Total", 6)} ${rpad("Deep", 6)} ${rpad("Speed", 7)} ${rpad("SSL", 5)} ${rpad("Book", 5)} ${rpad("Rev", 5)} ${rpad("CTA", 5)} ${rpad("Form", 5)} ${rpad("Mob", 5)} ${rpad("SEO", 5)} Status`);
  console.log("  " + "─".repeat(80));

  for (const row of stateRes.rows) {
    const status = parseInt(row.total) >= STATE_THRESHOLD ? "✅" : "❌";
    console.log(
      `  ${pad(row.state, 8)} ${rpad(row.total, 6)} ${rpad(row.deep_audited, 6)} ${rpad(avg(row.avg_speed, 1) + "s", 7)} ${rpad(pct(row.ssl_rate, 1), 5)} ${rpad(pct(row.booking_rate, 1), 5)} ${rpad(pct(row.reviews_rate, 1), 5)} ${rpad(pct(row.cta_rate, 1), 5)} ${rpad(pct(row.form_rate, 1), 5)} ${rpad(pct(row.mobile_rate, 1), 5)} ${rpad(pct(row.seo_rate, 1), 5)} ${status}`
    );
  }
  console.log();

  // ─── 3. By city ───────────────────────────────────────────────────
  const cityRes = await client.query(`
    SELECT
      city, state,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE niche_audit IS NOT NULL) as deep_audited,
      AVG(page_speed_seconds) FILTER (WHERE page_speed_seconds IS NOT NULL) as avg_speed,
      COUNT(*) FILTER (WHERE has_ssl = true)::float / NULLIF(COUNT(*), 0) as ssl_rate,
      COUNT(*) FILTER (WHERE has_online_booking = true)::float / NULLIF(COUNT(*), 0) as booking_rate,
      COUNT(*) FILTER (WHERE has_reviews_displayed = true)::float / NULLIF(COUNT(*), 0) as reviews_rate,
      COUNT(*) FILTER (WHERE has_clear_cta = true)::float / NULLIF(COUNT(*), 0) as cta_rate,
      COUNT(*) FILTER (WHERE has_contact_form = true)::float / NULLIF(COUNT(*), 0) as form_rate,
      COUNT(*) FILTER (WHERE is_mobile_responsive = true)::float / NULLIF(COUNT(*), 0) as mobile_rate,
      COUNT(*) FILTER (WHERE has_meta_seo = true)::float / NULLIF(COUNT(*), 0) as seo_rate,
      AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating,
      AVG(review_count) FILTER (WHERE review_count IS NOT NULL) as avg_reviews
    FROM leads
    WHERE category = 'house_cleaning' AND city IS NOT NULL AND state IS NOT NULL
    GROUP BY city, state
    ORDER BY total DESC
  `);

  const qualifyingCities = cityRes.rows.filter((r) => parseInt(r.total) >= CITY_THRESHOLD);
  const belowThreshold = cityRes.rows.filter((r) => parseInt(r.total) < CITY_THRESHOLD);

  console.log("─── CITIES (10+ leads) ────────────────────────────────────────\n");
  console.log(`  ${pad("City", 25)} ${rpad("St", 3)} ${rpad("Total", 6)} ${rpad("Deep", 6)} ${rpad("Speed", 7)} ${rpad("SSL", 5)} ${rpad("Book", 5)} ${rpad("Rev", 5)} ${rpad("CTA", 5)} ${rpad("Form", 5)} ${rpad("Rat", 5)} ${rpad("GRev", 5)}`);
  console.log("  " + "─".repeat(90));

  for (const row of qualifyingCities) {
    console.log(
      `  ${pad(row.city, 25)} ${rpad(row.state, 3)} ${rpad(row.total, 6)} ${rpad(row.deep_audited, 6)} ${rpad(avg(row.avg_speed, 1) + "s", 7)} ${rpad(pct(row.ssl_rate, 1), 5)} ${rpad(pct(row.booking_rate, 1), 5)} ${rpad(pct(row.reviews_rate, 1), 5)} ${rpad(pct(row.cta_rate, 1), 5)} ${rpad(pct(row.form_rate, 1), 5)} ${rpad(avg(row.avg_rating, 1), 5)} ${rpad(Math.round(row.avg_reviews || 0), 5)}`
    );
  }

  console.log(`\n  Qualifying cities: ${qualifyingCities.length}`);
  console.log(`  Below threshold: ${belowThreshold.length} cities with <${CITY_THRESHOLD} leads`);
  if (belowThreshold.length > 0) {
    const belowList = belowThreshold.slice(0, 10).map((r) => `${r.city}, ${r.state} (${r.total})`).join("; ");
    console.log(`  Examples: ${belowList}${belowThreshold.length > 10 ? "..." : ""}`);
  }
  console.log();

  // ─── 4. National aggregates ───────────────────────────────────────
  const natRes = await client.query(`
    SELECT
      AVG(page_speed_seconds) FILTER (WHERE page_speed_seconds IS NOT NULL) as avg_speed,
      COUNT(*) FILTER (WHERE has_ssl = true)::float / NULLIF(COUNT(*) FILTER (WHERE has_ssl IS NOT NULL), 0) as ssl_rate,
      COUNT(*) FILTER (WHERE has_online_booking = true)::float / NULLIF(COUNT(*) FILTER (WHERE has_online_booking IS NOT NULL), 0) as booking_rate,
      COUNT(*) FILTER (WHERE has_reviews_displayed = true)::float / NULLIF(COUNT(*) FILTER (WHERE has_reviews_displayed IS NOT NULL), 0) as reviews_rate,
      COUNT(*) FILTER (WHERE has_clear_cta = true)::float / NULLIF(COUNT(*) FILTER (WHERE has_clear_cta IS NOT NULL), 0) as cta_rate,
      COUNT(*) FILTER (WHERE has_contact_form = true)::float / NULLIF(COUNT(*) FILTER (WHERE has_contact_form IS NOT NULL), 0) as form_rate,
      COUNT(*) FILTER (WHERE is_mobile_responsive = true)::float / NULLIF(COUNT(*) FILTER (WHERE is_mobile_responsive IS NOT NULL), 0) as mobile_rate,
      COUNT(*) FILTER (WHERE has_meta_seo = true)::float / NULLIF(COUNT(*) FILTER (WHERE has_meta_seo IS NOT NULL), 0) as seo_rate,
      AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating,
      AVG(review_count) FILTER (WHERE review_count IS NOT NULL) as avg_reviews
    FROM leads
    WHERE category = 'house_cleaning'
  `);
  const nat = natRes.rows[0];

  console.log("─── NATIONAL AVERAGES ─────────────────────────────────────────\n");
  console.log(`  Avg speed:              ${avg(nat.avg_speed, 1)}s`);
  console.log(`  SSL rate:               ${pct(nat.ssl_rate, 1)}`);
  console.log(`  Online booking rate:    ${pct(nat.booking_rate, 1)}`);
  console.log(`  Reviews displayed rate: ${pct(nat.reviews_rate, 1)}`);
  console.log(`  CTA above fold rate:    ${pct(nat.cta_rate, 1)}`);
  console.log(`  Contact form rate:      ${pct(nat.form_rate, 1)}`);
  console.log(`  Mobile responsive rate: ${pct(nat.mobile_rate, 1)}`);
  console.log(`  SEO basics rate:        ${pct(nat.seo_rate, 1)}`);
  console.log(`  Avg Google rating:      ${avg(nat.avg_rating, 1)}`);
  console.log(`  Avg review count:       ${Math.round(nat.avg_reviews || 0)}`);
  console.log();

  // ─── 5. Gap frequency from enrichment booleans ────────────────────
  const gapRes = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE has_ssl IS NOT NULL) as ssl_checked,
      COUNT(*) FILTER (WHERE has_ssl = false) as no_ssl,
      COUNT(*) FILTER (WHERE has_online_booking IS NOT NULL) as booking_checked,
      COUNT(*) FILTER (WHERE has_online_booking = false) as no_booking,
      COUNT(*) FILTER (WHERE has_reviews_displayed IS NOT NULL) as reviews_checked,
      COUNT(*) FILTER (WHERE has_reviews_displayed = false) as no_reviews,
      COUNT(*) FILTER (WHERE has_clear_cta IS NOT NULL) as cta_checked,
      COUNT(*) FILTER (WHERE has_clear_cta = false) as no_cta,
      COUNT(*) FILTER (WHERE has_contact_form IS NOT NULL) as form_checked,
      COUNT(*) FILTER (WHERE has_contact_form = false) as no_form,
      COUNT(*) FILTER (WHERE is_mobile_responsive IS NOT NULL) as mobile_checked,
      COUNT(*) FILTER (WHERE is_mobile_responsive = false) as no_mobile,
      COUNT(*) FILTER (WHERE has_meta_seo IS NOT NULL) as seo_checked,
      COUNT(*) FILTER (WHERE has_meta_seo = false) as no_seo,
      COUNT(*) FILTER (WHERE page_speed_seconds IS NOT NULL) as speed_checked,
      COUNT(*) FILTER (WHERE page_speed_seconds > 3) as slow_speed
    FROM leads
    WHERE category = 'house_cleaning'
  `);
  const gaps = gapRes.rows[0];

  console.log("─── GAP FREQUENCY (from enrichment booleans) ──────────────────\n");

  const gapList = [
    { name: "No online booking", count: parseInt(gaps.no_booking), checked: parseInt(gaps.booking_checked) },
    { name: "No reviews displayed", count: parseInt(gaps.no_reviews), checked: parseInt(gaps.reviews_checked) },
    { name: "No clear CTA above fold", count: parseInt(gaps.no_cta), checked: parseInt(gaps.cta_checked) },
    { name: "No contact form", count: parseInt(gaps.no_form), checked: parseInt(gaps.form_checked) },
    { name: "No SSL", count: parseInt(gaps.no_ssl), checked: parseInt(gaps.ssl_checked) },
    { name: "Not mobile responsive", count: parseInt(gaps.no_mobile), checked: parseInt(gaps.mobile_checked) },
    { name: "Missing SEO basics", count: parseInt(gaps.no_seo), checked: parseInt(gaps.seo_checked) },
    { name: "Slow page load (>3s)", count: parseInt(gaps.slow_speed), checked: parseInt(gaps.speed_checked) },
  ].sort((a, b) => (b.count / b.checked) - (a.count / a.checked));

  for (const g of gapList) {
    const freq = g.checked > 0 ? Math.round((g.count / g.checked) * 100) : 0;
    console.log(`  ${pad(g.name, 30)} ${rpad(g.count, 5)} / ${rpad(g.checked, 5)} = ${rpad(freq + "%", 5)}`);
  }
  console.log();

  // ─── 6. Deep audit gap frequency from gapSummary JSONB ────────────
  const deepGapRes = await client.query(`
    SELECT
      gap_item->>'gap' as gap_name,
      gap_item->>'severity' as gap_severity,
      gap_item->>'category' as gap_category,
      COUNT(*) as occurrences
    FROM leads,
    LATERAL jsonb_array_elements(niche_audit->'gapSummary') as gap_item
    WHERE leads.category = 'house_cleaning'
      AND niche_audit IS NOT NULL
      AND jsonb_typeof(niche_audit->'gapSummary') = 'array'
    GROUP BY gap_item->>'gap', gap_item->>'severity', gap_item->>'category'
    ORDER BY occurrences DESC
    LIMIT 25
  `);

  console.log("─── DEEP AUDIT GAP FREQUENCY (from nicheAudit.gapSummary) ─────\n");
  console.log(`  ${pad("Gap", 45)} ${rpad("Count", 6)} ${pad("Severity", 10)} ${pad("Category", 15)}`);
  console.log("  " + "─".repeat(80));
  for (const row of deepGapRes.rows) {
    console.log(
      `  ${pad(row.gap_name?.substring(0, 44) || "?", 45)} ${rpad(row.occurrences, 6)} ${pad(row.gap_severity || "-", 10)} ${pad(row.gap_category || "-", 15)}`
    );
  }
  console.log();

  // ─── 7. Sub-niche distribution ────────────────────────────────────
  const subNicheRes = await client.query(`
    SELECT
      sub_niche,
      COUNT(*) as leads_with
    FROM leads,
    LATERAL jsonb_array_elements_text(
      CASE
        WHEN sub_niches IS NOT NULL AND jsonb_typeof(sub_niches) = 'array'
        THEN sub_niches
        ELSE '[]'::jsonb
      END
    ) as sub_niche
    WHERE category = 'house_cleaning'
    GROUP BY sub_niche
    ORDER BY leads_with DESC
  `);

  console.log("─── SUB-NICHE DISTRIBUTION ────────────────────────────────────\n");
  for (const row of subNicheRes.rows) {
    console.log(`  ${pad(row.sub_niche, 25)} ${rpad(row.leads_with, 5)} leads (${pct(parseInt(row.leads_with), parseInt(totals.total))})`);
  }
  console.log();

  // ─── 8. Website Quality Score simulation ──────────────────────────
  // Calculate simplified scores for all enriched leads to see distribution
  const scoreSimRes = await client.query(`
    SELECT
      id, city, state,
      has_ssl, has_online_booking, has_reviews_displayed,
      has_clear_cta, has_contact_form, is_mobile_responsive,
      has_meta_seo, page_speed_seconds, niche_audit
    FROM leads
    WHERE category = 'house_cleaning'
      AND (has_ssl IS NOT NULL OR has_online_booking IS NOT NULL)
  `);

  const simplifiedScores = [];
  const deepScores = [];

  for (const row of scoreSimRes.rows) {
    const simScore = calcSimplifiedScore(row);
    simplifiedScores.push(simScore);

    if (row.niche_audit) {
      const dScore = calcDeepScore(row.niche_audit);
      if (dScore !== null) deepScores.push(dScore);
    }
  }

  // Distribution buckets
  function bucketize(scores) {
    const buckets = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    for (const s of scores) {
      if (s <= 20) buckets["0-20"]++;
      else if (s <= 40) buckets["21-40"]++;
      else if (s <= 60) buckets["41-60"]++;
      else if (s <= 80) buckets["61-80"]++;
      else buckets["81-100"]++;
    }
    return buckets;
  }

  const simAvg = simplifiedScores.length > 0
    ? Math.round(simplifiedScores.reduce((a, b) => a + b, 0) / simplifiedScores.length)
    : 0;
  const deepAvg = deepScores.length > 0
    ? Math.round(deepScores.reduce((a, b) => a + b, 0) / deepScores.length)
    : 0;

  console.log("─── WEBSITE QUALITY SCORE SIMULATION ──────────────────────────\n");
  console.log("  Simplified Score (all enriched leads):");
  console.log(`    Sample: ${simplifiedScores.length} leads`);
  console.log(`    Average: ${simAvg}/100`);
  console.log(`    Min: ${Math.min(...simplifiedScores)} | Max: ${Math.max(...simplifiedScores)} | Median: ${simplifiedScores.sort((a, b) => a - b)[Math.floor(simplifiedScores.length / 2)]}`);
  const simBuckets = bucketize(simplifiedScores);
  console.log(`    Distribution: 0-20: ${simBuckets["0-20"]} | 21-40: ${simBuckets["21-40"]} | 41-60: ${simBuckets["41-60"]} | 61-80: ${simBuckets["61-80"]} | 81-100: ${simBuckets["81-100"]}`);
  console.log();

  if (deepScores.length > 0) {
    console.log("  Deep Score (deep-audited leads only):");
    console.log(`    Sample: ${deepScores.length} leads`);
    console.log(`    Average: ${deepAvg}/100`);
    console.log(`    Min: ${Math.min(...deepScores)} | Max: ${Math.max(...deepScores)} | Median: ${deepScores.sort((a, b) => a - b)[Math.floor(deepScores.length / 2)]}`);
    const deepBuckets = bucketize(deepScores);
    console.log(`    Distribution: 0-20: ${deepBuckets["0-20"]} | 21-40: ${deepBuckets["21-40"]} | 41-60: ${deepBuckets["41-60"]} | 61-80: ${deepBuckets["61-80"]} | 81-100: ${deepBuckets["81-100"]}`);
  } else {
    console.log("  Deep Score: No deep-audited leads found.");
  }
  console.log();

  // ─── 9. Estimated page count ──────────────────────────────────────
  const qualifyingStates = stateRes.rows.filter((r) => parseInt(r.total) >= STATE_THRESHOLD);
  const problemPages = gapList.filter((g) => g.checked > 0 && (g.count / g.checked) >= 0.3);

  console.log("─── ESTIMATED PAGE COUNT ───────────────────────────────────────\n");
  console.log(`  National pillar:        1`);
  console.log(`  State pages:            ${qualifyingStates.length} (${qualifyingStates.map((r) => r.state).join(", ")})`);
  console.log(`  City pages:             ${qualifyingCities.length}`);
  console.log(`  Problem pages:          ${problemPages.length} (gaps with 30%+ frequency)`);
  // Problem × state: each problem that has enough data per state
  let problemStateCount = 0;
  // Rough estimate: each problem page × each qualifying state
  problemStateCount = problemPages.length * qualifyingStates.length;
  console.log(`  Problem × state (est):  ${problemStateCount}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  TOTAL (estimated):      ${1 + qualifyingStates.length + qualifyingCities.length + problemPages.length + problemStateCount}`);
  console.log();

  // ─── 10. Data quality warnings ────────────────────────────────────
  console.log("─── DATA QUALITY WARNINGS ─────────────────────────────────────\n");

  // Check for null enrichment fields
  const nullCheckRes = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE has_ssl IS NULL) as null_ssl,
      COUNT(*) FILTER (WHERE has_online_booking IS NULL) as null_booking,
      COUNT(*) FILTER (WHERE page_speed_seconds IS NULL) as null_speed,
      COUNT(*) FILTER (WHERE city IS NULL) as null_city,
      COUNT(*) FILTER (WHERE state IS NULL) as null_state,
      COUNT(*) FILTER (WHERE website IS NULL OR website = '') as null_website
    FROM leads
    WHERE category = 'house_cleaning'
  `);
  const nulls = nullCheckRes.rows[0];

  if (parseInt(nulls.null_ssl) > 0)
    console.log(`  ⚠  ${nulls.null_ssl}/${nulls.total} leads have NULL has_ssl (not enriched)`);
  if (parseInt(nulls.null_booking) > 0)
    console.log(`  ⚠  ${nulls.null_booking}/${nulls.total} leads have NULL has_online_booking`);
  if (parseInt(nulls.null_speed) > 0)
    console.log(`  ⚠  ${nulls.null_speed}/${nulls.total} leads have NULL page_speed_seconds`);
  if (parseInt(nulls.null_city) > 0)
    console.log(`  ⚠  ${nulls.null_city}/${nulls.total} leads have NULL city`);
  if (parseInt(nulls.null_state) > 0)
    console.log(`  ⚠  ${nulls.null_state}/${nulls.total} leads have NULL state`);
  if (parseInt(nulls.null_website) > 0)
    console.log(`  ⚠  ${nulls.null_website}/${nulls.total} leads have no website`);

  const deepVsTotal = parseInt(totals.deep_audited) / parseInt(totals.total);
  if (deepVsTotal < 0.3)
    console.log(`  ⚠  Only ${pct(deepVsTotal, 1)} of leads have deep audits — deep score averages may be unreliable`);

  console.log();
  console.log("═══════════════════════════════════════════════════════════════\n");

  await client.end();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
