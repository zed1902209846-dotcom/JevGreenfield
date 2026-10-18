/** Risk-first responsive theme; inlined with the page for the existing CSP. */
export const DASHBOARD_STYLE = String.raw`
:root {
  --bg:#edf3f4; --panel:#fff; --panel2:#e8f0f2; --line:#d4e0e3; --line2:#a7bdc4;
  --text:#173f50; --muted:#506974; --dim:#536c76; --accent:#007779; --accentInk:#fff;
  --up:#187563; --down:#b33d30; --warn:#916000;
  --upWash:rgba(24,117,99,.09); --downWash:rgba(179,61,48,.09); color-scheme:light;
}
body { font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif; }
::selection { background:#badfdf; color:#173f50; }
* { scrollbar-width:thin; scrollbar-color:var(--line2) transparent; }
:focus-visible { outline:2px solid var(--accent); outline-offset:4px; }
input { caret-color:var(--accent); }
a { text-underline-offset:4px; }
.app { min-height:0; display:grid; gap:28px; max-width:1536px; margin:auto; padding:36px 48px 0;
  background:transparent; grid-template-columns:340px minmax(0,1fr); grid-template-rows:none;
  grid-template-areas:"ask ask" "top top" "overview chart" "book side" "bottom bottom" "status status"; }
.masthead { background:#173f50; color:white; }
.mastinner { max-width:1536px; margin:auto; padding:20px 48px; display:flex; align-items:center; gap:36px; }
.brand { display:flex; align-items:baseline; gap:14px; color:white; text-decoration:none; }
.brand b { font-size:32px; line-height:1; letter-spacing:-.04em; }
.brand span { font-size:14px; color:#c3d7df; }
.mastinner nav { display:flex; gap:24px; margin-left:auto; }
.mastinner nav a { color:#e3eef2; text-decoration:none; }
.mastinner nav a:hover { text-decoration:underline; }
.language { min-height:40px; padding:6px 14px; background:transparent; border:1px solid #819fae; color:white; border-radius:5px; cursor:pointer; }
.masthead :focus-visible { outline-color:#8cd4cf; }
.app > .askbar { background:transparent; padding:0; margin:0; }
.askbar h1 { font-size:clamp(26px,2.5vw,36px); line-height:1.3; margin:0 0 10px; font-weight:650; letter-spacing:-.025em; }
.intro { color:var(--muted); margin:0 0 26px; max-width:75ch; }
.askfield { background:white; border:1px solid var(--line2); border-radius:6px; padding:0 18px; box-shadow:none; }
.askfield:focus-within { box-shadow:none; outline:2px solid var(--accent); outline-offset:2px; }
.askfield svg { width:20px; height:20px; flex:none; }
.cta { border-radius:6px; padding:0 30px; font-weight:600; }
.chips button { min-height:32px; }
.app > .top { border-block:1px solid var(--line); padding:18px 0; background:transparent; gap:12px 28px; }
.pair { flex-basis:100%; }
.pair h2 { font-size:18px; margin:0; }
.tabs { gap:24px; padding:0 22px; }
.tabs button { min-height:48px; font-weight:600; }
.chart { height:auto; min-height:410px; }
.chartNote { padding:28px; text-align:center; }
.app > .overview { grid-area:overview; background:#173f50; color:#fff; padding:26px; }
.overview h2 { font-size:18px; font-weight:600; margin:0 0 20px; }
.overview .gauge { padding:0; align-items:stretch; }
.overview .gauge svg { max-width:none; }
.overview .gaugeLvl { margin-top:8px; font-size:18px; letter-spacing:0; }
.overview .gaugeSub { color:#c3d7df; margin-top:6px; font-size:12px; }
.riskNote { color:#c3d7df; font-size:12px; margin:14px 0 22px; overflow-wrap:anywhere; }
.outlook { padding-top:18px; border-top:1px solid #496878; display:flex; justify-content:space-between; align-items:center; gap:12px; }
.outlook strong { font-size:28px; font-variant-numeric:tabular-nums; }
.overview .crit { padding:12px 0 0; }
.overview .crit li { background:#573d3d; color:#ffe1dc; }
.crit li::before { content:none; }
.book { align-self:start; min-height:0; }
.bookHead,.row { padding-inline:20px; }
.row { height:36px; }
.detail { font-size:12px; padding:16px 20px; position:static; }
.side { height:auto; min-height:0; overflow:visible; padding:24px; display:grid; grid-template-columns:1fr 1fr; gap:20px 28px; align-content:start; }
.side > .pills,.side > .probNote,.side > .probBar { grid-column:1 / -1; }
.side > * { min-width:0; }
.side > .kv { align-self:start; }
.brief { background:transparent; border:0; border-radius:0; padding:0; grid-column:1 / -1; }
.brief h4 { font-size:16px; }
.brief .sum { font-size:14px; }
.brief li { font-size:13px; }
.section { padding-top:18px; }
.section h4 { font-size:14px; flex-wrap:wrap; }
.more,.seeAll,.copy { min-height:32px; }
.seg button.on.buy { background:var(--up); color:white; }
.seg button.on.sell { background:var(--down); color:white; }
.app > .status { background:transparent; border-top:1px solid var(--line); padding:18px 0; }
.bottom .tabs { flex-wrap:wrap; gap:0 24px; }
.bottom .tabs .hint { white-space:normal; padding-bottom:10px; }
.empty { padding:32px 22px; }
.skip { position:absolute; left:12px; top:-80px; padding:10px; background:white; color:var(--text); z-index:5; }
.skip:focus { top:10px; }
@media (max-width:1180px) { .app { padding:28px; grid-template-columns:300px minmax(0,1fr); gap:22px; } }
@media (max-width:1000px) { .side { grid-template-columns:1fr; } .mastinner { padding-inline:28px; } }
@media (max-width:720px) {
  .app { padding:22px 16px 0; gap:20px; grid-template-columns:minmax(0,1fr);
    grid-template-areas:"ask" "top" "overview" "chart" "book" "side" "bottom" "status"; }
  .mastinner { padding:18px 16px; gap:12px; flex-wrap:wrap; }
  .brand { gap:10px; } .brand b { font-size:28px; }
  .mastinner nav { order:3; width:100%; margin:0; }
  .language { margin-left:auto; }
  .top { gap:16px 24px; } .stat { flex:1 0 40%; }
  .side { padding:20px; } .chart { height:390px; min-height:390px; }
  .overview { min-height:360px; } .overview .gauge svg { max-width:320px; }
  .intro { margin-bottom:20px; } .askfield input { font-size:16px; }
  .cta { padding:14px 24px; }
  .status .grow,.bottom .tabs .grow { display:none; }
  .bottom .tabs .hint { flex-basis:100%; }
}
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior:auto !important; transition:none !important; } }
`;
