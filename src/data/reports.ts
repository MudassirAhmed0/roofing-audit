import reportsJson from "./reports.json";
import privateReportsJson from "./private-reports.json";

export interface Gap {
  gap: string;
  impact: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  fixEffort: "quick-win" | "moderate" | "major";
  estimatedMonthlyCost: string;
}

export type DiagnosticType = "blind-spender" | "pretty-and-broken" | "half-built" | "invisible";

export interface BusinessSummary {
  oneLiner: string;
  topThreeGaps: string[];
  estimatedTotalMonthlyCost: string;
  estimatedAnnualLtvLost: string;
  competitivePosition: string;
  seasonalUrgency: string;
  recommendedFirstProject: string;
  recommendedFirstProjectPrice: string;
  recommendedFirstProjectTimeline: string;
  growthOpportunity: string;
  diagnosticType?: DiagnosticType;
  diagnosticLabel?: string;
  diagnosticHeadline?: string;
  diagnosticDescription?: string;
  websiteQualityScore?: number;
}

export interface ImpactEstimate {
  monthlyVisitors: number;
  bounceReason: string;
  bouncePercent: number;
  bouncedVisitors: number;
  bookingRate: number;
  missedLeads: string;
  avgServiceCall: number;
  missedRepairRevenue: string;
  installNote: string;
}

export interface Report {
  slug: string;
  name: string;
  domain: string;
  website: string;
  rating: number;
  reviewCount: number;
  city: string;
  state: string;
  totalScore: number;
  websiteQualityScore: number;
  impactEstimate: ImpactEstimate;
  businessSummary: BusinessSummary;
  gapSummary: Gap[];
}

export const reports: Report[] = reportsJson as Report[];
export const privateReports: Report[] = privateReportsJson as Report[];
export const allReports: Report[] = [...reports, ...privateReports];

export function getReport(slug: string): Report | undefined {
  return reports.find((r) => r.slug === slug);
}

export function getAllSlugs(): string[] {
  return reports.map((r) => r.slug);
}

export function isPrivateReport(slug: string): boolean {
  return privateReports.some((r) => r.slug === slug);
}

export const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export const severityColors = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-500" },
  medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-500" },
  low: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" },
};

export const categoryLabels: Record<string, string> = {
  trust: "Trust & Credibility",
  "lead-capture": "Lead Capture",
  speed: "Page Speed",
  seo: "SEO",
  content: "Content",
  business: "Business Impact",
  tracking: "Tracking & Analytics",
};

export const categoryIcons: Record<string, string> = {
  trust: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  "lead-capture": "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  speed: "M13 10V3L4 14h7v7l9-11h-7z",
  seo: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  content: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  business: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  tracking: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
};
