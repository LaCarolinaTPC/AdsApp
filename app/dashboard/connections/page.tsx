import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner, EmptyState } from "@/components/ui/States";
import { ConnectMetaButton } from "@/components/dashboard/ConnectMetaButton";
import { DisconnectButton } from "@/components/dashboard/DisconnectButton";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("meta_connections")
    .select("id, meta_user_id, status, scopes, token_expires_at, created_at")
    .order("created_at", { ascending: false });

  const active = (connections ?? []).filter((c) => c.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Conexiones</h1>
        <p className="text-sm text-slate-500">
          Conecta tu cuenta de Meta Ads mediante Facebook Login for Business.
        </p>
      </div>

      {sp.connected && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Cuenta de Meta conectada correctamente.
        </div>
      )}
      {sp.error && (
        <ErrorBanner message={`Error conectando con Meta: ${sp.error}`} />
      )}

      <Card>
        <CardHeader
          title="Meta Ads"
          subtitle="Permisos del MVP: solo lectura (ads_read)."
          action={<ConnectMetaButton label="Conectar / Reconectar" />}
        />
        <CardBody>
          {active.length === 0 ? (
            <EmptyState
              title="Sin conexiones activas"
              description="Conecta tu cuenta de Meta Ads para empezar a importar campañas."
              action={<ConnectMetaButton />}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {active.map((c) => {
                const expired = c.token_expires_at
                  ? new Date(c.token_expires_at).getTime() < Date.now()
                  : false;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        Meta User ID: {c.meta_user_id ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Conectada{" "}
                        {new Date(c.created_at).toLocaleDateString("es-ES")} ·
                        Scopes: {(c.scopes ?? []).join(", ")}
                      </p>
                      <p className="text-xs text-slate-400">
                        Expira:{" "}
                        {c.token_expires_at
                          ? new Date(c.token_expires_at).toLocaleString(
                              "es-ES",
                            )
                          : "sin fecha"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {expired ? (
                        <Badge tone="danger">Token expirado</Badge>
                      ) : (
                        <Badge tone="success">Activa</Badge>
                      )}
                      <DisconnectButton />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Próxima fase (no activo en MVP)" />
        <CardBody className="space-y-2 text-sm text-slate-600">
          <p>
            Para habilitar la aplicación automática de cambios en Meta Ads se
            requerirán los permisos{" "}
            <code className="rounded bg-slate-100 px-1">ads_management</code> y{" "}
            <code className="rounded bg-slate-100 px-1">
              business_management
            </code>
            .
          </p>
          <p className="text-slate-400">
            Ver README → «Fase 2» y <code>lib/meta/actions.ts</code>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
