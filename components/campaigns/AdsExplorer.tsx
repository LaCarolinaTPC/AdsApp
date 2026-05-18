"use client";

import { useState } from "react";
import {
  Images,
  Monitor,
  Smartphone,
  Instagram,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner, EmptyState } from "@/components/ui/States";

interface Creative {
  title?: string;
  body?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  object_type?: string;
}
interface Ad {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  creative?: Creative;
}
interface AdSet {
  adset_id: string;
  adset_name: string;
  ads: Ad[];
}

const FORMATS = [
  { key: "DESKTOP_FEED_STANDARD", label: "Escritorio", icon: Monitor },
  { key: "MOBILE_FEED_STANDARD", label: "Móvil", icon: Smartphone },
  { key: "INSTAGRAM_STANDARD", label: "Instagram", icon: Instagram },
  { key: "INSTAGRAM_STORY", label: "IG Story", icon: BookOpen },
] as const;

function statusTone(s?: string) {
  const v = (s ?? "").toUpperCase();
  if (v === "ACTIVE") return "success" as const;
  if (v === "PAUSED") return "warning" as const;
  return "neutral" as const;
}

export function AdsExplorer({ campaignCacheId }: { campaignCacheId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/meta/campaign/${campaignCacheId}/ads`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error cargando anuncios");
      setAdSets(json.adSets ?? []);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-3">
        <Button onClick={load} loading={loading}>
          {!loading && <Images className="h-4 w-4" />}
          Cargar anuncios, creativos y previews
        </Button>
        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  if (adSets.length === 0) {
    return (
      <EmptyState
        title="Sin anuncios"
        description="Esta campaña no tiene anuncios o no se pudieron cargar."
      />
    );
  }

  return (
    <div className="space-y-6">
      {adSets.map((set) => (
        <div key={set.adset_id} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">
              {set.adset_name}
            </h3>
            <Badge tone="neutral">{set.ads.length} anuncios</Badge>
          </div>
          <div className="grid gap-4">
            {set.ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        </div>
      ))}
      {error && <ErrorBanner message={error} />}
    </div>
  );
}

function AdCard({ ad }: { ad: Ad }) {
  const [fmt, setFmt] = useState<string | null>(null);
  const [html, setHtml] = useState<Record<string, string>>({});
  const [loadingFmt, setLoadingFmt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const c = ad.creative;

  async function showPreview(format: string) {
    setFmt(format);
    setErr(null);
    if (html[format]) return;
    setLoadingFmt(format);
    try {
      const res = await fetch(
        `/api/meta/ad/${ad.id}/preview?format=${format}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error cargando preview");
      setHtml((h) => ({ ...h, [format]: json.html }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingFmt(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-4">
        {c?.thumbnail_url || c?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image_url || c.thumbnail_url}
            alt={ad.name}
            className="h-24 w-24 flex-shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
            <Images className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{ad.name}</p>
            <Badge tone={statusTone(ad.effective_status ?? ad.status)}>
              {ad.effective_status ?? ad.status}
            </Badge>
            {c?.video_id && <Badge tone="info">Video</Badge>}
          </div>
          {c?.title && (
            <p className="mt-1 text-sm font-medium text-slate-700">
              {c.title}
            </p>
          )}
          {c?.body && (
            <p className="mt-0.5 line-clamp-3 text-sm text-slate-500">
              {c.body}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            onClick={() => showPreview(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              fmt === f.key
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {loadingFmt === f.key ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <f.icon className="h-3.5 w-3.5" />
            )}
            {f.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="mt-3">
          <ErrorBanner message={err} />
        </div>
      )}

      {fmt && html[fmt] && (
        <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          {/* Preview oficial de Meta (iframe a facebook.com) servido vía backend */}
          <div
            className="mx-auto w-fit"
            dangerouslySetInnerHTML={{ __html: html[fmt] }}
          />
        </div>
      )}
    </div>
  );
}
