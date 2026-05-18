"use client";

import { Plug } from "lucide-react";

export function ConnectMetaButton({
  label = "Conectar Meta Ads",
}: {
  label?: string;
}) {
  return (
    <a
      href="/api/meta/oauth/start"
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
    >
      <Plug className="h-4 w-4" />
      {label}
    </a>
  );
}
