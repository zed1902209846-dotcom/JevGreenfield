/**
 * Trade risk index for one BSC token: 0 (low) .. 100 (high).
 *
 * Deterministic on purpose — same inputs, same score — so a buyer can audit
 * it. Each component maps raw data to 0..1; the index is the weighted mean
 * over the components that had data (`coverage` says how much weight that was).
 */

import {
  type MarketSnapshot,
  type ReferenceSnapshot,
  registryAddress,
  type SecuritySnapshot,
} from "./market.js";

export interface RiskComponent {
  key: string;
  label: string;
  weight: number;
  /** 0..1, or null when the input was unavailable. */
  value: number | null;
  detail: string;
}

export interface RiskReport {
  score: number | null;
  level: "low" | "medium" | "high" | "unknown";
  coverage: number;
  /** Critical findings that floor the score regardless of the average. */
  critical: string[];
  components: RiskComponent[];
}

// A single one of these near its maximum can lose the whole position, so it
// must not be averaged away by healthy readings elsewhere.
const CRITICAL_KEYS = new Set(["contract", "liquidity", "concentration"]);
const CRITICAL_AT = 0.9;
const CRITICAL_FLOOR = 75;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** 1 at or below `bad`, 0 at or above `good`, log-linear between. */
function logScale(x: number, bad: number, good: number): number {
  if (x <= bad) return 1;
  if (x >= good) return 0;
  return 1 - Math.log(x / bad) / Math.log(good / bad);
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const usd = (x: number) =>
  x >= 1e6 ? `$${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `$${(x / 1e3).toFixed(1)}K` : `$${x.toFixed(0)}`;

function contractRisk(s: SecuritySnapshot | null): [number | null, string] {
  if (!s) return [null, "no security data"];
  if (s.honeypot) return [1, "HONEYPOT: tokens cannot be sold"];
  let r = 0;
  const why: string[] = [];
  const add = (cond: boolean | null, w: number, text: string) => {
    if (cond) {
      r += w;
      why.push(text);
    }
  };
  add(s.cannotSellAll, 0.5, "cannot sell all");
  add(s.ownerCanChangeBalance, 0.5, "owner can change balances");
  add(s.hiddenOwner, 0.3, "hidden owner");
  add(s.openSource === false, 0.3, "source not verified");
  add(s.mintable, 0.15, "mintable");
  add(s.proxy, 0.1, "upgradeable proxy");
  const tax = Math.max(s.buyTax ?? 0, s.sellTax ?? 0);
  add(tax > 0.1, 0.3, `tax ${pct(tax)}`);
  if (s.trustList) {
    r *= 0.3;
    why.push("on GoPlus trust list");
  }
  return [clamp01(r), why.length ? why.join(", ") : "no red flags"];
}

export function computeRisk(input: {
  market: MarketSnapshot | null;
  security: SecuritySnapshot | null;
  reference?: ReferenceSnapshot | null;
  answerable: number | null;
}): RiskReport {
  const { market: m, security: s, reference: ref = null, answerable } = input;
  const components: RiskComponent[] = [];
  const push = (key: string, label: string, weight: number, v: [number | null, string]) =>
    components.push({ key, label, weight, value: v[0], detail: v[1] });

  push("contract", "Contract security", 0.22, contractRisk(s));

  push("liquidity", "Liquidity", 0.18,
    m?.liquidityUsd != null
      ? [logScale(m.liquidityUsd, 10_000, 5_000_000), `${usd(m.liquidityUsd)} in the top pair`]
      : [null, "no pair found"]);

  const moves = m ? [m.change1h, m.change6h, m.change24h] : [];
  push("volatility", "Volatility", 0.12,
    m && moves.some((x) => x !== null)
      ? [
          clamp01(Math.max(
            Math.abs(m.change1h ?? 0) / 5,
            Math.abs(m.change6h ?? 0) / 15,
            Math.abs(m.change24h ?? 0) / 30,
          )),
          [["1h", m.change1h], ["6h", m.change6h], ["24h", m.change24h]]
            .map(([k, v]) => `${k} ${v === null ? "n/a" : `${v}%`}`)
            .join(" · "),
        ]
      : [null, "no price history"]);

  push("concentration", "Holder concentration", 0.1,
    s?.top10HolderShare != null
      ? [
          clamp01((s.top10HolderShare - 0.2) / 0.6) * (s.trustList ? 0.3 : 1),
          `top-10 holders own ${pct(s.top10HolderShare)} (burn/locked excluded)`,
        ]
      : [null, "no holder data"]);

  const trades = m && m.buys24h !== null && m.sells24h !== null ? m.buys24h + m.sells24h : null;
  push("flow", "Sell pressure", 0.08,
    trades
      ? [
          clamp01((m!.sells24h! / trades - 0.4) / 0.4) * 0.7 + (trades < 50 ? 0.3 : 0),
          `${m!.buys24h} buys / ${m!.sells24h} sells in 24h`,
        ]
      : [null, "no trade counts"]);

  push("maturity", "Token age", 0.1,
    m?.pairAgeDays != null
      ? [logScale(Math.max(m.pairAgeDays, 0.01), 7, 365), `pair is ${m.pairAgeDays.toFixed(0)} days old`]
      : [null, "unknown pair age"]);

  push("information", "Information", 0.08,
    answerable !== null
      ? [clamp01(1 - answerable), `Jev answerable = ${answerable.toFixed(2)}`]
      : [null, "no Jev answer"]);

  push("listing", "Market listing", 0.07,
    ref
      ? ref.listed
        ? [0, `listed on CoinGecko${ref.marketCapUsd ? ` · market cap ${usd(ref.marketCapUsd)}` : ""}`]
        : [1, "not listed on CoinGecko under this contract"]
      : [null, "CoinGecko unavailable"]);

  // A DEX price far from the all-venue price means a thin or manipulated pair.
  const dev =
    ref?.priceUsd && m?.priceUsd ? Math.abs(m.priceUsd - ref.priceUsd) / ref.priceUsd : null;
  push("deviation", "Price deviation", 0.05,
    dev !== null
      ? [clamp01((dev - 0.01) / 0.09), `DEX ${m!.priceUsd} vs CoinGecko ${ref!.priceUsd} (${pct(dev)} apart)`]
      : [null, ref && !ref.listed ? "no reference price (unlisted)" : "no reference price"]);

  const known = components.filter((c) => c.value !== null);
  const coverage = known.reduce((sum, c) => sum + c.weight, 0);
  const critical = known
    .filter((c) => CRITICAL_KEYS.has(c.key) && c.value! >= CRITICAL_AT)
    .map((c) => `${c.label}: ${c.detail}`);
  if (s?.honeypot) critical.unshift("HONEYPOT: tokens cannot be sold");
  // A major token's ticker on a non-official contract is a classic copycat scam.
  const official = m ? registryAddress(m.symbol) : null;
  if (m && official && official.toLowerCase() !== m.address.toLowerCase()) {
    critical.unshift(
      `Impersonation: uses the ${m.symbol} ticker but is not the official contract (${official})`,
    );
  }
  if (coverage < 0.3) {
    return { score: null, level: "unknown", coverage, critical, components };
  }
  const average = Math.round(
    (known.reduce((sum, c) => sum + c.weight * c.value!, 0) / coverage) * 100,
  );
  const floor = s?.honeypot ? 95 : critical.length ? CRITICAL_FLOOR : 0;
  const final = Math.max(average, floor);
  return {
    score: final,
    level: final < 30 ? "low" : final < 60 ? "medium" : "high",
    coverage: Math.round(coverage * 100) / 100,
    critical,
    components,
  };
}
