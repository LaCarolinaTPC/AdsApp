# AI Meta Ads Optimizer — MVP

SaaS multiusuario para conectar Meta Ads, visualizar campañas reales,
analizarlas con IA y guardar recomendaciones accionables.

> **Restricción del MVP:** esta versión **solo lee** datos y **analiza**.
> **Nunca modifica campañas reales** de Meta Ads. La estructura para la
> aplicación automática (Fase 2) está creada pero **bloqueada**.

---

## Stack

| Capa        | Tecnología                                            |
|-------------|-------------------------------------------------------|
| Framework   | Next.js 15 (App Router) + TypeScript                  |
| UI          | Tailwind CSS v3, componentes propios, `lucide-react`  |
| DB / Auth   | Supabase (Postgres + Supabase Auth) con **RLS**       |
| Meta        | Meta Marketing API + Facebook Login for Business      |
| IA          | Proveedor configurable (OpenAI-compatible) vía env    |
| Paquetes    | **pnpm**                                              |

---

## Arquitectura

```
/app
  /(auth)            login / register + server actions
  /dashboard         resumen, conexiones, cuentas, campañas, recomendaciones
  /api
    /meta            oauth/start, oauth/callback, accounts, campaigns, disconnect
    /ai/analyze      análisis de campaña con IA
    /recommendations listar + cambiar estado (+ apply = Fase 2, 403)
/components          ui, dashboard, campaigns, recommendations
/lib
  /supabase          client (browser), server (RLS), admin (service role)
  /meta              config, oauth, client (Marketing API), actions (Fase 2), crypto, connection
  /ai                provider (configurable + mock), prompts
/types               tipos de dominio y de la Meta API
/database/schema.sql esquema completo + RLS + triggers
middleware.ts        refresco de sesión + protección de /dashboard
```

**Seguridad incorporada**

- Rutas privadas protegidas en `middleware.ts` (redirige a `/login`).
- **RLS en todas las tablas**: un usuario jamás ve datos de otro,
  incluso si la API fallara.
- `access_token` de Meta **cifrado con AES-256-GCM** antes de guardarse
  (`lib/meta/crypto.ts`). El token nunca llega al frontend.
- Todas las llamadas a Meta ocurren en el backend (Route Handlers).
- Manejo de token expirado/inválido (marca la conexión como `expired`).
- Auditoría básica en `action_logs`.

---

## Puesta en marcha (paso a paso)

### 1. Requisitos

- Node.js ≥ 20
- **pnpm** (`npm i -g pnpm`)
- Un proyecto en [Supabase](https://supabase.com)
- Una app en [Meta for Developers](https://developers.facebook.com)

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena `.env.local`:

- **Supabase** → Project Settings → API: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Clave de cifrado de tokens** (obligatoria para guardar tokens seguros):

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

  Pega el resultado en `TOKEN_ENCRYPTION_KEY`.
- **Meta**: `META_APP_ID`, `META_APP_SECRET`,
  `META_REDIRECT_URI=http://localhost:3000/api/meta/oauth/callback`,
  `META_API_VERSION=v21.0`, `META_SCOPES=ads_read`.
- **IA** (opcional): `OPENAI_API_KEY`. Si lo dejas vacío, la app usa un
  **análisis heurístico local** (mock) para poder probar el flujo
  completo sin credenciales. `AI_BASE_URL` / `AI_MODEL` permiten usar
  Vercel AI Gateway, Azure OpenAI, etc.

### 4. Base de datos

En Supabase → **SQL Editor**, pega y ejecuta **todo** el contenido de
`database/schema.sql`. Crea tablas, índices, triggers, el perfil
automático al registrarse y **todas las políticas RLS**.

### 5. Configurar la app de Meta

1. En [developers.facebook.com](https://developers.facebook.com) crea
   una app de tipo *Business*.
2. Añade el producto **Facebook Login for Business**.
3. En *Facebook Login → Configuración* añade el **OAuth redirect URI**:
   `http://localhost:3000/api/meta/oauth/callback`.
4. Añade el producto **Marketing API**.
5. Permiso del MVP: `ads_read` (en revisión/modo desarrollo basta con
   usuarios de prueba o roles de la app).

### 6. Configurar Supabase Auth

- Authentication → Providers → **Email** habilitado.
- Para desarrollo rápido puedes desactivar *Confirm email* (entonces el
  registro inicia sesión directamente).

### 7. Arrancar

```bash
pnpm dev
```

Abre `http://localhost:3000` → Regístrate → Dashboard →
**Conexiones → Conectar Meta Ads** → autoriza → vuelve a la app →
**Cuentas → Sincronizar** → **Campañas → Sincronizar** →
entra a una campaña → **Analizar con IA** → revisa las recomendaciones.

### Scripts

```bash
pnpm dev         # desarrollo
pnpm build       # build de producción
pnpm start       # servir build
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
```

---

## Modelo de datos

`users`, `meta_connections`, `meta_ad_accounts`, `campaigns_cache`,
`campaign_insights`, `ai_analysis`, `recommendations`, `action_logs`.
Todas con `id`, `created_at`, `updated_at` (donde aplica) y `user_id`
para el aislamiento multi-tenant vía RLS.

### Estados de una recomendación

- `pending` — recién generada por la IA.
- `accepted_manual` — el usuario la aplicó manualmente en Meta.
- `rejected` — descartada.
- `applied_future` — marcada para aplicar automáticamente en Fase 2.

---

## Cómo activar la **Fase 2** (aplicación automática)

> Hoy está deliberadamente bloqueado. Pasos para habilitarlo:

1. **Permisos Meta**: cambia
   `META_SCOPES=ads_read,ads_management,business_management` y pide a los
   usuarios **reconectar** (re-autorizan los nuevos scopes). Estos
   permisos requieren App Review de Meta.
2. **Activar el flag**: `WRITE_ACTIONS_ENABLED=true`. El guard de
   `lib/meta/actions.ts` (`pauseCampaign`, `updateCampaignBudget`,
   `pauseAdSet`, `updateAdSetBudget`, `pauseAd`, `duplicateCampaign`,
   `updateCampaignStatus`) dejará de lanzar `WriteActionsDisabledError`.
3. **Endpoint de aplicación**: implementar la lógica real en
   `app/api/recommendations/[id]/apply/route.ts` (hoy responde 403):
   - Resolver la conexión y validar scope `ads_management`.
   - Mapear `recommendation_type` → acción de `lib/meta/actions.ts`.
   - Guardar en `action_logs` el estado **antes** y **después**
     (base para *rollback* / reversión manual).
   - Marcar la recomendación como `applied_future` → `applied`.
4. **UI**: habilitar el botón **«Aceptar y aplicar en Meta Ads»** en
   `components/recommendations/RecommendationActions.tsx` (hoy
   `disabled`).
5. **Confirmación antes de cambios sensibles**: añadir un modal de
   confirmación explícita (pausar campaña, bajar presupuesto, etc.)
   antes de invocar el endpoint.
6. **Rollback / reversión manual**: usar el payload `antes` de
   `action_logs` para crear una acción inversa (ej. reactivar campaña,
   restaurar presupuesto).

### Punto de cifrado

El cifrado **ya está implementado** (AES-256-GCM en
`lib/meta/crypto.ts`). Si `TOKEN_ENCRYPTION_KEY` no está configurada,
en desarrollo se hace un fallback **marcado** (`plain:` + warning) para
no romper el flujo local; en producción llama a
`assertEncryptionConfigured()` para forzar el fallo si falta la clave.

---

## Notas

- Sin `OPENAI_API_KEY` el análisis usa heurísticas locales claramente
  etiquetadas (no datos quemados en producción real).
- Los presupuestos de Meta vienen en céntimos; se convierten con
  `fromMetaBudget()`.
- La sincronización con Meta es bajo demanda (botones «Sincronizar»)
  para respetar los rate limits; los datos quedan en caché en Postgres.
