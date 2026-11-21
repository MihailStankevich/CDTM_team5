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

A priority model scores the day behind that screen. It weighs how hard the news hits, how soon something is due, how this person decides, how long it has been since anyone spoke to them, and what the relationship is worth. The ranking is available at `/api/priority`. The screen the advisor uses stays the one above.

## How a note gets written

A headline only reaches a family when it is about something they own. A bond story goes to the bond sleeve. An oil story goes to the foreign funds. An index move goes to the largest US-equity book, and mentions a leveraged fund only as a clause, not as the reason.

The model then writes one note for that household. It has to use their names, their holdings and their way of deciding. Swap the names and the note should stop making sense. Quiet notes go out. A hard hit waits, with the text already written, until the advisor sends it or leaves it.

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
