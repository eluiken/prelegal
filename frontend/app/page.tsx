"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NDAShell from "@/components/NDAShell";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("prelegal_user");
    if (!user) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span style={{ color: "#888888" }} className="text-sm">Loading…</span>
      </div>
    );
  }

  return <NDAShell />;
}
