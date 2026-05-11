"use client";

import { useRef, useState } from "react";
import NDAForm from "@/components/NDAForm";
import NDAPreview from "@/components/NDAPreview";
import { defaultValues, NDAFormValues } from "@/lib/nda-template";

export default function NDAShell() {
  const [values, setValues] = useState<NDAFormValues>(defaultValues);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const el = previewRef.current;
      // Temporarily expand overflow so html2canvas captures the full document,
      // not just the visible scroll area.
      const prevStyle = { height: el.style.height, overflow: el.style.overflow };
      el.style.height = "auto";
      el.style.overflow = "visible";
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });
      el.style.height = prevStyle.height;
      el.style.overflow = prevStyle.overflow;

      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let yOffset = 0;
      while (yOffset < imgHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
      }

      const party1 = values.party1Company || values.party1Name || "Party1";
      const party2 = values.party2Company || values.party2Name || "Party2";
      pdf.save(`Mutual-NDA-${party1}-${party2}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 shadow-sm flex flex-col h-full">
        <NDAForm
          values={values}
          onChange={setValues}
          onDownload={handleDownload}
          downloading={downloading}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <NDAPreview values={values} previewRef={previewRef} />
      </div>
    </div>
  );
}
