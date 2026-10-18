/** UI-only preview: no wallet, API key, paid request, or agent runtime needed. */
import express from "express";
import { DASHBOARD_PAGE } from "../src/dashboardPage.js";

const app = express();
app.get("/", (_req, res) => res.redirect("/dashboard/"));
app.get("/dashboard/", (_req, res) => {
  res.set("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'")
    .type("html").send(DASHBOARD_PAGE);
});
app.get("/dashboard/api/status", (_req, res) => res.json({ network: "UI preview · no live agent", wallet: "", demo: false, forecasts: 0 }));
app.get("/dashboard/api/forecasts", (_req, res) => res.json({ forecasts: [] }));
app.listen(4173, "127.0.0.1", () => console.log("Dashboard preview: http://127.0.0.1:4173/dashboard/"));
