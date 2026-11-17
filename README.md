# First to know, first to tell

**Sherpas challenge at CDTM Valencia Hacks 2026. Saturday 21 November 2026, The Terminal Hub, Valencia**

> **TODO (organisers, delete this block before sharing):**
> 1. Discord invite link and QR, and the name of the hand-in command (`/entrega` is a placeholder).
> 2. Exact hours: start, hand-in deadline, pitches.
> 3. Pitch length and jury questions.
> 4. Team size.
> 5. Repo visibility: make this repo public on the day, or invite teams.
> 6. CDTM emails on the case login, and what the access page shows CDTM teams (no AI key).
> 7. Jury criteria and weights: sign-off.
> 8. Which rule change teams get at the start.
> 9. Legal values through the MCP: tool not live yet.

## Join the Discord first

**[Discord: TODO invite link](#)** is where the day happens:

- **Announcements and rules**
- **Questions to the Sherpas mentor**, product and data questions on the day
- **Hand-in** with `/entrega` (TODO: confirm command)

## Start here

1. Read this page: the challenge, the families, the data and the hand-in are all here.
2. Create your team's own GitHub repo and copy what you need from this one (TODO: template or copy, once visibility is decided). Everyone in the team needs a free GitHub account.
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

## The challenge

**A tax or legal rule changes. Turn it into a closer relationship between a financial advisor and the families they look after:** find who it affects, explain what it means for each of them, and design the follow-up that helps them act.

After the plan, life and rules keep changing. When a tax limit or legal value changes, a general announcement does not tell a family whether it affects them, how much, or what to do. Working that out family by family and writing to each one takes the advisor time they do not have, so most changes go unexplained.

Sherpas already keeps its planning values up to date with their sources. Updating a number and explaining its impact to an existing family are two different jobs. The second one is your challenge.

What your build should make possible:

- **Find who is affected, and how.** Connect the rule's conditions to each family's data. Explain the effect on their money, or say what is missing before it can be calculated.
- **Tell their own story.** Each affected family understands the change in terms of their own money and goals, with no finance background.
- **Design the follow-up.** The sequence, timing and channel, and how it changes if the family reads, ignores, replies or asks for a meeting.
- **Keep the advisor in control.** The advisor sees why each family was picked and approves before anything reaches a family.

Format, channel and stack are yours: an agent, a workflow, a message sequence, or something we have not thought of. No voice interface, chatbot or separate app is required.

### An example rule change

You get the rule change for the day at the start: the change, its effective date and its official source (TODO: which change). Here is how one change plays out.

The US Social Security wage base rises from **$184,500 (2026) to $192,300 (2027)**; the employee rate is 6.2% ([SSA](https://www.ssa.gov/oact/cola/cbb.html)). If each salary stays the same and is all covered employee wages:

| Family member | Salary | Effect of this change alone | |
|---|---|---|---|
| Samantha | $250,000 | $7,800 more taxable band, so about $484 more Social Security tax a year ($40 a month) | Worth a message |
| Michael | $180,000 | Below both limits, so it costs him nothing | No message needed |

Same rule, different families, different answers. That is the difference between an announcement and advice. This is an illustration, not a full tax projection. A wage limit applies per person, so use each person's own salary, not the family total.

## The cases

Four synthetic households, true to life, built for this event. Every team gets all four. Each has a complete Sherpas plan.

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
| `persona.md` | The family as clients: how they take risk and decide, what drives and worries them (sections **D0 to D6**, concerns **O1, O2...**, tensions **T1, T2...**). Its figures match the plan |
| `report.pdf` | The client report, for Timothy and Melanie, Michael, and Daniel and Emily. Samantha's is not included |

All amounts are US dollars.

## Legal values

[`legal/legal-dataset-sample.json`](legal/legal-dataset-sample.json) is a sample of the legal values Sherpas uses to build plans: public law figures, each with its official source. Same shape as in the product: tables of `key: { "value", "source" }`.

```json
"SSWageBaseByYear": {
  "2026": { "value": 184500, "source": "SSA contribution and benefit base (ssa.gov/oact/cola/cbb.html)" },
  "2027": { "value": 192300, "source": "SSA contribution and benefit base 2027: $192,300 (...)" }
}
```

| Table | What it holds |
|---|---|
| `FICATaxSS`, `FICATaxMedicare`, `FICATaxAdditionalMedicare` | Payroll tax rates and the Additional Medicare thresholds by filing status |
| `SSWageBaseByYear` | Social Security wage base by year, 2023 to 2027 |
| `FullRetirementAgeByBirthdate` | SSA wage base (`SSWB`) and national average wage index (`NAWI`) by year, used to index earnings |
| `FullRetirementAgeByYearOfBirth` | Full retirement age (67) and the benefit factor for claiming at 62 to 70; the `default` row covers everyone born after 1960 |
| `SpouseBenefitsReductionFactor`, `SurvivorBenefitFRATable` | Spousal benefit reduction by months claimed early, survivor full retirement age by birth year |
| `StandardDeduction` | 2026 federal standard deduction by filing status, plus the extra amount at 65 |
| `RMDStartAge` | Age at which required withdrawals from retirement accounts start |
| `QCDLimitByYear` | Most a person 70½ or older can give to charity straight from an IRA |
| `MedicarePremiums`, `IRMAATiers` | 2026 Medicare Part B and D base premiums, and the income tiers that add a surcharge |

Not in this sample yet: federal and state income tax brackets and contribution limits (TODO).

Which values apply to each family. Ages, states, filing status, salaries and accounts are in each `financial-health.json`:

| Family | State, filing status | Values that apply |
|---|---|---|
| Timothy & Melanie Weah | CA, married filing jointly. Two salaries, both born after 1960 | Social Security and Medicare rates; wage base per person; Additional Medicare `marriedJointly` threshold; standard deduction `MARRIED_JOINTLY`; full retirement age `default` row; spouse and survivor tables; RMD start age; Medicare and IRMAA married columns from 65. California income tax applies (brackets not in the sample) |
| Michael Carter | TX, single. One salary, born after 1960 | Social Security and Medicare rates; wage base; Additional Medicare `single` threshold; standard deduction `SINGLE`; full retirement age `default` row; RMD start age; Medicare and IRMAA single columns from 65. Texas has no state income tax |
| Daniel & Emily Johnson | CO, married filing jointly. Two salaries, both born after 1960 | As for the Weahs. Colorado income tax applies (brackets not in the sample) |
| Samantha Lewis | FL, single. One salary, born after 1960 | As for Michael. Florida has no state income tax |

The QCD limit does not apply to any of the four today: all are under 70½.

## Your tools

| | |
|---|---|
| **4 cases through the MCP** | Read-only access to the four families and their plans, with an email login. See [Connect to the cases](#connect-to-the-cases) |
| **Files in this repo** | The same case data in [`cases/`](cases/) and the legal values in [`legal/`](legal/) |
| **AI models** | Bring your own. There are no AI credits for this event: use any model or tool your team already has |
| **Mentor** | A Sherpas mentor on the day for product and data questions |

**Ground rules:** use only the supplied synthetic families and public sources; send no real messages; keep keys on your backend, never in browser code.

## Your day, and what you hand in

| When | What |
|---|---|
| Sat 21 Nov, TODO | **Kick-off**: the challenge and the rule change |
| TODO | **Hand-in**, one per team, on Discord with `/entrega` (TODO: confirm) |
| TODO | **Pitches**: a live demo on the projector, TODO minutes per team, then the prize |

What you hand in:

1. **GitHub repo link** with your code and a README: how to run it, what it uses, and which parts are simulated.
2. **A working MVP** that checks all four families against the supplied rule change and takes at least one affected family through the whole flow: their message, the advisor's approval, and at least one follow-up (a reply, no reply, or a meeting request).
3. **A live demo** on the projector during your pitch, showing what the family and the advisor experience.

## How the jury scores

Six questions, 100 points (TODO: sign-off).

| Points | Criterion | The jury asks |
|---|---|---|
| 30 | Creativity and innovation | What did it add that we did not ask for? Is it something new: a format, channel or moment we had not thought of? |
| 25 | Motivation to act | Does each family know the next step and want to take it, and does the follow-up adapt if they reply, ignore it or ask for a meeting? |
| 20 | Their own story | Would each family understand what it means for their money and goals, with no finance background? |
| 10 | Advisor in control | Can the advisor see why each family was picked, and approve before anything is sent? |
| 10 | The whole flow, live | Does the live demo go from the rule change to a family taking a step? |
| 5 | The right families | Does it message the families the change affects and leave the others alone? |

Exact figures carry little weight: Sherpas already gets them right inside the product. A new idea, built well, counts most.

## Prize

<p align="center">
  <img src="assets/join.png" alt="Sherpas wants you. Internship opportunities" width="100%">
</p>

**500 € for the winning team.** Sherpas is looking for talent: the best prize is building real things with us.

## Connect to the cases

The MCP (Model Context Protocol) is a standard way for AI assistants and your own code to read data. Ours serves the four cases, read only. All the case data is also in [`cases/`](cases/), so you can build without it.

| Service | Address | Access |
|---|---|---|
| Case data (MCP) | `https://mcp-hackathon.sherpaswealth.com/mcp` | Email login in your AI tool, or your personal MCP token from code |

The address is for code and AI tools, not a web page: opened in a browser it shows `405`, which is normal. The only page to open in a browser is [your access page](https://mcp-hackathon.sherpaswealth.com/personal-token).

### 1. Get your MCP token

Open [your access page](https://mcp-hackathon.sherpaswealth.com/personal-token) and log in with **the email you registered with**. We send you a 6-digit code (check spam too); it works for 10 minutes. Your token lasts 72 hours, and each login replaces the previous one. Each teammate has their own. (TODO: CDTM emails on the list, and the page's labels for CDTM.)

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

TODO: not live yet. Planned tool `get_legal_values`, with `{}` for every table, `{"table":"SSWageBaseByYear"}` for one table, or `{"caseId":"samantha-lewis"}` for the values that apply to one family. Until then, read [`legal/legal-dataset-sample.json`](legal/legal-dataset-sample.json).

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
