import type { DiagnosticType } from "./reports";

export interface PainPage {
  slug: string;
  diagnosticType: DiagnosticType;
  title: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  heroStat: string;
  heroStatLabel: string;
  sections: {
    whatWeFind: {
      heading: string;
      intro: string;
      findings: { stat: string; label: string; detail: string }[];
    };
    whyItHappens: {
      heading: string;
      reasons: { title: string; description: string }[];
    };
    whatToFix: {
      heading: string;
      intro: string;
      steps: { title: string; description: string; effort: string; impact: string }[];
    };
  };
}

// Empty — will populate with roofing-specific pain pages
export const painPages: PainPage[] = [];
