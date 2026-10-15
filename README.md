# Vyntra Account Desk

A single-user research and call-preparation workspace for bank SDR conversations. Node.js 24+, built-in SQLite, and a lightweight browser interface. No runtime npm dependencies.

## Run

```sh
cd /workspace/SDRVyntra
npm ci
cp .env.example .env
npm start
```

Open port 3000 in your development environment. `npm run dev` restarts the server on code changes. `npm test` runs integration and provider-contract tests using isolated temporary databases.

The app works immediately in **fictional demo mode**. Demo output always describes the invented Meridian Example Bank, regardless of the account entered; it is never presented as research about a real bank.

## Enable live research

Set both `TAVILY_API_KEY` (Tavily Search API) and `OPENAI_API_KEY` (OpenAI API with access to the configured model) in the server environment or local `.env`, then restart the server. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Credentials stay on the server; `.env` is ignored by Git. Do not paste keys into knowledge settings or notes. Allow outbound HTTPS to `api.tavily.com` and `api.openai.com`.

The status badge reports whether credentials are configured, not whether their account has usable quota. A provider error shows an explicit error and preserves the existing saved brief. Missing either key deliberately selects demo mode; invalid configured keys never silently fall back to demo.

Before using research for outreach, populate **Vyntra knowledge** with internally approved product information, differentiators, examples, qualification criteria and prohibited claims. Initial content contains only the broad offering supplied; missing product details are marked. Saved knowledge affects new research and refreshes, not old briefs.

## Daily workflow

Enter bank, geography, offering and persona, optionally website, contact and notes. Research saves the account and brief automatically. Use saved-account search, save editable notes, refresh the selected account, copy opener/email/LinkedIn drafts, or download a complete Markdown brief with citations, source excerpts, timestamps, limitations and notes. A new submission creates a separate account; Refresh updates the selected account. Source labels jump to the source library; expand a source to inspect its excerpt and original link.

## Storage and deployment

SQLite lives at `data/vyntra.sqlite` by default (`DATABASE_PATH` overrides it). Accounts, notes and approved knowledge survive restarts. Preserve the data directory on a persistent volume. For a consistent backup use SQLite's backup tooling or stop the app before copying the database and its WAL files. Keep account notes and generated briefs confidential.

This version has a single shared login using browser HTTP Basic authentication, with no separate user accounts, CRM or sending integration. Set APP_USERNAME and APP_PASSWORD privately. Render/production refuses access until both are set. Use a long unique password. Browsers may remember it until closed; there is no separate logout button. It binds to `0.0.0.0` for development environments. Use only in a private, access-controlled workspace; set the shared login before exposing it to the public internet. TLS and access control belong at the hosting proxy. Live research sends account inputs, pasted notes and approved knowledge to the model provider, and bank/persona queries to the search provider: use information permitted by your organisation's policy.

## Research boundaries

- Three live searches cover account background, relevant initiatives, and the requested person/function. Official material is prioritised through synthesis instructions. Coverage is not exhaustive.
- Evidence consists of **search-provider excerpts**, not independently fetched or fully verified pages. Source URLs and excerpts come from search results, never from model-invented URLs. Publication dates can be unknown; older background is labelled separately.
- The model must cite evidence for factual sections, ground call/outreach statements in those sections, distinguish hypotheses, avoid invented urgency and verify named roles. Programmatic validation rejects missing/unknown citations in factual sections, malformed responses and oversized outreach. It cannot prove semantic entailment, source freshness or a person's current employment. Review original sources before using claims. Call and outreach include section-level citations for their account-specific statements.
- Retrieved content and pasted context are delimited as untrusted data in model instructions; the model has no tools, credentials, database access or sending capabilities. Prompt injection and factual errors cannot be eliminated by instructions alone.
- Weak evidence should produce explicit limitations and no invented developments. No usable sources is an error. Live provider behaviour has contract tests with mock responses; real end-to-end live output requires valid credentials and quota.
- Single process, small personal workload; no background jobs. Search calls have a 60-second timeout and synthesis a separate 60-second timeout. Keep the page open while research runs. Copy requires browser clipboard support/secure context; manual text selection remains available.

## Structure

`src/storage.js`: SQLite persistence and knowledge defaults. `src/research.js`: provider calls, evidence and validation. `src/demo.js`: fictional fixtures. `src/export.js`: Markdown export. `src/server.js`: HTTP API/static serving. `public/`: responsive interface. `test/`: integration tests including persistence and failure handling.

## Render setup

Connect this GitHub repository and choose Node. Leave Root Directory empty. Build command: `npm ci`; start command: `npm start`. Set `NODE_VERSION` to `24.19.0`. Under Environment, privately add `APP_USERNAME` and a long unique `APP_PASSWORD`. No app data is accessible on Render until these are configured; the browser asks you to sign in. Do not share credentials in chat. API keys are optional for the fictional demo.

Render free services have ephemeral storage: saved accounts may disappear on restart or deployment. For daily use, choose a plan supporting a persistent disk, mount it at `/var/data`, and set `DATABASE_PATH=/var/data/vyntra.sqlite`. Confirm Render’s displayed costs before buying. Use one service instance with this SQLite setup. The app has no separate public health endpoint: an unauthenticated request intentionally receives 401 once login is configured.
