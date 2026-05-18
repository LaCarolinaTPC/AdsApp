import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/types";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "accepted_manual", label: "Aceptadas" },
  { key: "rejected", label: "Rechazadas" },
];

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recommendations")
    .select("*")
    .order("created_at", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);

  const { data: recs } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Historial de recomendaciones
        </h1>
        <p className="text-sm text-slate-500">
          Acepta (aplicada manualmente) o rechaza. En el MVP no se modifica
          Meta Ads automáticamente.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (sp.status ?? "") === f.key;
          return (
            <Link
              key={f.key}
              href={
                f.key
                  ? `/dashboard/recommendations?status=${f.key}`
                  : "/dashboard/recommendations"
              }
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {recs && recs.length > 0 ? (
        <div className="space-y-4">
          {(recs as Recommendation[]).map((r) => (
            <RecommendationCard key={r.id} rec={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sin recomendaciones"
          description="Analiza una campaña con IA para generar recomendaciones accionables."
        />
      )}
    </div>
  );
}
