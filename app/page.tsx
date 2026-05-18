import Link from "next/link";
import {
  BarChart3,
  Brain,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Conecta Meta Ads",
    desc: "Autoriza con Facebook Login for Business y visualiza cuentas, campañas y métricas reales.",
  },
  {
    icon: Brain,
    title: "Análisis con IA",
    desc: "Diagnóstico, problemas, urgencia y recomendaciones priorizadas para cada campaña.",
  },
  {
    icon: ShieldCheck,
    title: "Solo lectura (MVP)",
    desc: "Esta versión nunca modifica tus campañas. Tokens cifrados y datos aislados por usuario.",
  },
  {
    icon: Zap,
    title: "Recomendaciones accionables",
    desc: "Acepta o rechaza sugerencias y guarda el historial. Aplicación automática en Fase 2.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            ⚡
          </span>
          AI Meta Ads Optimizer
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-20 text-center">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            MVP · Solo lectura y análisis
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Optimiza tus campañas de Meta Ads con{" "}
            <span className="text-brand-600">inteligencia artificial</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Conecta tu cuenta publicitaria, deja que la IA analice el
            rendimiento y recibe recomendaciones claras y priorizadas. Sin
            tocar tus campañas hasta que tú lo decidas.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
            >
              Empezar gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        AI Meta Ads Optimizer — MVP. Esta versión no modifica campañas reales.
      </footer>
    </div>
  );
}
