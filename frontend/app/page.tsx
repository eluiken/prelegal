"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NDAShell from "@/components/NDAShell";
import DocShell from "@/components/DocShell";
import DocumentPicker from "@/components/DocumentPicker";
import { DocSchema } from "@/lib/doc-schemas";

type View =
  | { type: "loading" }
  | { type: "picker" }
  | { type: "nda" }
  | { type: "doc"; schema: DocSchema };

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>({ type: "loading" });

  useEffect(() => {
    const user = localStorage.getItem("prelegal_user");
    if (!user) {
      router.replace("/login");
    } else {
      setView({ type: "picker" });
    }
  }, [router]);

  function handleDocSelect(schema: DocSchema | null, filename: string) {
    if (filename === "Mutual-NDA.md") {
      setView({ type: "nda" });
    } else if (schema) {
      setView({ type: "doc", schema });
    }
  }

  if (view.type === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span style={{ color: "#888888" }} className="text-sm">
          Loading…
        </span>
      </div>
    );
  }

  if (view.type === "picker") {
    return <DocumentPicker onSelect={handleDocSelect} />;
  }

  if (view.type === "nda") {
    return <NDAShell onBack={() => setView({ type: "picker" })} />;
  }

  if (view.type === "doc") {
    return <DocShell schema={view.schema} onBack={() => setView({ type: "picker" })} />;
  }

  return null;
}
