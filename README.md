# First to know — News Tracker + Client Profiling

MVP for the [Sherpas challenge at CDTM Valencia Hacks 2026](CHALLENGE.md): keep every family feeling personally watched — via **news → personalized drafts** and a **client profile** fed by meetings and simulated professional signals.

**Never auto-sends.** Drafts stay in the advisor inbox until Approve / Dismiss.

## What we built

| Piece | What it does |
|---|---|
| **Client profiles** | Household, persona (decision style, risk, concerns), plan hooks, advisor notes. |
| **Simulated LinkedIn** | Per-family professional card + activity (employer concentration, career signals). **Not scraped** — challenge forbids scraping real people. |
| **Meetings → CRM** | Paste transcript or upload audio; extract life events (new child, job change, home hunt…); update household / tags / facts in `data/crm.json`. |
| **News ingest** | Demo replay of shocks from `investment-analysis.json` + 2027 tax rule; optional live RSS. |
| **Matcher + drafts** | Score impact per family; email-ready copy with `$` / `%` from the plan. |
| **Advisor inbox** | Group by headline → edit / approve / approve-all. |

## Quick start

```bash
npm install
npm run dev
```

- [http://localhost:3000](http://localhost:3000) — news inbox  
- [http://localhost:3000/clients](http://localhost:3000/clients) — client book  
- Open a family → **Run demo meeting** (e.g. Johnsons → baby Nora updates the household)

### Optional LLM / Whisper

Copy `.env.example` to `.env.local`:

```
SHERPAS_LLM_API_KEY=your-team-key
SHERPAS_LLM_BASE_URL=https://llm-hackathon.sherpaswealth.com/v1
```

Without a key: template drafts + heuristic transcript extraction still work offline. With a key: draft polish, richer event extraction, and Whisper if the proxy supports `/audio/transcriptions`.

## What is real vs simulated

| Real | Simulated |
|---|---|
| Case data under `cases/` and `legal/` | LinkedIn / employer names (explicitly simulated) |
| Replay market events & drawdowns | Sending email to clients |
| Meeting transcript → CRM updates (local JSON) | Live LinkedIn scrape (not done — against rules) |
| RSS when reachable | Scale story to 150 families (same pipelines) |
| Advisor approve workflow | |

## API

- `POST /api/ingest` `{ "mode": "replay" | "rss" | "both" }`
- `GET/PATCH /api/drafts`
- `GET /api/clients` · `GET/PATCH /api/clients/:slug`
- `GET/POST /api/clients/:slug/meetings` — `{ transcript }` or `{ demo: true }` or multipart audio

## Demo script (≈4 min)

1. **Clients** → Daniel & Emily → **Run demo meeting** → household gains Nora; tags `new-parent`.
2. **Clients** → Michael → demo meeting → home hunt + promotion + layoff watch.
3. **News inbox** → Ingest today → Liberation Day → approve a personal draft.
4. Pitch: profiling + tracker + advisor-approved comms — life events and markets in one loop.

## Stack

Next.js 15 · TypeScript · Tailwind CSS 4 · `rss-parser` · local CRM file

## Challenge brief

[CHALLENGE.md](CHALLENGE.md)
