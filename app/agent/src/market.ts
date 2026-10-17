/**
 * Read-only BSC market data for the token a buyer asks about.
 *
 *   DexScreener  price, liquidity, volume, price change, buy/sell counts, pair age
 *   GoPlus       contract security: honeypot, taxes, mint/owner powers, holders
 *   CoinGecko    aggregated reference price, market cap, listing status
 *   GeckoTerminal hourly price history of the same DEX pair (keyless)
 *
 * DexScreener and GoPlus are keyless; CoinGecko uses COINGECKO_API_KEY (a free
 * Demo key) when set and falls back to the rate-limited public tier otherwise. Mainnet (chainId 56) data regardless of
 * the network the seller settles on. Nothing here signs or trades.
 */

const DEXSCREENER = "https://api.dexscreener.com";
const GOPLUS = "https://api.gopluslabs.io/api/v1/token_security/56";
const COINGECKO = "https://api.coingecko.com/api/v3";
const GECKOTERMINAL = "https://api.geckoterminal.com/api/v2/networks/bsc/pools";
const TIMEOUT_MS = 10_000;

// Burn / zero sinks hold supply nobody can sell — excluded from concentration.
const SINK_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
]);

/**
 * How the token was identified — buyers should trust a "symbol" match least:
 *   address   the buyer gave this contract address
 *   registry  a major token, pinned to its official BSC contract below
 *   research  an address the researcher found on the web (unverified)
 *   symbol    best-effort ticker match against trusted quote pairs (unverified)
 */
export type TokenMatch = "address" | "registry" | "research" | "symbol";

export interface MarketSnapshot {
  match: TokenMatch;
  symbol: string;
  name: string;
  address: string;
  pairAddress: string;
  dex: string;
  quoteSymbol: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  change1h: number | null;
  change6h: number | null;
  change24h: number | null;
  buys24h: number | null;
  sells24h: number | null;
  fdvUsd: number | null;
  pairAgeDays: number | null;
  url: string | null;
}

export interface SecuritySnapshot {
  honeypot: boolean | null;
  openSource: boolean | null;
  mintable: boolean | null;
  proxy: boolean | null;
  hiddenOwner: boolean | null;
  ownerCanChangeBalance: boolean | null;
  cannotSellAll: boolean | null;
  buyTax: number | null; // fraction, 0.05 = 5%
  sellTax: number | null;
  holderCount: number | null;
  /** Share of supply held by the top 10 holders, burn/zero/locked sinks excluded. */
  top10HolderShare: number | null;
  trustList: boolean;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

async function getJson(
  url: string,
  signal?: AbortSignal,
  headers: Record<string, string> = {},
): Promise<any> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const resp = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Accept: "application/json", ...headers },
  });
  if (!resp.ok) throw new Error(`${new URL(url).host} ${resp.status}`);
  return resp.json();
}

function num(x: unknown): number | null {
  const n = typeof x === "string" ? Number(x) : x;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function flag(x: unknown): boolean | null {
  if (x === "1" || x === 1) return true;
  if (x === "0" || x === 0) return false;
  return null;
}

function toSnapshot(p: any, match: TokenMatch): MarketSnapshot {
  const created = num(p.pairCreatedAt);
  return {
    match,
    symbol: String(p.baseToken?.symbol ?? ""),
    name: String(p.baseToken?.name ?? ""),
    address: String(p.baseToken?.address ?? ""),
    pairAddress: String(p.pairAddress ?? ""),
    dex: String(p.dexId ?? ""),
    quoteSymbol: String(p.quoteToken?.symbol ?? ""),
    priceUsd: num(p.priceUsd),
    liquidityUsd: num(p.liquidity?.usd),
    volume24hUsd: num(p.volume?.h24),
    change1h: num(p.priceChange?.h1),
    change6h: num(p.priceChange?.h6),
    change24h: num(p.priceChange?.h24),
    buys24h: num(p.txns?.h24?.buys),
    sells24h: num(p.txns?.h24?.sells),
    fdvUsd: num(p.fdv),
    pairAgeDays: created === null ? null : (Date.now() - created) / 86_400_000,
    url: typeof p.url === "string" ? p.url : null,
  };
}

// Official BSC contracts for major tokens, each checked against DexScreener on
// 2026-10-17 (name, price and tens of millions in liquidity). Ticker lookups
// for these names are otherwise hijacked by copycat tokens: a fake "BTC" at
// $117 and a fake "WBNB" quoted against a fake "USTT" both out-rank nothing
// but each other in raw search results.
const REGISTRY: Record<string, string> = {
  BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  FDUSD: "0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409",
  XRP: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",
  DOGE: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43",
  ADA: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47",
  DOT: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402",
  LINK: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
  UNI: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
  LTC: "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94",
  TRX: "0xCE7de646e7208a4Ef112cb6ed5038FA6cC6b12e3",
  U: "0xcE24439F2D9C6a2289F741120FE202248B666666",
  BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  USD1: "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
};

// What people call these tokens → registry key. BNB trades on DEXes as WBNB.
const ALIASES: Record<string, string> = {
  BTC: "BTCB", BITCOIN: "BTCB", XBT: "BTCB",
  BNB: "WBNB", WBNB: "WBNB",
  WETH: "ETH", ETHER: "ETH", ETHEREUM: "ETH",
  PANCAKESWAP: "CAKE", DOGECOIN: "DOGE", CARDANO: "ADA", POLKADOT: "DOT",
  CHAINLINK: "LINK", UNISWAP: "UNI", LITECOIN: "LTC", TRON: "TRX", RIPPLE: "XRP",
  TETHER: "USDT",
};

// A pair only counts if its quote side is a real asset — copycats pair a fake
// token with a fake quote ("USTT") to fabricate price and liquidity.
const TRUSTED_QUOTES = new Set(
  ["WBNB", "USDT", "USDC", "BUSD", "FDUSD", "USD1", "U", "BTCB", "ETH"].map((k) =>
    REGISTRY[k]!.toLowerCase(),
  ),
);

/** Registry address for a ticker or common name, if it is a major token. */
export function registryAddress(symbol: string | undefined): string | null {
  const key = symbol?.trim().replace(/^\$/, "").toUpperCase();
  if (!key) return null;
  const canonical = ALIASES[key] ?? key;
  return REGISTRY[canonical] ?? null;
}

const byLiquidity = (a: any, b: any) => (num(b.liquidity?.usd) ?? 0) - (num(a.liquidity?.usd) ?? 0);
const trustedQuote = (p: any) => TRUSTED_QUOTES.has(String(p.quoteToken?.address).toLowerCase());

/** Most liquid pair with `address` as the base token, preferring trusted quotes. */
async function pairForAddress(address: string, signal?: AbortSignal): Promise<any | null> {
  const pairs = await getJson(`${DEXSCREENER}/token-pairs/v1/bsc/${address}`, signal);
  const base = (Array.isArray(pairs) ? pairs : [])
    .filter((p: any) => String(p.baseToken?.address).toLowerCase() === address.toLowerCase())
    .sort(byLiquidity);
  return base.find(trustedQuote) ?? base[0] ?? null;
}

/**
 * Find the BSC token a request is about, in order of trust:
 *   1. an address the buyer typed themselves
 *   2. the registry, for major tokens by ticker or name
 *   3. an address the researcher found
 *   4. an exact-ticker search, trusted-quote pairs only (flagged unverified)
 */
export async function findToken(
  ref: { userAddress?: string; address?: string; symbol?: string },
  signal?: AbortSignal,
): Promise<MarketSnapshot | null> {
  if (ref.userAddress && ADDRESS_RE.test(ref.userAddress)) {
    const p = await pairForAddress(ref.userAddress, signal);
    if (p) return toSnapshot(p, "address");
  }
  const pinned = registryAddress(ref.symbol);
  if (pinned) {
    const p = await pairForAddress(pinned, signal);
    if (p) return toSnapshot(p, "registry");
  }
  if (ref.address && ADDRESS_RE.test(ref.address)) {
    const p = await pairForAddress(ref.address, signal);
    if (p) {
      const pinnedForSymbol = registryAddress(p.baseToken?.symbol)?.toLowerCase();
      return toSnapshot(p, pinnedForSymbol === ref.address.toLowerCase() ? "registry" : "research");
    }
  }
  const symbol = ref.symbol?.trim().replace(/^\$/, "");
  if (!symbol) return null;
  const data = await getJson(
    `${DEXSCREENER}/latest/dex/search?q=${encodeURIComponent(symbol)}`,
    signal,
  );
  const list = ((data?.pairs ?? []) as any[])
    .filter(
      (p) =>
        p.chainId === "bsc" &&
        trustedQuote(p) &&
        String(p.baseToken?.symbol).toUpperCase() === symbol.toUpperCase(),
    )
    .sort(byLiquidity);
  return list.length ? toSnapshot(list[0], "symbol") : null;
}

export async function tokenSecurity(
  address: string,
  signal?: AbortSignal,
): Promise<SecuritySnapshot | null> {
  if (!ADDRESS_RE.test(address)) return null;
  const data = await getJson(`${GOPLUS}?contract_addresses=${address}`, signal);
  const r = data?.result?.[address.toLowerCase()];
  if (!r) return null;
  const holders = ((r.holders ?? []) as any[])
    .filter(
      (h) => !SINK_ADDRESSES.has(String(h.address).toLowerCase()) && String(h.is_locked) !== "1",
    )
    .slice(0, 10);
  const top10 = holders.reduce((s, h) => s + (num(h.percent) ?? 0), 0);
  return {
    honeypot: flag(r.is_honeypot),
    openSource: flag(r.is_open_source),
    mintable: flag(r.is_mintable),
    proxy: flag(r.is_proxy),
    hiddenOwner: flag(r.hidden_owner),
    ownerCanChangeBalance: flag(r.owner_change_balance),
    cannotSellAll: flag(r.cannot_sell_all),
    buyTax: num(r.buy_tax),
    sellTax: num(r.sell_tax),
    holderCount: num(r.holder_count),
    top10HolderShare: holders.length ? Math.min(1, top10) : null,
    trustList: flag(r.trust_list) === true,
  };
}

export interface ReferenceSnapshot {
  /** Listed on CoinGecko under this BSC contract — curated, so copycats and fresh launches are not. */
  listed: boolean;
  priceUsd: number | null;
  marketCapUsd: number | null;
  /** Aggregated across every venue CoinGecko tracks, not just one DEX pair. */
  volume24hUsd: number | null;
  change24h: number | null;
}

/** CoinGecko view of a BSC contract; null when CoinGecko could not be asked (rate limit, outage). */
export async function referencePrice(
  address: string,
  signal?: AbortSignal,
): Promise<ReferenceSnapshot | null> {
  if (!ADDRESS_RE.test(address)) return null;
  const key = process.env.COINGECKO_API_KEY;
  const data = await getJson(
    `${COINGECKO}/simple/token_price/binance-smart-chain?contract_addresses=${address}` +
      "&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true",
    signal,
    key ? { "x-cg-demo-api-key": key } : {},
  );
  const r = data?.[address.toLowerCase()];
  if (!r) {
    return { listed: false, priceUsd: null, marketCapUsd: null, volume24hUsd: null, change24h: null };
  }
  return {
    listed: true,
    priceUsd: num(r.usd),
    marketCapUsd: num(r.usd_market_cap) || null, // CoinGecko reports 0 when unknown
    volume24hUsd: num(r.usd_24h_vol),
    change24h: num(r.usd_24h_change),
  };
}

export interface PriceHistory {
  interval: "1h";
  /** [unix seconds, open, high, low, close, volume USD], oldest first. Hours without trades are absent. */
  candles: [number, number, number, number, number, number][];
}

/** Last 7 days of hourly candles for a pair, in USD of its base token. */
export async function priceHistory(
  pairAddress: string,
  signal?: AbortSignal,
): Promise<PriceHistory | null> {
  if (!ADDRESS_RE.test(pairAddress)) return null;
  const data = await getJson(
    `${GECKOTERMINAL}/${pairAddress}/ohlcv/hour?aggregate=1&limit=168&currency=usd&token=base`,
    signal,
  );
  const since = Date.now() / 1000 - 7 * 86_400;
  const candles = ((data?.data?.attributes?.ohlcv_list ?? []) as unknown[][])
    .map((c) => c.slice(0, 6).map(num))
    .filter(
      (c): c is [number, number, number, number, number, number] =>
        c.length === 6 && c.every((x) => x !== null) && c[0]! >= since,
    )
    .sort((a, b) => a[0] - b[0]);
  return candles.length >= 2 ? { interval: "1h", candles } : null;
}

/** Percent change from the first open to the last close of a history. */
export function historyChangePct(h: PriceHistory | null): number | null {
  if (!h || h.candles.length < 2) return null;
  const first = h.candles[0]![1];
  const last = h.candles[h.candles.length - 1]![4];
  return first > 0 ? Math.round(((last - first) / first) * 10_000) / 100 : null;
}

/** Compact market block for the Jev state — only what bears on price direction. */
export function marketToState(
  m: MarketSnapshot,
  ref: ReferenceSnapshot | null = null,
  history: PriceHistory | null = null,
): Record<string, unknown> {
  const d7 = historyChangePct(history);
  const r = (x: number | null, dp = 2) => (x === null ? null : Math.round(x * 10 ** dp) / 10 ** dp);
  return {
    ...(ref?.listed
      ? { market_cap_usd: r(ref.marketCapUsd, 0), all_venues_volume_24h_usd: r(ref.volume24hUsd, 0) }
      : {}),
    token: `${m.symbol} (${m.name})`,
    price_usd: m.priceUsd,
    price_change_pct: { h1: m.change1h, h6: m.change6h, h24: m.change24h, ...(d7 !== null ? { d7 } : {}) },
    liquidity_usd: r(m.liquidityUsd, 0),
    volume_24h_usd: r(m.volume24hUsd, 0),
    trades_24h: { buys: m.buys24h, sells: m.sells24h },
    pair_age_days: r(m.pairAgeDays, 0),
  };
}
