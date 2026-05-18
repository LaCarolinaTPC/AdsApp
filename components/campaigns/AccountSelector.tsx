"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Account {
  id: string;
  name: string | null;
  account_id: string;
}

export function AccountSelector({
  accounts,
  selected,
}: {
  accounts: Account[];
  selected?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(id: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("account", id);
    router.push(`/dashboard/campaigns?${sp.toString()}`);
    // Fuerza recargar los datos del server component (la lista de
    // campañas) al cambiar de cuenta en el dropdown.
    router.refresh();
  }

  return (
    <select
      value={selected ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
    >
      <option value="" disabled>
        Selecciona una cuenta
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name || a.account_id}
        </option>
      ))}
    </select>
  );
}
