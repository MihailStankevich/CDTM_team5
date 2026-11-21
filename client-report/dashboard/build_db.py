"""Build the SQLite database (data/sherpas.db) from the Sherpas case files.

Reads data/cases/<family>/{financial-health,investment-analysis,signals}.json,
which are copied unchanged from the Sherpas hackathon repository.

Run:  python3 build_db.py
"""
import json
import os
import sqlite3
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = os.path.join(HERE, "data", "cases")
if not os.path.isdir(CASES):  # inside the team repo, read the shared case files
    CASES = os.path.join(HERE, "..", "..", "cases")
DB = os.path.join(HERE, "data", "sherpas.db")

TODAY = "2026-11-21"          # the day of the demo
PLAN_DATE = "2026-11-02"      # simulated: plan delivered right after the analysis window (ends 2026-11-01)

ADVISOR = {  # simulated advisor names, one per family
    "daniel-emily-johnson": "Rachel Moore",
    "michael-carter": "David Kim",
    "samantha-lewis": "Rachel Moore",
    "timothy-melanie-weah": "Laura Bennett",
}

SCHEMA = """
CREATE TABLE family (
  slug TEXT PRIMARY KEY, name TEXT, city TEXT, state TEXT, advisor TEXT,
  score INTEGER, band TEXT, score_message TEXT,
  net_worth REAL, investable REAL, total_debt REAL, yearly_income REAL,
  free_cash_flow REAL, yearly_savings REAL, monthly_spending REAL,
  cash_months REAL, cash_months_target REAL, accessible_cash REAL, summary TEXT
);
CREATE TABLE member (
  id INTEGER PRIMARY KEY, family_slug TEXT, first_name TEXT, role TEXT, age INTEGER,
  retirement_age INTEGER, risk_profile TEXT, sort INTEGER
);
CREATE TABLE account (
  id INTEGER PRIMARY KEY, family_slug TEXT, name TEXT, kind TEXT, balance REAL,
  yearly_contribution REAL, owner TEXT
);
CREATE TABLE debt (
  id INTEGER PRIMARY KEY, family_slug TEXT, name TEXT, balance REAL, rate REAL,
  monthly_payment REAL, owner TEXT
);
CREATE TABLE pillar (
  id INTEGER PRIMARY KEY, family_slug TEXT, name TEXT, score INTEGER, points TEXT
);
CREATE TABLE next_step (
  id INTEGER PRIMARY KEY, family_slug TEXT, title TEXT, action TEXT, effort TEXT,
  score_before INTEGER, score_after INTEGER
);
CREATE TABLE projection (
  family_slug TEXT, year INTEGER, age_client INTEGER, net_worth REAL,
  net_worth_today REAL, investable REAL, debts REAL
);
CREATE TABLE goal (
  id INTEGER PRIMARY KEY, family_slug TEXT, member_name TEXT, kind TEXT, title TEXT,
  target_date TEXT, progress REAL, status TEXT, headline TEXT, detail TEXT, sort INTEGER
);
CREATE TABLE timeline_event (
  id INTEGER PRIMARY KEY, family_slug TEXT, date TEXT, kind TEXT, title TEXT,
  body TEXT, impact_pct REAL, upcoming INTEGER, simulated INTEGER, source TEXT
);
"""

ROLE_ORDER = {"client": 0, "co-client": 1, "child": 2}


def load(slug, part):
    with open(os.path.join(CASES, slug, part + ".json")) as f:
        return json.load(f)


def v(x):
    return x.get("value") if isinstance(x, dict) else x


def money(x):
    return "${:,.0f}".format(x)


def nice_account_kind(t):
    t = t.lower()
    if "401" in t or "ira" in t or "roth" in t:
        return "Retirement"
    if "529" in t or "ugma" in t or "custodial" in t:
        return "College"
    if "brokerage" in t:
        return "Investments"
    if "hsa" in t:
        return "Health savings"
    return "Cash"


def family_name(household):
    adults = [h["first_name"] for h in household if h["role"] != "child"]
    return " & ".join(adults)


def build_family(cur, slug):
    fh = load(slug, "financial-health")
    ia = load(slug, "investment-analysis")
    sig = load(slug, "signals")
    case, prof, km = fh["case"], fh["profile"], fh["key_metrics"]
    hh = case["household"]

    # ---------------- family + money summary ----------------
    accounts_total = sum(a["balance"] for a in prof["accounts"])
    other_total = sum(a["value"] for a in prof.get("other_assets", []))
    debt_total = sum(l["balance"] for l in prof["liabilities"])
    salary = sum(i["yearly"] for i in prof["incomes"]
                 if i["type"] in ("SALARY_AND_WAGES",) and i["starts"] <= 2026 <= i["ends"])
    ret = km["facts"]["retirement"]
    fcf = ret["netCashFlowThisYear"]["value"]
    ef = km["ratios"]["emergencyFund"]
    cash = km["facts"]["cash"]
    summary_first = fh["narrative"]["summary_main"].split("\n")[0].lstrip("- ").strip()

    cur.execute("INSERT INTO family VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
        slug, family_name(hh), case["city"], case["state"], ADVISOR.get(slug, "Your advisor"),
        fh["score"]["published_score"], fh["score"]["band"], fh["score"]["message"],
        accounts_total + other_total - debt_total, accounts_total, debt_total, salary,
        fcf, km["ratios"]["savingsLevel"]["savingAmount"], ef["monthlyExpenses"],
        float(v(cash["monthsCovered"])), float(ef["minRecommendedEFMonths"]),
        v(cash["accessibleCash"]), summary_first,
    ))

    for i, h in enumerate(sorted(hh, key=lambda h: ROLE_ORDER.get(h["role"], 9))):
        cur.execute("INSERT INTO member (family_slug, first_name, role, age, retirement_age, risk_profile, sort) VALUES (?,?,?,?,?,?,?)",
                    (slug, h["first_name"], h["role"], h.get("age"), h.get("retirement_age"), h.get("risk_profile"), i))

    for a in prof["accounts"]:
        cur.execute("INSERT INTO account (family_slug, name, kind, balance, yearly_contribution, owner) VALUES (?,?,?,?,?,?)",
                    (slug, a["name"], nice_account_kind(a["account_type"]), a["balance"],
                     a.get("yearly_contribution_total", 0), ", ".join(a.get("owner", []))))
    for l in prof["liabilities"]:
        cur.execute("INSERT INTO debt (family_slug, name, balance, rate, monthly_payment, owner) VALUES (?,?,?,?,?,?)",
                    (slug, l["name"], l["balance"], l.get("interest_rate"), l.get("monthly_payment"), ", ".join(l.get("owner", []))))
    for p in fh["score"]["pillars"]:
        cur.execute("INSERT INTO pillar (family_slug, name, score, points) VALUES (?,?,?,?)",
                    (slug, p["pillar"], p["score"], p["points_shown_in_app"]))
    for m in fh["score"]["top_moves"]:
        cur.execute("INSERT INTO next_step (family_slug, title, action, effort, score_before, score_after) VALUES (?,?,?,?,?,?)",
                    (slug, m["title"], m["action"], m["effort"], m["score_before"], m["score_after"]))
    for y in fh["projections"]["yearly"]:
        cur.execute("INSERT INTO projection VALUES (?,?,?,?,?,?,?)",
                    (slug, y["year"], y.get("age_client"), y["net_worth"], y["net_worth_todays_dollars"],
                     y["investable_assets"], y["total_debts"]))

    # ---------------- goals per person ----------------
    goals = []
    chart = {g.get("name"): g for g in fh["goals"]["chartGoals"] if g.get("name")}
    depl = km["retirementAndOtherGoals"]["assetDepletion"]
    cp = km["retirementAndOtherGoals"]["clientProfile"]
    end_age = cp["endOfPlanAge"]
    run_out = depl.get("ageWhenTheyRunOutOfLiquidAssets")
    adults = [h for h in hh if h["role"] != "child"]
    kids = [h for h in hh if h["role"] == "child"]

    for h in adults:
        ra = h["retirement_age"]
        cg = chart.get(f"{h['first_name']}'s Retirement", {})
        if isinstance(run_out, (int, float)):
            # years of retirement the savings cover, measured on the plan's own age scale
            prim_ra = cp["clientRetirementAge"]
            covered = max(0.0, min(1.0, (run_out - prim_ra) / (end_age - prim_ra)))
            status = "attention" if covered < 0.9 else "on_track"
            headline = f"Savings last to age {run_out}, the plan runs to {end_age}"
            detail = (f"Retire at {ra}. Your savings cover about {round(covered*100)}% of the retirement years in the plan. "
                      "Your advisor is working on closing the gap.")
        else:
            covered = 1.0
            status = "on_track"
            left = depl.get("liquidAssetsAtEndOfPlan") or 0
            headline = f"On track: money lasts beyond age {end_age}"
            detail = f"Retire at {ra}. The plan projects about {money(left)} still saved at the end."
        goals.append((h["first_name"], "retirement", f"Retire at {ra}", (cg.get("date") or "")[:10],
                      covered, status, headline, detail))

    # college, one goal per child, funded by accounts earmarked for college
    edu_goals = {g["name"]: g for g in prof["goals"] if g["type"] == "EDUCATION"}
    college_accounts = [a for a in prof["accounts"] if nice_account_kind(a["account_type"]) == "College"]
    shared = sum(a["balance"] for a in college_accounts if not any(k["first_name"] in a["name"] for k in kids))
    for k in kids:
        g = edu_goals.get(f"College {k['first_name']}")
        if not g:
            continue
        total = g["amount"] * (g["end_year"] - g["start_year"])
        own = sum(a["balance"] for a in college_accounts if k["first_name"] in a["name"])
        saved = own + shared / max(1, len(kids))
        pct = min(1.0, saved / total) if total else 0
        started = g["start_year"] <= 2026
        status = "on_track" if pct >= 0.5 else ("attention" if pct > 0 else "not_started")
        when = "already in college" if started else f"starts {g['start_year']}"
        goals.append((k["first_name"], "college", "College", (chart.get(f"College {k['first_name']}", {}).get("date") or f"{g['start_year']}-08-01")[:10],
                      pct, status, f"{money(saved)} saved of {money(total)}",
                      f"{k['first_name']} is {k['age']} and {when}. Cost in the plan: {money(g['amount'])} a year for {g['end_year']-g['start_year']} years."))

    # purchases (home, car): down payment against cash + brokerage today
    liquid = sum(a["balance"] for a in prof["accounts"] if nice_account_kind(a["account_type"]) in ("Cash", "Investments"))
    for g in prof["goals"]:
        if g["type"] in ("REAL_ESTATE_PURCHASE", "VEHICLE_PURCHASE"):
            pp, loan = g.get("planned_purchase", {}), g.get("planned_loan", {})
            down = pp.get("value_at_purchase", g["amount"]) - loan.get("amount", 0)
            pct = min(1.0, liquid / down) if down else 1.0
            label = "Buy a home" if g["type"] == "REAL_ESTATE_PURCHASE" else "Buy a car"
            goals.append(("Family", "purchase", f"{label} in {g['start_year']}", f"{g['start_year']}-01-01",
                          pct, "on_track" if pct >= 1 else "attention",
                          f"Down payment about {money(down)}",
                          f"Price in the plan {money(pp.get('value_at_purchase', g['amount']))}. Cash and investments today: {money(liquid)} (estimate)."))
        elif g["type"] == "VACATION":
            ok = fcf > 0
            goals.append(("Family", "vacation", f"{money(g['amount'])} vacation every year", "2027-01-01",
                          1.0 if ok else 0.5, "on_track" if ok else "attention",
                          "Covered in your yearly budget" if ok else "Tight this year",
                          "Next trip January 2027."))

    target = float(ef["minRecommendedEFMonths"])
    months = float(v(cash["monthsCovered"]))
    goals.append(("Family", "cushion", "Safety cushion", "",
                  min(1.0, months / target), "on_track" if months >= target else "attention",
                  f"{months:g} months of expenses saved, goal {target:g}",
                  f"Cash you can reach quickly: {money(v(cash['accessibleCash']))}. It covers {months:g} months of spending."))

    for i, g in enumerate(goals):
        cur.execute("INSERT INTO goal (family_slug, member_name, kind, title, target_date, progress, status, headline, detail, sort) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (slug,) + g + (i,))

    # ---------------- advisor timeline ("Proof of Watch") ----------------
    ev = []
    # 1) market shocks: real dates and the family's own back-tested drop; the "check" is simulated
    for e in ia["key_metrics"]["performanceAnalysis"]["perEventDrawdowns"]:
        dd = e["household"]["drawdownPct"]
        if abs(dd) < 0.015:
            continue
        rec = e["household"].get("recoveryDays")
        rec_txt = f" and was back in {rec} days" if rec else ""
        if abs(dd) >= 0.05:
            body = (f"Markets fell hard. Your advisor reviewed your portfolio the same week: it dropped {abs(dd)*100:.1f}%{rec_txt}. "
                    "Your plan was built for drops like this, so nothing needed to change.")
        else:
            body = (f"Your advisor checked your portfolio: a small dip of {abs(dd)*100:.1f}%{rec_txt}. No action needed.")
        ev.append((e["eventDate"], "market", f"Market watch: {e['eventTitle']}", body, dd, 0, 1,
                   "investment-analysis.json perEventDrawdowns"))

    # 2) plan delivered
    ev.append((PLAN_DATE, "plan", "Your financial plan was delivered",
               f"Your advisor built your plan with you. Financial health score: {fh['score']['published_score']} out of 100.",
               None, 0, 1, "financial-health.json score"))

    # 3) signals from the case (rule changes, decisions, life moments)
    for s in sig["signals"]:
        d = s.get("date") or PLAN_DATE
        if s["moment"] == "market":
            continue  # already covered by the market watch entries above
        upcoming = 1 if d > TODAY else 0
        bullets = s["touches_this_family"][:2]
        bullets = [b.split(" (persona")[0].rstrip(".") + "." for b in bullets]
        if s["moment"] == "rule":
            title = "Checked the new 2027 tax rules for you"
        elif upcoming:
            title = "Coming up: " + s["headline"]
        else:
            title = "Next step agreed: " + s["headline"].replace("The plan's first move: ", "")
        ev.append((d, s["moment"], title, " ".join(bullets), None, upcoming, 0, "signals.json " + s["id"]))

    # 4) upcoming dated goals from the plan (next 4 years)
    for g in fh["goals"]["chartGoals"]:
        if not g.get("name"):
            continue
        d = g["date"][:10]
        if TODAY < d <= "2030-12-31" and not any(x[0] == d and x[5] for x in ev):
            ev.append((d, "goal", f"Coming up: {g['name']}",
                       "Your advisor will check in a few months before to make sure the money is ready.",
                       None, 1, 0, "financial-health.json goals.chartGoals"))

    for e in ev:
        cur.execute("INSERT INTO timeline_event (family_slug, date, kind, title, body, impact_pct, upcoming, simulated, source) VALUES (?,?,?,?,?,?,?,?,?)",
                    (slug,) + e)


def main():
    if os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    con.executescript(SCHEMA)
    cur = con.cursor()
    for slug in sorted(os.listdir(CASES)):
        if os.path.isdir(os.path.join(CASES, slug)):
            build_family(cur, slug)
    con.commit()
    for t in ("family", "member", "account", "debt", "goal", "timeline_event", "projection"):
        print(f"{t:15s}", con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0])
    con.close()
    print("Database written to", DB)


if __name__ == "__main__":
    main()
