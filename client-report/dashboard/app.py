"""Family dashboard: a small local web app on top of data/sherpas.db.

Only the Python standard library is used (no installs needed).

Run:  python3 app.py            then open http://localhost:8000
      python3 app.py 8080       to use another port
"""
import os
import sqlite3
import sys
from datetime import date
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "data", "sherpas.db")
TODAY = date(2026, 11, 21)
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

KIND = {  # label, css class
    "market": ("Market watch", "k-market"),
    "plan": ("Your plan", "k-plan"),
    "rule": ("Tax and law", "k-rule"),
    "decision": ("Decision", "k-decision"),
    "life": ("Life moment", "k-life"),
    "goal": ("Goal", "k-goal"),
}
STATUS = {
    "on_track": ("On track", "s-ok"),
    "attention": ("Needs attention", "s-warn"),
    "not_started": ("Not started", "s-off"),
}
GOAL_ICON = {"retirement": "R", "college": "C", "purchase": "H", "vacation": "V", "cushion": "S"}


# --------------------------------------------------------------------------- helpers
def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


def money(x, short=False):
    sign = "-" if x < 0 else ""
    x = abs(x)
    if short and x >= 1_000_000:
        return f"{sign}${x/1_000_000:.1f}M"
    if short and x >= 10_000:
        return f"{sign}${x/1000:.0f}k"
    return f"{sign}${x:,.0f}"


def nice_date(s):
    y, m, d = (int(p) for p in s.split("-"))
    return f"{d} {MONTHS[m-1]} {y}"


def to_date(s):
    y, m, d = (int(p) for p in s.split("-"))
    return date(y, m, d)


def e(s):
    return escape(str(s)) if s is not None else ""


# --------------------------------------------------------------------------- charts (inline SVG)
def timeline_svg(events):
    """Horizontal timeline. Market dips hang below the line; plan, rules and decisions sit above it."""
    W, H, L, R = 1000, 260, 30, 30
    axis_y = 110
    start, end = date(2023, 6, 1), date(2027, 12, 31)
    span = (end - start).days

    def x(d):
        return L + (W - L - R) * ((d - start).days / span)

    out = [f'<svg viewBox="0 0 {W} {H}" class="tl-svg" role="img" aria-label="Timeline of what your advisor did">']
    # years
    for yr in range(2024, 2028):
        xx = x(date(yr, 1, 1))
        out.append(f'<line x1="{xx:.1f}" y1="20" x2="{xx:.1f}" y2="{H-20}" class="grid"/>')
        out.append(f'<text x="{xx+4:.1f}" y="{H-8}" class="yr">{yr}</text>')
    tx = x(TODAY)
    out.append(f'<rect x="{tx:.1f}" y="14" width="{W-R-tx:.1f}" height="{H-34}" class="future"/>')
    out.append(f'<line x1="{L}" y1="{axis_y}" x2="{W-R}" y2="{axis_y}" class="axis"/>')
    out.append(f'<line x1="{tx:.1f}" y1="14" x2="{tx:.1f}" y2="{H-20}" class="today"/>')
    out.append(f'<text x="{tx-6:.1f}" y="28" class="today-t" text-anchor="end">Today</text>')
    out.append(f'<text x="{tx+8:.1f}" y="28" class="soon-t">Coming up</text>')

    above_slots = []
    dip_labels = []
    for ev in events:
        d = to_date(ev["date"])
        if d > end:
            continue
        xx = x(d)
        cls = KIND.get(ev["kind"], ("", "k-goal"))[1]
        title = e(f'{nice_date(ev["date"])}: {ev["title"]}')
        if ev["kind"] == "market" and ev["impact_pct"] is not None:
            depth = min(80, 12 + abs(ev["impact_pct"]) * 800)
            near = sum(1 for p in dip_labels if abs(p - xx) < 34)
            dip_labels.append(xx)
            ly = axis_y + depth + 14 + near * 15
            out.append(f'<g><title>{title}</title>'
                       f'<rect x="{xx-5:.1f}" y="{axis_y}" width="10" height="{depth:.1f}" rx="3" class="dip"/>'
                       f'<circle cx="{xx:.1f}" cy="{axis_y}" r="7" class="dot {cls}"/>'
                       f'<text x="{xx:.1f}" y="{ly:.1f}" text-anchor="middle" class="dip-t">-{abs(ev["impact_pct"])*100:.1f}%</text></g>')
        else:
            lvl = sum(1 for s in above_slots if abs(s - xx) < 22)
            above_slots.append(xx)
            yy = axis_y - 30 - lvl * 26
            hollow = " hollow" if ev["upcoming"] else ""
            out.append(f'<g><title>{title}</title>'
                       f'<line x1="{xx:.1f}" y1="{axis_y}" x2="{xx:.1f}" y2="{yy:.1f}" class="stem"/>'
                       f'<circle cx="{xx:.1f}" cy="{yy:.1f}" r="9" class="dot {cls}{hollow}"/></g>')
    out.append("</svg>")
    return "".join(out)


def gauge_svg(score, band):
    import math
    r, cx, cy = 80, 100, 100
    ang = math.pi * (1 - score / 100)
    ex, ey = cx + r * math.cos(ang), cy - r * math.sin(ang)
    large = 0
    color = "var(--ok)" if score >= 70 else ("var(--warn)" if score >= 45 else "var(--bad)")
    return (f'<svg viewBox="0 0 200 120" class="gauge" role="img" aria-label="Score {score} of 100">'
            f'<path d="M20 100 A80 80 0 0 1 180 100" class="g-bg"/>'
            f'<path d="M20 100 A80 80 0 {large} 1 {ex:.1f} {ey:.1f}" stroke="{color}" class="g-fg"/>'
            f'<text x="100" y="92" text-anchor="middle" class="g-num">{score}</text>'
            f'<text x="100" y="114" text-anchor="middle" class="g-sub">out of 100</text></svg>')


def projection_svg(rows, ret_year):
    rows = [r for r in rows if r["year"] <= ret_year + 12]
    W, H, L, R, T, B = 640, 230, 56, 16, 16, 30
    ys = [r["net_worth_today"] for r in rows]
    lo, hi = min(0, min(ys)), max(ys) * 1.08
    x0, x1 = rows[0]["year"], rows[-1]["year"]

    def X(y):
        return L + (W - L - R) * (y - x0) / max(1, (x1 - x0))

    def Y(v):
        return T + (H - T - B) * (1 - (v - lo) / (hi - lo))

    pts = " ".join(f"{X(r['year']):.1f},{Y(r['net_worth_today']):.1f}" for r in rows)
    area = f"{X(x0):.1f},{Y(max(lo,0)):.1f} " + pts + f" {X(x1):.1f},{Y(max(lo,0)):.1f}"
    out = [f'<svg viewBox="0 0 {W} {H}" class="proj" role="img" aria-label="Projected net worth">']
    for i in range(4):
        v = lo + (hi - lo) * i / 3
        out.append(f'<line x1="{L}" x2="{W-R}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" class="grid"/>'
                   f'<text x="{L-6}" y="{Y(v)+4:.1f}" text-anchor="end" class="ax">{money(v, True)}</text>')
    for yr in range(x0, x1 + 1, 5):
        out.append(f'<text x="{X(yr):.1f}" y="{H-8}" text-anchor="middle" class="ax">{yr}</text>')
    out.append(f'<polygon points="{area}" class="p-area"/><polyline points="{pts}" class="p-line"/>')
    if x0 <= ret_year <= x1:
        rx = X(ret_year)
        out.append(f'<line x1="{rx:.1f}" x2="{rx:.1f}" y1="{T}" y2="{H-B}" class="ret"/>'
                   f'<text x="{rx-6:.1f}" y="{T+12}" text-anchor="end" class="ret-t">Retirement</text>')
    first = rows[0]
    out.append(f'<circle cx="{X(first["year"]):.1f}" cy="{Y(first["net_worth_today"]):.1f}" r="5" class="p-now"/>')
    out.append("</svg>")
    return "".join(out)


# --------------------------------------------------------------------------- pages
CSS = """
:root{--bg:#f5f3ee;--card:#fff;--ink:#1d2a2a;--muted:#5d6b6b;--line:#e4e0d6;--brand:#1f5f5b;--brand-ink:#1f5f5b;--brand-soft:#e3efed;--onbrand:#fff;--onbrand-soft:#dcebe9;
--ok:#2e7d4f;--ok-soft:#e2f2e8;--warn:#b7791f;--warn-soft:#fbf0dc;--bad:#b4442f;--off:#8a8f8f;--off-soft:#eeeeec;
--market:#4a6fa5;--plan:#1f5f5b;--rule:#7b5ea7;--decision:#c0673a;--life:#b7791f;--goal:#2e7d4f;
--track:#ece8df;--axis:#9aa5a5;--future:#f3f7f6;--tick:#7a8585;--dip:#cfdbee;--stem:#b9c2c2;--body2:#384646;--soon-line:#cfe2df}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#121a1a;--card:#1b2525;--ink:#e6ecea;--muted:#9fb0ae;--line:#2c3a39;--brand:#24706a;--brand-ink:#7cc7bf;--brand-soft:#1b3331;--onbrand:#fff;--onbrand-soft:#d5ebe8;
--ok:#55b480;--ok-soft:#1a3325;--warn:#e0a64a;--warn-soft:#3a2e17;--bad:#e07a63;--off:#9aa0a0;--off-soft:#2a3131;
--market:#7f9fd0;--plan:#3a9d95;--rule:#a68ad1;--decision:#e08a5c;--life:#e0a64a;--goal:#55b480;
--track:#2f3b3a;--axis:#6c7b7a;--future:#172221;--tick:#8d9b9a;--dip:#2e3f5c;--stem:#4a5857;--body2:#cbd6d4;--soon-line:#2a4643;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121a1a;--card:#1b2525;--ink:#e6ecea;--muted:#9fb0ae;--line:#2c3a39;--brand:#24706a;--brand-ink:#7cc7bf;--brand-soft:#1b3331;--onbrand:#fff;--onbrand-soft:#d5ebe8;
--ok:#55b480;--ok-soft:#1a3325;--warn:#e0a64a;--warn-soft:#3a2e17;--bad:#e07a63;--off:#9aa0a0;--off-soft:#2a3131;
--market:#7f9fd0;--plan:#3a9d95;--rule:#a68ad1;--decision:#e08a5c;--life:#e0a64a;--goal:#55b480;
--track:#2f3b3a;--axis:#6c7b7a;--future:#172221;--tick:#8d9b9a;--dip:#2e3f5c;--stem:#4a5857;--body2:#cbd6d4;--soon-line:#2a4643;color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--brand-ink)}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header.top{background:var(--brand);color:var(--onbrand);padding:14px 0}
header.top .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.logo{font-weight:700;letter-spacing:.3px;color:var(--onbrand);text-decoration:none;font-size:18px}
.switch{display:flex;gap:6px;flex-wrap:wrap}
.switch a{color:var(--onbrand-soft);text-decoration:none;padding:5px 12px;border-radius:999px;font-size:14px;border:1px solid rgba(255,255,255,.25)}
.switch a.on{background:var(--card);color:var(--brand-ink);font-weight:600}
.hero{padding:34px 0 10px}
.hero h1{font-size:34px;margin:0 0 6px;line-height:1.2}
.hero p{margin:0;color:var(--muted);font-size:18px}
.watch{display:flex;gap:14px;flex-wrap:wrap;margin:22px 0 6px}
.pill-big{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 16px;flex:1 1 200px}
.pill-big b{display:block;font-size:24px;color:var(--brand-ink)}
.pill-big span{color:var(--muted);font-size:14px}
nav.jump{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line);margin-top:18px}
nav.jump .wrap{display:flex;gap:6px;overflow-x:auto;padding:10px 20px}
nav.jump a{white-space:nowrap;text-decoration:none;color:var(--ink);padding:7px 14px;border-radius:999px;background:var(--card);border:1px solid var(--line);font-size:15px}
section{padding:30px 0 6px;scroll-margin-top:64px}
section h2{font-size:26px;margin:0 0 4px}
section .lead{color:var(--muted);margin:0 0 18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:820px){.grid2,.grid4{grid-template-columns:1fr 1fr}.hero h1{font-size:28px}}
@media(max-width:560px){.grid2,.grid4{grid-template-columns:1fr}}
.tl-svg{width:100%;height:auto;display:block}
.tl-svg .grid,.proj .grid{stroke:var(--track);stroke-width:1}
.tl-svg .axis{stroke:var(--axis);stroke-width:2}
.tl-svg .future{fill:var(--future)}
.tl-svg .today{stroke:var(--brand);stroke-width:2;stroke-dasharray:4 4}
.tl-svg .today-t{fill:var(--brand-ink);font-size:13px;font-weight:700}
.tl-svg .soon-t{fill:var(--muted);font-size:13px}
.tl-svg .yr,.proj .ax{fill:var(--tick);font-size:13px}
.tl-svg .dip{fill:var(--dip)}
.tl-svg .dip-t{fill:var(--market);font-size:12px;font-weight:600}
.tl-svg .stem{stroke:var(--stem);stroke-width:1.5}
.dot{stroke:var(--card);stroke-width:2.5}
.dot.hollow{fill:var(--card)!important;stroke-width:3}
.dot.k-market{fill:var(--market)}.dot.k-plan{fill:var(--plan)}.dot.k-rule{fill:var(--rule)}.dot.k-decision{fill:var(--decision)}.dot.k-life{fill:var(--life)}.dot.k-goal{fill:var(--goal)}
.dot.hollow.k-goal{stroke:var(--goal)}.dot.hollow.k-life{stroke:var(--life)}.dot.hollow.k-decision{stroke:var(--decision)}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;color:var(--muted);margin-top:8px}
.legend i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.feed{list-style:none;margin:0;padding:0}
.feed li{display:grid;grid-template-columns:110px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line)}
.feed li:first-child{border-top:0}
.feed .when{color:var(--muted);font-size:14px;padding-top:2px}
.feed h3{margin:0 0 4px;font-size:18px}
.feed p{margin:0;color:var(--body2)}
.tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;margin-bottom:6px;color:var(--onbrand)}
.tag.k-market{background:var(--market)}.tag.k-plan{background:var(--plan)}.tag.k-rule{background:var(--rule)}.tag.k-decision{background:var(--decision)}.tag.k-life{background:var(--life)}.tag.k-goal{background:var(--goal)}
.soon{background:var(--brand-soft);border-color:var(--soon-line)}
.kpi .lbl{color:var(--muted);font-size:14px}
.kpi .val{font-size:28px;font-weight:700;margin:2px 0}
.kpi .hint{font-size:14px;color:var(--muted)}
.kpi .val.neg{color:var(--bad)}
.score{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.gauge{width:200px}
.g-bg{fill:none;stroke:var(--track);stroke-width:16;stroke-linecap:round}
.g-fg{fill:none;stroke-width:16;stroke-linecap:round}
.g-num{font-size:40px;font-weight:700;fill:var(--ink)}
.g-sub{font-size:13px;fill:var(--muted)}
.bars{flex:1;min-width:220px}
.bar-row{margin:8px 0}
.bar-row .t{display:flex;justify-content:space-between;font-size:14px}
.bar{height:10px;background:var(--track);border-radius:999px;overflow:hidden;margin-top:4px}
.bar i{display:block;height:100%;border-radius:999px}
.stack{display:flex;height:26px;border-radius:8px;overflow:hidden;margin:6px 0 10px}
.stack i{display:block;height:100%}
.list{list-style:none;margin:0;padding:0}
.list li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:15px}
.list li:first-child{border-top:0}
.list .sub{color:var(--muted);font-size:13px}
.proj{width:100%;height:auto}
.p-area{fill:var(--brand-soft)}.p-line{fill:none;stroke:var(--brand-ink);stroke-width:3}
.p-now{fill:var(--brand-ink)}.ret{stroke:var(--warn);stroke-dasharray:5 4;stroke-width:2}.ret-t{fill:var(--warn);font-size:13px;font-weight:600}
.step{display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line)}
.step:first-child{border-top:0}
.step .up{background:var(--ok-soft);color:var(--ok);font-weight:700;border-radius:10px;padding:6px 10px;white-space:nowrap;font-size:14px}
.people{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.person .who{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.avatar{width:44px;height:44px;border-radius:50%;background:var(--brand);color:var(--onbrand);display:grid;place-items:center;font-weight:700;font-size:18px}
.avatar-fam{background:var(--decision)}
.person h3{margin:0;font-size:19px}
.person .sub{color:var(--muted);font-size:14px}
.goal{padding:12px 0;border-top:1px solid var(--line)}
.goal .row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.goal b{font-size:16px}
.goal p{margin:6px 0 0;font-size:14px;color:var(--muted)}
.goal .head{font-size:15px;margin-top:6px}
.status{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}
.s-ok{background:var(--ok-soft);color:var(--ok)}.s-warn{background:var(--warn-soft);color:var(--warn)}.s-off{background:var(--off-soft);color:var(--off)}
.bar i.s-ok{background:var(--ok)}.bar i.s-warn{background:var(--warn)}.bar i.s-off{background:var(--off)}
footer{color:var(--muted);font-size:13px;padding:36px 0 40px}
.fams{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin:24px 0 40px}
.fam{text-decoration:none;color:inherit;display:block;transition:transform .1s}
.fam:hover{transform:translateY(-2px);border-color:var(--brand-ink)}
.fam h3{margin:0 0 4px;font-size:21px}
.fam .sub{color:var(--muted);font-size:15px}
.fam .go{margin-top:14px;color:var(--brand-ink);font-weight:600}
"""


def page(title, body, slug=None, families=()):
    links = "".join(
        f'<a href="/family/{f["slug"]}" class="{"on" if f["slug"] == slug else ""}">{e(f["name"])}</a>' for f in families)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(title)}</title><style>{CSS}</style></head>
<body><header class="top"><div class="wrap"><a class="logo" href="/">My Family Plan</a><div class="switch">{links}</div></div></header>
{body}
<footer><div class="wrap">Demo for CDTM VLC Hacks 2026 (Sherpas challenge). Figures come from each family's Sherpas plan.
Advisor names and the dates of advisor actions are simulated; market drops are each family's own back-tested results.</div></footer>
</body></html>"""


def home(con):
    fams = con.execute("SELECT * FROM family ORDER BY name").fetchall()
    cards = []
    for f in fams:
        members = con.execute("SELECT first_name, role FROM member WHERE family_slug=? ORDER BY sort", (f["slug"],)).fetchall()
        kids = [m["first_name"] for m in members if m["role"] == "child"]
        who = f"with {', '.join(kids)}" if kids else "just me"
        cards.append(f'<a class="card fam" href="/family/{f["slug"]}"><h3>{e(f["name"])}</h3>'
                     f'<div class="sub">{e(f["city"])}, {e(f["state"])} · {e(who)}</div>'
                     f'<div class="sub">Advisor: {e(f["advisor"])}</div><div class="go">Open our plan →</div></a>')
    body = (f'<div class="wrap"><div class="hero"><h1>Who is looking at their plan?</h1>'
            f'<p>Pick a family. Each family only sees its own page.</p></div>'
            f'<div class="fams">{"".join(cards)}</div></div>')
    return page("My Family Plan", body, families=fams)


def family_page(con, slug):
    f = con.execute("SELECT * FROM family WHERE slug=?", (slug,)).fetchone()
    if not f:
        return None
    fams = con.execute("SELECT slug, name FROM family ORDER BY name").fetchall()
    members = con.execute("SELECT * FROM member WHERE family_slug=? ORDER BY sort", (slug,)).fetchall()
    events = con.execute("SELECT * FROM timeline_event WHERE family_slug=? ORDER BY date", (slug,)).fetchall()
    past = [x for x in events if not x["upcoming"]]
    future = [x for x in events if x["upcoming"]]
    accounts = con.execute("SELECT * FROM account WHERE family_slug=? ORDER BY balance DESC", (slug,)).fetchall()
    debts = con.execute("SELECT * FROM debt WHERE family_slug=? ORDER BY rate DESC", (slug,)).fetchall()
    pillars = con.execute("SELECT * FROM pillar WHERE family_slug=?", (slug,)).fetchall()
    steps = con.execute("SELECT * FROM next_step WHERE family_slug=?", (slug,)).fetchall()
    proj = con.execute("SELECT * FROM projection WHERE family_slug=? ORDER BY year", (slug,)).fetchall()
    goals = con.execute("SELECT * FROM goal WHERE family_slug=? ORDER BY sort", (slug,)).fetchall()

    adults = [m for m in members if m["role"] != "child"]
    last = past[-1]
    checks = len(past)
    market_checks = sum(1 for x in past if x["kind"] == "market")
    big = min((x for x in past if x["kind"] == "market"), key=lambda x: x["impact_pct"], default=None)

    # ---- hero
    hero = (f'<div class="wrap"><div class="hero"><h1>Hi {e(f["name"])}</h1>'
            f'<p>{e(f["advisor"])}, your advisor, keeps an eye on your plan so you don\'t have to.</p>'
            f'<div class="watch">'
            f'<div class="pill-big"><b>{nice_date(last["date"])}</b><span>Last check on your plan: {e(last["title"].lower())}</span></div>'
            f'<div class="pill-big"><b>{checks} times</b><span>your advisor looked at your plan when something happened</span></div>'
            f'<div class="pill-big"><b>{market_checks} market drops</b><span>checked against your money. None needed a change.</span></div>'
            f'</div></div></div>'
            '<nav class="jump"><div class="wrap"><a href="#watch">What your advisor did</a>'
            '<a href="#money">Your money</a><a href="#goals">Your goals</a></div></nav>')

    # ---- section 1: timeline
    feed = []
    for x in reversed(past):
        lab, cls = KIND.get(x["kind"], ("", ""))
        feed.append(f'<li><div class="when">{nice_date(x["date"])}</div><div><span class="tag {cls}">{lab}</span>'
                    f'<h3>{e(x["title"])}</h3><p>{e(x["body"])}</p></div></li>')
    soon = []
    for x in future:
        lab, cls = KIND.get(x["kind"], ("", ""))
        soon.append(f'<li><div class="when">{nice_date(x["date"])}</div><div><span class="tag {cls}">{lab}</span>'
                    f'<h3>{e(x["title"])}</h3><p>{e(x["body"])}</p></div></li>')
    legend = ("".join(f'<span><i style="background:var(--{k})"></i>{KIND[k][0]}</span>'
                      for k in ("market", "plan", "rule", "decision", "goal")))
    big_txt = (f' The biggest drop was {e(big["title"].replace("Market watch: ", ""))}: '
               f'your money fell {abs(big["impact_pct"])*100:.1f}% and your plan held.') if big else ""
    s1 = (f'<section id="watch"><div class="wrap"><h2>What your advisor has done for you</h2>'
          f'<p class="lead">Every dot is a moment your advisor checked your plan. Bars below the line show how much your own money dipped when markets fell.{big_txt}</p>'
          f'<div class="card">{timeline_svg(events)}<div class="legend">{legend}<span>Hollow dot: coming up</span></div></div>'
          f'<div class="grid2" style="margin-top:16px"><div class="card"><h3 style="margin-top:0">Latest first</h3><ul class="feed">{"".join(feed)}</ul></div>'
          f'<div class="card soon"><h3 style="margin-top:0">Coming up next</h3><ul class="feed">{"".join(soon) or "<li>Nothing scheduled.</li>"}</ul></div></div>'
          f'</div></section>')

    # ---- section 2: money
    fcf = f["free_cash_flow"]
    fcf_hint = "left over after all bills and savings" if fcf >= 0 else "you spend a bit more than comes in"
    kpis = (f'<div class="grid4">'
            f'<div class="card kpi"><div class="lbl">What you own minus what you owe</div><div class="val">{money(f["net_worth"])}</div><div class="hint">Net worth, home included</div></div>'
            f'<div class="card kpi"><div class="lbl">Savings and investments</div><div class="val">{money(f["investable"])}</div><div class="hint">You add {money(f["yearly_savings"])} a year</div></div>'
            f'<div class="card kpi"><div class="lbl">Debts</div><div class="val">{money(f["total_debt"])}</div><div class="hint">{len(debts)} loans and cards</div></div>'
            f'<div class="card kpi"><div class="lbl">Each year</div><div class="val {"neg" if fcf < 0 else ""}">{money(fcf)}</div><div class="hint">{fcf_hint}</div></div>'
            f'</div>')
    pill_rows = "".join(
        f'<div class="bar-row"><div class="t"><span>{e(p["name"])}</span><span>{e(p["points"])}</span></div>'
        f'<div class="bar"><i class="{"s-ok" if p["score"] >= 70 else ("s-warn" if p["score"] >= 40 else "s-off")}" style="width:{max(3, p["score"])}%;'
        f'{"background:var(--bad)" if p["score"] < 40 else ""}"></i></div></div>' for p in pillars)
    score_card = (f'<div class="card"><h3 style="margin-top:0">Financial health score</h3><div class="score">{gauge_svg(f["score"], f["band"])}'
                  f'<div class="bars">{pill_rows}</div></div></div>')

    colors = {"Cash": "#7fb7a4", "Investments": "#4a6fa5", "Retirement": "#1f5f5b", "College": "#c0a14a", "Health savings": "#9b7bb8"}
    by_kind = {}
    for a in accounts:
        by_kind[a["kind"]] = by_kind.get(a["kind"], 0) + a["balance"]
    tot = sum(by_kind.values()) or 1
    stack = "".join(f'<i style="width:{v/tot*100:.2f}%;background:{colors.get(k, "#999")}" title="{e(k)}"></i>' for k, v in by_kind.items())
    keys = "".join(f'<span><i style="background:{colors.get(k, "#999")};border-radius:3px"></i>{e(k)} {money(v)}</span>' for k, v in by_kind.items())
    acc_list = "".join(f'<li><span>{e(a["name"])}<div class="sub">{e(a["owner"])}</div></span><b>{money(a["balance"])}</b></li>' for a in accounts)
    debt_list = "".join(
        f'<li><span>{e(d["name"])}<div class="sub">{(d["rate"] or 0)*100:.1f}% interest · {money(d["monthly_payment"] or 0)} a month</div></span><b>{money(d["balance"])}</b></li>'
        for d in debts) or "<li>No debts.</li>"
    where = (f'<div class="card"><h3 style="margin-top:0">Where your money is</h3><div class="stack">{stack}</div>'
             f'<div class="legend">{keys}</div><ul class="list" style="margin-top:10px">{acc_list}</ul></div>')
    owe = f'<div class="card"><h3 style="margin-top:0">What you owe</h3><ul class="list">{debt_list}</ul></div>'
    first_ad = adults[0]
    ret_year = TODAY.year + (first_ad["retirement_age"] - first_ad["age"])
    projc = (f'<div class="card"><h3 style="margin-top:0">Where your plan is heading</h3>'
             f'<p class="lead" style="margin:0 0 8px;font-size:15px">Net worth year by year, in today\'s dollars, if you follow the plan.</p>'
             f'{projection_svg(proj, ret_year)}</div>')
    step_html = "".join(
        f'<div class="step"><span class="up">+{s["score_after"] - s["score_before"]} pts</span><div><b>{e(s["title"])}</b>'
        f'<div class="sub" style="color:var(--muted);font-size:15px">{e(s["action"])}</div></div></div>' for s in steps)
    nexts = f'<div class="card"><h3 style="margin-top:0">What your advisor suggests next</h3>{step_html}</div>'
    s2 = (f'<section id="money"><div class="wrap"><h2>Your money at a glance</h2>'
          f'<p class="lead">{e(f["summary"])}</p>{kpis}'
          f'<div class="grid2" style="margin-top:16px">{score_card}{nexts}</div>'
          f'<div style="margin-top:16px">{projc}</div>'
          f'<div class="grid2" style="margin-top:16px">{where}{owe}</div></div></section>')

    # ---- section 3: goals per person
    people = []
    groups = [(m["first_name"], m) for m in members] + [("Family", None)]
    for name, m in groups:
        gs = [g for g in goals if g["member_name"] == name]
        if not gs:
            continue
        if m is None:
            sub, av, label = "Shared by everyone", '<div class="avatar avatar-fam">F</div>', "The whole family"
        else:
            role = {"client": "", "co-client": "", "child": "child, "}[m["role"]]
            sub = f'{role}{m["age"]} years old'
            av = f'<div class="avatar">{e(name[0])}</div>'
            label = name
        items = []
        for g in gs:
            st, sc = STATUS.get(g["status"], ("", "s-off"))
            when = f' · {nice_date(g["target_date"])[-8:]}' if g["target_date"] else ""
            items.append(f'<div class="goal"><div class="row"><b>{e(g["title"])}<span class="sub" style="font-weight:400">{e(when)}</span></b>'
                         f'<span class="status {sc}">{st}</span></div>'
                         f'<div class="bar"><i class="{sc}" style="width:{max(2, g["progress"]*100):.0f}%"></i></div>'
                         f'<div class="head">{e(g["headline"])}</div><p>{e(g["detail"])}</p></div>')
        people.append(f'<div class="card person"><div class="who">{av}<div><h3>{e(label)}</h3><div class="sub">{e(sub)}</div></div></div>{"".join(items)}</div>')
    s3 = (f'<section id="goals"><div class="wrap"><h2>How everyone\'s goals are going</h2>'
          f'<p class="lead">One card per person. The bar shows how far along each goal is today.</p>'
          f'<div class="people">{"".join(people)}</div></div></section>')

    return page(f'{f["name"]}: my family plan', hero + s1 + s2 + s3, slug=slug, families=fams)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/") or "/"
        con = db()
        try:
            if path == "/":
                html = home(con)
            elif path.startswith("/family/"):
                html = family_page(con, path.split("/")[2])
            else:
                html = None
        finally:
            con.close()
        if html is None:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not found")
            return
        data = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


def main():
    if not os.path.exists(DB):
        import build_db
        build_db.main()
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Open http://localhost:{port}  (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
