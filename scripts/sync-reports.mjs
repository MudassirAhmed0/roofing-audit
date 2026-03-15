/**
 * Pulls roofing audit reports from Postgres and writes src/data/reports.json.
 *
 * Strategy: pull ALL deep-audited leads with niche_audit data, then pick
 * up to PER_CITY reports per city for even coverage. Ensures every city,
 * state, and problem type has report pages backing it.
 *
 * Usage:  npm run sync-reports
 * Env:    DATABASE_URL (required)
 */

import pgPkg from "pg";
const { Client } = pgPkg;
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "reports.json");

// How many reports per city (picks best spread of scores within each city)
const PER_CITY = 9;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: DATABASE_URL env var is required");
  process.exit(1);
}

// ── State-specific licensing text ───────────────────────────────────
const LICENSE_TEXT = {
  TX: "Displaying a business license number builds trust with homeowners. Not showing it makes the business look less legitimate than competitors who display theirs.",
  AZ: "Displaying a business license number builds trust with homeowners. Not showing it makes the business look less legitimate than competitors who display theirs.",
  FL: "Displaying a business license or bonding number builds trust with homeowners. Not showing it makes the business look less legitimate than competitors who display theirs.",
};

// ── Website Quality Score (mirrors hvac.ts calculateWebsiteQualityScore) ─
function calculateWebsiteQualityScore(audit) {
  if (audit.websiteQualityScore) return audit.websiteQualityScore;

  const speed = audit.pageSpeedSeconds ?? 20;
  const speedScore = Math.max(0, 20 - Math.min(20, (speed - 2) * 2));

  let trust = 0;
  if (audit.hasSsl) trust += 5;
  if (audit.httpRedirectsToHttps) trust += 5;
  if (audit.hasLicenseNumber) trust += 5;
  if (audit.hasReviewsOnSite) trust += 5;

  let leadCapture = 0;
  if (audit.hasClearCtaAboveFold) leadCapture += 5;
  if (audit.hasClickToCall) leadCapture += 5;
  if (audit.hasBookingWidget) leadCapture += 5;
  if (audit.hasContactForm) leadCapture += 5;
  if (audit.hasAfterHoursCapture) leadCapture += 5;

  let seo = 0;
  if (audit.hasMetaTitle && audit.hasMetaDescription) seo += 5;
  if (audit.hasLocalBusinessSchema) seo += 5;
  if (audit.hasXmlSitemap) seo += 5;

  let content = 0;
  if (audit.serviceAreaPageCount > 0) content += 5;
  if (audit.hasAboutPage) content += 5;

  let mobile = 0;
  if (audit.hasStickyContactOnMobile) mobile += 10;

  return Math.round(speedScore + trust + leadCapture + seo + content + mobile);
}

// ── Diagnostic Type Detection ──────────────────────────────────────
const DIAGNOSTIC_CONFIG = {
  "blind-spender": {
    label: "The Blind Spot",
    headline: "You're losing money and don't know where",
    description: "No ads, no tracking, no strategy. Your website has {gapCount} issues silently costing you an estimated {monthlyCost}/month. You're not getting calls because your site isn't built to generate them.",
  },
  "pretty-and-broken": {
    label: "The Leaky Funnel",
    headline: "Your site looks fine — it's quietly losing you leads",
    description: "You're spending on marketing and your site scores {score}/100 — above the 34-point industry average. But {gapCount} hidden issues are killing your conversions. Estimated leak: {monthlyCost}/month.",
  },
  "half-built": {
    label: "The Money Pit",
    headline: "You're paying for traffic that hits a broken site",
    description: "We detected ad tracking ({adSignal}) on your site, which means you're spending money to drive visitors. But your site scores {score}/100, so that traffic is bouncing to competitors. Estimated waste: {monthlyCost}/month.",
  },
  "invisible": {
    label: "The Hidden Gem",
    headline: "Your site is solid — nobody can find it",
    description: "Your website scores {score}/100, well above the 34-point average. But without ads or an SEO strategy, you're invisible. Competitors with worse sites are getting the calls you should be getting.",
  },
};

function detectDiagnosticType(audit, qualityScore) {
  const isRunningAds = audit.isRunningPaidAds || audit.adSpendSignal === "heavy-spender" || audit.adSpendSignal === "likely-running-ads";
  const isDecentSite = qualityScore >= 50;

  if (isRunningAds && isDecentSite) return "pretty-and-broken";
  if (isRunningAds && !isDecentSite) return "half-built";
  if (!isRunningAds && isDecentSite) return "invisible";
  return "blind-spender";
}

function buildDiagnosticFields(audit, qualityScore) {
  // If the audit already has diagnostic fields from a re-audit, use them
  if (audit.businessSummary?.diagnosticType) {
    return {
      diagnosticType: audit.businessSummary.diagnosticType,
      diagnosticLabel: audit.businessSummary.diagnosticLabel,
      diagnosticHeadline: audit.businessSummary.diagnosticHeadline,
      diagnosticDescription: audit.businessSummary.diagnosticDescription,
    };
  }

  const type = detectDiagnosticType(audit, qualityScore);
  const config = DIAGNOSTIC_CONFIG[type];
  const adSignalText = audit.detectedPixels?.length > 0
    ? audit.detectedPixels.join(", ")
    : audit.adSpendSignal || "none";

  const gapCount = audit.gapSummary?.length || 0;
  const monthlyCost = audit.businessSummary?.estimatedTotalMonthlyCost || "thousands";

  const description = config.description
    .replace("{gapCount}", String(gapCount))
    .replace("{monthlyCost}", monthlyCost)
    .replace("{score}", String(qualityScore))
    .replace("{adSignal}", adSignalText);

  return {
    diagnosticType: type,
    diagnosticLabel: config.label,
    diagnosticHeadline: config.headline,
    diagnosticDescription: description,
  };
}

// ── Impact estimate calculation (mirrors hvac.ts calculateRevenueImpact) ─
function buildImpactEstimate(audit, lead) {
  let lostLeads = 0;
  if (audit.pageSpeedSeconds && audit.pageSpeedSeconds > 3) lostLeads += 3;
  if (!audit.hasSsl) lostLeads += 4;
  else if (!audit.httpRedirectsToHttps) lostLeads += 1;
  if (!audit.hasClearCtaAboveFold) lostLeads += 3;
  if (!audit.hasClickToCall) lostLeads += 4;
  if (!audit.hasAfterHoursCapture) lostLeads += 5;
  if (!audit.hasBookingWidget) lostLeads += 2;
  if (!audit.hasContactForm) lostLeads += 3;
  if (!audit.hasReviewsOnSite && (lead.review_count || 0) > 10) lostLeads += 2;
  if (audit.serviceAreaPageCount === 0) lostLeads += 2;
  if (audit.isRunningPaidAds && ((!audit.hasSsl || !audit.httpRedirectsToHttps) || !audit.hasClickToCall || !audit.hasClearCtaAboveFold)) lostLeads += 3;

  // Estimate monthly visitors from review count (rough heuristic)
  const reviews = lead.review_count || 50;
  let monthlyVisitors;
  if (reviews > 5000) monthlyVisitors = 2500;
  else if (reviews > 2000) monthlyVisitors = 1500;
  else if (reviews > 1000) monthlyVisitors = 1200;
  else if (reviews > 500) monthlyVisitors = 800;
  else if (reviews > 200) monthlyVisitors = 500;
  else if (reviews > 100) monthlyVisitors = 350;
  else monthlyVisitors = 200;

  // Build bounce reason from top issues
  const reasons = [];
  if (audit.pageSpeedSeconds && audit.pageSpeedSeconds > 3) {
    reasons.push(`${audit.pageSpeedSeconds}s load time (53% leave after 3s)`);
  }
  if (!audit.hasSsl) {
    reasons.push('Chrome "Not Secure" warning');
  } else if (!audit.httpRedirectsToHttps) {
    reasons.push('Chrome "Not Secure" warning on HTTP links');
  }
  if (!audit.hasClickToCall) reasons.push("phone not clickable on mobile");
  if (!audit.hasContactForm) reasons.push("no contact form");
  if (!audit.hasAfterHoursCapture && reasons.length < 3) reasons.push("no after-hours capture");
  if (!audit.hasReviewsOnSite && reviews > 100 && reasons.length < 3) reasons.push("no visible reviews");
  if (!audit.hasClearCtaAboveFold && reasons.length < 3) reasons.push("no CTA above fold");

  const bouncePercent = Math.min(55, 25 + lostLeads * 1.5);
  const bouncedVisitors = Math.round(monthlyVisitors * bouncePercent / 100);
  const bookingRate = 5;
  const missedLeadsLow = Math.max(2, Math.round(bouncedVisitors * bookingRate / 100 * 0.7));
  const missedLeadsHigh = Math.max(3, Math.round(bouncedVisitors * bookingRate / 100 * 1.3));
  const avgServiceCall = 200; // avg roofing job value
  const missedRevLow = missedLeadsLow * avgServiceCall;
  const missedRevHigh = missedLeadsHigh * avgServiceCall;

  return {
    monthlyVisitors,
    bounceReason: reasons.slice(0, 3).join(" + "),
    bouncePercent: Math.round(bouncePercent),
    bouncedVisitors,
    bookingRate,
    missedLeads: `${missedLeadsLow}-${missedLeadsHigh}`,
    avgServiceCall,
    missedRepairRevenue: `$${missedRevLow.toLocaleString()}-$${missedRevHigh.toLocaleString()}`,
    installNote:
      missedLeadsHigh >= 10
        ? `If even 3 of those became recurring weekly clients, that's another $2,400-$3,600/month.`
        : `If even 1 became a recurring weekly client, that's another $800-$1,200/month.`,
  };
}

// ── URL roofing ────────────────────────────────────────────────────
function cleanUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    // Strip UTM and tracking params
    u.search = "";
    let clean = u.toString();
    // Remove trailing slash from path if it's just the root
    if (u.pathname === "/") clean = clean.replace(/\/$/, "");
    return clean;
  } catch {
    return url;
  }
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Fix state-specific gaps ─────────────────────────────────────────
function fixGaps(gaps, state) {
  const licenseText = LICENSE_TEXT[state] || LICENSE_TEXT.TX;
  return gaps.map((g) => {
    if (g.gap === "No license number displayed") {
      return { ...g, impact: licenseText };
    }
    return g;
  });
}

// ── Pick best spread per city ────────────────────────────────────────
// For each city, pick up to PER_CITY reports with maximum score diversity.
// Strategy: sort by websiteQualityScore, pick evenly spaced entries.
function pickPerCity(rows, perCity) {
  // Group by city+state
  const byCityState = new Map();
  for (const row of rows) {
    const key = `${row.city}|${row.state}`;
    if (!byCityState.has(key)) byCityState.set(key, []);
    byCityState.get(key).push(row);
  }

  const picked = [];
  for (const [, cityRows] of byCityState) {
    // Sort by quality score for even spread
    cityRows.sort((a, b) => {
      const scoreA = calculateWebsiteQualityScore(a.niche_audit);
      const scoreB = calculateWebsiteQualityScore(b.niche_audit);
      return scoreB - scoreA;
    });

    if (cityRows.length <= perCity) {
      picked.push(...cityRows);
    } else {
      // Pick evenly spaced entries for score diversity
      const step = (cityRows.length - 1) / (perCity - 1);
      for (let i = 0; i < perCity; i++) {
        picked.push(cityRows[Math.round(i * step)]);
      }
    }
  }

  return picked;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log(`Connected. Pulling all deep-audited roofing leads...`);

  // Pull ALL leads that have niche_audit data (deep-audited)
  const res = await client.query(
    `SELECT id, name, website, city, state, total_score, rating, review_count, niche_audit
     FROM leads
     WHERE niche_audit IS NOT NULL
       AND niche_audit::text != 'null'
       AND niche_audit->'gapSummary' IS NOT NULL
       AND category = 'roofing'
     ORDER BY city, total_score DESC`
  );

  console.log(`Found ${res.rows.length} deep-audited leads across ${new Set(res.rows.map(r => r.city)).size} cities`);

  // Pick up to PER_CITY per city for even coverage
  const selectedRows = pickPerCity(res.rows, PER_CITY);
  console.log(`Selected ${selectedRows.length} reports (up to ${PER_CITY} per city)`);

  // Dedupe by slug (some businesses may share names)
  const seenSlugs = new Set();
  const reports = [];

  for (const row of selectedRows) {
    const audit = row.niche_audit;
    if (!audit?.gapSummary?.length) continue;
    if (!row.city || !row.state) continue;

    const cleanedUrl = cleanUrl(row.website);
    const domain = extractDomain(row.website);
    let slug = slugify(row.name);

    // Dedupe slugs
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${row.city.toLowerCase().replace(/\s+/g, "-")}`;
    }
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const qualityScore = calculateWebsiteQualityScore(audit);
    const diagnostic = buildDiagnosticFields(audit, qualityScore);

    reports.push({
      slug,
      name: row.name,
      domain,
      website: cleanedUrl,
      rating: row.rating,
      reviewCount: row.review_count,
      city: row.city,
      state: row.state,
      totalScore: row.total_score,
      websiteQualityScore: qualityScore,
      impactEstimate: buildImpactEstimate(audit, row),
      businessSummary: {
        ...audit.businessSummary,
        ...diagnostic,
        websiteQualityScore: qualityScore,
      },
      gapSummary: fixGaps(audit.gapSummary, row.state),
    });
  }

  // Sort final output: by state, then city, then score desc
  reports.sort((a, b) => {
    if (a.state !== b.state) return (a.state || "").localeCompare(b.state || "");
    if (a.city !== b.city) return (a.city || "").localeCompare(b.city || "");
    return b.websiteQualityScore - a.websiteQualityScore;
  });

  writeFileSync(OUT, JSON.stringify(reports, null, 2));
  console.log(`\nWrote ${reports.length} reports to ${OUT}`);

  // Summary by city
  const cityCounts = new Map();
  const stateCounts = new Map();
  for (const r of reports) {
    cityCounts.set(`${r.city}, ${r.state}`, (cityCounts.get(`${r.city}, ${r.state}`) || 0) + 1);
    stateCounts.set(r.state, (stateCounts.get(r.state) || 0) + 1);
  }

  console.log(`\nCoverage: ${cityCounts.size} cities, ${stateCounts.size} states`);
  console.log(`\nReports per city:`);
  for (const [city, count] of [...cityCounts.entries()].sort()) {
    console.log(`  ${city.padEnd(30)} ${count}`);
  }
  console.log(`\nReports per state:`);
  for (const [state, count] of [...stateCounts.entries()].sort()) {
    console.log(`  ${state.padEnd(5)} ${count}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
