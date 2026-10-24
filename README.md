# WatchKITA

A cinematic movie and TV discovery site powered by the [Watchmode API](https://api.watchmode.com/), with a React client, an Express API layer, optional Supabase persistence, and a Vercel deployment path.

WatchKITA is a discovery guide, not a streaming service. It shows catalog metadata and where titles are legally available in the selected region, and it never hosts or streams video.

## What is implemented

- **Home** — rotating featured hero built from real title details, trending/popular rails, recently released titles, genre picks, region-aware availability.
- **Movies / TV Shows / Discover** — shared catalog browser with type tabs, genre filters, release-year filters, sort options, region switching, URL-synced filters, removable filter chips, and "Load more" pagination.
- **Search** — full-screen search overlay using Watchmode autocomplete with debounced requests, request cancellation, keyboard navigation, type filters, recent searches, and a full results page using `/search`.
- **Title details** — artwork, synopsis, year/runtime/content rating, audience and critic scores when returned, trailer link, watchlist and share actions, provider availability grouped by subscription/free/rental/purchase, cast and crew, TV seasons and episodes, and similar titles.
- **Watchlist** — local-first, persists across reloads, grid/list views, filtering, per-item removal, and confirmed clear-all. Optional Supabase mirror.
- **Region switching** — populated from `GET /regions`, defaulting to `PH` (verified against the live region list).
- **States** — loading skeletons, empty states, error states with retry, toasts, error boundary.
- **Accessibility** — keyboard navigation, skip link, visible focus, labelled controls, reduced-motion support.

## Stack

| Layer | Technology |
| --- | --- |
| Client | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide, TanStack Query |
| Server | Node.js 22+, Express, TypeScript, Zod, Helmet, express-rate-limit |
| Upstream | `@watchmode/api-client` v3 (official SDK, Node 22+) |
| Database | Supabase Postgres (response cache + optional watchlist mirror) |
| Hosting | Vercel (static client + one serverless API function) |

## Project structure

```
.
├── api/index.ts              # Vercel serverless entry, forwards /api/* to Express
├── client/
│   ├── src/
│   │   ├── components/       # Navbar, hero, rails, cards, filters, details sections
│   │   │   └── ui/           # Button, TitleImage primitives
│   │   ├── context/          # Region, watchlist, toasts
│   │   ├── hooks/            # Debounce
│   │   ├── lib/              # API client, queries, poster queue, formatting, motion
│   │   ├── pages/            # Home, Movies, TV, Discover, Search, Title, Watchlist
│   │   └── types.ts          # Shared client model
│   └── vite.config.ts        # Dev proxy /api -> localhost:5000
├── server/
│   ├── src/
│   │   ├── app.ts            # Express app factory (used by local server and Vercel)
│   │   ├── index.ts          # Local HTTP server
│   │   ├── env.ts            # Validated environment, cache TTLs
│   │   ├── lib/              # SDK wrapper, normalization, cache, Supabase, errors
│   │   ├── middleware/       # Error handling
│   │   ├── routes/           # Internal /api routes
│   │   └── services/         # Cached catalog service
│   └── .env.example
├── supabase/schema.sql
└── vercel.json
```

## API layer

All Watchmode calls happen on the server with the official SDK. The browser only talks to `/api`, and the browser bundle contains neither the key nor upstream headers.

| Our route | Watchmode endpoint | Notes |
| --- | --- | --- |
| `GET /api/health` | — | Fast readiness check, no upstream call |
| `GET /api/status` | `GET /status` | Quota and connectivity, cached 60s |
| `GET /api/search?q=&type=` | `GET /search` | `search_field=name`; type is filtered by the server |
| `GET /api/autocomplete?q=&type=` | `GET /autocomplete-search` | Suggestions with artwork |
| `GET /api/titles` | `GET /list-titles` | `types`, `genres`, `regions`, `sort_by`, `page`, `limit`; `year` maps to release-date bounds |
| `GET /api/titles/posters?ids=` | `GET /title/{id}/details` | Batched, max 30 ids (see note below) |
| `GET /api/titles/:id` | `GET /title/{id}/details` | Content rating resolved for the selected region |
| `GET /api/titles/:id/sources` | `GET /title/{id}/sources` | `regions` from the selected region |
| `GET /api/titles/:id/cast-crew` | `GET /title/{id}/cast-crew` | Split into cast and crew |
| `GET /api/titles/:id/seasons` | `GET /title/{id}/seasons` | |
| `GET /api/titles/:id/episodes?season=` | `GET /title/{id}/episodes` | |
| `GET /api/genres` | `GET /genres` | |
| `GET /api/sources` | `GET /sources` | Provider reference data and logos |
| `GET /api/regions` | `GET /regions` | |
| `GET /api/watchlist?device=` | Supabase | Optional device-scoped mirror |

### Why posters use a separate endpoint

Watchmode's list endpoints return ids, titles, years, and types — but **no artwork**. Artwork only comes from `/title/{id}/details`. The client therefore renders catalog cards immediately from list data and fetches artwork through a shared batching queue (visible cards only, IntersectionObserver, batches of up to 24, 7-day cache). This keeps requests bounded instead of issuing one per card on every view.

### Caching and quota

Watchmode quotas are finite (the test account reported a 2,500 request allowance). The server uses:

- an in-memory LRU-ish cache,
- a Supabase `api_cache` table for durable caching across instances and deploys,
- in-flight request de-duplication,
- per-resource TTLs (details/posters 24h–7d, availability 6h, listings 30m, search 5m),
- `GET /api/status` to inspect the quota.

Without Supabase credentials the app works normally with the memory cache (cold starts cost upstream requests). With Supabase configured, repeat views cost nothing upstream.

## Getting started

Requirements: Node.js 22+ (the Watchmode SDK requires it), npm, and a Watchmode API key.

```bash
npm install
cp server/.env.example server/.env
# edit server/.env and set WATCHMODE_API_KEY
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api/health
- Vite proxies `/api` to the server, so no client-side key or base URL is needed.

Production build:

```bash
npm run build       # client bundle + server TypeScript
npm start           # serves the API; also serves client/dist when present
```

## Supabase setup (optional but recommended)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Copy the project URL and the **service_role** key into `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

4. Restart the API. `GET /api/status` should report `"supabase": "configured"`.

Why this design:

- Both tables have RLS enabled with **no policies**, so the public anon key cannot read them. Only the server-side service key can.
- `api_cache` is a normalized payload cache with expiry; expired rows are skipped and cleaned opportunistically.
- `watchlist_items` is a durable copy of the browser watchlist keyed by an anonymous device id stored in `localStorage`. It is not a user account system and does not sync a person across devices.

If Supabase is not configured, watchlist cloud calls return `503 watchlist_unavailable` and the client silently falls back to browser storage.

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Set environment variables in **Project → Settings → Environment Variables**:

```
WATCHMODE_API_KEY=...
SUPABASE_URL=...              # optional
SUPABASE_SERVICE_KEY=...      # optional
ALLOWED_ORIGINS=https://your-domain.example
```

3. Deploy. `vercel.json` already defines:
   - build command `npm run build:client`,
   - output directory `client/dist`,
   - a single serverless function at `api/index.ts` with 30s max duration,
   - `/api/:path*` rewritten to that function (the original sub-path is passed as `__path` and restored before Express routing),
   - other paths rewritten to `index.html` for client-side routing.

The API key stays in the Vercel server environment. It is never sent to the browser.

## Security notes

- `.env` files are git-ignored; `server/.env.example` contains placeholders only.
- **Rotate the Watchmode key that was previously present in `server/.env.example`.** It looked like a live credential. Treat it as compromised, create a new key in the Watchmode dashboard, and update `server/.env` (and Vercel) with the new value.
- Upstream errors are mapped to safe messages; API keys, headers, and stack traces are not returned to clients.
- All ids, region codes, pagination, and watchlist payloads are validated with Zod.
- Rate limiting is applied to `/api` (400 requests per 5 minutes per IP). Serverless rate limiting is per instance, so treat it as best-effort.
- Provider links open in a new tab and only use `http(s)` URLs returned by the API. Gated placeholder strings such as "Deeplinks available for paid plans only" are discarded.

## Watchmode plan limitations and deliberate omissions

- **No provider filter in Discover.** `/list-titles` supports type, genre, region, release dates, and sorting, but not "available on provider X". Adding a UI filter for that would be dishonest, so it is not shown.
- **No "Free to watch" or "Leaving soon" rails.** These need data the current plan/endpoints do not reliably provide (`/title-leaving-dates`, and free availability across arbitrary listings). They are omitted rather than faked.
- **Live events are not implemented.** `/live-coverage` and the live endpoints are plan-gated and region-dependent. The section is omitted instead of shipping a broken page.
- **People results are not displayed.** The catalog focus is movies and TV; person pages are outside this build.
- **Artwork** is used only when Watchmode returns a URL. Missing artwork renders a designed placeholder with the title initials.
- **Availability is not guaranteed.** Sources can be incomplete, region-restricted, or require payment. The UI labels each option by the type the API returns and never claims a link plays video.
- **Prices are not displayed.** The API returns a numeric price without enough currency context for a multi-region UI.
- Availability is always tied to the selected region; the app does not assume US catalog availability.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API and client together |
| `npm run dev:server` | Express on port 5000 |
| `npm run dev:client` | Vite on port 5173 |
| `npm run build` | Build client and server |
| `npm run build:client` | Typecheck and build the client only |
| `npm start` | Run the built server |
| `npm run typecheck` | Typecheck both workspaces |

## Verification performed

- Live Watchmode calls through the SDK and through every internal route, including details, sources in `PH`/`US`, cast/crew, seasons, episodes, search, autocomplete, regions, genres, and reference sources.
- Error behavior: invalid title → `404`, invalid type/query → `400`, missing limitation → `503` with a safe message.
- Client production build and TypeScript checks for both workspaces.
- Production bundle searched for the API key and `X-API-Key`: no matches.
- Serverless entry exercised locally with the same rewrite shape Vercel uses (`/api?__path=...`).
- Browser smoke test of the running app.

Not verified: a live Supabase project (no credentials were available) and a real Vercel deployment. The SQL schema and serverless configuration are provided for those steps.
