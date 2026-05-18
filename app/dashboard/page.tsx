import Link from "next/link";
import { Plug, Wallet, Megaphone, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConnectMetaButton } from "@/components/dashboard/ConnectMetaButton";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = await createClient();

  const [{ data: conn }, accounts, campaigns, recs] = await Promise.all([
    supabase
      .from("meta_connections")
      .select("id, status, token_expires_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meta_ad_accounts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("campaigns_cache")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("recommendations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const connected = Boolean(conn);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resumen</h1>
        <p className="text-sm text-slate-500">
          Estado de tu cuenta y actividad reciente.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Conexión con Meta Ads"
          subtitle={
            connected
              ? "Tu cuenta de Meta está conectada."
              : "Aún no has conectado ninguna cuenta de Meta Ads."
          }
          action={
            connected ? (
              <Badge tone="success">Conectado</Badge>
            ) : (
              <Badge tone="warning">Sin conexión</Badge>
            )
          }
        />
        {!connected && (
          <CardBody>
            <ConnectMetaButton />
          </CardBody>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Cuentas publicitarias"
          value={accounts.count ?? 0}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label="Campañas en caché"
          value={campaigns.count ?? 0}
          icon={<Megaphone className="h-5 w-5" />}
        />
        <MetricCard
          label="Recomendaciones pendientes"
          value={recs.count ?? 0}
          icon={<Lightbulb className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/connections">
          <Card className="transition-shadow hover:shadow-md">
            <CardBody className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-brand-600" />
              <div>
                <p className="font-medium text-slate-900">Conexiones</p>
                <p className="text-sm text-slate-500">
                  Gestiona tu conexión con Meta.
                </p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/dashboard/campaigns">
          <Card className="transition-shadow hover:shadow-md">
            <CardBody className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-brand-600" />
              <div>
                <p className="font-medium text-slate-900">Campañas</p>
                <p className="text-sm text-slate-500">
                  Analiza el rendimiento con IA.
                </p>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
