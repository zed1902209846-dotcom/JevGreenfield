# Jev Risk Oracle

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
BNB Chain token traders who want to judge trade risk quickly before making their own decision. Confirmed for this redesign: prioritize understandable conclusions and support Chinese and English.

## Product Purpose
Combine sourced research, live token market and contract data, Jev probabilities, and a deterministic 0–100 trade risk index in a dashboard.

## Capabilities and Constraints
Preserve existing forecast selection, token queries, price history, risk factors, research evidence, source links, and trade-impact simulation. The agent sells information and never trades. Demo forecasts require server-side demo mode; production payment flows remain server-owned. Forecast history is process-local. Render untrusted data with textContent and preserve the existing CSP. No fabricated live forecasts or commercial claims.

## Stack
Existing TypeScript agent; a self-contained HTML/CSS/JavaScript dashboard exported from src/dashboardPage.ts and served by src/dashboard.ts.

## Evidence on Hand
README.md describes the pipeline and risk components. src/dashboardPage.ts implements the incumbent terminal-style dashboard. docs/dashboard.png is the committed dashboard screenshot.

## Brand Commitments
Jev Risk Oracle name. User confirmed a redesign of /dashboard with Chinese/English switching.
