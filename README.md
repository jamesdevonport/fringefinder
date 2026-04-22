# Fringe Finder

An unofficial, fan-made directory of Brighton Fringe 2026. Static Next.js site with a Cloudflare Pages Function for the AI matchmaker (Workers AI / Kimi K2.5).

## Repo layout

```
fringe/
├── scrape.py           # Python scraper (brightonfringe.org → results.json)
├── results.json        # Scraped catalogue — input to the web build
├── web/                # Next.js 16 site deployed to Cloudflare Pages
│   ├── app/            # Routes: /, /browse, /calendar, /match, /explore, /events/[slug], /venues/[slug], /bookmarks
│   ├── components/
│   ├── functions/api/  # Cloudflare Pages Functions (AI matchmaker)
│   ├── lib/
│   ├── scripts/
│   │   └── prepare-data.ts   # Reads ../results.json → writes web/data/*.json + web/public/events-search.json
│   └── wrangler.toml   # AI binding + build output config
└── .gitignore
```

The generated files under `web/data/` and `web/public/events-search.json` are intentionally **not** committed — they are rebuilt from `results.json` on every build via the `prebuild` npm hook.

## Cloudflare Pages deployment

Connect this GitHub repo to a Cloudflare Pages project with the following settings:

| Setting                    | Value                |
| -------------------------- | -------------------- |
| Production branch          | `main`               |
| Framework preset           | Next.js (Static HTML Export) — or "None" |
| Build command              | `npm run build`      |
| Build output directory     | `out`                |
| Root directory (advanced)  | `web`                |
| Node version (env var)     | `NODE_VERSION=20` (optional, CF default 22 also works) |

The Workers AI binding for `/api/match` is declared in `web/wrangler.toml`:

```toml
[ai]
binding = "AI"
```

Cloudflare Pages respects `wrangler.toml` at the Pages project root (here, `web/`), so the AI binding is provisioned automatically — no dashboard binding needed. If you prefer the dashboard, remove the `[ai]` block and add the binding under **Pages project → Settings → Functions → Bindings → AI**.

### How the build runs on Cloudflare Pages

1. CF clones the repo.
2. `cd web && npm ci && npm run build`.
3. `prebuild` hook runs `tsx scripts/prepare-data.ts`, which reads `../results.json` and writes `web/data/*.json` + `web/public/events-search.json`.
4. `next build` produces a static export in `web/out/`.
5. Cloudflare Pages serves `web/out/` and wires `web/functions/api/match.ts` as a Pages Function at `/api/match` with the AI binding.

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
