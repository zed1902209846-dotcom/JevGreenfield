/**
 * The seller's work product: a calibrated forecast + trade risk report for a
 * BSC token question.
 *
 *     buyer request ──▶ researcher (web search, token id) ──┐
 *                       DexScreener + GoPlus (market, security) ──▶ state ──▶ Jev
 *                                                              └──▶ risk index ──▶ deliverable JSON
 *
 * Mirrors jevymarket's research → state → Jev path, minus the trading: the
 * buyer pays for the calibrated view itself and trades (or not) on their own. Called from `buildRunWork` in
 * unifiedMain.ts, i.e. only AFTER the commerce rail has authorised the work
 * (verified ERC-8183 job or settled/free x402 request). Nothing here prices,
 * signs or moves money.
 */

import { loadStudioToml, type TomlTable } from "@bnbagent/studio-runtime/config";
import {
  confidenceOf,
  JevClient,
  noul,
  noulOf,
  score,
  scoreMeanOf,
} from "./jev.js";
import { recordForecast } from "./dashboard.js";
import {
  findToken,
  type MarketSnapshot,
  marketToState,
  type PriceHistory,
  priceHistory,
  registryAddress,
  type ReferenceSnapshot,
  referencePrice,
  type SecuritySnapshot,
  tokenSecurity,
} from "./market.js";
import { type Brief, briefToState, Researcher, ResearchError } from "./research.js";
import { computeRisk } from "./risk.js";

export const CLARITY_LEVELS = [
  "Resolution criteria are missing, contradictory, or depend on undefined terms.",
  "Criteria exist but leave major ambiguity about what counts or who decides.",
  "Criteria are mostly clear; a few edge cases are unspecified.",
  "Criteria are clear with a named resolution source; minor edge cases only.",
  "Criteria are precise, objective, and leave no room for interpretation.",
];

export const QUESTIONS = {
  resolves_yes: noul(
    "Given the question and its resolution criteria, this question will resolve YES. " +
      "If an `evidence` brief is present, weigh its dated facts and latest development " +
      "against `days_until_resolution`. A `market` block, if present, is the current " +
      "on-chain trading snapshot of the token's most liquid BSC pair.",
    {
      true: "The question resolves YES under its resolution criteria by the deadline.",
      false: "The question resolves NO, or the YES condition is not met by the deadline.",
    },
  ),
  answerable: noul(
    "The state (including the `evidence` brief, if present) contains enough current and " +
      "relevant information to form a well-informed probability estimate for this question. " +
      "This is about information sufficiency, not certainty: an uncertain outcome can still " +
      "be well-informed. Answer NO only if key facts needed to estimate it are missing, stale, " +
      "or would require news that is not in the state.",
    {
      true: "The state holds enough current, relevant facts for a well-informed estimate.",
      false: "Key facts are missing, stale, or would require news not in the state.",
    },
  ),
  clarity: score(
    "How clear and objective are the resolution criteria for this question?",
    CLARITY_LEVELS,
  ),
};

// Below these, the forecast is still returned but flagged as not reliable.
const MIN_ANSWERABLE = Number(process.env.MIN_ANSWERABLE ?? 0.7);
const MIN_CLARITY = Number(process.env.MIN_CLARITY ?? 2);

/**
 * Pull the buyer's task out of the work prompt. ERC-8183 delivery wraps it as
 * `JOB CONTEXT:\n{"task": ..., "terms": ...}` (see sellerCore.ts); x402 passes
 * the buyer's prompt verbatim.
 */
export function extractRequest(prompt: string): string {
  const marker = "JOB CONTEXT:\n";
  const i = prompt.indexOf(marker);
  if (i === -1) return prompt.trim();
  const ctx = prompt.slice(i + marker.length).trim();
  try {
    const parsed = JSON.parse(ctx) as { task?: unknown; terms?: unknown };
    const task = typeof parsed.task === "string" ? parsed.task : JSON.stringify(parsed.task);
    const terms =
      parsed.terms && Object.keys(parsed.terms as object).length > 0
        ? `\nTerms: ${JSON.stringify(parsed.terms)}`
        : "";
    return `${task}${terms}`.trim();
  } catch {
    return ctx;
  }
}

function daysUntil(deadline: string, today: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(deadline)) return null;
  const t = Date.parse(deadline.slice(0, 10) + "T23:59:59Z");
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - today.getTime()) / 86_400_000));
}

let clients: { researcher: Researcher; jev: JevClient } | undefined;

/** Built lazily so a seller without a key can still boot and serve negotiate. */
function getClients(): { researcher: Researcher; jev: JevClient } {
  if (clients) return clients;
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const llm = (loadStudioToml().llm ?? {}) as TomlTable;
  clients = {
    researcher: new Researcher({
      apiKey,
      model: process.env.RESEARCH_MODEL ?? String(llm.model ?? "deepseek/deepseek-v4.1-flash"),
    }),
    jev: new JevClient({ apiKey, model: process.env.JEV_MODEL ?? "typesafe/jev-1.14" }),
  };
  return clients;
}

/** Run research + Jev for one buyer request and return the deliverable as JSON text. */
export async function runOracle(prompt: string, abortSignal?: AbortSignal): Promise<string> {
  return JSON.stringify(await analyze(extractRequest(prompt), abortSignal), null, 2);
}

/** "YYYY-MM-DD: text" facts → dated timeline, newest first. */
function timeline(b: Brief): { date: string; text: string }[] {
  const items = [b.latestDevelopment, ...b.keyFacts]
    .filter(Boolean)
    .map((f) => {
      const m = /^(\d{4}-\d{2}-\d{2}|undated)\s*[:\-–]\s*(.*)$/s.exec(f);
      return m ? { date: m[1]!, text: m[2]!.trim() } : { date: "undated", text: f };
    });
  const seen = new Set<string>();
  return items
    .filter((i) => !seen.has(i.text) && seen.add(i.text))
    .sort((a, b) => b.date.localeCompare(a.date));
}

interface MarketData {
  market: MarketSnapshot | null;
  security: SecuritySnapshot | null;
  reference: ReferenceSnapshot | null;
  history: PriceHistory | null;
  error: string | null;
}

const NO_MARKET: MarketData = { market: null, security: null, reference: null, history: null, error: null };

const userAddressIn = (request: string) => /0x[0-9a-fA-F]{40}/.exec(request)?.[0];

/**
 * A token the request names outright — a typed contract or a major ticker/name
 * (BTC, Bitcoin, CAKE…) — so market data can load while research runs.
 */
function guessTokenRef(request: string): { symbol?: string; address?: string } | null {
  if (userAddressIn(request)) return {};
  const word = (request.match(/\$?[A-Za-z]{2,12}/g) ?? []).find((w) => registryAddress(w));
  return word ? { symbol: word } : null;
}

async function marketData(
  request: string,
  ref: { symbol?: string; address?: string },
  signal?: AbortSignal,
): Promise<MarketData> {
  // An address the buyer typed outranks anything inferred from the ticker.
  const userAddress = userAddressIn(request);
  if (!userAddress && !ref.symbol && !ref.address) return NO_MARKET;
  try {
    const market = await findToken({ userAddress, address: ref.address, symbol: ref.symbol }, signal);
    const address = market?.address || userAddress || ref.address;
    // Both are optional enrichments: a failure drops that input, never the forecast.
    const optional = <T,>(label: string, p: Promise<T>) =>
      p.catch((e) => {
        console.warn(`[oracle] ${label} failed: ${e instanceof Error ? e.message : e}`);
        return null;
      });
    const [security, reference, history] = await Promise.all([
      address ? optional("GoPlus", tokenSecurity(address, signal)) : null,
      address ? optional("CoinGecko", referencePrice(address, signal)) : null,
      market ? optional("GeckoTerminal", priceHistory(market.pairAddress, signal)) : null,
    ]);
    return {
      market,
      security,
      reference,
      history,
      error: market ? null : "no BSC pair found for this token",
    };
  } catch (e) {
    if (signal?.aborted) throw e;
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[oracle] market data failed: ${error}`);
    return { ...NO_MARKET, error };
  }
}

// Research briefs are reused for the same question for a while: the web does not
// change by the minute, and the brief is ~90% of a forecast's time and cost.
// Market data and the Jev call still run fresh on every request.
const BRIEF_TTL_MS = Number(process.env.RESEARCH_TTL_MINUTES ?? 30) * 60_000;
const briefCache = new Map<string, { at: number; brief: Brief }>();
const briefInflight = new Map<string, Promise<Brief>>();

async function getBrief(
  researcher: Researcher,
  request: string,
  today: string,
  signal?: AbortSignal,
): Promise<{ brief: Brief; cached: boolean }> {
  const key = today + "|" + request.trim().toLowerCase().replace(/\s+/g, " ");
  const hit = briefCache.get(key);
  if (hit && Date.now() - hit.at < BRIEF_TTL_MS) return { brief: hit.brief, cached: true };
  // Two buyers asking the same thing at once share one research call.
  const pending = briefInflight.get(key);
  if (pending) return { brief: await pending, cached: true };
  const p = researcher.brief(request, today, signal);
  briefInflight.set(key, p);
  try {
    const brief = await p;
    briefCache.set(key, { at: Date.now(), brief });
    if (briefCache.size > 200) briefCache.delete(briefCache.keys().next().value!);
    return { brief, cached: false };
  } finally {
    briefInflight.delete(key);
  }
}

export async function analyze(
  request: string,
  abortSignal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const { researcher, jev } = getClients();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Start market data now when the request already names the token; research
  // decides later whether that guess was the token it meant.
  const guess = guessTokenRef(request);
  const early = guess ? marketData(request, guess, abortSignal) : null;
  early?.catch(() => {});

  let brief: Brief | null = null;
  let researchCached = false;
  let researchError: string | null = null;
  try {
    ({ brief, cached: researchCached } = await getBrief(researcher, request, today, abortSignal));
  } catch (e) {
    // Auth / credit failures are operator problems — surface them so delivery retries
    // instead of shipping a forecast that silently lacks evidence.
    if (e instanceof ResearchError && (e.status === 401 || e.status === 402)) throw e;
    if (abortSignal?.aborted) throw e;
    researchError = e instanceof Error ? e.message : String(e);
    console.warn(`[oracle] research failed, asking Jev without evidence: ${researchError}`);
  }

  if (brief && !brief.question) {
    const out = {
      status: "not_forecastable",
      request,
      reason: brief.summary || "The request could not be framed as a yes/no question.",
      generated_at: now.toISOString(),
    };
    recordForecast(out);
    return out;
  }

  let md: MarketData = NO_MARKET;
  if (early) {
    const e = await early;
    // Keep the early fetch only if research points at the same contract.
    const wanted = brief ? registryAddress(brief.tokenSymbol)?.toLowerCase() : undefined;
    const same = userAddressIn(request) || !brief || (wanted && e.market?.address.toLowerCase() === wanted);
    md = same ? e : await marketData(request, { symbol: brief!.tokenSymbol, address: brief!.tokenAddress }, abortSignal);
  } else if (brief) {
    md = await marketData(request, { symbol: brief.tokenSymbol, address: brief.tokenAddress }, abortSignal);
  }
  const { market, security, reference, history, error: marketError } = md;

  const question = brief?.question || request;
  const state: Record<string, unknown> = {
    question,
    today,
  };
  if (brief?.resolutionCriteria) state.resolution_criteria = brief.resolutionCriteria;
  const days = brief ? daysUntil(brief.deadline, now) : null;
  if (days !== null) state.days_until_resolution = days; // pre-computed: Jev is bad at date math
  if (market) state.market = marketToState(market, reference, history);
  if (brief) state.evidence = briefToState(brief);

  const d = await jev.decide(state, QUESTIONS, abortSignal);
  const pYes = noulOf(d.answers.resolves_yes);
  const answerable = noulOf(d.answers.answerable);
  const clarityMean = scoreMeanOf(d.answers.clarity);
  if (pYes === null || answerable === null || clarityMean === null) {
    throw new Error(`Unexpected Jev answer shape: ${JSON.stringify(d.answers)}`);
  }
  const clarity = Math.round(clarityMean);
  const reliable = answerable >= MIN_ANSWERABLE && clarity >= MIN_CLARITY;
  const risk = computeRisk({ market, security, reference, answerable });

  const out = {
    status: "ok",
    request,
    question,
    resolution_criteria: brief?.resolutionCriteria ?? null,
    deadline: brief?.deadline || null,
    token: market
      ? {
          symbol: market.symbol,
          name: market.name,
          address: market.address,
          chain: "bsc",
          match: market.match,
          verified: market.match === "address" || market.match === "registry",
        }
      : brief?.tokenSymbol
        ? {
            symbol: brief.tokenSymbol,
            name: null,
            address: brief.tokenAddress || null,
            chain: "bsc",
            match: null,
            verified: false,
          }
        : null,
    forecast: {
      p_yes: round(pYes),
      p_no: round(1 - pYes),
      answerable: round(answerable),
      clarity,
      clarity_label: CLARITY_LEVELS[clarity] ?? null,
      clarity_confidence: confidenceOf(d.answers.clarity),
      reliable,
      note: reliable
        ? "Jev had enough current information and clear criteria."
        : `Low confidence: needs answerable >= ${MIN_ANSWERABLE} and clarity >= ${MIN_CLARITY}.`,
    },
    risk,
    market: market ?? (marketError ? { error: marketError } : null),
    reference,
    chart: history,
    security,
    news: brief ? timeline(brief) : [],
    evidence: brief
      ? {
          as_of: brief.asOf,
          summary: brief.summary,
          for_yes: brief.forYes,
          against_yes: brief.againstYes,
          sources: brief.sources,
        }
      : { error: researchError },
    models: { decision: d.model ?? jev.model, research: brief?.model ?? researcher.model },
    cost_usd: round((d.usage.cost ?? 0) + (brief && !researchCached ? brief.cost : 0), 6),
    research_cached: researchCached,
    generated_at: now.toISOString(),
    disclaimer:
      "Calibrated probability and rule-based risk estimate for information only; not financial advice. " +
      "This agent never trades on your behalf.",
  };
  recordForecast(out);
  return out;
}

function round(x: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}
