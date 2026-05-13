// Document schema definitions for all 12 catalog document types.
// The Mutual NDA (filename: Mutual-NDA.md) is routed to the dedicated NDAShell;
// all other types use the generic DocShell with these schemas.

export interface DocField {
  key: string;
  label: string;
}

export interface DocSchema {
  name: string;
  filename: string;
  party1Role: string;
  party2Role: string;
  hasGoverningLaw: boolean;
  hasJurisdiction: boolean;
  specificFields: DocField[];
  requiredFields: string[];
  fieldHints: string;
}

export interface GenericDocValues {
  party1Name: string;
  party1Title: string;
  party1Company: string;
  party1Address: string;
  party2Name: string;
  party2Title: string;
  party2Company: string;
  party2Address: string;
  effectiveDate: string;
  governingLaw: string;
  jurisdiction: string;
  [key: string]: string;
}

export function getDefaultValues(schema: DocSchema): GenericDocValues {
  const base: GenericDocValues = {
    party1Name: "",
    party1Title: "",
    party1Company: "",
    party1Address: "",
    party2Name: "",
    party2Title: "",
    party2Company: "",
    party2Address: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    governingLaw: "",
    jurisdiction: "",
  };
  for (const field of schema.specificFields) {
    base[field.key] = "";
  }
  return base;
}

export function isDocComplete(schema: DocSchema, values: GenericDocValues): boolean {
  return schema.requiredFields.every((key) => Boolean(values[key]?.trim()));
}

export function buildGenericCoverPage(schema: DocSchema, values: GenericDocValues): string {
  const effectiveDateDisplay = values.effectiveDate
    ? new Date(values.effectiveDate + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "[Effective Date]";

  let md = `# ${schema.name}\n\n`;
  md += `**Effective Date:** ${effectiveDateDisplay}\n\n`;
  md += `---\n\n`;

  md += `## ${schema.party1Role}\n\n`;
  md += `| | |\n|---|---|\n`;
  if (values.party1Company) md += `| **Company** | ${values.party1Company} |\n`;
  else md += `| **Company** | _[Fill in ${schema.party1Role} company]_ |\n`;
  if (values.party1Name) md += `| **Name** | ${values.party1Name} |\n`;
  if (values.party1Title) md += `| **Title** | ${values.party1Title} |\n`;
  if (values.party1Address) md += `| **Address** | ${values.party1Address} |\n`;
  md += `\n`;

  md += `## ${schema.party2Role}\n\n`;
  md += `| | |\n|---|---|\n`;
  if (values.party2Company) md += `| **Company** | ${values.party2Company} |\n`;
  else md += `| **Company** | _[Fill in ${schema.party2Role} company]_ |\n`;
  if (values.party2Name) md += `| **Name** | ${values.party2Name} |\n`;
  if (values.party2Title) md += `| **Title** | ${values.party2Title} |\n`;
  if (values.party2Address) md += `| **Address** | ${values.party2Address} |\n`;
  md += `\n`;

  if (schema.specificFields.length > 0) {
    md += `## Agreement Details\n\n`;
    for (const field of schema.specificFields) {
      const val = values[field.key];
      md += `**${field.label}:** ${val || `_[Fill in ${field.label.toLowerCase()}]_`}\n\n`;
    }
  }

  if (schema.hasGoverningLaw || schema.hasJurisdiction) {
    md += `## Governing Law & Jurisdiction\n\n`;
    if (schema.hasGoverningLaw) {
      md += `**Governing Law:** ${values.governingLaw || "_[Fill in state]_"}\n\n`;
    }
    if (schema.hasJurisdiction) {
      md += `**Jurisdiction:** ${values.jurisdiction || "_[Fill in city/county and state]_"}\n\n`;
    }
  }

  md += `---\n\n`;
  md += `*This cover page accompanies the ${schema.name} Standard Terms.*\n\n`;
  md += `By signing this Cover Page, each party agrees to enter into this agreement as of the Effective Date.\n\n`;

  md += `| | **${schema.party1Role}** | **${schema.party2Role}** |\n`;
  md += `|:---|:---|:---|\n`;
  md += `| **Signature** | | |\n`;
  md += `| **Print Name** | ${values.party1Name || ""} | ${values.party2Name || ""} |\n`;
  md += `| **Title** | ${values.party1Title || ""} | ${values.party2Title || ""} |\n`;
  md += `| **Company** | ${values.party1Company || ""} | ${values.party2Company || ""} |\n`;
  md += `| **Address** | ${values.party1Address || ""} | ${values.party2Address || ""} |\n`;
  md += `| **Date** | | |\n`;

  return md;
}

export const DOC_SCHEMAS: DocSchema[] = [
  {
    name: "Mutual Non-Disclosure Agreement",
    filename: "Mutual-NDA.md",
    party1Role: "Party 1",
    party2Role: "Party 2",
    hasGoverningLaw: true,
    hasJurisdiction: true,
    specificFields: [],
    requiredFields: ["party1Company", "party2Company", "governingLaw", "jurisdiction"],
    fieldHints:
      "party names, titles, companies, and notice addresses for both parties; the purpose of the NDA; effective date; MNDA term (expires after N years, or until terminated); confidentiality term (N years, or perpetual); governing law (US state); jurisdiction (city/county and state); any modifications to standard terms",
  },
  {
    name: "Mutual NDA Cover Page",
    filename: "Mutual-NDA-coverpage.md",
    party1Role: "Party 1",
    party2Role: "Party 2",
    hasGoverningLaw: true,
    hasJurisdiction: true,
    specificFields: [],
    requiredFields: ["party1Company", "party2Company", "governingLaw", "jurisdiction"],
    fieldHints:
      "party names, titles, companies, and notice addresses for both parties; the purpose of the NDA; effective date; MNDA term; confidentiality term; governing law (US state); jurisdiction (city/county and state); any modifications",
  },
  {
    name: "Cloud Service Agreement",
    filename: "CSA.md",
    party1Role: "Provider",
    party2Role: "Customer",
    hasGoverningLaw: true,
    hasJurisdiction: true,
    specificFields: [
      { key: "productDescription", label: "Cloud Service / Product Description" },
      { key: "subscriptionPeriod", label: "Subscription Period" },
    ],
    requiredFields: ["party1Company", "party2Company", "governingLaw"],
    fieldHints:
      "Provider and Customer company names, signer names and titles, notice addresses, effective date, description of the cloud service or product, subscription period length, governing law (US state), and jurisdiction",
  },
  {
    name: "Design Partner Agreement",
    filename: "design-partner-agreement.md",
    party1Role: "Vendor",
    party2Role: "Design Partner",
    hasGoverningLaw: true,
    hasJurisdiction: false,
    specificFields: [
      { key: "productDescription", label: "Product / Service Being Designed" },
      { key: "feedbackObligations", label: "Feedback Obligations" },
    ],
    requiredFields: ["party1Company", "party2Company"],
    fieldHints:
      "Vendor and Design Partner company names, signer names and titles, notice addresses, effective date, description of the product being co-designed, what feedback the design partner will provide, and governing law",
  },
  {
    name: "Service Level Agreement",
    filename: "sla.md",
    party1Role: "Provider",
    party2Role: "Customer",
    hasGoverningLaw: false,
    hasJurisdiction: false,
    specificFields: [
      { key: "targetUptime", label: "Target Uptime (e.g., 99.9%)" },
      { key: "supportChannel", label: "Support Channel (e.g., email address)" },
      { key: "responseTime", label: "Target Response Time" },
    ],
    requiredFields: ["party1Company", "party2Company"],
    fieldHints:
      "Provider and Customer company names, signer names and titles, effective date, target uptime percentage (e.g. 99.9%), support channel (e.g. email address), and target response time for support requests",
  },
  {
    name: "Professional Services Agreement",
    filename: "psa.md",
    party1Role: "Provider",
    party2Role: "Customer",
    hasGoverningLaw: true,
    hasJurisdiction: true,
    specificFields: [
      { key: "servicesDescription", label: "Services Description" },
      { key: "paymentTerms", label: "Payment Terms" },
    ],
    requiredFields: ["party1Company", "party2Company", "governingLaw"],
    fieldHints:
      "Provider and Customer company names, signer names and titles, notice addresses, effective date, description of the professional services to be provided, payment terms (e.g. net 30), governing law, and jurisdiction",
  },
  {
    name: "Data Processing Agreement",
    filename: "DPA.md",
    party1Role: "Controller",
    party2Role: "Processor",
    hasGoverningLaw: true,
    hasJurisdiction: false,
    specificFields: [
      { key: "dataCategories", label: "Categories of Personal Data" },
      { key: "processingPurpose", label: "Purpose of Processing" },
    ],
    requiredFields: ["party1Company", "party2Company"],
    fieldHints:
      "Controller and Processor company names, signer names and titles, notice addresses, effective date, categories of personal data being processed, purpose of the processing, and governing law",
  },
  {
    name: "Software License Agreement",
    filename: "Software-License-Agreement.md",
    party1Role: "Licensor",
    party2Role: "Licensee",
    hasGoverningLaw: true,
    hasJurisdiction: true,
    specificFields: [
      { key: "softwareName", label: "Software Name / Product" },
      { key: "licenseScope", label: "License Scope (e.g., worldwide, non-exclusive)" },
    ],
    requiredFields: ["party1Company", "party2Company", "governingLaw"],
    fieldHints:
      "Licensor and Licensee company names, signer names and titles, notice addresses, effective date, name of the software being licensed, license scope and restrictions, governing law, and jurisdiction",
  },
  {
    name: "Partnership Agreement",
    filename: "Partnership-Agreement.md",
    party1Role: "Party 1",
    party2Role: "Party 2",
    hasGoverningLaw: true,
    hasJurisdiction: true,
    specificFields: [
      { key: "partnershipScope", label: "Partnership Scope / Purpose" },
      { key: "revenueShare", label: "Revenue Share Arrangement" },
    ],
    requiredFields: ["party1Company", "party2Company", "governingLaw"],
    fieldHints:
      "both party company names, signer names and titles, notice addresses, effective date, description of the partnership scope and go-to-market activities, revenue share arrangement, governing law, and jurisdiction",
  },
  {
    name: "Pilot Agreement",
    filename: "Pilot-Agreement.md",
    party1Role: "Provider",
    party2Role: "Customer",
    hasGoverningLaw: true,
    hasJurisdiction: false,
    specificFields: [
      { key: "productDescription", label: "Product / Service Being Piloted" },
      { key: "pilotDuration", label: "Pilot Duration (e.g., 90 days)" },
    ],
    requiredFields: ["party1Company", "party2Company"],
    fieldHints:
      "Provider and Customer company names, signer names and titles, notice addresses, effective date, description of the product or service being piloted, pilot duration, and governing law",
  },
  {
    name: "Business Associate Agreement",
    filename: "BAA.md",
    party1Role: "Covered Entity",
    party2Role: "Business Associate",
    hasGoverningLaw: false,
    hasJurisdiction: false,
    specificFields: [
      { key: "servicesDescription", label: "Services Involving PHI" },
      { key: "phiCategories", label: "Categories of PHI Handled" },
    ],
    requiredFields: ["party1Company", "party2Company"],
    fieldHints:
      "Covered Entity and Business Associate company names, signer names and titles, notice addresses, effective date, description of services that involve protected health information (PHI), and categories of PHI the Business Associate will handle",
  },
  {
    name: "AI Addendum",
    filename: "AI-Addendum.md",
    party1Role: "Provider",
    party2Role: "Customer",
    hasGoverningLaw: false,
    hasJurisdiction: false,
    specificFields: [
      { key: "aiUsageScope", label: "AI Features / Usage Scope" },
      { key: "dataTrainingRestriction", label: "Data Training Restrictions" },
    ],
    requiredFields: ["party1Company", "party2Company"],
    fieldHints:
      "Provider and Customer company names, signer names and titles, effective date, description of AI features or usage scope covered by this addendum, and any restrictions on using customer data for AI model training",
  },
];

export function getSchemaByFilename(filename: string): DocSchema | undefined {
  return DOC_SCHEMAS.find((s) => s.filename === filename);
}
