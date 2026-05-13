"use client";

import { DOC_SCHEMAS, DocSchema } from "@/lib/doc-schemas";

const catalog: { name: string; description: string; filename: string }[] = [
  {
    name: "Mutual Non-Disclosure Agreement",
    description:
      "Standard mutual NDA created by a committee of over 40 attorneys. Suitable for parties that need to share confidential information bidirectionally.",
    filename: "Mutual-NDA.md",
  },
  {
    name: "Mutual NDA Cover Page",
    description:
      "Cover page template to accompany the Common Paper Mutual NDA standard terms. Captures deal-specific details such as party names and governing law.",
    filename: "Mutual-NDA-coverpage.md",
  },
  {
    name: "Cloud Service Agreement",
    description:
      "Standard cloud service agreement (CSA) for SaaS and cloud product vendors. Covers subscription terms, acceptable use, data handling, and liability.",
    filename: "CSA.md",
  },
  {
    name: "Design Partner Agreement",
    description:
      "Standard design partner agreement for early-stage commercial relationships. Governs product feedback, IP ownership, and limited usage rights during a pre-launch phase.",
    filename: "design-partner-agreement.md",
  },
  {
    name: "Service Level Agreement",
    description:
      "Standard SLA defining uptime commitments, measurement methodology, and service credits for cloud and hosted services.",
    filename: "sla.md",
  },
  {
    name: "Professional Services Agreement",
    description:
      "Standard PSA for consulting, implementation, and custom development engagements. Covers statements of work, IP ownership, and payment terms.",
    filename: "psa.md",
  },
  {
    name: "Data Processing Agreement",
    description:
      "Standard GDPR-compliant DPA for handling personal data by a processor on behalf of a controller. Includes security obligations.",
    filename: "DPA.md",
  },
  {
    name: "Software License Agreement",
    description:
      "Standard software license agreement for on-premise or downloadable software. Covers license scope, restrictions, support, and warranties.",
    filename: "Software-License-Agreement.md",
  },
  {
    name: "Partnership Agreement",
    description:
      "Standard partnership agreement covering referral arrangements, co-selling, revenue sharing, and joint go-to-market activities.",
    filename: "Partnership-Agreement.md",
  },
  {
    name: "Pilot Agreement",
    description:
      "Standard pilot/trial agreement for short-term product evaluations before committing to a full commercial agreement.",
    filename: "Pilot-Agreement.md",
  },
  {
    name: "Business Associate Agreement",
    description:
      "Standard HIPAA BAA for vendors that handle protected health information (PHI) on behalf of a covered entity.",
    filename: "BAA.md",
  },
  {
    name: "AI Addendum",
    description:
      "Standard addendum addressing AI-specific terms: acceptable AI use, data training restrictions, and AI-generated output ownership.",
    filename: "AI-Addendum.md",
  },
];

// Abbreviated labels for cards
const SHORT_LABELS: Record<string, string> = {
  "Mutual-NDA.md": "NDA",
  "Mutual-NDA-coverpage.md": "NDA Cover",
  "CSA.md": "CSA",
  "design-partner-agreement.md": "Design Partner",
  "sla.md": "SLA",
  "psa.md": "PSA",
  "DPA.md": "DPA",
  "Software-License-Agreement.md": "Software License",
  "Partnership-Agreement.md": "Partnership",
  "Pilot-Agreement.md": "Pilot",
  "BAA.md": "BAA",
  "AI-Addendum.md": "AI Addendum",
};

interface Props {
  onSelect: (schema: DocSchema | null, filename: string) => void;
}

export default function DocumentPicker({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "#032147" }}
          >
            PL
          </div>
          <span className="text-lg font-semibold" style={{ color: "#032147" }}>
            Prelegal
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 px-8 py-12 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#032147" }}>
            Choose a document
          </h1>
          <p className="text-sm" style={{ color: "#888888" }}>
            Select the legal agreement you want to draft. Our AI will guide you through the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((doc) => {
            const schema = DOC_SCHEMAS.find((s) => s.filename === doc.filename) ?? null;
            return (
              <button
                key={doc.filename}
                onClick={() => onSelect(schema, doc.filename)}
                className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-100 transition-all group"
              >
                {/* Badge */}
                <div
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3 text-white"
                  style={{ backgroundColor: "#209dd7" }}
                >
                  {SHORT_LABELS[doc.filename] ?? "Doc"}
                </div>

                <h2
                  className="text-sm font-semibold mb-1.5 group-hover:opacity-80 transition-opacity"
                  style={{ color: "#032147" }}
                >
                  {doc.name}
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: "#888888" }}>
                  {doc.description}
                </p>

                <div
                  className="mt-4 text-xs font-medium"
                  style={{ color: "#753991" }}
                >
                  Draft with AI →
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
