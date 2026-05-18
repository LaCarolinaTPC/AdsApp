import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        Panel de optimización
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-700">{email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
