# First to know

An advisor looks after about 150 families. Each one wants to feel like the only one.

Sherpas already knows who they are and has built the plan. The hard part starts the morning after: a headline lands, a tax table changes, a child is born, and the family hears it from the news before they hear it from the person they pay. Silence reads as neglect. A newsletter that could have gone to anyone reads as worse.

**First to know** is the advisor's morning. It watches the four families in this case, decides what can go out on its own, and keeps the rest for a human yes.

Built for the [Sherpas challenge at CDTM Valencia Hacks 2026](CHALLENGE.md).

## The problem

On the family's side:

- They hear a market move or a tax change from the news, and wonder if anyone is watching their plan.
- A drop feels like their drop, even when the plan was built for it.
- A promotion, a layoff worry, a new child or a house hunt sits in a chat and never reaches the plan.
- The same paragraph goes to every household.

On the advisor's side:

- Nobody can read every headline against every portfolio before breakfast.
- A note that is safe for one family is the wrong note for the next. One person checks a number. A couple decides together. Someone else wants it said warmly, with their partner's name.
- Thirty personal drafts, approved one by one, is the whole morning. Some of those drafts did not need a person at all.

## What we do about it

The desk has three places.

**Today** is the morning. *What moved today* is the quiet news that has already gone out: five headlines, each one tied to the sleeve that household actually holds, with the note that was sent. *Actions* is the short list that still needs the advisor: two important stories, with the message open so it can be rewritten before it goes, plus the day's calls and meetings (accepted, waiting, or still to propose).

**Inbox** is every channel in one thread: WhatsApp, email, Telegram. The column on the right is a brief, not a dossier: how to talk to them, whether they have children, how much market language they want, and the next goal. A life event typed into the thread updates the profile. Samantha's column also carries a birthday note, ready to send.

**Clients** is the household, structured: who they are, how they decide, what they hold, and the meetings that changed the file. Paste what was said, or upload the audio. A new child, a raise or a house hunt is written back onto the profile.

A priority model scores the day behind that screen. The formula, the gates and the schedule are in the next section. The ranking itself is `GET /api/priority`. The screen the advisor uses stays the one above.

## How a note gets written

A headline only reaches a family when it is about something they own. A bond story goes to the bond sleeve. An oil story goes to the foreign funds. An index move goes to the largest US-equity book, and mentions a leveraged fund only as a clause, not as the reason.

The first text on screen is written from that card, so the desk does not wait on a language model. The model then rewrites only the notes that are actually showing: the two decisions and the five that already went out. It has to use their names, their holdings and their way of deciding. Swap the names and the note should stop making sense. A hard hit waits, with the text already written, until the advisor sends it or leaves it.

## The priority model

Every task is a vector of six factors in $[0, 1]$. The score is a convex combination, so it lives in $0$–$100$ and the weights are the whole policy:

$$
s = 100 \,(0.30\,I + 0.25\,U + 0.15\,S + 0.10\,G + 0.10\,C + 0.10\,V)
$$

| Factor | What it measures | How it is scaled |
|---|---|---|
| Impact $I$ | Dollars at stake over liquid wealth | Saturates at 10% of AUM, the size of a correction. Unknown dollars take the neutral value $0.5$. |
| Urgency $U$ | Time left | $1$ if it is happening now or overdue, then $0.9 / 0.8 / 0.5 / 0.3$ at 7, 30, 60, 180 and 365 days. No date is $0.1$. |
| Sensitivity $S$ | What kind of life this touches | Depletion, insurance and a home are $1$. Career and markets $0.8$, college $0.6$, tax and debt $0.3$. The family's anchor (protection, duty, freedom) adds $0.2$, and so does a market drop on a misaligned risk profile. |
| Gravity $G$ | Severity already in the plan | Critical $1$, significant $0.75$, moderate $0.5$, minor $0.25$, info $0.1$. |
| Contact $C$ | Silence | Days since the last conversation, capped at 90, one review cycle. |
| Value $V$ | Relationship size | AUM capped at $500k, the emerging-client line. Wealth cannot outrank a real problem. |

Bands are thresholds on that sum. Red is $80$ or above: impact, urgency and sensitivity have to agree. Amber is $60$. Anything from $40$ still belongs in this month. Under $40$ the score is mostly contact and value, and the task goes to the monthly recap.

Automation is a first-match rule. A request, a recommendation to move money, a critical concern or a big decision is a conversation. A note that quotes their own numbers, a topic more delicate than a tax line (sensitivity above $0.3$), or a low tolerance for automatic messages, waits for the advisor. Everything else can go.

Tolerance is a Beta belief. The prior comes from how they decide: a collaborator starts at $\mathrm{Beta}(3, 2)$, mean $0.6$. Reading a note without asking for a person is a success and increments $\alpha$. Asking for a human increments $\beta$. One such ask drops a collaborator to $0.5$, under the $0.6$ gate, and automation stops.

Channel follows the same facts. In person, a red or amber item or a big decision is a meeting, otherwise a call. A change under $0.5\%$ of liquid wealth is one ordinary day of noise and joins the recap instead of earning its own message. A validator, or any note with personal numbers, gets email. An immediate, sensitive market move gets a text. Send windows stay inside 8:00–20:00 local.

Inside a band, order is weighted shortest job first: score per advisor minute. Effort changes that order. The score stays the weighted sum above. One in-person conversation per family: anything else scoring $40$ or more is folded into that conversation's notes.

The agenda is greedy list scheduling. In-person tasks go highest score first, into the first free slot before a latest date, which is the band's horizon or two weeks before a deadline, whichever is sooner. One conversation per family. At the size of a real morning, about thirty tasks, that greedy order is a close approximation of minimising the sum of score times lateness.

The thresholds live in one config. `npm run test:priority` checks the worked scores, that the six contributions add up, that the gates fire in order, and that moving a weight by five points does not reshuffle the day.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| | |
|---|---|
| Today | [http://localhost:3000](http://localhost:3000) |
| Inbox | [http://localhost:3000/inbox](http://localhost:3000/inbox) |
| Clients | [http://localhost:3000/clients](http://localhost:3000/clients) |

To write notes and transcribe audio, copy `.env.example` to `.env.local` and set one key:

```
OPENAI_API_KEY=sk-...
```

A team key uses the Sherpas proxy instead:

```
TEAM_KEY=your-team-key
SHERPAS_LLM_BASE_URL=https://llm-hackathon.sherpaswealth.com/v1
```

Without a key, the desk still runs. Notes fall back to a short paragraph grounded in that household, and a pasted transcript is read with rules rather than a model. Audio needs a key: it goes to Whisper.

```bash
npm run test:priority
```

## A four-minute walkthrough

1. **Today.** Open *What moved today*. The note names that family's funds and the dollars in them, not a generic "you hold the market".
2. **Actions.** Two stories are waiting. Change a sentence and send it, or leave it. Under them, a meeting is already accepted and a call is still waiting. *Propose a call or a meeting* comes from how that client has been acting.
3. **Inbox.** Open Samantha. The right column says how to talk to her. It is her birthday: the note is written, and Send puts it in the thread.
4. **A client.** Open Daniel & Emily, then Meetings. Paste a line about a new child, or upload a short recording. The profile picks up the fact.
5. **A phone.** The same three places sit on a bottom bar. The list and the conversation take turns, so nothing has to be read sideways.

## What is real, and what is not

The four households are the case files in `cases/`, with the 2027 tax tables in `legal/`. Nothing here is a real client's LinkedIn, inbox or brokerage account.

| From the case | Played for the demo |
|---|---|
| Holdings, goals, income, persona, tax tables | Names of employers and the LinkedIn-style cards |
| Live headlines, when the feeds answer | Days since last contact, and how comfortable someone is with an automatic note |
| A pasted transcript or a Whisper transcription updating the local profile | Delivery. Send stays inside the app. Nothing goes to WhatsApp, email or Telegram |
| The quiet-versus-advisor split | A book of 150. The same pipeline, four families |

Days without contact and the comfort with automatic notes are simulated on purpose. The case files do not contain them, and the priority model needs them.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4

News from public RSS. Notes and transcripts through the OpenAI API, or the Sherpas proxy when a team key is set. The priority model is a pure function with its thresholds in one config, covered by `npm run test:priority`.
