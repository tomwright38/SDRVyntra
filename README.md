# Vyntra Account Desk — free manual edition

A personal bank research and call-preparation workspace. **No subscriptions, search keys or AI keys are needed.** The HTTP app makes no search or model calls, even if keys exist in its environment. It organises facts you paste and uses fixed templates; it does not automatically research or verify banks.

## Using it

1. Enter the bank, geography, offering and target persona.
2. Find a public bank publication, annual report, regulatory announcement or news article yourself. Click **Add source** and paste its title, link and short factual excerpt. Add a publication date only if known. Choose **Background** for an account overview or **Development** for a possible conversation topic. Up to eight sources are retained; up to five developments appear in the brief.
3. Click **Build my brief**. Review the source material, possible relevance, questions, opener and outreach. Everything pasted is labelled user-supplied and unverified. No named contact is represented as verified. An initiative is never treated as proof of a problem.
4. Save notes, search saved accounts, copy text or export Markdown. Select a saved account to edit its source cards, then **Rebuild brief**. The rebuild uses the original account details and edited sources/notes; submit the main form to create a separate account with changed bank/persona details.
5. Use **Vyntra knowledge** as your approved reference material. Free-mode templates do not automatically insert capability, integration, differentiator or customer-result claims. Personalise drafts yourself using only approved information.

With no sources supplied, the app produces a generic discovery plan and explicitly states that no account facts or reason to engage have been established. Old fictional demo briefs remain marked as fictional. The former optional live-provider module remains in the source for future extension and contract tests, but is not connected to the server workflow.

## Keep your work safe on free Render hosting

Render's free filesystem can be reset during restarts and deployments. **Click Download backup after each working session**, and before an update. It downloads all saved accounts, notes, source material and knowledge settings as a private JSON file. Keep this file on your computer; it contains your research and notes, but no server login or API credentials.

If saved data disappears, click **Restore backup** and select that file. Restore adds missing accounts, keeps existing accounts unchanged, and replaces approved knowledge with the backed-up version. A confirmation explains this before upload. Invalid backups change nothing. Maximum backup size is 5 MB; maximum 1,000 accounts per restore. Markdown exports are readable briefs, not restorable backups.

The database survives normal application restarts on persistent local storage. Render free hosting does **not** guarantee that filesystem survival. Local running is an alternative if you want durable storage without a paid hosting disk.

## Run locally

Requires Node.js 24 (pinned in `.node-version`). No npm runtime dependencies.

```sh
npm ci
cp .env.example .env
npm start
```

The server listens on port 3000 by default. `npm run dev` watches for source changes. `npm test` runs isolated integration tests for persistence, templates, citations, backup/restore, login protection and provider failure contracts. No paid provider calls occur during tests.

SQLite lives at `data/vyntra.sqlite`; override with `DATABASE_PATH`. Preserve this directory. Use the in-app backup for portable exports, or SQLite backup tools for database backups. Do not copy an active SQLite database without its required WAL state.

## Render

Choose **Node**, leave Root Directory empty, build with `npm ci`, start with `npm start`. The repository pins Node 24.19.0. Set a private `APP_USERNAME` and long unique `APP_PASSWORD` under Environment. Render/production refuses access until both are set. Your browser asks for the shared login. There are no separate users or automatic sending features. Browsers can remember the login until closed; there is no explicit logout button. Use HTTPS and keep the service access-controlled.

Keep the **Free** compute plan to avoid hosting charges; it can sleep after inactivity and does not provide a persistent disk. Use downloadable backups as above. Do not add OpenAI or Tavily keys for this edition: they are unused.

## Research and privacy limitations

Pasted excerpts, dates, links and personal notes are untrusted data. They are displayed as text, never executed or used as instructions. URLs are validated but not fetched. You are responsible for selecting authoritative sources and checking that excerpts, dates, account identity and relevance are correct. Call and outreach use general templates based on the first supplied development's title and selected offering, not semantic understanding of the full source material. No product fit or urgency is verified. Review and personalise before contacting anyone.

All research is processed on your app server and saved in its SQLite database. Backup files contain notes and approved knowledge, so keep them private. API keys and passwords are never included by the backup endpoint. Avoid pasting credentials into notes or source fields.

`src/manual.js` builds free templates; `storage.js` handles SQLite; `export.js` handles Markdown; `auth.js` handles the shared login; `server.js` serves the UI and API; `public/` contains the interface.
