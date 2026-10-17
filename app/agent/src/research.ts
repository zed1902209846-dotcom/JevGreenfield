/**
 * Researcher step: a generative model with web search writes a dated, sourced
 * evidence brief. Ported from markusbug/jevymarket `research.py`
 * (MIT License, Copyright (c) 2026 Markus Haas).
 *
 * Jev has no browsing and a training cutoff, so on news-driven questions it
 * (correctly) reports that the question is not answerable from what it was
 * given. This module fills that gap via OpenRouter's web-search plugin.
 *
 * Unlike jevymarket (which starts from a Polymarket market), a buyer here
 * sends free text, so the researcher ALSO normalises the request into one
 * binary question with explicit resolution criteria and a deadline. The
 * researcher never estimates a probability — that stays with Jev.
 *
 * Calls OpenRouter's chat endpoint directly (not the AI SDK) because the web
 * plugin is an OpenRouter-specific request field.
 */

import { postWithRetry } from "./jev.js";

// Odds sites and their mirrors: they only reflect market prices, which Jev must not see.
export const DEFAULT_EXCLUDE_DOMAINS = [
  "polymarket.com", "kalshi.com", "polyspotter.com", "polyveritas.com", "hkimarket.com",
  "manifold.markets", "metaculus.com", "predictit.org", "polymarketanalytics.com",
  "polymarket.us", "betfair.com", "oddschecker.com",
  // Mirrors seen leaking market odds/criteria into briefs (2026-10-17).
  "predictparity.com", "orrery.me", "awebanalysis.com", "coinrithm.com", "veykos.com",
  "struct.to", "havingsomuch.fun",
];

// Catch-all for mirrors not on the list: URL shapes that are market pages, not news.
const ODDS_URL_PATTERN = /prediction-?markets?|polymarket|kalshi/i;

export function isOddsSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (DEFAULT_EXCLUDE_DOMAINS.some((d) => host === d || host.endsWith("." + d))) return true;
  } catch {
    // not a URL — fall through to the pattern check
  }
  return ODDS_URL_PATTERN.test(url);
}

const SYSTEM_PROMPT = `You are a neutral research analyst supporting a calibrated forecasting model.
You receive a buyer's request, usually about trading a token on BNB Smart Chain (BSC).

First, identify the token: its ticker symbol and, if the buyer gave one or you can confirm it from
an official source, its BSC contract address. Use "" for anything you cannot confirm — never guess
an address. If the request is not about a specific token, leave both "".

Then restate the request as ONE binary (yes/no) question that will be objectively resolvable, with
explicit resolution criteria and a deadline. Keep the buyer's intent. For a generic trading question
("should I buy X?", "is X a good trade?", "will X go up?") use exactly:
"Will <SYMBOL>'s USD price on <today + 7 days> be higher than on <today>?" — resolved by the most
liquid PancakeSwap pair. If the request names no deadline, pick the most natural one and say so in
the criteria. If it cannot be turned into a forecastable yes/no question, set "question" to "" and
explain why in "summary".

Then find and report the CURRENT facts that bear on how that question will resolve. Search the
web. Prefer primary and reputable sources.

Rules:
- Source from news outlets, wire services, official government/organisation statements, regulators,
  league/federation sites, company filings, and reference data. Prediction-market sites and their
  mirrors (polymarket, kalshi, manifold, metaculus, etc.) are NOT sources: they only reflect odds,
  and this analysis must not see odds.
- Every fact must carry a date (YYYY-MM-DD). If you cannot date it, say "undated".
- Quote resolution-relevant numbers, names, deadlines and official statements exactly.
- Report the most recent development you can find and its date.
- Give considerations for and against a YES resolution as short factual bullets — not opinions.
- Do NOT estimate a probability, do NOT say what you would bet, do NOT summarize market odds.
- If you find nothing relevant, say so plainly in "summary".
- Output strictly one JSON object, no prose around it, with exactly these keys:
  {
    "token_symbol": "CAKE or \"\"",
    "token_address": "0x... (BSC) or \"\"",
    "question": "Will ... by YYYY-MM-DD?",
    "resolution_criteria": "what exactly counts as YES, and which source decides",
    "deadline": "YYYY-MM-DD",
    "as_of": "YYYY-MM-DD (date of the newest fact you found)",
    "summary": "2-4 sentences: current status relevant to resolution",
    "key_facts": ["YYYY-MM-DD: fact", ...],
    "latest_development": "YYYY-MM-DD: what happened most recently",
    "for_yes": ["short factual point", ...],
    "against_yes": ["short factual point", ...],
    "sources": ["https://...", ...]
  }`;

export class ResearchError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(`Researcher/OpenRouter ${status}: ${message}`);
  }
}

export interface Brief {
  tokenSymbol: string;
  tokenAddress: string;
  question: string;
  resolutionCriteria: string;
  deadline: string;
  asOf: string;
  summary: string;
  keyFacts: string[];
  latestDevelopment: string;
  forYes: string[];
  againstYes: string[];
  sources: string[];
  model: string;
  cost: number;
}

/** Compact evidence block for the Jev state. Sources/model/cost are noise to Jev. */
export function briefToState(b: Brief, maxChars = 2500): Record<string, unknown> {
  const ev = {
    as_of: b.asOf,
    summary: b.summary,
    key_facts: [...b.keyFacts],
    latest_development: b.latestDevelopment,
    considerations_for_yes: [...b.forYes],
    considerations_against_yes: [...b.againstYes],
  };
  // Trim list fields from the tail until the block fits.
  while (JSON.stringify(ev).length > maxChars) {
    const key = (
      ["considerations_against_yes", "considerations_for_yes", "key_facts"] as const
    ).find((k) => ev[k].length > 0);
    if (key) {
      ev[key].pop();
    } else {
      ev.summary = ev.summary.slice(0, Math.max(0, maxChars - 400));
      break;
    }
  }
  return ev;
}

export interface ResearcherOpts {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxResults?: number;
  maxRetries?: number;
  excludeDomains?: string[];
  /** Let the model emit reasoning tokens before the brief (slower; off by default). */
  reasoning?: boolean;
}

export class Researcher {
  readonly model: string;
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly maxResults: number;
  private readonly maxRetries: number;
  private readonly excludeDomains: string[];
  private readonly reasoning: boolean;

  constructor(opts: ResearcherOpts) {
    if (!opts.apiKey) throw new Error("OPENROUTER_API_KEY is required for the researcher");
    this.model = opts.model;
    this.maxResults = opts.maxResults ?? 5;
    this.maxRetries = opts.maxRetries ?? 3;
    this.excludeDomains = opts.excludeDomains ?? DEFAULT_EXCLUDE_DOMAINS;
    this.reasoning = opts.reasoning ?? process.env.RESEARCH_REASONING === "1";
    this.url =
      (opts.baseUrl ?? "https://openrouter.ai/api").replace(/\/+$/, "") +
      "/v1/chat/completions";
    this.headers = {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "jevGreenfield",
    };
  }

  async brief(request: string, today: string, abortSignal?: AbortSignal): Promise<Brief> {
    const body = {
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Today is ${today}.\n\nBuyer request:\n${request}\n\n` +
            "Identify the token, restate the request as a binary question, research the current " +
            "status, and return the JSON object.",
        },
      ],
      plugins: [
        {
          id: "web",
          engine: "exa",
          max_results: this.maxResults,
          ...(this.excludeDomains.length ? { exclude_domains: this.excludeDomains } : {}),
          search_prompt:
            `Web search results as of ${today}. Use only news, official and reference ` +
            "sources to establish the current, dated facts relevant to the question; " +
            "ignore prediction-market pages and odds. Cite sources by URL.",
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      usage: { include: true },
      // The brief is extraction + summarising, not deliberation: skipping the model's
      // reasoning tokens cut research from ~23 s to ~8 s with deepseek-v4.1-flash.
      // RESEARCH_REASONING=1 turns it back on.
      ...(this.reasoning ? {} : { reasoning: { enabled: false } }),
    };
    const call = async (b: Record<string, unknown>) => {
      const data = (await postWithRetry(
        this.url,
        this.headers,
        b,
        this.maxRetries,
        1.0,
        abortSignal,
        (status, msg, raw) => new ResearchError(status, msg, raw),
      )) as Record<string, any>;
      const msg = data?.choices?.[0]?.message;
      return { data, msg, parsed: msg ? parseJsonObject(String(msg.content ?? "")) : null };
    };

    let { data, msg, parsed } = await call(body);
    let cost = Number(data?.usage?.cost ?? 0) || 0;
    // Some models (seen with deepseek-v4.1-flash, ~1 in 6) answer json_object mode by echoing
    // the format itself: `{"type": "json_object"}`. A brief without a `question` key is
    // unusable, so retry once without response_format and rely on the prompt + our parser.
    if (!parsed || !("question" in parsed)) {
      console.warn(`[research] ${this.model} returned no brief; retrying without response_format`);
      const { response_format: _drop, ...plain } = body;
      ({ data, msg, parsed } = await call(plain));
      cost += Number(data?.usage?.cost ?? 0) || 0;
    }
    if (!msg) throw new ResearchError(200, "unexpected response shape", data);
    if (!parsed || !("question" in parsed)) {
      throw new ResearchError(200, "researcher did not return a brief JSON object", data);
    }

    const b: Brief = {
      tokenSymbol: str(parsed.token_symbol),
      tokenAddress: str(parsed.token_address),
      question: str(parsed.question),
      resolutionCriteria: str(parsed.resolution_criteria),
      deadline: str(parsed.deadline),
      asOf: str(parsed.as_of),
      summary: str(parsed.summary),
      keyFacts: list(parsed.key_facts),
      latestDevelopment: str(parsed.latest_development),
      forYes: list(parsed.for_yes),
      againstYes: list(parsed.against_yes),
      sources: list(parsed.sources),
      model: String(data.model ?? this.model),
      cost,
    };
    for (const ann of msg.annotations ?? []) {
      const url = ann?.url_citation?.url;
      if (url && !b.sources.includes(url)) b.sources.push(url);
    }
    const dropped = b.sources.filter(isOddsSource);
    if (dropped.length) {
      console.warn(`[research] dropped ${dropped.length} odds-site source(s): ${dropped.join(", ")}`);
      b.sources = b.sources.filter((u) => !isOddsSource(u));
    }
    return b;
  }
}

function str(x: unknown): string {
  return x === undefined || x === null ? "" : String(x).trim();
}

function list(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((i) => String(i).trim()).filter(Boolean);
  if (typeof x === "string" && x.trim()) return [x.trim()];
  return [];
}

/** Parse a JSON object from model output, tolerating code fences and surrounding prose. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const t = text.trim();
  if (!t) return null;
  const candidates = [t];
  for (const m of t.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) candidates.push(m[1]!.trim());
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(t.slice(start, end + 1));
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
