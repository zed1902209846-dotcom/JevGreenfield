/** Exact UI-copy localization. Research, user requests and source content stay verbatim. */
export const DASHBOARD_LOCALE = String.raw`
(function () {
  "use strict";
  var dictionary = {
    "Skip to analysis":"跳转至风险分析","Main navigation":"主导航","Risk analysis":"风险分析","Forecast history":"预测记录",
    "Switch language":"切换语言","See the risk before you trade.":"交易之前，先看清风险。",
    "Run a forecast to see the chart":"完成一次预测后，即可查看价格走势","No price history for this pair":"此交易对暂无历史价格","Not a token question — no chart":"此问题不涉及具体代币，暂无图表",
    "UI preview · no live agent":"界面预览 · 未连接实时智能体","Hourly candles over 7 days":"过去 7 天的每小时蜡烛图","Risk index gauge":"风险指数色阶","YES":"是",
    "Research, contract security and market data. One clearer view of your next BNB Chain trade.":"结合研究证据、合约安全与市场数据，看清下一笔 BNB Chain 交易的风险。",
    "Token name or 0x… contract address":"输入代币名称或 0x… 合约地址","Token name or contract address":"代币名称或合约地址",
    "BNB Chain market overview":"BNB Chain 市场概览","Analyze":"分析风险","Analyzing…":"正在分析…","Try:":"试试看：",
    "Is Bitcoin risky to buy?":"买入 Bitcoin 风险高吗？","Is CAKE a risky buy right now?":"现在买入 CAKE 风险高吗？",
    "Copycat “BTC” contract":"仿冒 BTC 合约","Micro-cap FOMOON":"小市值 FOMOON","Will BNB be above $800 on Nov 1?":"11 月 1 日 BNB 会超过 $800 吗？",
    "Risk overview":"风险概览","Risk at a glance":"风险概览","LOW RISK":"低风险","MEDIUM RISK":"中等风险","HIGH RISK":"高风险","NO DATA":"暂无数据",
    "0 = low risk · 100 = high risk":"0 = 低风险 · 100 = 高风险","Lower risk does not mean the price will rise.":"低风险不代表价格一定上涨。",
    "Forecast P(YES)":"问题成立的预测概率","Select a forecast to see its question and probability.":"选择一条预测，查看具体问题与概率。",
    "DEX price":"DEX 价格","Market (CoinGecko)":"市场参考价 (CoinGecko)","24h change":"24 小时涨跌","24h volume":"24 小时成交量",
    "Liquidity":"流动性","Market cap / FDV":"市值 / 完全稀释估值","Pair age":"交易对年龄","Chart":"价格走势","Evidence":"研究证据",
    "For YES":"支持问题成立","Against YES":"反对问题成立","Risk book":"风险分项","Security":"合约安全","Factor":"风险因素","Risk":"风险","Weight":"权重",
    "Risk index":"风险指数","Hover a factor for the reading behind it.":"悬停或聚焦风险因素，查看具体依据。","No risk data":"暂无风险数据",
    "No security data":"暂无合约安全数据","No forecast selected":"尚未选择预测","Show full criteria":"展开判定标准","Hide criteria":"收起判定标准",
    "Jev's probability for the question above — not a buy/sell signal":"Jev 对上述问题的预测概率，不代表买卖信号",
    "Research brief":"研究摘要","Run a forecast to see the evidence behind it.":"完成一次预测后，即可查看研究证据。","Read more":"展开全文","Show less":"收起",
    "Answerable":"证据充分度","Clarity":"问题清晰度","Reliability":"可信度","Deadline":"判定日期","7d change":"7 天涨跌","Cost of forecast":"预测成本",
    "Trade impact simulator":"交易影响模拟","estimate · not advice":"仅为估算，不构成建议","Buy":"买入","Sell":"卖出","Order size in USD":"订单金额（美元）",
    "Est. avg fill":"预计成交均价","Slippage vs mid":"相对中间价滑点","Price after trade":"交易后价格变化","Share of pool":"占流动池比例",
    "You receive ≈":"预计收到 ≈","You get back ≈":"预计收回 ≈","Run a forecast to simulate a trade.":"完成预测后可模拟交易影响。",
    "No liquidity data for this token.":"该代币暂无流动性数据。","Expect noticeable slippage at this size.":"此订单金额可能产生明显滑点。",
    "Constant-product (V2) math on the top pair's liquidity, excluding pool fees. V3 pools concentrate liquidity, so real impact may be lower.":"基于主要交易对流动性与恒定乘积（V2）模型，不含池手续费。V3 采用集中流动性，实际影响可能更低。",
    "Token":"代币","market data · BSC mainnet":"市场数据 · BSC 主网","Name":"名称","Contract":"合约","Holders":"持币地址数","Top pair":"主要交易对","Pair contract":"交易对合约",
    "Seller":"服务提供方","Wallet":"钱包","Network":"网络","Forecasts served":"已生成预测","Payment":"支付方式","Research model":"研究模型",
    "Forecasts":"预测记录","News":"新闻","Sources":"数据来源","Probabilities by Jev · risk is rule-based · not financial advice":"概率由 Jev 预测 · 风险采用确定性规则 · 不构成投资建议",
    "Time (UTC)":"时间 (UTC)","Question":"预测问题","P(YES)":"成立概率","Identified by":"识别方式","No forecasts yet. Paid orders over A2A / x402 appear here.":"暂无预测。通过 A2A / x402 购买的预测将在此显示。",
    "Date":"日期","What happened":"事件","Source":"来源","Online":"已连接","Offline":"连接中断","This agent never trades on your behalf":"本智能体不会替你执行交易",
    "No news":"暂无新闻","No evidence":"暂无研究证据","No token":"未识别代币","Not listed":"未收录","Reliable":"较可信","Low confidence":"低置信度",
    "Your contract":"指定合约","Official contract":"官方合约","Official":"官方","Unverified addr":"未验证地址","Unverified ticker":"未验证简称","Unverified":"未验证",
    "Price up":"价格上涨","Not up":"未上涨","Above":"高于目标","Not above":"未高于目标","Falls below":"低于目标","Stays above":"保持目标之上",
    "Honeypot":"貔貅盘","Source code":"源代码","Mintable":"可增发","Hidden owner":"隐藏所有者","Owner can edit balances":"所有者可修改余额","Upgradeable proxy":"可升级代理",
    "Buy / sell tax":"买入 / 卖出税","Top-10 holders":"前十大持币者","GoPlus trust list":"GoPlus 信任名单","Verified":"已验证","Listed":"已收录","unknown":"未知","Yes":"是","No":"否",
    "Copy":"复制","Copied":"已复制","Select":"手动选择","Contract security":"合约安全","Volatility":"波动性","Holder concentration":"持币集中度","Sell pressure":"卖出压力","Token age":"代币年龄","Information":"信息充分度","Market listing":"市场收录","Price deviation":"价格偏离",
    "No research brief.":"暂无研究摘要。","Not forecastable.":"当前无法进行预测。","Failed":"分析失败，请重试",
    "Live seller: buy a forecast over A2A (ERC-8183 job) or pay per request at /x402 — the result appears here.":"通过 A2A（ERC-8183 任务）或 /x402 按次购买预测，结果将在此显示。",
    "Connection unavailable. Showing the last received data; retrying every 15 seconds.":"连接暂不可用。当前显示上次收到的数据，每 15 秒自动重试。",
    "Cannot reach the agent. Check the connection and refresh to try again.":"无法连接智能体。请检查连接后刷新重试。"
  };
  var lang = "zh";
  try { lang = localStorage.getItem("jev-language") || (navigator.language.indexOf("zh") === 0 ? "zh" : "en"); } catch (_) {}
  var originals = new WeakMap();
  var excluded = "script,style,#question,#overviewQuestion,#criteria,#briefSum,#briefPoints,#summary,#forYes,#againstYes,#news,#sources,#crit,#detail,td.wrap,#tkName";
  // These empty-state literals are owned by the UI, even inside content containers.
  var emptyCopy = /^(No forecast selected|Select a forecast to see its question and probability\.|Run a forecast to see the evidence behind it\.|No evidence|No news|No research brief\.|Not forecastable\.|No risk data|Hover a factor for the reading behind it\.)$/;
  function translate(s) {
    if (lang !== "zh") return s;
    if (Object.prototype.hasOwnProperty.call(dictionary, s)) return dictionary[s];
    return s.replace(/^Forecasts \((\d+)\)$/, "预测记录 ($1)")
      .replace(/^RISK (\d+) · (LOW|MEDIUM|HIGH) RISK$/, function (_, n, level) { return "风险 " + n + " · " + ({LOW:"低风险",MEDIUM:"中等风险",HIGH:"高风险"})[level]; })
      .replace(/^(YES|NO) (.*)$/, function (_, side, value) { return (side === "YES" ? "成立 " : "不成立 ") + value; })
      .replace(/^coverage (\d+)%$/, "覆盖率 $1%")
      .replace(/^data coverage (\d+)% · 0 low → 100 high$/, "数据覆盖率 $1% · 0 低 → 100 高")
      .replace(/^(\d+) days$/, "$1 天")
      .replace(/^Demo mode · runs without payment · (\d+) runs left · ~10 s each, repeats ~1 s$/, "演示模式 · 无需支付 · 剩余 $1 次 · 每次约 10 秒，重复约 1 秒")
      .replace(/^Analyzing… web research → on-chain data → Jev \((\d+)s\)$/, "正在分析… 网络研究 → 链上数据 → Jev（$1 秒）")
      .replace(/^See all evidence(?: \(\+(\d+) points\))?, (\d+) dated facts & (\d+) sources →$/, "查看全部证据 · $2 条事件 · $3 个来源 →")
      .replace(/^as of (.*)$/, "截至 $1")
      .replace(/^(\d+) · (LOW|MEDIUM|HIGH)$/, function (_, n, level) { return n + " · " + ({LOW:"低",MEDIUM:"中",HIGH:"高"})[level]; });
  }
  function apply() {
    observer.disconnect();
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var node = walker.currentNode, text = node.nodeValue, previous = originals.get(node);
      var source = previous && text === previous.output ? previous.source : text;
      if (!source.trim() || !node.parentElement || node.parentElement.closest("script,style")) continue;
      if (node.parentElement.closest(excluded) && !emptyCopy.test(source.trim())) continue;
      var output = source.replace(source.trim(), translate(source.trim()));
      originals.set(node, { source:source, output:output });
      if (text !== output) node.nodeValue = output;
    }
    document.querySelectorAll("[placeholder],[aria-label]").forEach(function (element) {
      ["placeholder","aria-label"].forEach(function (attr) {
        var value = element.getAttribute(attr); if (!value) return;
        var key = "data-locale-" + attr, source = element.getAttribute(key) || value;
        if (dictionary[source]) { element.setAttribute(key, source); element.setAttribute(attr, translate(source)); }
      });
    });
    document.getElementById("language").textContent = lang === "zh" ? "EN / 中文" : "中文 / EN";
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
  }
  var observer = new MutationObserver(apply);
  document.getElementById("language").addEventListener("click", function () {
    lang = lang === "zh" ? "en" : "zh";
    try { localStorage.setItem("jev-language", lang); } catch (_) {}
    apply();
  });
  apply();
})();
`;
