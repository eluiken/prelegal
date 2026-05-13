"use client";

import { useRef, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import DocPreview from "@/components/DocPreview";
import {
  DocSchema,
  GenericDocValues,
  getDefaultValues,
  isDocComplete,
} from "@/lib/doc-schemas";

interface Props {
  schema: DocSchema;
  onBack?: () => void;
}

export default function DocShell({ schema, onBack }: Props) {
  const [values, setValues] = useState<GenericDocValues>(() => getDefaultValues(schema));
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const canDownload = isDocComplete(schema, values);

  async function handleDownload() {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");

      const el = previewRef.current;
      const wrapper = document.createElement("div");
      wrapper.style.cssText =
        "position:fixed;top:0;left:-9999px;width:" + el.offsetWidth + "px;background:#fff;z-index:-1";
      const clone = el.cloneNode(true) as HTMLDivElement;
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      let dataUrl: string;
      try {
        dataUrl = await toPng(clone, { backgroundColor: "#ffffff", pixelRatio: 2 });
      } finally {
        document.body.removeChild(wrapper);
      }

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (img.naturalHeight * pageWidth) / img.naturalWidth;

      let yOffset = 0;
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
      }

      const party1 = values.party1Company || values.party1Name || "Party1";
      const party2 = values.party2Company || values.party2Name || "Party2";
      const safeName = schema.name.replace(/[^a-zA-Z0-9]/g, "-");
      pdf.save(`${safeName}-${party1}-${party2}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {onBack && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex-shrink-0">
          <button
            onClick={onBack}
            className="text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: "#888888" }}
          >
            ← Back to documents
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 shadow-sm flex flex-col h-full">
          <ChatPanel
            values={values}
            onChange={(v) => setValues(v as GenericDocValues)}
            onDownload={handleDownload}
            downloading={downloading}
            canDownload={canDownload}
            docTypeName={schema.name}
            docType={schema.filename}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <DocPreview schema={schema} values={values} previewRef={previewRef} />
        </div>
      </div>
    </div>
  );
}
