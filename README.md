# Fringe Finder

An unofficial, fan-made directory of Brighton Fringe 2026. Static Next.js site deployed to Cloudflare Workers with Static Assets, with a Worker handler at `/api/match` that calls Google Gemini (3.1 Flash Lite) for the AI matchmaker.

## Repo layout

```
fringe/
├── scrape.py           # Python scraper (brightonfringe.org → results.json)
├── results.json        # Scraped catalogue — input to the web build
├── web/                # Next.js 16 site deployed as a Cloudflare Worker + Static Assets
│   ├── app/            # Routes: /, /browse, /calendar, /match, /explore, /events/[slug], /venues/[slug], /bookmarks
│   ├── components/
│   ├── worker/
│   │   └── index.ts    # Cloudflare Worker entry — handles /api/match, delegates everything else to static assets
│   ├── lib/
│   ├── scripts/
│   │   └── prepare-data.ts   # Reads ../results.json → writes web/data/*.json + web/public/events-search.json
│   └── wrangler.toml   # Worker + assets + AI binding
└── .gitignore
```

The generated files under `web/data/` and `web/public/events-search.json` are intentionally **not** committed — they are rebuilt from `results.json` on every build via the `prebuild` npm hook.

## Cloudflare Workers deployment

Connect this GitHub repo to a Cloudflare Workers project with the following build settings:

| Setting                    | Value                |
| -------------------------- | -------------------- |
| Production branch          | `main`               |
| Build command              | `npm run build`      |
| Deploy command             | `npx wrangler deploy` |
| Root directory (advanced)  | `web`                |
| Node version (env var)     | `NODE_VERSION=20` (optional, CF default 22 also works) |

Everything else is driven by `web/wrangler.toml`:

```toml
name = "fringefinder"
main = "worker/index.ts"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./out"
binding = "ASSETS"
html_handling = "auto-trailing-slash"
not_found_handling = "404-page"
```

### Secrets

The Worker calls Gemini via Google's Generative Language API and needs a `GEMINI_API_KEY` secret. Set it **once**, either via wrangler:

```bash
cd web
wrangler secret put GEMINI_API_KEY
# paste your key, hit enter
```

…or in the CF dashboard → **Workers → fringefinder → Settings → Variables and Secrets → Add secret** with name `GEMINI_API_KEY`.

For local `wrangler dev`, drop the key into `web/.dev.vars` (gitignored):

```
GEMINI_API_KEY=your-key-here
```

### How the build runs on Cloudflare

1. CF clones the repo.
2. `cd web && npm ci && npm run build`.
3. `prebuild` hook runs `tsx scripts/prepare-data.ts`, which reads `../results.json` and writes `web/data/*.json` + `web/public/events-search.json`.
4. `next build` produces a static export in `web/out/`.
5. `npx wrangler deploy` bundles `web/worker/index.ts` and uploads it alongside the static assets in `web/out/`.
6. The Worker:
   - Serves `/api/match` — calls the Google Gemini API (gemini-3.1-flash-lite) using the `GEMINI_API_KEY` secret and returns ranked picks.
   - Delegates every other request to the `ASSETS` binding, which serves the Next.js static export with clean trailing-slash handling.

## Local development

```bash
# Scraper (optional — only needed if you want to refresh results.json)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # (if added)
python scrape.py

# Web
cd web
npm install
npm run dev
```

`npm run dev` triggers `predev` → `prepare-data`, so the dev server has fresh data artifacts.

## Notes

- All event information is scraped from [brightonfringe.org](https://www.brightonfringe.org). Please book tickets through them.
- Bookmarks are stored in the user's browser `localStorage` only — no accounts, no tracking, no server state.
- The AI matchmaker uses Cloudflare Workers AI (`@cf/moonshotai/kimi-k2.5`) via the Pages Function binding.
