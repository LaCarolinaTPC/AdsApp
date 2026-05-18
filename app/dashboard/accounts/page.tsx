import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { ConnectMetaButton } from "@/components/dashboard/ConnectMetaButton";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: conn }] = await Promise.all([
    supabase
      .from("meta_ad_accounts")
      .select("id, account_id, name, currency, account_status, business_id")
      .order("name"),
    supabase
      .from("meta_connections")
      .select("id")
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cuentas publicitarias
          </h1>
          <p className="text-sm text-slate-500">
            Cuentas asociadas a tu conexión de Meta.
          </p>
        </div>
        {conn && (
          <SyncButton
            endpoint="/api/meta/accounts?refresh=1"
            label="Sincronizar cuentas"
          />
        )}
      </div>

      {!conn ? (
        <EmptyState
          title="Sin conexión de Meta"
          description="Conecta tu cuenta para ver tus cuentas publicitarias."
          action={<ConnectMetaButton />}
        />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          title="Sin cuentas todavía"
          description="Pulsa «Sincronizar cuentas» para traerlas desde Meta."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardHeader
                title={a.name || a.account_id}
                subtitle={a.account_id}
                action={
                  <Badge
                    tone={a.account_status === 1 ? "success" : "warning"}
                  >
                    {a.account_status === 1 ? "Activa" : `Estado ${a.account_status}`}
                  </Badge>
                }
              />
              <CardBody className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Moneda: {a.currency ?? "—"}
                </span>
                <Link
                  href={`/dashboard/campaigns?account=${a.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Ver campañas →
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
