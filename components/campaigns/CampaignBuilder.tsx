"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/States";

const COUNTRIES = [
  ["CO", "Colombia"],
  ["MX", "México"],
  ["US", "Estados Unidos"],
  ["ES", "España"],
  ["AR", "Argentina"],
  ["PE", "Perú"],
  ["CL", "Chile"],
  ["EC", "Ecuador"],
];
const CTAS = [
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "CONTACT_US",
  "BOOK_TRAVEL",
  "DOWNLOAD",
];

interface Page {
  id: string;
  name: string;
}

export function CampaignBuilder({
  adAccountId,
  currency,
}: {
  adAccountId: string;
  currency: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Paso 1 — Campaña
  const [cName, setCName] = useState("");
  const [cBudget, setCBudget] = useState("");
  // Paso 2 — Conjunto
  const [sName, setSName] = useState("");
  const [sBudget, setSBudget] = useState("");
  const [countries, setCountries] = useState<string[]>(["CO"]);
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState("all");
  // Paso 3 — Anuncio
  const [pages, setPages] = useState<Page[]>([]);
  const [pagesMsg, setPagesMsg] = useState<string | null>(null);
  const [pageId, setPageId] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [headline, setHeadline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");

  useEffect(() => {
    if (open && step === 3 && pages.length === 0) {
      fetch("/api/meta/pages")
        .then((r) => r.json())
        .then((j) => {
          setPages(j.pages ?? []);
          if (j.needsPermission || (j.pages ?? []).length === 0) {
            setPagesMsg(
              "Tu conexión no puede ver páginas de Facebook (falta el permiso pages_show_list). Puedes crear la Campaña + Conjunto ahora y añadir el anuncio luego.",
            );
          } else setPageId(j.pages[0].id);
        })
        .catch(() => setPagesMsg("No se pudieron cargar las páginas."));
    }
  }, [open, step, pages.length]);

  function reset() {
    setStep(1);
    setError(null);
    setDone(null);
  }

  async function build(withAd: boolean) {
    setLoading(true);
    setError(null);
    try {
      const body: any = {
        adAccountId,
        campaign: {
          name: cName.trim(),
          dailyBudget: cBudget ? Number(cBudget) : undefined,
        },
        adset: {
          name: sName.trim() || `${cName.trim()} - conjunto`,
          dailyBudget: sBudget ? Number(sBudget) : undefined,
          countries,
          ageMin: Number(ageMin),
          ageMax: Number(ageMax),
          genders:
            gender === "all" ? [] : gender === "men" ? [1] : [2],
        },
      };
      if (withAd && pageId && link) {
        body.ad = {
          pageId,
          link: link.trim(),
          message: message.trim(),
          headline: headline.trim(),
          imageUrl: imageUrl.trim() || undefined,
          cta,
        };
      }
      const res = await fetch("/api/meta/campaign/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false)
        throw new Error(json.error ?? "Error creando la campaña");
      setDone(
        `✅ Creado en PAUSED: ${[
          json.created.campaignId && "campaña",
          json.created.adSetId && "conjunto",
          json.created.adId && "anuncio",
        ]
          .filter(Boolean)
          .join(" + ")}. Actívala en Meta cuando quieras.`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const canStep1 = cName.trim().length > 0;
  const canStep2 =
    countries.length > 0 && Number(ageMin) >= 13 && Number(ageMax) <= 65;

  return (
    <>
      <Button onClick={() => { setOpen(true); reset(); }}>
        <Plus className="h-4 w-4" />
        Crear campaña
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Crear campaña — Tráfico
                </h3>
                <p className="text-xs text-slate-500">
                  Paso {step} de 3 · todo se crea en PAUSED
                </p>
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              {done ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                  {done}
                </div>
              ) : step === 1 ? (
                <>
                  <Field label="Nombre de la campaña">
                    <input
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Ej. Tráfico - Web Mayo"
                      className={inp}
                    />
                  </Field>
                  <Field label={`Presupuesto diario CBO (opcional, ${currency || ""})`}>
                    <input
                      type="number"
                      value={cBudget}
                      onChange={(e) => setCBudget(e.target.value)}
                      placeholder="Vacío = presupuesto en el conjunto"
                      className={inp}
                    />
                  </Field>
                </>
              ) : step === 2 ? (
                <>
                  <Field label="Nombre del conjunto">
                    <input
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      placeholder={`${cName || "Campaña"} - conjunto`}
                      className={inp}
                    />
                  </Field>
                  {!cBudget && (
                    <Field label={`Presupuesto diario del conjunto (${currency || ""})`}>
                      <input
                        type="number"
                        value={sBudget}
                        onChange={(e) => setSBudget(e.target.value)}
                        className={inp}
                      />
                    </Field>
                  )}
                  <Field label="Países">
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES.map(([code, name]) => {
                        const on = countries.includes(code);
                        return (
                          <button
                            key={code}
                            onClick={() =>
                              setCountries((c) =>
                                on
                                  ? c.filter((x) => x !== code)
                                  : [...c, code],
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${
                              on
                                ? "border-brand-300 bg-brand-50 text-brand-700"
                                : "border-slate-300 text-slate-600"
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Edad mín.">
                      <input
                        type="number"
                        value={ageMin}
                        onChange={(e) => setAgeMin(e.target.value)}
                        className={inp}
                      />
                    </Field>
                    <Field label="Edad máx.">
                      <input
                        type="number"
                        value={ageMax}
                        onChange={(e) => setAgeMax(e.target.value)}
                        className={inp}
                      />
                    </Field>
                    <Field label="Género">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className={inp}
                      >
                        <option value="all">Todos</option>
                        <option value="men">Hombres</option>
                        <option value="women">Mujeres</option>
                      </select>
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  {pagesMsg && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      {pagesMsg}
                    </div>
                  )}
                  {pages.length > 0 && (
                    <>
                      <Field label="Página de Facebook">
                        <select
                          value={pageId}
                          onChange={(e) => setPageId(e.target.value)}
                          className={inp}
                        >
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="URL de destino">
                        <input
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          placeholder="https://tusitio.com"
                          className={inp}
                        />
                      </Field>
                      <Field label="Texto principal">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={2}
                          className={inp}
                        />
                      </Field>
                      <Field label="Titular">
                        <input
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          className={inp}
                        />
                      </Field>
                      <Field label="URL de imagen (opcional)">
                        <input
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://.../imagen.jpg"
                          className={inp}
                        />
                      </Field>
                      <Field label="Botón (CTA)">
                        <select
                          value={cta}
                          onChange={(e) => setCta(e.target.value)}
                          className={inp}
                        >
                          {CTAS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  )}
                </>
              )}
              {error && <ErrorBanner message={error} />}
            </div>

            {!done && (
              <div className="flex justify-between gap-2 border-t border-slate-100 px-5 py-4">
                <Button
                  variant="secondary"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1 || loading}
                >
                  Atrás
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => build(false)}
                      loading={loading || pending}
                    >
                      Crear sin anuncio
                    </Button>
                    <Button
                      onClick={() => build(true)}
                      loading={loading || pending}
                      disabled={pages.length === 0 || !pageId || !link}
                    >
                      <Check className="h-4 w-4" />
                      Crear todo
                    </Button>
                  </div>
                )}
              </div>
            )}
            {done && (
              <div className="flex justify-end border-t border-slate-100 px-5 py-4">
                <Button onClick={() => setOpen(false)}>Cerrar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const inp =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
