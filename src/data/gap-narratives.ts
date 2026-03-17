export interface GapNarrative {
  heading: string;
  whyItMatters: string;
  whatTopSitesDo: string;
  costLine: string;
}

/** Interpolate {market}, {pct}, {count} into narrative templates */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export const gapNarratives: Record<string, GapNarrative> = {
  "no-schema-markup": {
    heading: "{pct}% of roofing sites in {market} have no LocalBusiness schema",
    whyItMatters:
      "Schema markup tells Google exactly what your business is, where you operate, and what services you offer. Without it, you're relying on Google to guess — and it often guesses wrong. Roofing companies with LocalBusiness schema appear in more local pack results and get richer search listings with ratings, hours, and service areas displayed directly in results.",
    whatTopSitesDo:
      "Top-performing roofing sites in {market} embed JSON-LD LocalBusiness schema on every page. They include service type, area served, price range, aggregate ratings, and opening hours. This gives Google structured data it can use to surface the business in local searches, map results, and knowledge panels.",
    costLine:
      "{count} roofing sites in {market} are invisible to Google's rich results because they lack basic schema markup.",
  },

  "no-airbnb-page": {
    heading: "{pct}% of roofing companies in {market} have no Airbnb/vacation rental page",
    whyItMatters:
      "Short-term rental properties need reliable roofing maintenance more than most homes. Hosts need fast, dependable roof repairs and inspections and they search specifically for \"Airbnb roof repair\" and \"vacation rental roofing contractor.\" Without a dedicated page, you're invisible to this entire segment — even if you already do the work.",
    whatTopSitesDo:
      "Leading roofing companies in {market} have dedicated Airbnb and vacation rental roofing pages with specific pricing for inspections, emergency repairs, and maintenance plans. They rank for \"Airbnb roof repair {market}\" and capture property managers who need reliable, responsive contractors.",
    costLine:
      "{count} roofing companies in {market} are missing out on the short-term rental turnover market — one of the fastest-growing segments in residential roofing.",
  },

  "no-online-scheduling": {
    heading: "{pct}% of roofing websites in {market} have no online scheduling",
    whyItMatters:
      "Homeowners expect to request a roofing estimate the same way they order food — online, instantly. When a potential customer visits your site at 9 PM and can't request a quote, they don't call back tomorrow. They find someone who lets them book right now. Every hour without online scheduling is an hour you're losing to competitors who have it.",
    whatTopSitesDo:
      "The best roofing sites in {market} offer instant online scheduling or quote forms that take under 60 seconds. They show available time slots, transparent pricing, and confirmation within minutes. Some integrate with scheduling tools that auto-fill the calendar and send reminders — reducing no-shows and admin time.",
    costLine:
      "{count} roofing businesses in {market} are forcing customers to call or email to book — and losing the ones who won't.",
  },

  "no-contact-form": {
    heading: "{pct}% of roofing sites in {market} have no contact form",
    whyItMatters:
      "Not everyone wants to call. Many homeowners prefer to send a message, especially outside business hours. A contact form is the minimum viable way to capture leads — without one, you're turning away every visitor who doesn't want to pick up the phone. That's a significant portion of younger homeowners and busy professionals.",
    whatTopSitesDo:
      "Top roofing companies in {market} have contact forms on every page — not just the contact page. They keep forms short (name, email, phone, zip, service type) and respond within minutes during business hours. The best ones use auto-responders so leads get instant confirmation.",
    costLine:
      "{count} roofing sites in {market} have no contact form at all — the easiest lead capture tool to add and the most costly to be missing.",
  },

  "no-pricing-page": {
    heading: "{pct}% of roofing websites in {market} hide their pricing",
    whyItMatters:
      "Homeowners comparison-shop roofing services. If they can't find a ballpark price on your site, they leave and check the competitor who shows one. Hiding pricing doesn't create mystery — it creates friction. The roofing companies that show transparent pricing convert more because they attract pre-qualified leads who already know the range.",
    whatTopSitesDo:
      "High-converting roofing sites in {market} publish starting prices or price ranges for repairs, replacements, and inspections. They frame pricing by roof size and material (e.g., \"asphalt shingle replacement starting at $5,000\") and include an instant quote calculator. This filters out low-budget leads and attracts customers ready to book.",
    costLine:
      "{count} roofing companies in {market} are losing comparison shoppers because they don't show pricing — the #1 thing homeowners search for.",
  },

  "no-recurring-plan": {
    heading: "{pct}% of roofing sites in {market} don't frame recurring plans",
    whyItMatters:
      "Recurring roofing clients are 5-10x more valuable than one-time projects. A maintenance plan client at $300-$500/year is worth $3,000-$5,000 over a roof's lifetime — but most roofing websites treat every service as a one-off. Without framing recurring maintenance plans (annual inspections, gutter cleanings, preventive repairs) with clear pricing and savings, you're leaving your most profitable revenue stream on the table.",
    whatTopSitesDo:
      "The best roofing companies in {market} dedicate a section or page to recurring maintenance plans. They show annual inspection packages, seasonal maintenance bundles, and multi-year warranties with pricing tiers (e.g., \"Save 20% with an annual maintenance plan\"). They emphasize roof longevity, early leak detection, and the benefit of a dedicated roofing team who knows your property.",
    costLine:
      "{count} roofing sites in {market} don't promote recurring plans — missing the highest lifetime-value customers in the industry.",
  },

  "no-satisfaction-guarantee": {
    heading: "{pct}% of roofing companies in {market} show no satisfaction guarantee",
    whyItMatters:
      "Hiring a roofing contractor is a major investment. A satisfaction guarantee is the single fastest way to reduce that anxiety. It tells the customer: \"If something isn't right, we'll come back and fix it — free.\" Without one, you're asking customers to take all the risk on a $5,000-$15,000 project. Most won't.",
    whatTopSitesDo:
      "Top-rated roofing companies in {market} display their satisfaction guarantee prominently — on the homepage, service pages, and quote flow. The strongest ones offer a workmanship warranty with specific language about what's covered — leak-free guarantee, manufacturer-backed materials, and free follow-up inspections. This converts fence-sitters into signed contracts.",
    costLine:
      "{count} roofing companies in {market} have no visible satisfaction guarantee — the most effective trust signal for getting first-time customers to book.",
  },

  "no-https-redirect": {
    heading: "{pct}% of roofing sites in {market} don't redirect HTTP to HTTPS",
    whyItMatters:
      "When someone types your URL or clicks an old link, they may land on the HTTP version of your site. Without a redirect, Chrome displays a \"Not Secure\" warning in the address bar. For a roofing company — a business built on trust and entering people's homes — that warning is devastating. Visitors leave immediately.",
    whatTopSitesDo:
      "Every well-maintained roofing site in {market} uses a 301 redirect from HTTP to HTTPS. This ensures all visitors see a secure site regardless of how they arrive. It also consolidates SEO authority on a single URL version, preventing duplicate content issues.",
    costLine:
      "{count} roofing sites in {market} show a \"Not Secure\" warning to visitors arriving via HTTP — killing trust before the homepage even loads.",
  },

  "missing-meta-description": {
    heading: "{pct}% of roofing sites in {market} have missing or weak meta descriptions",
    whyItMatters:
      "The meta description is your 160-character sales pitch in Google results. Without one, Google auto-generates a snippet — usually pulling random text from your page that reads poorly. A strong meta description with your city name, services, and a call to action can double your click-through rate from search results.",
    whatTopSitesDo:
      "Leading roofing companies in {market} write unique meta descriptions for every page. Each one includes the city name, primary service, a differentiator (e.g., \"bonded & insured\"), and a CTA like \"Book online today.\" They treat meta descriptions as ads — because in search results, that's exactly what they are.",
    costLine:
      "{count} roofing sites in {market} are letting Google write their search result descriptions for them — and Google rarely does a good job.",
  },

  "phone-not-clickable": {
    heading: "{pct}% of roofing sites in {market} have non-clickable phone numbers",
    whyItMatters:
      "Over 60% of roofing service searches happen on mobile. When someone finds your site on their phone and wants to call, they expect to tap the number. If your phone number is plain text instead of a tel: link, they have to memorize it, switch apps, and type it in. Most won't bother — they'll tap the back button and call the next result.",
    whatTopSitesDo:
      "The best roofing sites in {market} use clickable tel: links for every phone number on every page. Many add a sticky call button on mobile that follows the user as they scroll. This single change — making the number tappable — can increase phone leads by 30-40%.",
    costLine:
      "{count} roofing websites in {market} are losing mobile callers because their phone number isn't tap-to-call.",
  },

  "no-cta-above-fold": {
    heading: "{pct}% of roofing sites in {market} have no CTA above the fold",
    whyItMatters:
      "You have 3-5 seconds to tell a visitor what to do next. If the first screen they see has no \"Book Now,\" \"Get a Quote,\" or \"Call Us\" button, they scroll aimlessly — or leave. A clear call-to-action above the fold is the difference between a lead and a bounce. It's the single highest-impact element on your homepage.",
    whatTopSitesDo:
      "Top roofing companies in {market} place a prominent CTA button in the hero section — visible without scrolling on both desktop and mobile. The best ones use action-oriented text like \"Get a Free Estimate\" or \"Schedule Your Inspection\" with a contrasting color that stands out from the rest of the page.",
    costLine:
      "{count} roofing sites in {market} have no call-to-action visible on the first screen — the most important real estate on any website.",
  },

  "no-deep-roofing-page": {
    heading: "{pct}% of roofing companies in {market} have no deep roofing page",
    whyItMatters:
      "A full roof replacement is typically 10-20x the price of a basic repair and represents the highest-value project in residential roofing. Homeowners search specifically for \"full roof replacement\" and \"roof replacement cost\" — if you don't have a dedicated page, you don't rank for these terms and you lose high-value leads.",
    whatTopSitesDo:
      "Successful roofing companies in {market} have a dedicated full replacement page with a clear scope of work (tear-off, decking inspection, underlayment, shingle installation, flashing, cleanup), pricing by roof size and material, before/after photos, and a free estimate CTA. This page captures search traffic and sets expectations for the project.",
    costLine:
      "{count} roofing companies in {market} are missing a dedicated full replacement page — one of the highest-converting service pages in the industry.",
  },

  "no-blog": {
    heading: "{pct}% of roofing sites in {market} have no blog or content hub",
    whyItMatters:
      "A blog isn't about writing for fun — it's about ranking for the hundreds of roofing-related questions homeowners ask Google every month. \"How long does a roof last?\" \"Should I repair or replace my roof?\" \"How to file a roofing insurance claim?\" Every answer is a chance to appear in search results and convert a reader into a customer.",
    whatTopSitesDo:
      "The best roofing companies in {market} publish 2-4 blog posts per month answering common customer questions. They target local keywords (\"storm damage roof repair {market}\"), link to their service pages, and include free estimate CTAs in every post. This builds organic traffic that compounds over time.",
    costLine:
      "{count} roofing companies in {market} have no blog — missing hundreds of long-tail search queries that could bring in free organic leads every month.",
  },

  "no-move-roofing-page": {
    heading: "{pct}% of roofing sites in {market} have no move-in/move-out page",
    whyItMatters:
      "Move-in and move-out roof inspections and repairs are high-urgency, high-value projects. People buying or selling homes have a hard deadline and need a roof in certifiable condition. They search \"roof inspection {market}\" and book the first company with a clear offering. Without a dedicated page, you don't rank for these searches and you lose these time-sensitive, high-margin jobs.",
    whatTopSitesDo:
      "Leading roofing companies in {market} have a dedicated move-in/move-out roofing page with specific pricing, a checklist of what's included, and fast turnaround messaging. Many partner with local real estate agents and property managers to capture referrals.",
    costLine:
      "{count} roofing companies in {market} don't have a move-in/move-out page — missing one of the most time-sensitive and profitable service categories.",
  },

  "no-service-area-pages": {
    heading: "{pct}% of roofing sites in {market} have no service area pages",
    whyItMatters:
      "When someone searches \"roofing company in [neighborhood]\" or \"roof repair near [suburb],\" Google looks for pages that specifically mention those locations. Without service area pages, you're relying on your homepage alone to rank for every city, town, and neighborhood you serve. It won't.",
    whatTopSitesDo:
      "Top roofing companies in {market} create individual pages for each city, suburb, and major neighborhood they serve. Each page includes unique content about that area, local testimonials, and specific service details. This is one of the highest-ROI SEO strategies for local service businesses.",
    costLine:
      "{count} roofing companies in {market} have no service area pages — invisible in local searches beyond their immediate city.",
  },

  "no-bonded-insured-messaging": {
    heading: "{pct}% of roofing sites in {market} don't mention bonded, insured, or background checks",
    whyItMatters:
      "You're asking homeowners to trust your crew on their roof — the most critical structure protecting their family. The #1 concern is safety, licensing, and accountability. If your website doesn't prominently state that your team is bonded, insured, and background-checked, customers assume the worst — or they just book with the company that does mention it.",
    whatTopSitesDo:
      "The most trusted roofing companies in {market} display bonded, insured, and licensed badges on every page. They show their contractor license number, proof of insurance, and manufacturer certifications prominently. This converts more cautious homeowners who are comparison-shopping on trust.",
    costLine:
      "{count} roofing companies in {market} don't address the #1 customer concern — whether their team is properly licensed, bonded, and insured.",
  },

  "no-first-time-offer": {
    heading: "{pct}% of roofing sites in {market} have no first-time customer offer",
    whyItMatters:
      "The hardest conversion in roofing is the first project. Once a homeowner trusts your work, they refer neighbors and come back for future repairs. A first-time incentive (free inspection, discounted gutter cleaning with a repair, or waived estimate fee) dramatically lowers the barrier to that first project — and the lifetime value far exceeds the discount.",
    whatTopSitesDo:
      "High-growth roofing companies in {market} promote a first-time offer prominently — in the hero section, as a banner, or as a pop-up. They frame it as limited (\"Free roof inspection this month\" or \"$200 off your first repair\") and tie it to booking online. This creates urgency and captures leads who are on the fence.",
    costLine:
      "{count} roofing companies in {market} offer no incentive for first-time customers — the single most effective tool for converting browsers into booked clients.",
  },

  "no-before-after-gallery": {
    heading: "{pct}% of roofing sites in {market} have no before/after gallery",
    whyItMatters:
      "Roofing is a visual service — the transformation is the product. Before/after photos are more persuasive than any written testimonial because they show the actual quality of your work. Without them, customers have to take your word for it. With them, they can see the difference you make.",
    whatTopSitesDo:
      "The best roofing companies in {market} maintain a gallery of before/after photos organized by project type (storm damage repair, full replacement, metal roofing, gutter installation). They take consistent, well-lit drone and ground-level photos and update the gallery regularly. Some embed them on service pages for maximum impact.",
    costLine:
      "{count} roofing sites in {market} have no visual proof of their work — missing the most persuasive content format for a visual service.",
  },

  "no-analytics": {
    heading: "{pct}% of roofing sites in {market} have no analytics tracking",
    whyItMatters:
      "Without analytics, you have no idea how many people visit your site, where they come from, what pages they view, or where they drop off. You can't measure what you can't track. Every marketing dollar you spend — ads, SEO, social media — is a guess without data showing what's actually working.",
    whatTopSitesDo:
      "Well-run roofing companies in {market} install Google Analytics and track key events: form submissions, phone clicks, estimate requests. They review traffic sources monthly to know which marketing channels drive real leads — and stop spending on channels that don't.",
    costLine:
      "{count} roofing companies in {market} are flying blind — spending money on marketing with no way to measure if it's working.",
  },

  "phone-mismatch": {
    heading: "{pct}% of roofing sites in {market} have a phone mismatch with Google",
    whyItMatters:
      "When your website shows a different phone number than your Google Business Profile, it creates two problems. First, customers get confused and lose trust. Second, Google uses phone number consistency as a local ranking signal — a mismatch hurts your position in local search and map results.",
    whatTopSitesDo:
      "Consistent roofing businesses in {market} use the same primary phone number across their website, Google Business Profile, Yelp, Facebook, and all directories. They audit their NAP (Name, Address, Phone) quarterly and immediately update any listing that falls out of sync.",
    costLine:
      "{count} roofing companies in {market} have a phone number on their website that doesn't match Google — confusing customers and hurting local rankings.",
  },
};
