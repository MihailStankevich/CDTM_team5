<p align="center">
  <img src="assets/banner.png" alt="First to know, first to tell. Sherpas challenge at CDTM Valencia Hacks 2026, Saturday 21 November, The Terminal Hub, Valencia" width="100%">
</p>

# First to know, first to tell

**Sherpas challenge at CDTM Valencia Hacks 2026. Saturday 21 November 2026, The Terminal Hub, Valencia**

[CDTM Valencia Hacks](https://vlc.hacks.cdtm.com/) is a one-day hackathon by CDTM Valencia (UPV and Universitat de València) with cases from several companies. Sherpas is one of the main sponsors; this page is everything you need for the Sherpas case.

## Join the Discord first

<a href="https://discord.gg/mCHYWRhFw"><img src="assets/discord-qr.png" alt="QR code: join the Discord" width="160" align="right"></a>

**[CDTM VLC Hacks x Sherpas Wealth on Discord](https://discord.gg/mCHYWRhFw)** is where the day happens. Scan the code or click the link:

- **Announcements and rules**: accept the rules in #welcome to see the rest
- **Your team's private channels**: in #welcome press **I have a team code** and paste the code from CDTM's team email (or type `/join`); no code? accept the rules, then one of you runs `/team create` and `/team add` for each teammate
- **Questions**: the #help forum, or `/mentor` in your team channel to call the Sherpas mentor
- **Your idea** with `/idea` (type `/help` for all commands). The official hand-in is on Polievalúa, see [Your day](#your-day-and-what-you-hand-in)

Every team member should join before the kick-off on Saturday.

## Start here

1. Read this page: the challenge, the families, the data and the hand-in are all here.
2. Click **Use this template > Create a new repository** (top right on GitHub). One person per team does this, under their own account, and chooses **Public** so the mentors and the jury can open it. Everyone in the team needs a free GitHub account.
3. Open one family's plan from [the cases table](#the-cases) and read the same family's `persona.md`.
4. Connect to the case data ([Connect to the cases](#connect-to-the-cases)) or read the files in [`cases/`](cases/) and [`legal/`](legal/).

Any language, framework or device. Keep a README that says what you built, how to run it, what it uses and which parts are simulated.

## Who we are

Sherpas Wealth is an AI platform for financial advisors in the United States ([sherpaswealth.com](https://sherpaswealth.com)). Advisors are our customers; families are their clients. For every family, an advisor does three jobs:

| | Job | Today |
|---|---|---|
| 1 | **Collect the data**: who the family is, what they earn, own and owe, and what they want | Solved by Sherpas |
| 2 | **Build the plan** | Solved by Sherpas: a narrated plan with an overview, advice area by area, a living map of their finances year by year, and concrete strategies |
| 3 | **Keep the family close**: after the plan, the relationship goes on for years | **This is your challenge** |

## The challenge: nurturing at scale

**A financial advisor looks after around 150 families. Each one wants to feel like the only one.**

The plan is not a once-a-year relationship. Between meetings, laws change, markets move, careers and families change, and every family wants to know that their advisor is on it: that if something matters to them, they will hear it first, from their advisor, in their own terms. And that if they hear nothing, it is because nothing needs doing.

Sherpas already collects the data and builds the plan. Your challenge is the day-to-day relationship after it: **how do you make every family feel looked after, personally and ahead of time, when one advisor has 150 of them?**

### The problems

What happens in the family's head:

1. **They hear it from the news first.** A tax rule changes: *"What does this mean for us? Do we have to change anything? Our advisor hasn't said a word. Do I have to ask?"* Every time they have to ask, they trust their advisor a little less.
2. **Markets fall and they panic alone.** Nvidia falls 30% in two weeks, or the market drops 20%: *"Is the bubble bursting? Do we sell? Can we still buy the beach house? Should we buy now?"* What they need first is someone telling them this is normal and the plan was built for it, then what it means for them.
3. **They feel like a number.** *"Our advisor has clients with two or three million. We have $150,000, but it is our $150,000."* Silence reads as "nobody is watching".
4. **Their life moves and nobody connects it to the plan.** A promotion (and the risk of spending all of the raise), layoffs at their company, a child turning 11 with seven years to college, a child about to lose the family's health cover at 26, a house they are thinking about.
5. **Generic content.** The same newsletter for every family: it explains what an annuity is to someone who already holds one, and skips the topics they actually care about.
6. **Big decisions take more than one message.** A Roth conversion: first they need to understand what it is, then why it suits them, then accept it, then feel ready to act. People need to hear about something four or five times before it feels familiar.

What happens on the advisor's side:

7. **Nobody can watch everything for everyone.** Regulation, markets, each family's employer, their LinkedIn, the dates already in their plan, for 150 families, every week.
8. **Knowing each person takes time.** What they care about, what they already know, how they react to risk: in a couple, one may shrug at a market drop while the other panics.
9. **Every message needs the advisor's approval.** AI should not write to a client on its own yet: the advisor approves first. With 30 personal drafts a day, approving them one by one is the whole morning.

### Where you could start

Pick the problems you believe in. Four parts of an answer, as examples; build one, several, or something else:

| Part | The question it answers |
|---|---|
| **Profiling** | Who is this person? Which topics matter to them, what do they already know, how do they decide and react to risk? |
| **Tracker** | What just happened to this family, their employer, the market or the law, and does it touch their plan? |
| **Content library** | What do we already have to say about this: to reassure, to explain, to check in, to celebrate? |
| **Communications** | Who hears what, when, and how does the advisor approve 30 personal messages in minutes: an inbox, a conversation ("seven messages today, this one because..."), or something new? |

**The core is communication that feels personal, approved by the advisor at scale, built on profiling and an event tracker.** Profiling tells you what each person cares about and already knows; the tracker connects events to their plan. A content library is an optional plus and counts least. Format, channel and stack are yours. You will not build everything in one day, and you do not need to.

Four families are supplied. You can simulate more to demonstrate scale; label them in your README.

### What already exists (do not rebuild it)

- **The plan:** for every family, Sherpas collects the data and builds a narrated plan (overview, advice by area, a living map year by year).
- **Tax and legal values:** every value behind a plan carries its official source; when a rule changes, Sherpas publishes the new value and new plans recalculate with it. Knowing that a number changed is solved; what it means for each family, and telling them, is not.
- **Emails around the plan:** the questionnaire invitation and reminders, an invitation to book a meeting, access to the plan. Once the plan is delivered, nothing more goes out.

## The cases

Four synthetic households, true to life, built for this event. Every team gets all four. Each has a complete Sherpas plan and a client profile: how each person takes risk and decides, what drives and worries them, and the dates already in their plan.

| Family | Who they are | Their story | Plan in the app | Files |
|---|---|---|---|---|
| Timothy & Melanie Weah | 40 and 38, Liam (6) and Josh (3). $150,000 in cash, an $18,000 card at 18%, a $350,000 home. San Francisco, CA | Plenty of cash and an expensive card. Where should each dollar go? | [Open the plan](https://app.sherpaswealth.com/plan/shared/RcCtgoNkGmD6dvGtYVKWLGefdCTFdc4JP_jH9Jbz2jo) | [`cases/timothy-melanie-weah/`](cases/timothy-melanie-weah/) |
| Michael Carter | 37, $180,000 salary, renting. Austin, TX | A $550,000 home in 2027 and retiring at 58. Can he do both? | [Open the plan](https://app.sherpaswealth.com/plan/shared/ZshH0AUJjZnvwKIYtP5wYKyvI6Nc1nsGwQlDncXLfek) | [`cases/michael-carter/`](cases/michael-carter/) |
| Daniel & Emily Johnson | 44 and 42, two children, a $560,000 mortgage, an $18,000 card at 24.9%. Denver, CO | College for Oliver and Sophia and retiring at 62. What comes first? | [Open the plan](https://app.sherpaswealth.com/plan/shared/FjVPq_UEwSMxaye8aOWj3osJWWSE3cDnYWcxm1X7I78) | [`cases/daniel-emily-johnson/`](cases/daniel-emily-johnson/) |
| Samantha Lewis | 47, two teenagers, $250,000 salary, debt-free and well insured. Miami, FL | College bills now and a second home in 2030. What next? | [Open the plan](https://app.sherpaswealth.com/plan/shared/vyV2h64-qSet-sJuwkAHxw-iUaYV88Lkwsg29L2Y5y8) | [`cases/samantha-lewis/`](cases/samantha-lewis/) |

**Plan in the app** opens the family's plan exactly as the client sees it: the advice, the living map and the investment analysis. No login needed, read only.

Each family folder contains:

| File | What it contains |
|---|---|
| `financial-health.json` | Who the family is (ages, state, tax filing status), their score and why, incomes, accounts, debts, insurance, goals, key metrics, written analysis and yearly projection |
| `investment-analysis.json` | Accounts and holdings, key metrics and the written investment analysis |
| `persona.md` | The client profile: wealth, life stage, risk per person (stated, revealed and inferred), how they decide, what drives them, upcoming transitions, concerns **O1, O2...** and tensions **T1, T2...** (sections **D0 to D6**). Its figures match the plan. A starting point for profiling |
| `report.pdf` | The client report, for Timothy and Melanie, Michael, and Daniel and Emily. Samantha's is not included |

All amounts are US dollars.

## Where to find the signals

Everything below is already in each family's files. Use it to know a family, or to see how something that happens touches them.

| Moment | What to look at | Where | Example |
|---|---|---|---|
| **Markets fall** | How this family's own portfolio did in 11 past market shocks | `investment-analysis.json`: `key_metrics.performanceAnalysis.perEventDrawdowns`, `analysis.events` | Tariff announcement, 2 Apr 2025: Samantha's portfolio fell 9.9%, Timothy and Melanie's 7.1% |
| **Markets fall** | What they hold, and how much of it is tech | `positions`, `key_metrics.concentrationAndDiversification.sectorConcentration` | Technology is 36% of the Johnsons' shares (through VTI, VWELX and VWO) |
| **Life moves** | Dated goals | `financial-health.json`: `goals.chartGoals` | Michael's home in January 2027, Ava's college in August 2028, Oliver's in August 2033 |
| **Life moves** | Who is in the family, and their ages | `case.household` | Oliver is 11, Ethan 18, Josh 3 |
| **Life moves** | Who earns what, and until when | `profile.incomes` | Each salary with its owner and end year |
| **Profiling** | Risk per person, how they decide, what worries them | `case.household[].risk_profile`; `persona.md` D4 to D6, concerns and tensions | Timothy is Growth, Melanie is Moderate |
| **A big decision** | What the plan recommends, and how each step moves the score | `score.top_moves`, `narrative.summary_recommendations` | Each move with its score before and after |
| **A rule changes** | Tax and legal values with official sources | [`legal/legal-dataset-sample.json`](legal/legal-dataset-sample.json) | Social Security wage base 2027: $192,300 |

Not in the data: employers' names and social profiles. Simulate them and say so in your README.

## Legal values (one possible source)

A rule change is one of the moments. [`legal/legal-dataset-sample.json`](legal/legal-dataset-sample.json) holds the tax and legal values that touch these families, each with its official source, in the shape Sherpas uses to build plans (`key: { "value", "source" }`). The Social Security and Medicare tables come from Sherpas' legal dataset; the federal brackets, standard deduction and child tax credit for 2026 and 2027 come from the IRS releases cited in each value.

Use it if regulation is relevant to the problems you choose. Market events, life changes and helping a family prepare for a decision are equally valid starting points. You do not have to build a regulatory alert system.

Each family's salaries, ages, children, state and filing status are in its `financial-health.json`.

## Your tools

| | |
|---|---|
| **4 cases through the MCP** | Read-only access to the four families and their plans, with an email login. See [Connect to the cases](#connect-to-the-cases) |
| **Files in this repo** | The same case data in [`cases/`](cases/) and the legal values in [`legal/`](legal/) |
| **The outside world** | Any public source you choose: news, market data, company announcements. Simulate what you cannot reach (a LinkedIn post, a layoff) and say so in your README |
| **AI models** | Bring your own. There are no AI credits for this event: use any model or tool your team already has |
| **Mentor** | A Sherpas mentor on the day for product and data questions |

**Ground rules:** use only the supplied synthetic families and public sources; do not scrape real people's profiles; send no real messages; keep keys on your backend, never in browser code.

## Your day, and what you hand in

| When | What |
|---|---|
| 08:30 | **Kick-off and case briefing** at The Terminal Hub: Sherpas, the families and the challenge |
| 10:00 | **Hacking time**, with mentor rounds |
| 13:30 | **Lunch** (30 minutes) |
| 14:00 | **Working time**: final push on the prototype and the pitch |
| Before 16:45 | **Hand-in**, one per team, on **Polievalúa**: pitch deck, GitHub repo link and demo video |
| 17:00 to 19:00 | **Pitches and awards**: 3 minutes per team plus 2 minutes of questions |

Teams of five; CDTM matches you with your team. Everything happens in English: code, README and pitch. Agenda from [vlc.hacks.cdtm.com](https://vlc.hacks.cdtm.com/).

What you hand in:

1. **Pitch deck** for your 3-minute pitch: the problem you chose, what you built, and why it matters to the family and the advisor.
2. **GitHub repo** with your working MVP and a README: the problems you chose, what you built, how to run it, what it uses, and which parts are simulated. It runs on the supplied families and can cover one part (profiling, tracker, content library, communications) or several; you do not need to build the whole chain.
3. **Demo video** showing what the family and the advisor experience with your MVP.

## Prize

<p align="center">
  <img src="assets/join.png" alt="Sherpas wants you. Internship opportunities" width="100%">
</p>

**500 € in Amazon vouchers for the winning team.** Sherpas is looking for talent: the best prize is building real things with us.

## Connect to the cases

The MCP (Model Context Protocol) is a standard way for AI assistants and your own code to read data. Ours serves the four cases, read only. All the case data is also in [`cases/`](cases/), so you can build without it.

| Service | Address | Access |
|---|---|---|
| Case data (MCP) | `https://mcp-hackathon.sherpaswealth.com/mcp` | Email login in your AI tool, or your personal MCP token from code |

The address is for code and AI tools, not a web page: opened in a browser it shows `405`, which is normal. The only page to open in a browser is [your access page](https://mcp-hackathon.sherpaswealth.com/personal-token).

### 1. Get your MCP token

Open [your access page](https://mcp-hackathon.sherpaswealth.com/personal-token) and log in with **the email you registered with**. We send you a 6-digit code (check spam too); it works for 10 minutes. Your token lasts 72 hours, and each login replaces the previous one. Each teammate has their own.

Save it in a `.env` file at the root of your repo. This repo's `.gitignore` already keeps `.env` out of git. Never commit it or show it in browser code, screenshots or demos.

```
MCP_URL=https://mcp-hackathon.sherpaswealth.com/mcp
MCP_TOKEN=your-personal-token
```

### 2. Use the cases in your AI assistant (optional, no code)

| Client | How to add the server |
|---|---|
| Claude Desktop or claude.ai | **Settings → Connectors → Add custom connector**. Name it **Sherpas cases** and enter the server URL. This requires custom-connector access on your account |
| Claude Code | `claude mcp add --transport http sherpas-cases https://mcp-hackathon.sherpaswealth.com/mcp`, then `/mcp` to authenticate |
| Cursor | Add `{ "mcpServers": { "sherpas-cases": { "url": "https://mcp-hackathon.sherpaswealth.com/mcp" } } }` to `~/.cursor/mcp.json`, then connect in the MCP settings |
| VS Code | Add `{ "servers": { "sherpas-cases": { "type": "http", "url": "https://mcp-hackathon.sherpaswealth.com/mcp" } } }` to `.vscode/mcp.json`, then start the server |

When the login page opens, enter your registered email and the 6-digit code. Then check:

1. The client lists the tools `list_cases` and `get_case`.
2. Ask **"List the cases using the Sherpas MCP."** You should get the four families.
3. Ask **"Summarise Samantha Lewis's case using the Sherpas MCP, then list her goals and what worries her."**

### 3. Read the cases from your code

| Tool | Arguments | What you get |
|---|---|---|
| `list_cases` | `{}` | Case IDs, households, locations, scores and available parts |
| `get_case` | `{"caseId":"samantha-lewis"}` | The case overview, sections and their sizes |
| `get_case` | `{"caseId":"samantha-lewis","part":"financial-health","section":"narrative"}` | The financial-health analysis text |
| `get_case` | `{"caseId":"samantha-lewis","part":"persona"}` | The family's persona, as Markdown text |

Omit `section` to fetch a whole part. Parts can be tens of thousands of tokens, so fetch only what you need. Send `MCP_TOKEN` as the `Authorization: Bearer <token>` header with an MCP SDK.

Python (`pip install mcp python-dotenv`):

```python
import asyncio, json, os
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client

load_dotenv()

async def main():
    http = create_mcp_http_client(headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"})
    async with streamable_http_client(os.environ["MCP_URL"], http_client=http) as (read, write, *_):
        async with ClientSession(read, write) as mcp:
            await mcp.initialize()
            r = await mcp.call_tool("get_case", {"caseId": "samantha-lewis", "part": "financial-health", "section": "narrative"})
            print(json.loads(r.content[0].text)["value"]["summary_main"])

asyncio.run(main())
```

JavaScript (`npm install @modelcontextprotocol/sdk`; save as `app.mjs`, run `node --env-file=.env app.mjs`):

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcp = new Client({ name: "my-team", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL), {
  requestInit: { headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` } },
}));
const r = await mcp.callTool({ name: "get_case", arguments: { caseId: "samantha-lewis", part: "financial-health", section: "narrative" } });
console.log(JSON.parse(r.content[0].text).value.summary_main);
```

### 4. Legal values through the MCP

Not available through the MCP. Read the legal values from [`legal/legal-dataset-sample.json`](legal/legal-dataset-sample.json).

### Troubleshooting

- **405 when opening `/mcp`:** normal. Use the URL in your MCP client settings.
- **No login email:** check spam and that you used the email you registered with; request a fresh code if the first expired.
- **"Este correo no está en la lista de participantes"** (this email is not on the participant list): use the email you registered with; if it still fails, ask the mentor.
- **MCP access stops working:** log in again for a new token, or reconnect your AI tool.
- **Cases missing:** use the JSON files in `cases/` and tell the mentor which case and section failed.
- **A token leaked** (pushed to GitHub, shown on screen): tell the mentor and log in again for a new one.

## A few terms

- **Social Security wage base:** the most salary per person that Social Security tax applies to in a year.
- **Standard deduction:** the part of income not taxed, by filing status.
- **Filing status:** how a household files its US tax return, for example single or married filing jointly.
- **RMD:** required minimum distribution, the yearly withdrawal the law requires from retirement accounts from a set age.
- **IRMAA:** a Medicare surcharge for people with higher income.
- **QCD:** qualified charitable distribution, a gift to charity straight from an IRA.
- **401(k), IRA, HSA, 529:** US retirement, health and education savings accounts with tax advantages.
- **Living map:** a year-by-year view of the family's projected financial life.
- **MCP:** Model Context Protocol, a standard way for AI assistants and code to read data from a server.
- **Backend:** the part of your app that runs on a computer or server, where keys stay private.
