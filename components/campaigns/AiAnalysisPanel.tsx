import { AlertCircle, ListChecks, Search, Lightbulb } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, urgencyTone } from "@/components/ui/Badge";
import type { AiAnalysisResult } from "@/types";

export function AiAnalysisPanel({
  result,
  model,
  createdAt,
}: {
  result: AiAnalysisResult;
  model?: string | null;
  createdAt?: string;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-brand-600" />
            Análisis de IA
          </span>
        }
        subtitle={
          createdAt
            ? `Generado ${new Date(createdAt).toLocaleString("es-ES")}${
                model ? ` · ${model}` : ""
              }`
            : undefined
        }
        action={
          <Badge tone={urgencyTone(result.nivel_urgencia)}>
            Urgencia: {result.nivel_urgencia}
          </Badge>
        }
      />
      <CardBody className="space-y-6">
        <section>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">
            Diagnóstico general
          </h4>
          <p className="text-sm leading-relaxed text-slate-600">
            {result.diagnostico_general}
          </p>
        </section>

        {result.problemas_detectados.length > 0 && (
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Problemas detectados
            </h4>
            <ul className="space-y-1 text-sm text-slate-600">
              {result.problemas_detectados.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.posibles_causas.length > 0 && (
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <ListChecks className="h-4 w-4 text-slate-500" />
              Posibles causas
            </h4>
            <ul className="space-y-1 text-sm text-slate-600">
              {result.posibles_causas.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-400">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Lightbulb className="h-4 w-4 text-brand-600" />
            Recomendaciones ({result.recomendaciones.length})
          </h4>
          <p className="text-xs text-slate-400">
            Las recomendaciones se guardan abajo y en la sección
            «Recomendaciones» para aceptarlas o rechazarlas.
          </p>
        </section>
      </CardBody>
    </Card>
  );
}
