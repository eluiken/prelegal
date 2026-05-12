"use client";

import { NDAFormValues } from "@/lib/nda-template";

interface Props {
  values: NDAFormValues;
  onChange: (values: NDAFormValues) => void;
  onDownload: () => void;
  downloading: boolean;
}

function Field({
  label,
  name,
  values,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: keyof NDAFormValues;
  values: NDAFormValues;
  onChange: (v: NDAFormValues) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={values[name] as string}
        onChange={(e) => onChange({ ...values, [name]: e.target.value })}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

export default function NDAForm({ values, onChange, onDownload, downloading }: Props) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-5 border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-900">Mutual NDA Generator</h1>
        <p className="text-xs text-gray-400 mt-0.5">Fill in the details to generate your document</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Party 1 */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Party 1
          </h2>
          <div className="space-y-3">
            <Field label="Full Name" name="party1Name" values={values} onChange={onChange} placeholder="Jane Smith" />
            <Field label="Title" name="party1Title" values={values} onChange={onChange} placeholder="CEO" />
            <Field label="Company" name="party1Company" values={values} onChange={onChange} placeholder="Acme Corp" />
            <Field label="Notice Address" name="party1Address" values={values} onChange={onChange} placeholder="jane@acme.com" />
          </div>
        </section>

        {/* Party 2 */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Party 2
          </h2>
          <div className="space-y-3">
            <Field label="Full Name" name="party2Name" values={values} onChange={onChange} placeholder="John Doe" />
            <Field label="Title" name="party2Title" values={values} onChange={onChange} placeholder="CTO" />
            <Field label="Company" name="party2Company" values={values} onChange={onChange} placeholder="Beta Inc" />
            <Field label="Notice Address" name="party2Address" values={values} onChange={onChange} placeholder="john@beta.com" />
          </div>
        </section>

        {/* Agreement details */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Agreement Details
          </h2>
          <div className="space-y-3">
            {/* Purpose */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Purpose</label>
              <textarea
                value={values.purpose}
                onChange={(e) => onChange({ ...values, purpose: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Effective Date */}
            <Field label="Effective Date" name="effectiveDate" values={values} onChange={onChange} type="date" />

            {/* MNDA Term */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MNDA Term</label>
              <div className="flex gap-2 items-center">
                <select
                  value={values.mndaTermType}
                  onChange={(e) =>
                    onChange({ ...values, mndaTermType: e.target.value as NDAFormValues["mndaTermType"] })
                  }
                  className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="years">Expires after</option>
                  <option value="until_terminated">Until terminated</option>
                </select>
                {values.mndaTermType === "years" && (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={values.mndaTermYears}
                      onChange={(e) =>
                        onChange({ ...values, mndaTermYears: String(Math.max(1, Number(e.target.value) || 1)) })
                      }
                      className="w-16 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">year(s)</span>
                  </>
                )}
              </div>
            </div>

            {/* Term of Confidentiality */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Term of Confidentiality</label>
              <div className="flex gap-2 items-center">
                <select
                  value={values.confidentialityTermType}
                  onChange={(e) =>
                    onChange({ ...values, confidentialityTermType: e.target.value as NDAFormValues["confidentialityTermType"] })
                  }
                  className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="years">Expires after</option>
                  <option value="perpetual">In perpetuity</option>
                </select>
                {values.confidentialityTermType === "years" && (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={values.confidentialityTermYears}
                      onChange={(e) =>
                        onChange({ ...values, confidentialityTermYears: String(Math.max(1, Number(e.target.value) || 1)) })
                      }
                      className="w-16 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">year(s)</span>
                  </>
                )}
              </div>
            </div>

            {/* Governing Law */}
            <Field label="Governing Law (State)" name="governingLaw" values={values} onChange={onChange} placeholder="Delaware" />

            {/* Jurisdiction */}
            <Field label="Jurisdiction" name="jurisdiction" values={values} onChange={onChange} placeholder="New Castle, DE" />

            {/* Modifications */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">MNDA Modifications (optional)</label>
              <textarea
                value={values.modifications}
                onChange={(e) => onChange({ ...values, modifications: e.target.value })}
                rows={2}
                placeholder="List any modifications to the standard terms..."
                className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="p-5 border-t border-gray-100">
        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors"
        >
          {downloading ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
