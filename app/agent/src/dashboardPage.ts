/**
 * The /dashboard single-page UI, inlined so the esbuild deploy bundle carries it.
 * Risk-first bilingual workspace: query, market context, risk horizon and
 * price history, followed by complete research and analysis tools.
 *
 * Everything rendered from a forecast (questions, news, sources) comes from
 * buyers, LLMs and the web: it is written with textContent only, never
 * innerHTML, and links are restricted to http(s). The page is wrapped in
 * String.raw, so its script must not use template literals.
 */

import { DASHBOARD_LOCALE } from "./dashboardLocale.js";
import { DASHBOARD_STYLE } from "./dashboardStyle.js";

export const DASHBOARD_PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jev Risk Oracle</title>
<style>
  :root {
    --bg: #0b1418; --panel: #0f1a1f; --panel2: #15232a; --line: #1d2b31; --line2: #27373e;
    --text: #e2e8ea; --muted: #8b999f; --dim: #5d6c72;
    --accent: #50d2c1; --accentInk: #04211d;
    --up: #2bb68f; --down: #ed5e75; --warn: #e8b34b;
    --upWash: rgba(43,182,143,.16); --downWash: rgba(237,94,117,.16);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; }
  .num { font-variant-numeric: tabular-nums; }
  .up { color: var(--up); } .down { color: var(--down); } .muted { color: var(--muted); }
  button { font: inherit; }

  /* ── layout ───────────────────────────────────────────── */
  .app { display: grid; min-height: 100vh; gap: 1px; background: var(--line);
    grid-template-columns: minmax(0, 1fr) 300px 330px;
    grid-template-rows: auto auto clamp(420px, 56vh, 640px) minmax(220px, 1fr) auto;
    grid-template-areas: "top top side" "ask ask side" "chart book side" "bottom bottom side" "status status status"; }
  .app > * { background: var(--panel); min-width: 0; }
  .top { grid-area: top; } .chart { grid-area: chart; } .book { grid-area: book; }
  .side { grid-area: side; } .bottom { grid-area: bottom; } .status { grid-area: status; } .askbar { grid-area: ask; }
  @media (max-width: 1180px) {
    .app { grid-template-rows: none; grid-auto-rows: auto; }
    .chart { height: clamp(380px, 60vh, 560px); }
    .app { grid-template-columns: minmax(0, 1fr) 320px;
      grid-template-areas: "top top" "ask ask" "chart chart" "book side" "bottom bottom" "status status"; }
  }
  @media (max-width: 720px) {
    .app { grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "top" "ask" "chart" "side" "book" "bottom" "status"; }
  }

  /* ── market strip ─────────────────────────────────────── */
  .top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 28px; padding: 14px 18px 4px;
    background: linear-gradient(180deg, rgba(80,210,193,.13), rgba(80,210,193,.08)), var(--panel); }
  .pair { display: flex; align-items: center; gap: 10px; }
  .pair .logo { color: var(--accent); font-size: 20px; line-height: 1; }
  .pair h1 { margin: 0; font-size: 21px; font-weight: 600; letter-spacing: .2px; }
  .tag { border-radius: 4px; padding: 2px 7px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .tag.low { background: var(--upWash); color: var(--up); }
  .tag.medium { background: rgba(232,179,75,.16); color: var(--warn); }
  .tag.high { background: var(--downWash); color: var(--down); }
  .tag.unknown, .tag.na { background: var(--panel2); color: var(--muted); }
  .tag.ok { background: var(--upWash); color: var(--up); }
  .tag.bad { background: var(--downWash); color: var(--down); }
  .tag.warn { background: rgba(232,179,75,.16); color: var(--warn); }
  .stat { min-width: 0; }
  .stat .k { color: var(--muted); font-size: 12px; border-bottom: 1px dashed var(--dim); display: inline-block; }
  .stat .v { font-size: 14px; margin-top: 2px; white-space: nowrap; }

  /* ── tabs ─────────────────────────────────────────────── */
  .tabs { display: flex; gap: 22px; padding: 0 16px; border-bottom: 1px solid var(--line); }
  .tabs button { background: none; border: 0; color: var(--muted); padding: 11px 0 10px; cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
  .tabs button.on { color: var(--text); border-bottom-color: var(--accent); }
  .tabs .grow { flex: 1; }
  .tabs .hint { color: var(--muted); align-self: center; font-size: 12px; white-space: nowrap; }
  [data-pane][hidden] { display: none !important; }

  /* ── chart ────────────────────────────────────────────── */
  .chart { display: flex; flex-direction: column; }
  .ohlc { padding: 10px 16px 0; font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ohlc b { color: var(--text); font-weight: 500; margin-right: 10px; }
  .ohlc i { font-style: normal; margin-right: 8px; }
  .chartBox { position: relative; flex: 1; min-height: 0; }
  .chartBox svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
  .chartBox svg:focus { outline: none; }
  .chartBox svg:focus-visible { outline: 1px solid var(--accent); outline-offset: -2px; }
  .chartNote { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); }
  .evidence { padding: 14px 18px; overflow: auto; }
  .evidence p { margin: 0 0 14px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .cols h3 { font-size: 12px; margin: 0 0 6px; font-weight: 600; }
  .cols ul { margin: 0; padding-left: 16px; color: var(--muted); }
  .cols li { margin-bottom: 4px; }
  @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }

  /* ── risk book ────────────────────────────────────────── */
  /* The book shares the chart's fixed-height row: it scrolls inside, never spills over the tables. */
  .book { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .bookPane { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow-y: auto;
    scrollbar-width: thin; scrollbar-color: var(--line2) transparent; }
  .bookHead, .row { display: grid; grid-template-columns: minmax(0, 1fr) 52px 54px; gap: 8px; padding: 0 14px; }
  .bookHead { color: var(--muted); font-size: 12px; padding-top: 10px; padding-bottom: 6px; }
  .bookHead span:not(:first-child), .row .r, .row .w { text-align: right; }
  .row { position: relative; height: 27px; flex: none; align-items: center; font-variant-numeric: tabular-nums; cursor: default; }
  .row > span { position: relative; z-index: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row .depth { position: absolute; top: 2px; bottom: 2px; right: 0; z-index: 0; }
  .row.ask .depth { background: var(--downWash); } .row.ask .f { color: var(--down); }
  .row.bid .depth { background: var(--upWash); } .row.bid .f { color: var(--up); }
  .row.na .f { color: var(--muted); }
  .row:hover { background: var(--panel2); }
  .spread { display: grid; grid-template-columns: auto auto auto; justify-content: center; gap: 22px;
    background: var(--panel2); padding: 7px 14px; font-variant-numeric: tabular-nums; margin: 2px 0; }
  .spread b { font-weight: 600; }
  .gauge { display: flex; flex-direction: column; align-items: center; padding: 8px 14px 2px; flex: none; }
  .gauge svg { width: 100%; max-width: 200px; height: auto; display: block; }
  .gaugeLvl { font-weight: 700; font-size: 13px; letter-spacing: .6px; margin-top: -2px; }
  .gaugeSub { color: var(--muted); font-size: 11.5px; }
  .crit { margin: 0; padding: 8px 14px 4px; list-style: none; display: grid; gap: 4px; }
  .crit:empty { display: none; }
  .crit li { background: var(--downWash); color: var(--down); border-radius: 4px; padding: 5px 8px; font-size: 12px; }
  .crit li::before { content: "⚠ "; }
  .detail { color: var(--muted); font-size: 11.5px; padding: 8px 14px 10px; min-height: 36px; border-top: 1px solid var(--line);
    margin-top: auto; position: sticky; bottom: 0; z-index: 3; background: var(--panel); flex: none; }
  .flag { display: flex; justify-content: space-between; gap: 10px; padding: 7px 14px; border-bottom: 1px solid var(--line); }

  /* ── forecast ticket ──────────────────────────────────── */
  .side { padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }
  /* Wide layout: the side column spans every row, so it must not size them.
     height:0 keeps it out of track sizing, min-height:100% fills its area,
     and anything longer scrolls inside the column instead of stretching the chart. */
  @media (min-width: 1181px) {
    .side { height: 0; min-height: 100%; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--line2) transparent; }
  }
  .pills { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pills span { background: var(--panel2); border-radius: 6px; text-align: center; padding: 8px 4px; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  .crit2 { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; margin-top: 4px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .crit2.open { display: block; }
  .more { background: none; border: 0; color: var(--accent); padding: 2px 0 0; font-size: 12px; cursor: pointer; }
  .more[hidden] { display: none; }
  .brief { background: var(--panel2); border: 1px solid var(--line2); border-radius: 8px; padding: 12px; }
  .brief h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .brief h4 .ttl { white-space: nowrap; }
  .brief h4 .tag { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .brief .sum { margin: 0; font-size: 12.5px; line-height: 1.5; overflow-wrap: anywhere;
    display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
  .brief .sum.open { display: block; }
  .brief ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
  .brief li { display: grid; grid-template-columns: 14px 1fr; gap: 6px; font-size: 12px; color: var(--text); overflow-wrap: anywhere; }
  .brief li::before { font-size: 10px; padding-top: 2px; }
  .brief li.pro::before { content: "▲"; color: var(--up); }
  .brief li.con::before { content: "▼"; color: var(--down); }
  .brief .seeAll { margin-top: 10px; background: none; border: 0; padding: 0; color: var(--accent); font-size: 12px; cursor: pointer; }
  .split { display: grid; grid-template-columns: 1fr 1fr; background: var(--panel2); border-radius: 6px; padding: 3px; gap: 3px; }
  .split div { border-radius: 4px; text-align: center; padding: 8px 4px; font-weight: 600; }
  .split .yes { background: var(--accent); color: var(--accentInk); }
  .split .no { color: var(--text); }
  .probBar { height: 6px; border-radius: 99px; background: var(--downWash); overflow: hidden; }
  .probBar i { display: block; height: 100%; background: var(--accent); }
  .probNote { color: var(--muted); font-size: 11.5px; margin-top: -8px; }
  .split div small { display: block; font-size: 11px; font-weight: 500; opacity: .85; margin-top: 1px; }
  .kv { display: grid; grid-template-columns: 1fr auto; gap: 7px 10px; font-variant-numeric: tabular-nums; }
  .kv > span:nth-child(odd) { color: var(--muted); }
  .kv > span:nth-child(even) { text-align: right; overflow-wrap: anywhere; }
  /* Overlaps the 1px grid gap so the wash flows from the market strip without a seam. */
  .askbar { margin-top: -1px; padding: 12px 18px 12px;
    background: linear-gradient(180deg, rgba(80,210,193,.08), rgba(80,210,193,0) 85%), var(--panel); }
  .askrow { display: flex; gap: 10px; }
  .askfield { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: var(--bg);
    border: 1.5px solid var(--accent); border-radius: 10px; padding: 0 14px; box-shadow: 0 0 0 4px rgba(80,210,193,.10); transition: box-shadow .15s; }
  .askfield:focus-within { box-shadow: 0 0 0 4px rgba(80,210,193,.28); }
  .askfield .ico { color: var(--accent); font-size: 18px; }
  .askfield input { flex: 1; min-width: 0; background: transparent; border: 0; color: var(--text); font: inherit; font-size: 16px; padding: 14px 0; }
  .askfield input:focus { outline: none; }
  .askfield input::placeholder { color: var(--dim); }
  .askfield input:disabled { cursor: not-allowed; }
  .cta { background: var(--accent); color: var(--accentInk); border: 0; border-radius: 10px; padding: 0 26px; font-size: 15px; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .cta:hover:not(:disabled) { filter: brightness(1.08); }
  .cta:disabled { opacity: .5; cursor: not-allowed; }
  .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; }
  .chips .lbl { color: var(--muted); }
  .chips button { background: var(--panel2); color: var(--text); border: 1px solid var(--line2); border-radius: 99px; padding: 4px 11px; cursor: pointer; font-size: 12px; }
  .chips button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .chips button:disabled { opacity: .5; cursor: not-allowed; }
  .msg { color: var(--muted); font-size: 12px; min-height: 17px; margin-top: 8px; }
  @media (max-width: 720px) { .askrow { flex-direction: column; } .cta { padding: 12px; } }
  .msg.err { color: var(--down); }
  .section { border-top: 1px solid var(--line); padding-top: 12px; }
  .section h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .section h4 small { color: var(--dim); font-weight: 400; font-size: 11px; }
  .seg { display: grid; grid-template-columns: 1fr 1fr; background: var(--panel2); border-radius: 6px; padding: 3px; gap: 3px; margin-bottom: 10px; }
  .seg button { background: none; border: 0; color: var(--muted); border-radius: 4px; padding: 6px 4px; cursor: pointer; font-weight: 600; }
  .seg button.on.buy { background: var(--up); color: #04211d; }
  .seg button.on.sell { background: var(--down); color: #2a0710; }
  .sizeRow { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .sizeRow input[type=range] { flex: 1; accent-color: var(--accent); }
  .sizeVal { min-width: 74px; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;
    border: 1px solid var(--line2); border-radius: 6px; padding: 4px 8px; }
  .ticks { display: flex; justify-content: space-between; color: var(--dim); font-size: 10.5px; margin: 0 84px 10px 0; }
  .simWarn { margin-top: 8px; font-size: 12px; border-radius: 4px; padding: 6px 8px; }
  .simWarn.bad { background: var(--downWash); color: var(--down); }
  .simWarn.warn { background: rgba(232,179,75,.14); color: var(--warn); }
  .simNote { color: var(--dim); font-size: 11px; margin-top: 8px; }
  .addr { display: inline-flex; align-items: center; gap: 6px; }
  .copy { background: var(--panel2); border: 1px solid var(--line2); color: var(--muted); border-radius: 4px; padding: 1px 7px; font-size: 11px; cursor: pointer; }
  .copy:hover { color: var(--accent); border-color: var(--accent); }
  .links { display: flex; gap: 6px; margin-top: 10px; }
  .links a { flex: 1 1 0; min-width: 0; text-align: center; text-decoration: none; color: var(--text); background: var(--panel2);
    border: 1px solid var(--line2); border-radius: 6px; padding: 7px 4px; font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .links a:hover { border-color: var(--accent); color: var(--accent); }

  /* ── bottom tables ────────────────────────────────────── */
  .bottom { display: flex; flex-direction: column; min-height: 0; }
  .tableWrap { overflow: auto; flex: 1; max-height: 340px; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th { text-align: left; color: var(--muted); font-weight: 400; padding: 8px 16px; position: sticky; top: 0; background: var(--panel); white-space: nowrap; }
  td { padding: 7px 16px; border-top: 1px solid var(--line); vertical-align: top; }
  tr.pick { cursor: pointer; } tr.pick:hover td { background: var(--panel2); } tr.sel td { background: var(--panel2); }
  td.wrap { white-space: normal; overflow-wrap: anywhere; min-width: 260px; }
  td a { color: var(--muted); }
  .empty { color: var(--muted); padding: 14px 16px; }

  /* ── status bar ───────────────────────────────────────── */
  .status { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; padding: 6px 12px; font-size: 12px; color: var(--muted); }
  .online { border: 1px solid var(--up); color: var(--up); border-radius: 4px; padding: 1px 7px; }
  .online::before { content: "● "; }
  .status .grow { flex: 1; }

  .tip { position: absolute; pointer-events: none; background: var(--panel2); border: 1px solid var(--line2); border-radius: 4px; padding: 2px 6px; font-size: 11.5px; color: var(--text); white-space: nowrap; z-index: 2; font-variant-numeric: tabular-nums; }
${DASHBOARD_STYLE}
</style>
</head>
<body>
<a class="skip" href="#analysis">Skip to analysis</a>
<header class="masthead"><div class="mastinner">
  <a class="brand" href="#analysis"><b>jev</b><span>Risk Oracle</span></a>
  <nav aria-label="Main navigation"><a href="#analysis">Risk analysis</a><a href="#history">Forecast history</a></nav>
  <button class="language" id="language" type="button" aria-label="Switch language">中文 / EN</button>
</div></header>
<main class="app" id="analysis">
  <header class="top">
    <div class="pair"><h2 id="pairName">BNB Chain market overview</h2><span class="tag unknown" id="riskTag">NO DATA</span></div>
    <div class="stat"><span class="k">DEX price</span><div class="v num" id="sPrice">—</div></div>
    <div class="stat"><span class="k">Market (CoinGecko)</span><div class="v num" id="sRef">—</div></div>
    <div class="stat"><span class="k">24h change</span><div class="v num" id="sChg">—</div></div>
    <div class="stat"><span class="k">24h volume</span><div class="v num" id="sVol">—</div></div>
    <div class="stat"><span class="k">Liquidity</span><div class="v num" id="sLiq">—</div></div>
    <div class="stat"><span class="k">Market cap / FDV</span><div class="v num" id="sCap">—</div></div>
    <div class="stat"><span class="k">Pair age</span><div class="v num" id="sAge">—</div></div>
  </header>

  <section class="askbar">
    <h1>See the risk before you trade.</h1>
    <p class="intro">Research, contract security and market data. One clearer view of your next BNB Chain trade.</p>
    <form class="askrow" id="demo">
      <label class="askfield"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
        <input id="req" aria-label="Token name or contract address" maxlength="500" autocomplete="off" placeholder="Token name or 0x… contract address">
      </label>
      <button class="cta" id="go" type="submit">Analyze</button>
    </form>
    <div class="chips" id="chips">
      <span class="lbl">Try:</span>
      <button type="button" data-q="Is Bitcoin risky to buy?">Is Bitcoin risky to buy?</button>
      <button type="button" data-q="Is CAKE a risky buy right now?">Is CAKE a risky buy right now?</button>
      <button type="button" data-q="Is 0xdE673878e6d724fEFE4F4E310c70bf16444dc999 worth buying?">Copycat “BTC” contract</button>
      <button type="button" data-q="Is 0xb5E17933501712485D2EC6662679409006767777 worth buying?">Micro-cap FOMOON</button>
      <button type="button" data-q="Will BNB be above $800 on 2026-11-01?">Will BNB be above $800 on Nov 1?</button>
    </div>
    <div class="msg" id="msg" role="status" aria-live="polite"></div>
  </section>

  <section class="overview" aria-label="Risk overview">
    <h2>Risk at a glance</h2>
    <div class="gauge">
      <svg id="gauge" viewBox="0 0 288 116" role="img" aria-label="Risk index gauge"></svg>
      <div class="gaugeLvl" id="gaugeLvl">NO DATA</div>
      <div class="gaugeSub" id="gaugeSub">0 = low risk · 100 = high risk</div>
    </div>
    <p class="riskNote">Lower risk does not mean the price will rise.</p>
    <div class="outlook"><span>Forecast P(YES)</span><strong id="overviewProb">—</strong></div>
    <p class="riskNote" id="overviewQuestion">Select a forecast to see its question and probability.</p>
    <ul class="crit" id="crit"></ul>
  </section>

  <section class="chart">
    <div class="tabs" data-tabs="main">
      <button class="on" data-tab="chartPane">Chart</button>
      <button data-tab="evidencePane">Evidence</button>
      <span class="grow"></span>
      <span class="hint" id="chartHint">1h · 7d</span>
    </div>
    <div data-pane="chartPane" style="display:flex;flex-direction:column;flex:1">
      <div class="ohlc" id="ohlc"></div>
      <div class="chartBox" id="chartBox"></div>
    </div>
    <div data-pane="evidencePane" class="evidence" hidden>
      <p id="summary"></p>
      <div class="cols">
        <div><h3 class="up">For YES</h3><ul id="forYes"></ul></div>
        <div><h3 class="down">Against YES</h3><ul id="againstYes"></ul></div>
      </div>
    </div>
  </section>

  <section class="book">
    <div class="tabs" data-tabs="book">
      <button class="on" data-tab="riskPane">Risk book</button>
      <button data-tab="secPane">Security</button>
    </div>
    <div data-pane="riskPane" class="bookPane">
      <div class="bookHead"><span>Factor</span><span>Risk</span><span>Weight</span></div>
      <div id="asks"></div>
      <div class="spread"><span>Risk index</span><b id="spreadScore">—</b><span id="spreadCov" class="muted">—</span></div>
      <div id="bids"></div>
      <div class="detail" id="detail">Hover a factor for the reading behind it.</div>
    </div>
    <div data-pane="secPane" id="secList" class="bookPane" hidden></div>
  </section>

  <aside class="side">
    <div class="pills"><span id="pChain">BSC</span><span id="pMatch">—</span><span id="pModel">Jev</span></div>
    <div>
      <div class="q" id="question">No forecast selected</div>
      <div class="crit2" id="criteria"></div>
      <button type="button" class="more" id="critToggle" hidden>Show full criteria</button>
    </div>
    <div class="split"><div class="yes num" id="yesBox">YES —</div><div class="no num" id="noBox">NO —</div></div>
    <div class="probBar"><i id="probBar" style="width:0"></i></div>
    <div class="probNote">Jev's probability for the question above — not a buy/sell signal</div>
    <div class="brief" id="brief">
      <h4><span class="ttl">Research brief</span><span class="tag na" id="briefAsOf">—</span></h4>
      <p class="sum" id="briefSum">Run a forecast to see the evidence behind it.</p>
      <button type="button" class="more" id="sumToggle" hidden>Read more</button>
      <ul id="briefPoints"></ul>
      <button type="button" class="seeAll" id="seeAll" hidden>See all evidence, news &amp; sources →</button>
    </div>
    <div class="kv">
      <span>Answerable</span><span id="answerable">—</span>
      <span>Clarity</span><span id="clarity">—</span>
      <span>Reliability</span><span id="reliable">—</span>
      <span>Deadline</span><span id="deadline">—</span>
      <span>7d change</span><span id="d7">—</span>
      <span>Cost of forecast</span><span id="cost">—</span>
    </div>
    <div class="section" id="simSection">
      <h4>Trade impact simulator <small>estimate · not advice</small></h4>
      <div class="seg" id="simSide"><button type="button" class="buy on" data-side="buy">Buy</button><button type="button" class="sell" data-side="sell">Sell</button></div>
      <div class="sizeRow">
        <input type="range" id="simSize" min="0" max="12" step="1" value="4" aria-label="Order size in USD">
        <span class="sizeVal" id="simSizeVal">$1,000</span>
      </div>
      <div class="ticks"><span>$100</span><span>$1K</span><span>$10K</span><span>$100K</span></div>
      <div class="kv">
        <span>Est. avg fill</span><span id="simFill">—</span>
        <span>Slippage vs mid</span><span id="simSlip">—</span>
        <span>Price after trade</span><span id="simImpact">—</span>
        <span>Share of pool</span><span id="simShare">—</span>
        <span id="simOutLbl">You receive ≈</span><span id="simOut">—</span>
      </div>
      <div class="simWarn" id="simWarn" hidden></div>
      <div class="simNote">Constant-product (V2) math on the top pair's liquidity, excluding pool fees. V3 pools concentrate liquidity, so real impact may be lower.</div>
    </div>
    <div class="section" id="tokenSection">
      <h4>Token <small>market data · BSC mainnet</small></h4>
      <div class="kv">
        <span>Name</span><span id="tkName">—</span>
        <span>Contract</span><span id="tkAddr">—</span>
        <span>Holders</span><span class="num" id="tkHolders">—</span>
        <span>Top pair</span><span id="tkPair">—</span>
        <span>Pair contract</span><span id="tkPairAddr">—</span>
      </div>
      <div class="links" id="tkLinks"></div>
    </div>
    <div class="section">
      <h4>Seller</h4>
      <div class="kv">
        <span>Wallet</span><span class="num" id="wallet">—</span>
        <span>Network</span><span id="net">—</span>
        <span>Forecasts served</span><span class="num" id="count">0</span>
        <span>Payment</span><span>ERC-8183 · x402</span>
        <span>Research model</span><span id="research">—</span>
      </div>
    </div>
  </aside>

  <section class="bottom" id="history">
    <div class="tabs" data-tabs="bottom">
      <button class="on" data-tab="histPane" id="histTab">Forecasts</button>
      <button data-tab="newsPane">News</button>
      <button data-tab="srcPane">Sources</button>
      <span class="grow"></span>
      <span class="hint">Probabilities by Jev · risk is rule-based · not financial advice</span>
    </div>
    <div data-pane="histPane" class="tableWrap">
      <table><thead><tr><th>Time (UTC)</th><th>Token</th><th>Question</th><th>P(YES)</th><th>Risk</th><th>Identified by</th></tr></thead><tbody id="hist"></tbody></table>
      <div class="empty" id="histEmpty">No forecasts yet. Paid orders over A2A / x402 appear here.</div>
    </div>
    <div data-pane="newsPane" class="tableWrap" hidden>
      <table><thead><tr><th>Date</th><th>What happened</th></tr></thead><tbody id="news"></tbody></table>
    </div>
    <div data-pane="srcPane" class="tableWrap" hidden>
      <table><thead><tr><th>#</th><th>Source</th></tr></thead><tbody id="sources"></tbody></table>
    </div>
  </section>

  <footer class="status">
    <span class="online" id="online">Online</span>
    <span id="stNet">bsc-testnet</span>
    <span class="grow"></span>
    <span>This agent never trades on your behalf</span>
    <span>Jev · DexScreener · GoPlus · CoinGecko · GeckoTerminal</span>
  </footer>
</main>

<script>
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var state = { list: [], sel: 0, pinned: false, demo: false };
  var C = { up: "#187563", down: "#b33d30", line: "#d4e0e3", muted: "#506974", text: "#173f50" };

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function safeUrl(u) { return typeof u === "string" && /^https?:\/\//i.test(u) ? u : null; }
  function link(u, text) {
    var s = safeUrl(u);
    return s ? el("a", { href: s, target: "_blank", rel: "noopener noreferrer" }, text || s) : el("span", null, text || u);
  }
  function fmtUsd(x) {
    if (x === null || x === undefined) return "—";
    if (x >= 1e9) return "$" + (x / 1e9).toFixed(2) + "B";
    if (x >= 1e6) return "$" + (x / 1e6).toFixed(2) + "M";
    if (x >= 1e3) return "$" + (x / 1e3).toFixed(1) + "K";
    return "$" + Number(x).toFixed(2);
  }
  function bare(x) { return x >= 1 ? x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(Number(x.toPrecision(4))); }
  function fmtPrice(x) { return x === null || x === undefined ? "—" : "$" + bare(x); }
  function signed(v) { return (v >= 0 ? "+" : "") + v.toFixed(2) + "%"; }
  function tag(text, kind) { return el("span", { class: "tag " + kind }, text); }
  function stat(id, t, cls) { var n = $(id); n.textContent = t; n.className = "v num " + (cls || ""); }

  // ── tabs ──
  document.querySelectorAll("[data-tabs]").forEach(function (bar) {
    var host = bar.parentNode;
    bar.querySelectorAll("button[data-tab]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.classList.contains("on")));
      b.addEventListener("click", function () {
        bar.querySelectorAll("button[data-tab]").forEach(function (o) {
          o.classList.toggle("on", o === b);
          o.setAttribute("aria-pressed", String(o === b));
          var pane = host.querySelector('[data-pane="' + o.getAttribute("data-tab") + '"]');
          if (pane) pane.hidden = o !== b;
        });
        if (b.getAttribute("data-tab") === "chartPane") renderChart(current());
      });
    });
  });

  function current() { return state.list.length ? state.list[Math.min(state.sel, state.list.length - 1)] : null; }

  // ── market strip ──
  var LEVEL = { low: "LOW RISK", medium: "MEDIUM RISK", high: "HIGH RISK", unknown: "NO DATA" };
  function renderTop(f) {
    var m = f && f.market && !f.market.error ? f.market : null, ref = f && f.reference, r = f && f.risk;
    $("pairName").textContent = f ? (f.token ? f.token.symbol + "-USD" : "No token") : "BNB Chain market overview";
    var lv = (r && r.level) || "unknown", rt = $("riskTag");
    rt.className = "tag " + lv;
    rt.textContent = r && r.score !== null && r.score !== undefined ? "RISK " + r.score + " · " + LEVEL[lv] : LEVEL[lv];
    stat("sPrice", m ? fmtPrice(m.priceUsd) : "—");
    if (ref && ref.listed && ref.priceUsd) {
      var dev = m && m.priceUsd ? Math.abs(m.priceUsd - ref.priceUsd) / ref.priceUsd * 100 : null;
      stat("sRef", fmtPrice(ref.priceUsd) + (dev !== null ? "  Δ" + dev.toFixed(2) + "%" : ""));
    } else stat("sRef", ref && !ref.listed ? "Not listed" : "—", ref && !ref.listed ? "down" : "");
    if (m && m.change24h !== null) stat("sChg", signed(m.change24h), m.change24h >= 0 ? "up" : "down"); else stat("sChg", "—");
    stat("sVol", m ? fmtUsd(m.volume24hUsd) : "—");
    stat("sLiq", m ? fmtUsd(m.liquidityUsd) : "—");
    stat("sCap", (ref && ref.marketCapUsd ? fmtUsd(ref.marketCapUsd) : "—") + " / " + (m ? fmtUsd(m.fdvUsd) : "—"));
    stat("sAge", m && m.pairAgeDays !== null ? Math.round(m.pairAgeDays) + " days" : "—");
  }

  // ── candles ──
  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(tagName, attrs) { var n = document.createElementNS(SVGNS, tagName); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }
  function niceStep(span, count) {
    var raw = span / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  }
  function axisNum(v, step) {
    if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: step < 1 ? 2 : 0 });
    if (v >= 1) return v.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2);
    return String(Number(v.toPrecision(3)));
  }
  function compact(v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "K" : v >= 10 ? v.toFixed(0) : v.toFixed(2); }
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function hourLabel(t) { var d = new Date(t * 1000); return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(2) + "  " + String(d.getUTCHours()).padStart(2, "0") + ":00 UTC"; }

  function ohlcLine(f, c, prev) {
    var box = $("ohlc"); clear(box);
    var m = f && f.market && !f.market.error ? f.market : null;
    box.appendChild(el("b", null, m ? m.symbol + "/" + m.quoteSymbol + " · 1h · " + m.dex : "—"));
    if (!c) return;
    var base = prev ? prev[4] : c[1], ch = c[4] - base, cls = c[4] >= c[1] ? "up" : "down";
    [["O", c[1]], ["H", c[2]], ["L", c[3]], ["C", c[4]]].forEach(function (p) {
      var i = el("i"); i.appendChild(document.createTextNode(p[0]));
      i.appendChild(el("span", { class: cls + " num" }, bare(p[1]))); box.appendChild(i);
    });
    // Micro-cap moves are unreadable as absolute numbers; show only the percent there.
    var abs = Math.abs(ch) >= 0.0001 ? (ch < 0 ? "-" : "+") + bare(Math.abs(ch)) + " " : "";
    box.appendChild(el("span", { class: cls + " num" }, abs + "(" + signed(ch / base * 100) + ")"));
    box.appendChild(el("span", { class: "muted num" }, "   Vol $" + compact(c[5])));
  }

  function renderChart(f) {
    var box = $("chartBox"); clear(box);
    var cs = f && f.chart && f.chart.candles ? f.chart.candles : [];
    $("chartHint").textContent = cs.length && cs.length < 120 ? "1h · 7d · only " + cs.length + " of 168 hours traded" : "1h · 7d";
    if (cs.length < 2) {
      ohlcLine(f, null);
      box.appendChild(el("div", { class: "chartNote" }, f ? (f.token ? "No price history for this pair" : "Not a token question — no chart") : "Run a forecast to see the chart"));
      return;
    }
    if (!box.clientWidth) return;
    var W = box.clientWidth, H = box.clientHeight, L = 8, T = 10, B = 26;
    var volH = Math.round((H - T - B) * 0.22), gap = 10, priceB = H - B - volH - gap;
    var t0 = cs[0][0], t1 = cs[cs.length - 1][0], slots = Math.max(1, (t1 - t0) / 3600 + 1);
    var lo = Infinity, hi = -Infinity, vmax = 0;
    cs.forEach(function (c) { lo = Math.min(lo, c[3]); hi = Math.max(hi, c[2]); vmax = Math.max(vmax, c[5]); });
    if (hi === lo) { hi *= 1.01; lo *= 0.99; }
    var pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
    var step = niceStep(hi - lo, 6);
    // The right axis widens to fit its longest label (micro-cap prices are long).
    var R = Math.max(64, Math.round(Math.max(axisNum(cs[cs.length - 1][4], step).length, axisNum(hi, step).length) * 7 + 22));
    var slotW = (W - L - R) / slots, bodyW = Math.max(1, Math.min(14, slotW * 0.7));
    var X = function (t) { return L + ((t - t0) / 3600 + 0.5) * slotW; };
    var Y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (priceB - T); };
    var V = function (v) { return H - B - (vmax ? v / vmax : 0) * volH; };

    var root = svg("svg", { tabindex: "0", role: "img", "aria-label": "Hourly candles over 7 days" });
    for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      root.appendChild(svg("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: C.line, "stroke-width": 1 }));
      var yt = svg("text", { x: W - R + 8, y: Y(v) + 4, "font-size": 11, fill: C.muted }); yt.textContent = axisNum(v, step); root.appendChild(yt);
    }
    root.appendChild(svg("line", { x1: L, x2: W - R, y1: priceB + gap / 2, y2: priceB + gap / 2, stroke: C.line, "stroke-width": 1 }));
    var vt = svg("text", { x: W - R + 8, y: V(vmax) + 10, "font-size": 11, fill: C.muted }); vt.textContent = "$" + compact(vmax); root.appendChild(vt);
    var dayW = 24 * slotW, every = Math.max(1, Math.ceil(44 / dayW));
    for (var d = Math.ceil(t0 / 86400) * 86400, i = 0; d <= t1; d += 86400, i++) {
      if (i % every) continue;
      var dx = X(d) - slotW / 2;
      root.appendChild(svg("line", { x1: dx, x2: dx, y1: T, y2: H - B, stroke: C.line, "stroke-width": 1 }));
      var xt = svg("text", { x: dx, y: H - 8, "text-anchor": "middle", "font-size": 11, fill: C.muted }); xt.textContent = String(new Date(d * 1000).getUTCDate()); root.appendChild(xt);
    }
    cs.forEach(function (c) {
      var col = c[4] >= c[1] ? C.up : C.down, x = X(c[0]);
      root.appendChild(svg("line", { x1: x, x2: x, y1: Y(c[2]), y2: Y(c[3]), stroke: col, "stroke-width": 1 }));
      var top = Y(Math.max(c[1], c[4])), h = Math.max(1, Math.abs(Y(c[1]) - Y(c[4])));
      root.appendChild(svg("rect", { x: x - bodyW / 2, y: top, width: bodyW, height: h, fill: col }));
      root.appendChild(svg("rect", { x: x - bodyW / 2, y: V(c[5]), width: bodyW, height: Math.max(0, H - B - V(c[5])), fill: col, "fill-opacity": 0.55 }));
    });
    var last = cs[cs.length - 1], lastCol = last[4] >= last[1] ? C.up : C.down;
    root.appendChild(svg("line", { x1: L, x2: W - R, y1: Y(last[4]), y2: Y(last[4]), stroke: lastCol, "stroke-width": 1, "stroke-dasharray": "2 3" }));
    root.appendChild(svg("rect", { x: W - R + 2, y: Y(last[4]) - 9, width: R - 4, height: 18, rx: 2, fill: lastCol }));
    var lt = svg("text", { x: W - R + 8, y: Y(last[4]) + 4, "font-size": 11, "font-weight": 600, fill: "#ffffff" }); lt.textContent = axisNum(last[4], step); root.appendChild(lt);

    var vx = svg("line", { y1: T, y2: H - B, stroke: C.muted, "stroke-width": 1, "stroke-dasharray": "4 4", visibility: "hidden" });
    var hy = svg("line", { x1: L, x2: W - R, stroke: C.muted, "stroke-width": 1, "stroke-dasharray": "4 4", visibility: "hidden" });
    root.appendChild(vx); root.appendChild(hy);
    box.appendChild(root);
    var yTip = el("div", { class: "tip", hidden: "" }), xTip = el("div", { class: "tip", hidden: "" });
    box.appendChild(yTip); box.appendChild(xTip);

    var cur = cs.length - 1;
    ohlcLine(f, last, cs[cs.length - 2]);
    function show(idx, py) {
      cur = Math.max(0, Math.min(cs.length - 1, idx));
      var c = cs[cur], x = X(c[0]);
      vx.setAttribute("x1", x); vx.setAttribute("x2", x); vx.setAttribute("visibility", "visible");
      var yy = py === undefined ? Y(c[4]) : Math.max(T, Math.min(priceB, py));
      hy.setAttribute("y1", yy); hy.setAttribute("y2", yy); hy.setAttribute("visibility", "visible");
      yTip.hidden = false; yTip.textContent = axisNum(lo + (1 - (yy - T) / (priceB - T)) * (hi - lo), step);
      yTip.style.left = (W - R + 2) + "px"; yTip.style.top = (yy - 10) + "px";
      xTip.hidden = false; xTip.textContent = hourLabel(c[0]);
      xTip.style.left = Math.max(0, Math.min(W - R - 130, x - 65)) + "px"; xTip.style.top = (H - B + 3) + "px";
      ohlcLine(f, c, cs[cur - 1]);
    }
    function hide() { vx.setAttribute("visibility", "hidden"); hy.setAttribute("visibility", "hidden"); yTip.hidden = true; xTip.hidden = true; ohlcLine(f, last, cs[cs.length - 2]); }
    function nearest(px) {
      var t = t0 + ((px - L) / slotW - 0.5) * 3600, a = 0, b = cs.length - 1;
      while (b - a > 1) { var mid = (a + b) >> 1; if (cs[mid][0] < t) a = mid; else b = mid; }
      return Math.abs(cs[a][0] - t) <= Math.abs(cs[b][0] - t) ? a : b;
    }
    root.addEventListener("pointermove", function (e) { var r = root.getBoundingClientRect(); show(nearest(e.clientX - r.left), e.clientY - r.top); });
    root.addEventListener("pointerleave", hide);
    root.addEventListener("focus", function () { show(cur); });
    root.addEventListener("blur", hide);
    root.addEventListener("keydown", function (e) {
      var k = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: cs.length - 1 }[e.key];
      if (k !== undefined) { show(k); e.preventDefault(); }
    });
  }

  // ── risk gauge ──
  function renderGauge(r) {
    var g = $("gauge"); clear(g);
    var score = r && r.score !== null && r.score !== undefined ? r.score : null;
    var col = score === null ? "#c3d7df" : score < 30 ? "#83d9c1" : score < 60 ? "#f2ca70" : "#ffafa3";
    [[0, 30, "#83d9c1"], [30, 60, "#f2ca70"], [60, 100, "#ffafa3"]].forEach(function (b) {
      g.appendChild(svg("rect", { x: b[0] * 2.84, y: 77, width: (b[1] - b[0]) * 2.84 - 3, height: 8, fill: b[2] }));
    });
    [0, 30, 60, 100].forEach(function (v) {
      var t = svg("text", { x: v * 2.81, y: 108, "text-anchor": v === 0 ? "start" : v === 100 ? "end" : "middle", "font-size": 11, fill: "#c3d7df" });
      t.textContent = v; g.appendChild(t);
    });
    if (score !== null) g.appendChild(svg("line", { x1: Math.min(281, Math.max(2, score * 2.81)), y1: 70, x2: Math.min(281, Math.max(2, score * 2.81)), y2: 91, stroke: "#fff", "stroke-width": 3 }));
    var n = svg("text", { x: 0, y: 55, "font-size": 56, "font-weight": 650, fill: col });
    n.textContent = score === null ? "—" : score; g.appendChild(n);
    var denominator = svg("text", { x: 120, y: 54, "font-size": 18, fill: "#c3d7df" }); denominator.textContent = "/ 100"; g.appendChild(denominator);
    $("gaugeLvl").textContent = r ? LEVEL[r.level || "unknown"] : "NO DATA";
    $("gaugeLvl").style.color = col;
    $("gaugeSub").textContent = r ? "data coverage " + Math.round((r.coverage || 0) * 100) + "% · 0 low → 100 high" : "0 = low risk · 100 = high risk";
    g.setAttribute("aria-label", score === null ? "Risk index: no data" : "Risk index " + score + " of 100, " + LEVEL[r.level || "unknown"]);
  }

  // ── risk book ──
  function renderBook(f) {
    renderGauge(f && f.risk);
    var r = f && f.risk, asks = $("asks"), bids = $("bids"), crit = $("crit");
    clear(asks); clear(bids); clear(crit);
    ((r && r.critical) || []).forEach(function (t) { crit.appendChild(el("li", null, t)); });
    var comps = ((r && r.components) || []).slice();
    var hiRisk = comps.filter(function (c) { return c.value !== null && c.value >= 0.3; }).sort(function (a, b) { return a.value - b.value; });
    var loRisk = comps.filter(function (c) { return c.value === null || c.value < 0.3; }).sort(function (a, b) { return (b.value === null ? -1 : b.value) - (a.value === null ? -1 : a.value); });
    function row(c, side, host) {
      var kind = c.value === null ? "na" : side, rw = el("div", { class: "row " + kind, tabindex: "0" });
      var depth = el("div", { class: "depth" });
      depth.style.width = (c.value === null ? 0 : (side === "ask" ? c.value : 1 - c.value) * 100) + "%";
      rw.appendChild(depth);
      rw.appendChild(el("span", { class: "f" }, c.label));
      rw.appendChild(el("span", { class: "r" }, c.value === null ? "—" : Math.round(c.value * 100)));
      rw.appendChild(el("span", { class: "w muted" }, Math.round(c.weight * 100) + "%"));
      var say = function () { $("detail").textContent = c.label + ": " + c.detail; };
      rw.addEventListener("pointerenter", say); rw.addEventListener("focus", say);
      host.appendChild(rw);
    }
    hiRisk.forEach(function (c) { row(c, "ask", asks); });
    loRisk.forEach(function (c) { row(c, "bid", bids); });
    var sc = $("spreadScore");
    sc.textContent = r && r.score !== null && r.score !== undefined ? r.score + " · " + (r.level || "").toUpperCase() : "—";
    sc.className = r ? (r.level === "low" ? "up" : r.level === "high" ? "down" : "") : "";
    $("spreadCov").textContent = r ? "coverage " + Math.round((r.coverage || 0) * 100) + "%" : "—";
    $("detail").textContent = comps.length ? "Hover a factor for the reading behind it." : "No risk data";

    var sec = $("secList"); clear(sec);
    var s = f && f.security;
    if (!s) { sec.appendChild(el("div", { class: "empty" }, "No security data")); return; }
    function flag(label, bad, txtBad, txtGood) {
      var d = el("div", { class: "flag" }); d.appendChild(el("span", null, label));
      d.appendChild(bad === null || bad === undefined ? tag("unknown", "na") : bad ? tag(txtBad, "bad") : tag(txtGood, "ok"));
      sec.appendChild(d);
    }
    flag("Honeypot", s.honeypot, "YES", "No");
    flag("Source code", s.openSource === null ? null : !s.openSource, "Unverified", "Verified");
    flag("Mintable", s.mintable, "Yes", "No");
    flag("Hidden owner", s.hiddenOwner, "Yes", "No");
    flag("Owner can edit balances", s.ownerCanChangeBalance, "Yes", "No");
    flag("Upgradeable proxy", s.proxy, "Yes", "No");
    var tax = Math.max(s.buyTax || 0, s.sellTax || 0);
    flag("Buy / sell tax", tax > 0.1, (tax * 100).toFixed(1) + "%", (tax * 100).toFixed(1) + "%");
    if (s.top10HolderShare !== null && s.top10HolderShare !== undefined) flag("Top-10 holders", s.top10HolderShare > 0.5, (s.top10HolderShare * 100).toFixed(1) + "%", (s.top10HolderShare * 100).toFixed(1) + "%");
    flag("GoPlus trust list", s.trustList ? false : null, "", "Listed");
  }

  // ── forecast ticket ──
  var MATCH = { address: "Your contract", registry: "Official contract", research: "Unverified addr", symbol: "Unverified ticker" };
  var MATCH_SHORT = { address: "Your contract", registry: "Official", research: "Unverified", symbol: "Unverified" };
  function renderTicket(f) {
    var fc = f && f.forecast, t = f && f.token;
    $("overviewProb").textContent = fc ? Math.round(fc.p_yes * 100) + "%" : "—";
    $("overviewQuestion").textContent = f ? (f.question || f.request || "") : "Select a forecast to see its question and probability.";
    $("pChain").textContent = t ? t.symbol : "BSC"; $("pChain").title = t ? "BSC · " + t.symbol : "";
    var pm = $("pMatch"); pm.textContent = t && t.match ? MATCH_SHORT[t.match] || t.match : "—"; pm.title = t && t.match ? MATCH[t.match] || "" : "";
    pm.style.color = t ? (t.verified ? "var(--up)" : "var(--warn)") : "";
    var jm = f && f.models ? /jev-(\d+\.\d+)/.exec(String(f.models.decision || "")) : null;
    $("pModel").textContent = jm ? "Jev " + jm[1] : "Jev";
    $("question").textContent = f ? (f.question || f.request || "") : "No forecast selected";
    var critEl = $("criteria"), critBtn = $("critToggle");
    critEl.textContent = f ? (f.status === "ok" ? (f.resolution_criteria || "") : (f.reason || "")) : "";
    critEl.classList.remove("open"); critBtn.textContent = "Show full criteria";
    // Only offer the toggle when the clamp actually hides text.
    critBtn.hidden = critEl.scrollHeight <= critEl.clientHeight + 2;
    renderBrief(f);
    // Say what YES means for this question so the split never reads as Buy/Sell.
    var q = (f && f.question) || "", hint =
      /\bhigher\b/i.test(q) ? ["Price up", "Not up"] :
      /\b(above|exceed|reach)/i.test(q) ? ["Above", "Not above"] :
      /\b(below|drop|fall|lower)/i.test(q) ? ["Falls below", "Stays above"] : null;
    function side(box, label, p, h) {
      clear(box);
      box.appendChild(document.createTextNode(label + " " + (fc ? Math.round(p * 100) + "%" : "—")));
      if (h) box.appendChild(el("small", null, h));
    }
    side($("yesBox"), "YES", fc && fc.p_yes, hint && hint[0]);
    side($("noBox"), "NO", fc && fc.p_no, hint && hint[1]);
    $("probBar").style.width = (fc ? fc.p_yes * 100 : 0) + "%";
    $("answerable").textContent = fc ? fc.answerable.toFixed(2) : "—";
    $("clarity").textContent = fc ? fc.clarity + " / 4" : "—";
    var rel = $("reliable"); clear(rel); rel.appendChild(fc ? (fc.reliable ? tag("Reliable", "ok") : tag("Low confidence", "warn")) : el("span", null, "—"));
    $("deadline").textContent = (f && f.deadline) || "—";
    var cs = f && f.chart && f.chart.candles, d7 = $("d7");
    if (cs && cs.length > 1) { var p = (cs[cs.length - 1][4] - cs[0][1]) / cs[0][1] * 100; d7.textContent = signed(p); d7.className = p >= 0 ? "up" : "down"; }
    else { d7.textContent = "—"; d7.className = ""; }
    $("cost").textContent = f && f.cost_usd !== undefined ? "$" + Number(f.cost_usd).toFixed(4) : "—";
    $("research").textContent = f && f.models ? String(f.models.research || "—").replace(/^[^/]+\//, "") : "—";
  }

  // ── research brief (the researcher's evidence, shown where the probability is) ──
  function renderBrief(f) {
    var ev = (f && f.evidence) || {}, pts = $("briefPoints"), asOf = $("briefAsOf"), all = $("seeAll");
    clear(pts);
    // Evidence older than a week is flagged: a stale brief is itself a risk signal.
    var age = ev.as_of && /^\d{4}-\d{2}-\d{2}/.test(ev.as_of) && f && f.generated_at
      ? Math.floor((Date.parse(f.generated_at.slice(0, 10)) - Date.parse(ev.as_of.slice(0, 10))) / 86400000) : null;
    var stale = age !== null && age > 7;
    asOf.textContent = !ev.as_of ? "—" : stale ? ev.as_of.slice(0, 10) + " · " + age + "d old" : "as of " + ev.as_of.slice(0, 10);
    asOf.title = ev.as_of ? "Newest fact in the brief is from " + ev.as_of : "";
    asOf.className = "tag " + (!ev.as_of ? "na" : stale ? "warn" : "ok");
    $("sumToggle").hidden = true;
    if (!f) { $("briefSum").textContent = "Run a forecast to see the evidence behind it."; all.hidden = true; return; }
    if (f.status !== "ok") { $("briefSum").textContent = f.reason || "Not forecastable."; all.hidden = true; return; }
    var sum = $("briefSum"), sumBtn = $("sumToggle");
    sum.textContent = ev.summary || (ev.error ? "Research failed — Jev answered without evidence: " + ev.error : "No research brief.");
    sum.classList.remove("open"); sumBtn.textContent = "Read more";
    sumBtn.hidden = sum.scrollHeight <= sum.clientHeight + 2;
    (ev.for_yes || []).slice(0, 2).forEach(function (t) { pts.appendChild(el("li", { class: "pro" }, t)); });
    (ev.against_yes || []).slice(0, 2).forEach(function (t) { pts.appendChild(el("li", { class: "con" }, t)); });
    var extra = Math.max(0, (ev.for_yes || []).length - 2) + Math.max(0, (ev.against_yes || []).length - 2);
    var nNews = (f.news || []).length, nSrc = (ev.sources || []).length;
    all.hidden = !(ev.summary || nNews || nSrc);
    all.textContent = "See all evidence" + (extra ? " (+" + extra + " points)" : "") + ", " + nNews + " dated facts & " + nSrc + " sources →";
  }
  $("sumToggle").addEventListener("click", function () {
    var open = $("briefSum").classList.toggle("open");
    this.textContent = open ? "Show less" : "Read more";
  });
  $("critToggle").addEventListener("click", function () {
    var open = $("criteria").classList.toggle("open");
    this.textContent = open ? "Hide criteria" : "Show full criteria";
  });
  $("seeAll").addEventListener("click", function () {
    document.querySelector('[data-tabs="main"] button[data-tab="evidencePane"]').click();
    document.querySelector('[data-tabs="bottom"] button[data-tab="newsPane"]').click();
    document.querySelector(".chart").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ── trade impact simulator ──
  var SIZES = [100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000, 25000, 50000, 75000, 100000];
  var sim = { side: "buy", idx: 4 };
  function money(x) { return "$" + x.toLocaleString("en-US", { maximumFractionDigits: 0 }); }
  function pctTxt(x) { return x < 0.0001 ? "<0.01%" : (x * 100).toFixed(x < 0.01 ? 3 : 2) + "%"; }
  function sev(x) { return x < 0.005 ? "up" : x < 0.03 ? "" : "down"; }
  function renderSim(f) {
    var m = f && f.market && !f.market.error ? f.market : null, size = SIZES[sim.idx];
    $("simSizeVal").textContent = money(size);
    var ids = ["simFill", "simSlip", "simImpact", "simShare", "simOut"], warn = $("simWarn");
    if (!m || !m.liquidityUsd || !m.priceUsd) {
      ids.forEach(function (id) { $(id).textContent = "—"; $(id).className = ""; });
      warn.hidden = false; warn.className = "simWarn warn"; warn.textContent = f ? "No liquidity data for this token." : "Run a forecast to simulate a trade.";
      return;
    }
    // x*y=k with the quote side holding half the pool's USD liquidity.
    var Q = m.liquidityUsd / 2, r = size / Q, p = m.priceUsd, buy = sim.side === "buy";
    var fill = buy ? p * (1 + r) : p / (1 + r);
    var slip = buy ? r : 1 - 1 / (1 + r);
    var after = buy ? Math.pow(1 + r, 2) - 1 : 1 - 1 / Math.pow(1 + r, 2);
    $("simFill").textContent = fmtPrice(fill);
    $("simSlip").textContent = pctTxt(slip); $("simSlip").className = sev(slip);
    $("simImpact").textContent = (buy ? "+" : "−") + pctTxt(after); $("simImpact").className = sev(after);
    $("simShare").textContent = pctTxt(size / m.liquidityUsd); $("simShare").className = sev(size / m.liquidityUsd / 2);
    $("simOutLbl").textContent = buy ? "You receive ≈" : "You get back ≈";
    $("simOut").textContent = buy ? compactTok(size / fill) + " " + m.symbol : money(size * (1 - slip));
    if (slip >= 0.1) { warn.hidden = false; warn.className = "simWarn bad"; warn.textContent = "This order is " + pctTxt(size / m.liquidityUsd) + " of the pool and would move the price " + pctTxt(after) + "."; }
    else if (slip >= 0.02) { warn.hidden = false; warn.className = "simWarn warn"; warn.textContent = "Expect noticeable slippage at this size."; }
    else warn.hidden = true;
  }
  function compactTok(n) { return n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(2) + "K" : n >= 1 ? n.toFixed(2) : n.toPrecision(3); }
  $("simSize").addEventListener("input", function () { sim.idx = Number(this.value); renderSim(current()); });
  document.querySelectorAll("#simSide button").forEach(function (b) {
    b.addEventListener("click", function () {
      sim.side = b.getAttribute("data-side");
      document.querySelectorAll("#simSide button").forEach(function (o) { o.classList.toggle("on", o === b); });
      renderSim(current());
    });
  });

  // ── token card ──
  function addrCell(id, addr) {
    var host = $(id); clear(host);
    if (!addr) { host.textContent = "—"; return; }
    var w = el("span", { class: "addr" });
    w.appendChild(el("span", { class: "num", title: addr }, addr.slice(0, 6) + "…" + addr.slice(-4)));
    var b = el("button", { type: "button", class: "copy" }, "Copy");
    b.addEventListener("click", function () {
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done, function () { b.textContent = "Select"; });
      else b.textContent = "Select";
    });
    w.appendChild(b); host.appendChild(w);
  }
  function renderToken(f) {
    var t = f && f.token, m = f && f.market && !f.market.error ? f.market : null, s = f && f.security;
    $("tkName").textContent = t ? (t.name ? t.name + " (" + t.symbol + ")" : t.symbol) : "—";
    var addr = t && /^0x[0-9a-fA-F]{40}$/.test(t.address || "") ? t.address : null;
    addrCell("tkAddr", addr);
    $("tkHolders").textContent = s && s.holderCount ? s.holderCount.toLocaleString("en-US") : "—";
    $("tkPair").textContent = m ? m.symbol + "/" + m.quoteSymbol + " · " + m.dex : "—";
    addrCell("tkPairAddr", m && /^0x[0-9a-fA-F]{40}$/.test(m.pairAddress || "") ? m.pairAddress : null);
    var links = $("tkLinks"); clear(links);
    if (addr) {
      links.appendChild(link("https://bscscan.com/token/" + addr, "BscScan"));
      if (m && m.url) links.appendChild(link(m.url, "DexScreener"));
      links.appendChild(link("https://pancakeswap.finance/swap?chain=bsc&outputCurrency=" + addr, "PancakeSwap"));
    }
  }

  // ── bottom tables ──
  function renderBottom(f) {
    var list = state.list, hist = $("hist"); clear(hist);
    $("histEmpty").hidden = list.length > 0;
    $("histTab").textContent = "Forecasts (" + list.length + ")";
    list.forEach(function (h, i) {
      var tr = el("tr", { class: "pick" + (i === state.sel ? " sel" : ""), tabindex: "0", "aria-label": "Select forecast " + (i + 1), "aria-selected": String(i === state.sel) });
      tr.appendChild(el("td", { class: "num" }, (h.generated_at || "").replace("T", " ").slice(5, 16)));
      tr.appendChild(el("td", null, h.token ? h.token.symbol : "—"));
      tr.appendChild(el("td", { class: "wrap" }, h.question || h.request || ""));
      tr.appendChild(el("td", { class: "num" }, h.forecast ? Math.round(h.forecast.p_yes * 100) + "%" : "—"));
      var td = el("td"), sc = h.risk && h.risk.score !== null && h.risk.score !== undefined ? h.risk.score : null;
      td.appendChild(tag(sc === null ? "—" : String(sc), sc === null ? "na" : sc < 30 ? "low" : sc < 60 ? "medium" : "high")); tr.appendChild(td);
      tr.appendChild(el("td", { class: "muted" }, h.token && h.token.match ? MATCH[h.token.match] || h.token.match : "—"));
      tr.addEventListener("click", function () { state.sel = i; state.pinned = i !== 0; render(); });
      tr.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); tr.click(); } });
      hist.appendChild(tr);
    });
    var news = $("news"); clear(news);
    ((f && f.news) || []).forEach(function (n) { var tr = el("tr"); tr.appendChild(el("td", { class: "num" }, n.date)); tr.appendChild(el("td", { class: "wrap" }, n.text)); news.appendChild(tr); });
    if (!f || !(f.news || []).length) { var tr0 = el("tr"); tr0.appendChild(el("td", { colspan: "2", class: "muted" }, "No news")); news.appendChild(tr0); }
    var src = $("sources"); clear(src);
    var ev = (f && f.evidence) || {};
    (ev.sources || []).forEach(function (u, i) { var tr = el("tr"); tr.appendChild(el("td", { class: "num muted" }, i + 1)); var td = el("td", { class: "wrap" }); td.appendChild(link(u)); tr.appendChild(td); src.appendChild(tr); });
    $("summary").textContent = ev.summary || ev.error || "No evidence";
    [["forYes", ev.for_yes], ["againstYes", ev.against_yes]].forEach(function (pr) {
      var ul = $(pr[0]); clear(ul); (pr[1] || []).forEach(function (t) { ul.appendChild(el("li", null, t)); });
    });
  }

  function render() {
    var f = current();
    $("count").textContent = state.list.length;
    renderTop(f); renderBook(f); renderTicket(f); renderSim(f); renderToken(f); renderBottom(f); renderChart(f);
  }

  function msg(text, err) { $("msg").textContent = text || ""; $("msg").className = "msg" + (err ? " err" : ""); }

  function load() {
    return fetch("api/forecasts").then(function (r) { if (!r.ok) throw new Error("Forecast service unavailable"); return r.json(); }).then(function (d) {
      var prev = state.list.length;
      state.list = d.forecasts || [];
      if (state.pinned && state.list.length > prev) state.sel += state.list.length - prev;
      if (!state.pinned) state.sel = 0;
      $("online").textContent = "Online"; $("online").className = "online";
      render();
    }).catch(function () { $("online").textContent = "Offline"; $("online").className = "tag bad"; msg("Connection unavailable. Showing the last received data; retrying every 15 seconds.", true); });
  }

  function status() {
    return fetch("api/status").then(function (r) { if (!r.ok) throw new Error("Status unavailable"); return r.json(); }).then(function (s) {
      $("net").textContent = s.network; $("stNet").textContent = s.network;
      $("wallet").textContent = s.wallet ? s.wallet.slice(0, 6) + "…" + s.wallet.slice(-4) : "—";
      state.demo = !!s.demo;
      setAskEnabled(s.demo);
      if (s.demo) msg("Demo mode · runs without payment · " + s.demo_left + " runs left · ~10 s each, repeats ~1 s");
      else msg("Live seller: buy a forecast over A2A (ERC-8183 job) or pay per request at /x402 — the result appears here.");
    }).catch(function () { state.demo = false; setAskEnabled(false); msg("Cannot reach the agent. Check the connection and refresh to try again.", true); });
  }

  var busy = false;
  function setAskEnabled(on) {
    var off = !on || busy;
    $("req").disabled = !on; $("go").disabled = off;
    document.querySelectorAll("#chips button").forEach(function (b) { b.disabled = off; });
    $("go").textContent = busy ? "Analyzing…" : "Analyze";
  }
  document.querySelectorAll("#chips button").forEach(function (b) {
    b.addEventListener("click", function () { $("req").value = b.getAttribute("data-q"); analyze(); });
  });
  function analyze() {
    if (!state.demo || busy) return;
    var q = $("req").value.trim();
    if (!q) { $("req").focus(); return; }
    busy = true; setAskEnabled(true);
    var t0 = Date.now();
    var timer = setInterval(function () { msg("Analyzing… web research → on-chain data → Jev (" + Math.round((Date.now() - t0) / 1000) + "s)"); }, 500);
    fetch("api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: q }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        clearInterval(timer);
        if (!res.ok) { msg(res.d.error || "Failed", true); return; }
        state.pinned = false; $("req").value = "";
        var took = ((Date.now() - t0) / 1000).toFixed(1);
        var note = res.d.research_cached ? " · research reused (asked in the last 30 min)" : "";
        return load().then(status).then(function () { msg("Done in " + took + "s" + note + " · " + $("msg").textContent); });
      })
      .catch(function (err) { clearInterval(timer); msg(String(err), true); })
      .then(function () { busy = false; setAskEnabled(state.demo); });
  }
  $("demo").addEventListener("submit", function (e) { e.preventDefault(); analyze(); });

  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { renderChart(current()); }, 120); });

  setAskEnabled(false); render(); status(); load();
  setInterval(load, 15000);
})();
</script>
<script>${DASHBOARD_LOCALE}</script>
</body>
</html>`;
