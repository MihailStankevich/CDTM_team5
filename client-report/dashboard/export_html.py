"""Export the whole app as one self-contained HTML page (all families, switch by hash)."""
import re, sys
import app

def body_of(html):
    b = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]
    b = re.sub(r'<header class="top">.*?</header>', "", b, flags=re.S)
    b = re.sub(r"<footer>.*?</footer>", "", b, flags=re.S)
    return b

con = app.db()
fams = con.execute("SELECT slug, name FROM family ORDER BY name").fetchall()
views = []
home = body_of(app.home(con)).replace('href="/family/', 'href="#')
views.append(f'<div class="view" id="v-home" data-view="home">{home}</div>')
for f in fams:
    s = f["slug"]
    b = body_of(app.family_page(con, s))
    for sec in ("watch", "money", "goals"):
        b = b.replace(f'id="{sec}"', f'id="{s}-{sec}"').replace(f'href="#{sec}"', f'href="#{s}" data-jump="{s}-{sec}"')
    views.append(f'<div class="view" id="v-{s}" data-view="{s}" hidden>{b}</div>')
links = "".join(f'<a href="#{f["slug"]}" data-link="{f["slug"]}">{app.e(f["name"])}</a>' for f in fams)
css = app.CSS.replace("body{margin:0;", "body{margin:0;")
out = f"""<title>My Family Plan</title>
<style>{css}
.wrap{{padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}}
a:focus-visible{{outline:3px solid var(--brand-ink);outline-offset:2px}}
@media (prefers-reduced-motion: reduce){{html{{scroll-behavior:auto}}.fam{{transition:none}}}}
</style>
<header class="top"><div class="wrap"><a class="logo" href="#home">My Family Plan</a><div class="switch">{links}</div></div></header>
{''.join(views)}
<footer><div class="wrap">Demo for CDTM VLC Hacks 2026 (Sherpas challenge). Figures come from each family's Sherpas plan.
Advisor names and the dates of advisor actions are simulated; market drops are each family's own back-tested results.</div></footer>
<script>
(function(){{
  var views=[].slice.call(document.querySelectorAll('.view'));
  function show(){{
    var h=(location.hash||'').slice(1); var found=false;
    views.forEach(function(v){{var on=v.dataset.view===h; v.hidden=!on; if(on) found=true;}});
    if(!found){{views[0].hidden=false; h='home';}}
    document.querySelectorAll('[data-link]').forEach(function(a){{a.classList.toggle('on',a.dataset.link===h);}});
    window.scrollTo(0,0);
  }}
  document.addEventListener('click',function(ev){{
    var a=ev.target.closest('[data-jump]'); if(!a) return;
    ev.preventDefault(); var t=document.getElementById(a.dataset.jump); if(t) t.scrollIntoView({{behavior:'smooth'}});
  }});
  window.addEventListener('hashchange',show); show();
}})();
</script>
"""
path = sys.argv[1] if len(sys.argv) > 1 else "family-plan.html"
open(path, "w").write(out)
print(path, len(out))
