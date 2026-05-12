"use client";

import ReactMarkdown from "react-markdown";
import { NDAFormValues, buildFullDocument } from "@/lib/nda-template";

interface Props {
  values: NDAFormValues;
  previewRef: React.RefObject<HTMLDivElement | null>;
}

export default function NDAPreview({ values, previewRef }: Props) {
  const markdown = buildFullDocument(values);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Preview</span>
        <span className="text-xs text-gray-300">Live</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <div
          ref={previewRef}
          className="max-w-2xl mx-auto px-8 py-10 text-sm text-gray-800 leading-relaxed"
          id="nda-preview"
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-gray-900 mt-8 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-1">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-gray-700">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 space-y-1">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-gray-700">{children}</li>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-gray-50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-3 py-2 text-gray-700 min-w-[100px]">
                  {children}
                </td>
              ),
              hr: () => <hr className="my-8 border-gray-200" />,
              a: ({ href, children }) => (
                <a href={href} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-gray-500 not-italic text-xs">{children}</em>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
