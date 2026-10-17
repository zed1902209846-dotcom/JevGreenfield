/**
 * /dashboard — a read-only view of recent forecasts: Jev's call, the trade
 * risk gauge, market + security data and the dated news the call was based on.
 *
 * Forecasts are kept in process memory (lost on restart / scale-to-zero).
 * The page is public wherever the agent is reachable and shows buyers'
 * questions — set DASHBOARD_ENABLED=0 to turn it off.
 *
 * DASHBOARD_DEMO=1 adds a query box that runs the oracle WITHOUT payment, for
 * local demos only. It is capped (DASHBOARD_DEMO_MAX, default 20 per process)
 * because every run spends OpenRouter credits. Never enable it on a public deploy.
 */

import express, { type Router } from "express";
import { DASHBOARD_PAGE } from "./dashboardPage.js";

const MAX_KEPT = 50;
const forecasts: Record<string, unknown>[] = [];

export function recordForecast(f: Record<string, unknown>): void {
  forecasts.unshift(f);
  if (forecasts.length > MAX_KEPT) forecasts.length = MAX_KEPT;
}

export function dashboardEnabled(): boolean {
  return process.env.DASHBOARD_ENABLED !== "0";
}

export function createDashboardRouter(opts: {
  walletAddress: string;
  network: string;
  analyze: (request: string, abortSignal?: AbortSignal) => Promise<Record<string, unknown>>;
}): Router {
  const demo = process.env.DASHBOARD_DEMO === "1";
  const demoMax = Number(process.env.DASHBOARD_DEMO_MAX ?? 20);
  let demoRuns = 0;
  let demoBusy = false;

  const router = express.Router();

  router.get("/", (req, res) => {
    // The page fetches relative `api/...` URLs, which only resolve under a trailing slash.
    const [path, query] = req.originalUrl.split("?", 2);
    if (!path!.endsWith("/")) {
      res.redirect(301, `${path}/${query ? `?${query}` : ""}`);
      return;
    }
    res
      .set("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'")
      .type("html")
      .send(DASHBOARD_PAGE);
  });

  router.get("/api/status", (_req, res) => {
    res.json({
      wallet: opts.walletAddress,
      network: opts.network,
      demo,
      demo_left: demo ? Math.max(0, demoMax - demoRuns) : 0,
      forecasts: forecasts.length,
    });
  });

  router.get("/api/forecasts", (_req, res) => {
    res.json({ forecasts });
  });

  router.post("/api/analyze", express.json({ limit: "8kb" }), async (req, res) => {
    if (!demo) {
      res.status(403).json({ error: "demo mode is off; buy a forecast via A2A or /x402" });
      return;
    }
    const request = String((req.body ?? {}).request ?? "").trim().slice(0, 500);
    if (!request) {
      res.status(400).json({ error: "request is required" });
      return;
    }
    if (demoRuns >= demoMax) {
      res.status(429).json({ error: `demo limit of ${demoMax} runs reached` });
      return;
    }
    if (demoBusy) {
      res.status(429).json({ error: "another demo run is in progress" });
      return;
    }
    demoBusy = true;
    demoRuns += 1;
    try {
      res.json(await opts.analyze(request, AbortSignal.timeout(150_000)));
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      demoBusy = false;
    }
  });

  return router;
}
