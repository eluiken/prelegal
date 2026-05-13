"use client";

import { useRef, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
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
      // html-to-image delegates rendering to the browser's SVG engine, which
      // supports oklch/lab — Tailwind v4's color format. html2canvas has a
      // hand-rolled CSS parser that throws on these modern color functions.
      const { toPng } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");

      const el = previewRef.current;

      // Clone into a detached body-level container so no overflow:hidden ancestor
      // clips the capture. The clone retains Tailwind classes whose styles are
      // already in the page stylesheet.
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
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });

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
      pdf.save(`Mutual-NDA-${party1}-${party2}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 shadow-sm flex flex-col h-full">
        <ChatPanel
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
