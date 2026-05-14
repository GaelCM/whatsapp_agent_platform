"use client";

import { useEffect, useState } from "react";
import { ConfigScreen } from "./ConfigScreen";

export function ConnectionGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "connected" | "missing_config" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/connection/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status);
        if (data.message) setErrorMsg(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(String(err));
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (status === "missing_config" || status === "error") {
    return <ConfigScreen />;
  }

  return <>{children}</>;
}
