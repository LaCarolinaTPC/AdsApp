import { Card, CardBody } from "@/components/ui/Card";
import {
  Badge,
  riskTone,
  priorityTone,
  statusTone,
  statusLabel,
} from "@/components/ui/Badge";
import { RecommendationActions } from "./RecommendationActions";
import type { Recommendation } from "@/types";

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{rec.title}</h3>
              {rec.recommendation_type && (
                <Badge tone="brand">{rec.recommendation_type}</Badge>
              )}
            </div>
            {rec.campaign_name && (
              <p className="mt-0.5 text-xs text-slate-400">
                Campaña: {rec.campaign_name}
              </p>
            )}
          </div>
          <Badge tone={statusTone(rec.status)}>
            {statusLabel(rec.status)}
          </Badge>
        </div>

        {rec.description && (
          <p className="text-sm text-slate-600">{rec.description}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {rec.reason && (
            <Field label="Por qué" value={rec.reason} />
          )}
          {rec.suggested_action && (
            <Field label="Acción sugerida" value={rec.suggested_action} />
          )}
          {rec.expected_impact && (
            <Field label="Impacto esperado" value={rec.expected_impact} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rec.risk_level && (
            <Badge tone={riskTone(rec.risk_level)}>
              Riesgo: {rec.risk_level}
            </Badge>
          )}
          {rec.priority && (
            <Badge tone={priorityTone(rec.priority)}>
              Prioridad: {rec.priority}
            </Badge>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <RecommendationActions id={rec.id} status={rec.status} />
        </div>
      </CardBody>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-700">{value}</p>
    </div>
  );
}
