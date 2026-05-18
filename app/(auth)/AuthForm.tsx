"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/States";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            ⚡
          </span>
          AI Meta Ads Optimizer
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "login"
            ? "Accede a tu panel de optimización."
            : "Empieza a analizar tus campañas con IA."}
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          {mode === "register" && (
            <Field
              label="Nombre completo"
              name="full_name"
              type="text"
              placeholder="Tu nombre"
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="tu@email.com"
            required
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            placeholder="••••••••"
            required
          />

          {state.error && <ErrorBanner message={state.error} />}
          {state.message && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {state.message}
            </div>
          )}

          <Button type="submit" loading={pending} className="w-full">
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-medium text-brand-600 hover:underline"
              >
                Regístrate
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-medium text-brand-600 hover:underline"
              >
                Inicia sesión
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}
