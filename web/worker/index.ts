/// <reference types="@cloudflare/workers-types/2023-07-01" />
import matchIndex from "../data/match-index.json";

type Performance = {
  date_iso: string;
  time_text: string | null;
  venue_name: string | null;
  venue_slug: string | null;
  price_min: number | null;
  price_max: number | null;
  free: boolean;
  time_of_day: string | null;
};

type IndexEntry = {
  slug: string;
  title: string;
  company: string | null;
  genre: string | null;
  short_description: string;
  hero_image: string | null;
  venue_list: string[];
  date_list: string[];
  earliest_date: string | null;
  price_min: number | null;
  price_max: number | null;
  has_free_performance: boolean;
  min_age: number | null;
  age_bucket: "Family" | "Kids" | "Teen" | "16+" | "18+";
  duration_mins: number | null;
  duration_bucket: string | null;
  content_warnings: string[];
  time_of_day_set: string[];
  weekend_dates: string[];
  next_performance: Performance | null;
};

type ChatTurn = { role: "user" | "assistant"; content: string };

type MatchFilters = {
  genres?: string[];
  max_min_age?: number;
  free_only?: boolean;
  duration_bucket?: string | string[];
  time_of_day?: string | string[];
  weekend_only?: boolean;
  under_price?: number;
  mood_keywords?: string[];
};

interface Env {
  GEMINI_API_KEY: string;
  ASSETS: Fetcher;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  promptFeedback?: unknown;
  error?: { code?: number; message?: string; status?: string };
};

const MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const EVENTS: IndexEntry[] = matchIndex as unknown as IndexEntry[];
const EVENTS_BY_SLUG = new Map(EVENTS.map((e) => [e.slug, e]));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/match") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      return handleMatch(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleMatch(request: Request, env: Env): Promise<Response> {
  let body: { messages?: ChatTurn[] };
  try {
    body = (await request.json()) as { messages?: ChatTurn[] };
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const history = Array.isArray(body.messages)
    ? body.messages.filter(
        (m): m is ChatTurn =>
          !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
      )
    : [];
  const userTurns = history.filter(
    (m) => m.role === "user" && m.content.trim().length > 0,
  );

  if (userTurns.length === 0) {
    return json({ error: "No user message to match against." }, 400);
  }

  const userBrief = userTurns
    .map((m, i) => {
      const tag = i === userTurns.length - 1 ? "[latest]" : `[turn ${i + 1}]`;
      return `${tag} ${m.content.trim()}`;
    })
    .join("\n");

  let filters: MatchFilters;
  let synthQuery: string;
  try {
    const result = await synthesiseFilters(env, userBrief);
    filters = result.filters;
    synthQuery = result.query;
  } catch (e) {
    return json({ error: `filter synthesis failed: ${describe(e)}` }, 500);
  }

  const candidates = narrow(filters);

  let ranked: { reply: string; picks: Array<{ slug: string; reason: string }> };
  try {
    ranked = await rerank(env, userBrief, synthQuery, candidates);
  } catch (e) {
    return json({ error: `rerank failed: ${describe(e)}` }, 500);
  }

  const picks = ranked.picks
    .map((r) => {
      const ev = EVENTS_BY_SLUG.get(r.slug);
      if (!ev) return null;
      return { slug: r.slug, reason: r.reason, event: ev };
    })
    .filter((p): p is NonNullable<typeof p> => !!p)
    .slice(0, 6);

  return json({
    stage: "ranked",
    reply: ranked.reply || defaultReply(picks.length),
    picks,
    usedModel: MODEL,
  });
}

async function synthesiseFilters(
  env: Env,
  userBrief: string,
): Promise<{ filters: MatchFilters; query: string }> {
  const system = `You translate a short chat conversation about what someone wants to see at Brighton Fringe into structured filters and a one-sentence search query.

The user has written one or more turns describing what they want. Later turns refine or override earlier ones — when the [latest] turn conflicts with an earlier turn, the [latest] turn wins.

Respond with ONLY a single minified JSON object — no prose, no markdown fences — matching this exact shape:

{
  "query": "one-sentence synthesis of what the user wants",
  "filters": {
    "genres": ["..."],
    "max_min_age": <number>,
    "free_only": <boolean>,
    "duration_bucket": ["≤45 min" | "45–75 min" | "75+ min"],
    "time_of_day": ["Matinee" | "Evening" | "Late night"],
    "weekend_only": <boolean>,
    "under_price": <number, GBP>,
    "mood_keywords": ["..."]
  }
}

Omit any filter key the user did not request. "filters" itself must be present (use {} if nothing applies).

Available genres (use EXACTLY these strings): "Comedy", "Theatre", "Music & Nightlife", "Cabaret & Variety", "Children & Young People", "Circus Dance & Physical Theatre", "Literature & Spoken Word", "Workshops", "Events & Films", "Tours", "Exhibitions".

Rules:
- Only set a filter if the user clearly asked for it. Err on the side of leaving filters loose — we rerank semantically afterwards.
- max_min_age is the highest min_age we'll accept. For "family"/"kids"/"kid-safe"/"squeaky clean", use 5. For "PG-ish"/"teen-friendly", use 12. For "might make you blush"/"adult"/"spicy", omit. For "anything goes", omit.
- under_price is a GBP number. "Free only" -> free_only: true. "Under £10" -> 10. "Under £20" -> 20. "Cheap" -> 15. If not mentioned, omit.
- duration_bucket: "short"/"30 min or less" -> ["≤45 min"]. "about an hour" -> ["45–75 min"]. "long"/"75+" -> ["75+ min"]. If unclear, omit.
- time_of_day: match "Matinee"/"Evening"/"Late night". "Any time" -> omit.
- mood_keywords: 3–6 short adjectives/nouns that capture the vibe (e.g. "absurd", "confessional", "raucous", "warm", "feminist", "surreal").
- Put the synthesised search query in one readable sentence, e.g. "A warm, funny hour that won't upset the kids."

Output JSON only. No markdown fences, no commentary.`;

  const content = await callGemini(env, system, userBrief, {
    maxOutputTokens: 1024,
    temperature: 0.3,
  });
  return parseJSON(content) as { query: string; filters: MatchFilters };
}

function narrow(f: MatchFilters, limit = 200): IndexEntry[] {
  const filtered = EVENTS.filter((e) => {
    if (f.genres?.length && (!e.genre || !f.genres.includes(e.genre))) return false;
    if (typeof f.max_min_age === "number" && e.min_age !== null && e.min_age > f.max_min_age) return false;
    if (f.free_only && !e.has_free_performance) return false;
    if (typeof f.under_price === "number") {
      if (!e.has_free_performance && (e.price_min === null || e.price_min > f.under_price))
        return false;
    }
    const dbList = Array.isArray(f.duration_bucket)
      ? f.duration_bucket
      : f.duration_bucket
        ? [f.duration_bucket]
        : [];
    if (dbList.length && (!e.duration_bucket || !dbList.includes(e.duration_bucket))) return false;
    const todList = Array.isArray(f.time_of_day)
      ? f.time_of_day
      : f.time_of_day
        ? [f.time_of_day]
        : [];
    if (todList.length && !e.time_of_day_set.some((t) => todList.includes(t))) return false;
    if (f.weekend_only && e.weekend_dates.length === 0) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    (a.earliest_date ?? "9999").localeCompare(b.earliest_date ?? "9999"),
  );

  if (sorted.length > limit) return sorted.slice(0, limit);
  if (sorted.length === 0) return EVENTS.slice(0, limit);
  return sorted;
}

async function rerank(
  env: Env,
  userBrief: string,
  query: string,
  candidates: IndexEntry[],
): Promise<{ reply: string; picks: Array<{ slug: string; reason: string }> }> {
  const catalog = candidates.map(buildLine).join("\n");
  const system = `You are a Brighton Fringe matchmaker chatting with someone. Pick the 6 best-matching shows from the CATALOG for this user's request.

Respond with ONLY a single minified JSON object — no prose, no markdown fences — matching this exact shape:

{
  "reply": "one warm conversational sentence, max 18 words, no emojis",
  "picks": [
    { "slug": "<catalog-slug>", "reason": "one sentence, max 18 words, warm and specific" },
    ... (exactly 6 picks)
  ]
}

"reply" examples: "Six I'd stake my reputation on — tell me if any miss.", "Here's a cheeky shortlist for a chill evening.", "Trying these — shout if you want me to push weirder or gentler."
"reason" example: "Belly laughs about growing up too fast — right up your street."

Only use slugs that appear verbatim in the CATALOG below. Do not invent slugs. Rank best to worst.

Output JSON only. No markdown fences, no commentary.`;

  const user = `User said:\n${userBrief}\n\nSynthesised query: ${query}\n\nCATALOG:\n${catalog}`;

  const content = await callGemini(env, system, user, {
    maxOutputTokens: 2048,
    temperature: 0.5,
  });
  const parsed = parseJSON(content) as {
    reply?: string;
    picks: Array<{ slug: string; reason: string }>;
  };
  const validSlugs = new Set(candidates.map((c) => c.slug));
  return {
    reply: parsed.reply?.trim() ?? "",
    picks: parsed.picks.filter((r) => validSlugs.has(r.slug)).slice(0, 6),
  };
}

function buildLine(e: IndexEntry): string {
  const age = e.age_bucket;
  const dur = e.duration_mins ? `${e.duration_mins}min` : "—";
  const next = e.earliest_date ?? "—";
  const venue = e.venue_list[0] ?? "—";
  const desc = (e.short_description || "").replace(/\s+/g, " ").slice(0, 150);
  const free = e.has_free_performance ? " (free perfs)" : "";
  const price = e.price_min !== null ? ` £${e.price_min}` : "";
  return `[${e.slug}] ${e.title} | ${e.genre ?? "Other"} | ${age} | ${dur}${price} | ${desc} | ${next} @ ${venue}${free}`;
}

async function callGemini(
  env: Env,
  system: string,
  user: string,
  options: { maxOutputTokens: number; temperature: number },
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY not set (configure via `wrangler secret put GEMINI_API_KEY` or in the CF dashboard)",
    );
  }

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as GeminiResponse;

  if (data.error) {
    throw new Error(
      `Gemini API error: ${data.error.message ?? data.error.status ?? JSON.stringify(data.error)}`,
    );
  }

  const parts = data.candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p?.text ?? "").join("").trim();

  if (!text) {
    const snippet = safeStringify(data).slice(0, 600);
    const finishReason = data.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(
      `Gemini empty response (finishReason=${finishReason}, body=${snippet})`,
    );
  }

  return stripFences(text);
}

function stripFences(s: string): string {
  if (s.startsWith("```")) {
    return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return s;
}

function parseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Reasoning models prepend chain-of-thought before the JSON. Walk the
    // string and return the first balanced JSON object/array.
    const extracted = extractBalancedJSON(raw);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {
        /* fall through */
      }
    }
    throw new Error(`JSON parse failed: ${raw.slice(0, 400)}`);
  }
}

function extractBalancedJSON(s: string): string | null {
  for (let i = 0; i < s.length; i++) {
    const start = s[i];
    if (start !== "{" && start !== "[") continue;
    const closer = start === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (c === start) depth++;
      else if (c === closer) {
        depth--;
        if (depth === 0) return s.substring(i, j + 1);
      }
    }
  }
  return null;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function defaultReply(n: number): string {
  if (n === 0) return "Couldn't land anything this time — try nudging me another way?";
  if (n === 1) return "One I think you'll like:";
  return `${n} I think you'll like:`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
