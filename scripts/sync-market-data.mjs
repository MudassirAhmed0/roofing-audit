/**
 * Market Data Sync — Aggregates roofing audit data for market pages.
 *
 * Connects to creative-axe PostgreSQL, computes Website Quality Scores,
 * aggregates by national/state/city/problem, writes market-data.json.
 *
 * Usage: npm run sync-market
 */

import pgPkg from "pg";
const { Client } = pgPkg;
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "market-data.json");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: DATABASE_URL env var is required");
  process.exit(1);
}

// ── Thresholds ──────────────────────────────────────────────────────
const CITY_THRESHOLD = 10;
const STATE_THRESHOLD = 20;
const PROBLEM_FREQUENCY_THRESHOLD = 0.3; // 30%

// ── State name mapping ──────────────────────────────────────────────
const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// ── Gap normalization ───────────────────────────────────────────────
// Maps deep audit gap names (or prefixes) to slugs and display names.
// matchGap() below does prefix matching so partial DB names still resolve.
const GAP_MAP = {
  "No online booking or instant quote": {
    slug: "no-online-booking",
    display: "No Online Booking or Instant Quote",
    category: "lead-capture",
  },
  "No online scheduling": {
    slug: "no-online-booking",
    display: "No Online Booking or Instant Quote",
    category: "lead-capture",
  },
  "No license number displayed": {
    slug: "no-license-number",
    display: "No License Number Displayed",
    category: "trust",
  },
  "HTTP does not redirect to HTTPS": {
    slug: "no-https-redirect",
    display: "No HTTPS Redirect",
    category: "trust",
  },
  "No service area pages": {
    slug: "no-service-area-pages",
    display: "No Service Area Pages",
    category: "seo",
  },
  "No satisfaction guarantee": {
    slug: "no-satisfaction-guarantee",
    display: "No Satisfaction Guarantee",
    category: "trust",
  },
  'No "Licensed & Insured" mention': {
    slug: "no-licensed-insured-mention",
    display: 'No "Licensed & Insured" Mention',
    category: "trust",
  },
  "No 'bonded, insured, background-checked' messaging": {
    slug: "no-bonded-insured-messaging",
    display: "No Bonded/Insured/Background-Checked Messaging",
    category: "trust",
  },
  "No LocalBusiness schema markup": {
    slug: "no-schema-markup",
    display: "No LocalBusiness Schema Markup",
    category: "seo",
  },
  "No contact form": {
    slug: "no-contact-form",
    display: "No Contact Form",
    category: "lead-capture",
  },
  "No pricing page": {
    slug: "no-pricing-page",
    display: "No Pricing Page",
    category: "content",
  },
  "No blog or content hub": {
    slug: "no-blog",
    display: "No Blog or Content Hub",
    category: "content",
  },
  "No recurring roofing plan framing": {
    slug: "no-recurring-plan",
    display: "No Recurring Roofing Plan Framing",
    category: "content",
  },
  "No Airbnb/vacation rental roofing page": {
    slug: "no-airbnb-page",
    display: "No Airbnb/Vacation Rental Roofing Page",
    category: "content",
  },
  "No dedicated deep roofing page": {
    slug: "no-deep-roofing-page",
    display: "No Dedicated Deep Roofing Page",
    category: "content",
  },
  "No move-in/move-out roofing page": {
    slug: "no-move-roofing-page",
    display: "No Move-In/Move-Out Roofing Page",
    category: "content",
  },
  "No first-time customer offer": {
    slug: "no-first-time-offer",
    display: "No First-Time Customer Offer",
    category: "lead-capture",
  },
  "No before/after gallery or portfolio": {
    slug: "no-before-after-gallery",
    display: "No Before/After Gallery or Portfolio",
    category: "trust",
  },
  "No way to capture leads after 6PM": {
    slug: "no-after-hours-capture",
    display: "No After-Hours Lead Capture",
    category: "lead-capture",
  },
  "Phone number mismatch with Google Business Profile": {
    slug: "phone-mismatch",
    display: "Phone Number Mismatch with Google",
    category: "business",
  },
  "Missing or weak meta description": {
    slug: "missing-meta-description",
    display: "Missing or Weak Meta Description",
    category: "seo",
  },
  "Phone number not clickable on mobile": {
    slug: "phone-not-clickable",
    display: "Phone Number Not Clickable on Mobile",
    category: "lead-capture",
  },
  "No analytics tracking installed": {
    slug: "no-analytics",
    display: "No Analytics Tracking",
    category: "tracking",
  },
  "No clear CTA above the fold": {
    slug: "no-cta-above-fold",
    display: "No Clear CTA Above the Fold",
    category: "lead-capture",
  },
  "Running ads without call tracking": {
    slug: "ads-without-call-tracking",
    display: "Running Ads Without Call Tracking",
    category: "tracking",
  },
};

// ── Gap matcher (prefix-based to handle long DB names) ──────────────
const _gapMapEntries = Object.entries(GAP_MAP);
const _gapCache = new Map();

function matchGap(gapName) {
  if (!gapName) return null;
  if (_gapCache.has(gapName)) return _gapCache.get(gapName);
  // Try exact match first
  if (GAP_MAP[gapName]) {
    _gapCache.set(gapName, GAP_MAP[gapName]);
    return GAP_MAP[gapName];
  }
  // Try prefix match (DB names can be longer than our keys)
  for (const [key, val] of _gapMapEntries) {
    if (gapName.startsWith(key) || key.startsWith(gapName)) {
      _gapCache.set(gapName, val);
      return val;
    }
  }
  _gapCache.set(gapName, null);
  return null;
}

// ── Slug helpers ────────────────────────────────────────────────────
function slugifyCity(city, state) {
  return `${city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${state.toLowerCase()}`;
}

function slugifyState(stateCode) {
  const name = STATE_NAMES[stateCode] || stateCode;
  return name.toLowerCase().replace(/\s+/g, "-");
}

// ── Website Quality Score (deep formula) ────────────────────────────
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
  if (audit.isMobileResponsive !== false) score += 5;
  if (audit.hasStickyContactOnMobile) score += 5;

  return Math.round(score);
}

// ── Score distribution buckets ──────────────────────────────────────
function bucketize(scores) {
  const b = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  for (const s of scores) {
    if (s <= 20) b["0-20"]++;
    else if (s <= 40) b["21-40"]++;
    else if (s <= 60) b["41-60"]++;
    else if (s <= 80) b["61-80"]++;
    else b["81-100"]++;
  }
  return b;
}

// ── Stat helpers ────────────────────────────────────────────────────
function rate(trueCount, total) {
  if (!total) return 0;
  return Math.round((trueCount / total) * 100) / 100;
}

function avg(values) {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected to database.");

  // ─── Pull all HVAC leads with enrichment + deep audit ─────────────
  const res = await client.query(`
    SELECT
      id, city, state, rating, review_count,
      page_speed_seconds, has_ssl, has_online_booking, has_reviews_displayed,
      has_clear_cta, has_contact_form, is_mobile_responsive, has_meta_seo,
      niche_audit
    FROM leads
    WHERE category = 'roofing' AND city IS NOT NULL AND state IS NOT NULL
  `);
  const allLeads = res.rows;
  console.log(`Fetched ${allLeads.length} roofing leads with city/state.`);

  // ─── Compute deep scores for each lead ────────────────────────────
  for (const lead of allLeads) {
    lead._deepScore = lead.niche_audit ? calcDeepScore(lead.niche_audit) : null;
    lead._hasDeepAudit = lead.niche_audit != null;
  }

  // ─── Helper: compute stats for a group of leads ───────────────────
  function computeStats(leads) {
    const total = leads.length;
    const deepLeads = leads.filter((l) => l._hasDeepAudit);
    const deepCount = deepLeads.length;

    // Enrichment boolean rates (from all leads with non-null values)
    const withSsl = leads.filter((l) => l.has_ssl != null);
    const withBooking = leads.filter((l) => l.has_online_booking != null);
    const withReviews = leads.filter((l) => l.has_reviews_displayed != null);
    const withCta = leads.filter((l) => l.has_clear_cta != null);
    const withForm = leads.filter((l) => l.has_contact_form != null);
    const withMobile = leads.filter((l) => l.is_mobile_responsive != null);
    const withSeo = leads.filter((l) => l.has_meta_seo != null);
    const withSpeed = leads.filter((l) => l.page_speed_seconds != null);
    const withRating = leads.filter((l) => l.rating != null);
    const withReviewCount = leads.filter((l) => l.review_count != null);

    const sslRate = rate(withSsl.filter((l) => l.has_ssl).length, withSsl.length);
    const bookingRate = rate(withBooking.filter((l) => l.has_online_booking).length, withBooking.length);
    const reviewsDisplayedRate = rate(withReviews.filter((l) => l.has_reviews_displayed).length, withReviews.length);
    const ctaRate = rate(withCta.filter((l) => l.has_clear_cta).length, withCta.length);
    const contactFormRate = rate(withForm.filter((l) => l.has_contact_form).length, withForm.length);
    const mobileRate = rate(withMobile.filter((l) => l.is_mobile_responsive).length, withMobile.length);
    const seoRate = rate(withSeo.filter((l) => l.has_meta_seo).length, withSeo.length);
    const avgSpeed = avg(withSpeed.map((l) => l.page_speed_seconds));
    const avgRating = avg(withRating.map((l) => l.rating));
    const avgReviewCount = Math.round(avg(withReviewCount.map((l) => l.review_count)));

    // Deep scores
    const deepScores = deepLeads.map((l) => l._deepScore).filter((s) => s != null);
    const avgDeepScore = deepScores.length >= 5 ? Math.round(avg(deepScores)) : null;
    const medianDeepScore = deepScores.length >= 5 ? median(deepScores) : null;
    const bestScore = deepScores.length ? Math.max(...deepScores) : null;
    const worstScore = deepScores.length ? Math.min(...deepScores) : null;
    const scoreDistribution = deepScores.length >= 5 ? bucketize(deepScores) : null;

    // Gap frequency from deep audit gapSummary
    const gapCounts = {};
    for (const lead of deepLeads) {
      const gaps = lead.niche_audit?.gapSummary;
      if (!Array.isArray(gaps)) continue;
      for (const g of gaps) {
        const gapName = g.gap;
        if (!gapName) continue;
        if (!gapCounts[gapName]) gapCounts[gapName] = { count: 0, severities: [], categories: [] };
        gapCounts[gapName].count++;
        if (g.severity) gapCounts[gapName].severities.push(g.severity);
        if (g.category) gapCounts[gapName].categories.push(g.category);
      }
    }

    // Build top gaps (sorted by frequency, only mapped gaps)
    const topGaps = [];
    for (const [gapName, data] of Object.entries(gapCounts)) {
      const mapped = matchGap(gapName);
      if (!mapped) continue; // skip unmapped gaps
      const frequency = deepCount > 0 ? round2(data.count / deepCount) : 0;
      // Most common severity
      const sevCounts = {};
      for (const s of data.severities) sevCounts[s] = (sevCounts[s] || 0) + 1;
      const topSeverity = Object.entries(sevCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "medium";

      topGaps.push({
        gap: mapped.display,
        slug: mapped.slug,
        frequency,
        count: data.count,
        severity: topSeverity,
        category: mapped.category,
      });
    }
    topGaps.sort((a, b) => b.frequency - a.frequency);

    return {
      totalLeads: total,
      deepAudited: deepCount,
      avgSpeed,
      avgRating,
      avgReviewCount,
      sslRate,
      bookingRate,
      reviewsDisplayedRate,
      ctaRate,
      contactFormRate,
      mobileRate,
      seoRate,
      avgDeepScore,
      medianDeepScore,
      bestScore,
      worstScore,
      scoreDistribution,
      topGaps,
    };
  }

  // ─── National stats ───────────────────────────────────────────────
  console.log("Computing national stats...");
  const nationalStats = computeStats(allLeads);

  // ─── Group leads by state and city ────────────────────────────────
  const byState = {};
  const byCity = {};
  for (const lead of allLeads) {
    const st = lead.state;
    const city = lead.city;
    if (!byState[st]) byState[st] = [];
    byState[st].push(lead);
    const cityKey = `${city}|${st}`;
    if (!byCity[cityKey]) byCity[cityKey] = [];
    byCity[cityKey].push(lead);
  }

  // ─── State stats ──────────────────────────────────────────────────
  console.log("Computing state stats...");
  const states = [];
  for (const [stateCode, leads] of Object.entries(byState)) {
    if (leads.length < STATE_THRESHOLD) continue;
    const stats = computeStats(leads);
    const stateName = STATE_NAMES[stateCode] || stateCode;
    const slug = slugifyState(stateCode);

    // Cities in this state that qualify
    const citiesInState = [];
    for (const [cityKey, cityLeads] of Object.entries(byCity)) {
      const [cityName, st] = cityKey.split("|");
      if (st === stateCode && cityLeads.length >= CITY_THRESHOLD) {
        citiesInState.push(cityName);
      }
    }

    states.push({
      state: stateCode,
      stateName,
      slug,
      ...stats,
      cities: citiesInState,
      vsNational: {
        speedDelta: round2(stats.avgSpeed - nationalStats.avgSpeed),
        bookingDelta: round2(stats.bookingRate - nationalStats.bookingRate),
        sslDelta: round2(stats.sslRate - nationalStats.sslRate),
        reviewsDelta: round2(stats.reviewsDisplayedRate - nationalStats.reviewsDisplayedRate),
        scoreDelta: stats.avgDeepScore != null && nationalStats.avgDeepScore != null
          ? stats.avgDeepScore - nationalStats.avgDeepScore : 0,
      },
    });
  }
  states.sort((a, b) => b.totalLeads - a.totalLeads);

  // ─── City stats ───────────────────────────────────────────────────
  console.log("Computing city stats...");
  const cities = [];
  for (const [cityKey, leads] of Object.entries(byCity)) {
    if (leads.length < CITY_THRESHOLD) continue;
    const [cityName, stateCode] = cityKey.split("|");
    const stats = computeStats(leads);
    const slug = slugifyCity(cityName, stateCode);
    const stateName = STATE_NAMES[stateCode] || stateCode;

    // Find the state stats for deltas
    const stateStats = states.find((s) => s.state === stateCode);

    cities.push({
      city: cityName,
      state: stateCode,
      stateName,
      slug,
      ...stats,
      vsState: stateStats
        ? {
            speedDelta: round2(stats.avgSpeed - stateStats.avgSpeed),
            bookingDelta: round2(stats.bookingRate - stateStats.bookingRate),
            sslDelta: round2(stats.sslRate - stateStats.sslRate),
            reviewsDelta: round2(stats.reviewsDisplayedRate - stateStats.reviewsDisplayedRate),
            scoreDelta: stats.avgDeepScore != null && stateStats.avgDeepScore != null
              ? stats.avgDeepScore - stateStats.avgDeepScore : 0,
          }
        : null,
      vsNational: {
        speedDelta: round2(stats.avgSpeed - nationalStats.avgSpeed),
        bookingDelta: round2(stats.bookingRate - nationalStats.bookingRate),
        sslDelta: round2(stats.sslRate - nationalStats.sslRate),
        reviewsDelta: round2(stats.reviewsDisplayedRate - nationalStats.reviewsDisplayedRate),
        scoreDelta: stats.avgDeepScore != null && nationalStats.avgDeepScore != null
          ? stats.avgDeepScore - nationalStats.avgDeepScore : 0,
      },
      // nearbyCities filled below
      nearbyCities: [],
    });
  }
  cities.sort((a, b) => b.totalLeads - a.totalLeads);

  // ─── Fill nearbyCities (top 5 same state by audit count) ──────────
  for (const city of cities) {
    const sameState = cities
      .filter((c) => c.state === city.state && c.slug !== city.slug)
      .sort((a, b) => b.totalLeads - a.totalLeads)
      .slice(0, 5);
    city.nearbyCities = sameState.map((c) => ({
      city: c.city,
      state: c.state,
      slug: c.slug,
      totalLeads: c.totalLeads,
      avgSpeed: c.avgSpeed,
      bookingRate: c.bookingRate,
      sslRate: c.sslRate,
      avgDeepScore: c.avgDeepScore,
    }));
  }

  // ─── Problem stats ────────────────────────────────────────────────
  console.log("Computing problem stats...");
  const problems = [];

  // Count each gap per city and state from deep-audited leads
  const deepLeads = allLeads.filter((l) => l._hasDeepAudit);
  const totalDeep = deepLeads.length;

  // Aggregate gap counts nationally, by state, and by city
  const gapNational = {}; // gapName -> count
  const gapByState = {}; // gapName -> { stateCode -> count }
  const gapByCity = {}; // gapName -> { cityKey -> count }

  for (const lead of deepLeads) {
    const gaps = lead.niche_audit?.gapSummary;
    if (!Array.isArray(gaps)) continue;
    const seenGaps = new Set(); // dedupe per lead
    for (const g of gaps) {
      const gapName = g.gap;
      if (!gapName || !matchGap(gapName) || seenGaps.has(gapName)) continue;
      seenGaps.add(gapName);

      gapNational[gapName] = (gapNational[gapName] || 0) + 1;

      if (!gapByState[gapName]) gapByState[gapName] = {};
      gapByState[gapName][lead.state] = (gapByState[gapName][lead.state] || 0) + 1;

      const ck = `${lead.city}|${lead.state}`;
      if (!gapByCity[gapName]) gapByCity[gapName] = {};
      gapByCity[gapName][ck] = (gapByCity[gapName][ck] || 0) + 1;
    }
  }

  // Deep lead counts per state and city
  const deepByState = {};
  const deepByCity = {};
  for (const lead of deepLeads) {
    deepByState[lead.state] = (deepByState[lead.state] || 0) + 1;
    const ck = `${lead.city}|${lead.state}`;
    deepByCity[ck] = (deepByCity[ck] || 0) + 1;
  }

  for (const [gapName, nationalCount] of Object.entries(gapNational)) {
    const mapped = matchGap(gapName);
    if (!mapped) continue;

    const nationalFrequency = round2(nationalCount / totalDeep);
    if (nationalFrequency < PROBLEM_FREQUENCY_THRESHOLD) continue;

    // Per-state breakdown
    const stateBreakdown = [];
    for (const [stateCode, count] of Object.entries(gapByState[gapName] || {})) {
      const stateDeep = deepByState[stateCode] || 0;
      if (stateDeep < STATE_THRESHOLD) continue;
      stateBreakdown.push({
        state: stateCode,
        stateName: STATE_NAMES[stateCode] || stateCode,
        slug: slugifyState(stateCode),
        frequency: round2(count / stateDeep),
        count,
        deepTotal: stateDeep,
      });
    }
    stateBreakdown.sort((a, b) => b.frequency - a.frequency);

    // Per-city breakdown
    const cityBreakdown = [];
    for (const [cityKey, count] of Object.entries(gapByCity[gapName] || {})) {
      const cityDeep = deepByCity[cityKey] || 0;
      if (cityDeep < CITY_THRESHOLD) continue;
      const [cityName, stateCode] = cityKey.split("|");
      cityBreakdown.push({
        city: cityName,
        state: stateCode,
        slug: slugifyCity(cityName, stateCode),
        frequency: round2(count / cityDeep),
        count,
        deepTotal: cityDeep,
      });
    }
    cityBreakdown.sort((a, b) => b.frequency - a.frequency);

    const worstCity = cityBreakdown[0] || null;
    const bestCity = cityBreakdown.length > 0 ? cityBreakdown[cityBreakdown.length - 1] : null;

    problems.push({
      gap: mapped.display,
      slug: mapped.slug,
      category: mapped.category,
      nationalFrequency,
      nationalCount,
      nationalDeepTotal: totalDeep,
      byState: stateBreakdown,
      byCity: cityBreakdown,
      worstCity: worstCity
        ? { city: worstCity.city, state: worstCity.state, frequency: worstCity.frequency }
        : null,
      bestCity: bestCity
        ? { city: bestCity.city, state: bestCity.state, frequency: bestCity.frequency }
        : null,
    });
  }
  problems.sort((a, b) => b.nationalFrequency - a.nationalFrequency);

  // ─── Assemble final output ────────────────────────────────────────
  const output = {
    generatedAt: new Date().toISOString(),
    service: "roofing",
    indexName: "Roofing Website Index",
    national: {
      service: "roofing",
      ...nationalStats,
      states: states.map((s) => s.state),
      stateCount: states.length,
      cityCount: cities.length,
    },
    states,
    cities,
    problems,
  };

  writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`\nWrote market data to ${OUT}`);

  // ─── Summary ──────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("MARKET DATA SYNC SUMMARY");
  console.log("═".repeat(60));
  console.log(`  Generated:      ${output.generatedAt}`);
  console.log(`  Index name:     ${output.indexName}`);
  console.log(`  Total leads:    ${nationalStats.totalLeads}`);
  console.log(`  Deep audited:   ${nationalStats.deepAudited}`);
  console.log(`  Avg deep score: ${nationalStats.avgDeepScore}/100`);
  console.log(`  States:         ${states.length} (${states.map((s) => s.state).join(", ")})`);
  console.log(`  Cities:         ${cities.length}`);
  console.log(`  Problems:       ${problems.length} (30%+ frequency)`);

  // Count problem x state pages
  let problemStateCount = 0;
  for (const p of problems) {
    problemStateCount += p.byState.filter((s) => s.count >= CITY_THRESHOLD).length;
  }

  const totalPages = 1 + states.length + cities.length + problems.length + problemStateCount;
  console.log(`  Problem×state:  ${problemStateCount}`);
  console.log(`  TOTAL PAGES:    ${totalPages}`);
  console.log();

  console.log("  States:");
  for (const s of states) {
    console.log(`    ${s.state} (${s.stateName}): ${s.totalLeads} leads, score ${s.avgDeepScore}, ${s.cities.length} cities`);
  }

  console.log("\n  Cities:");
  for (const c of cities) {
    console.log(`    ${c.city}, ${c.state}: ${c.totalLeads} leads, score ${c.avgDeepScore}, ${c.nearbyCities.length} nearby`);
  }

  console.log("\n  Problems:");
  for (const p of problems) {
    const statePages = p.byState.filter((s) => s.count >= CITY_THRESHOLD).length;
    console.log(`    ${p.slug}: ${Math.round(p.nationalFrequency * 100)}% (${p.nationalCount}/${p.nationalDeepTotal}) +${statePages} state pages`);
  }

  console.log(`\n${"═".repeat(60)}\n`);

  await client.end();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
