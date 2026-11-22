#!/usr/bin/env python3
"""
Export the static site (../CapRiver) as paste-ready Squarespace pieces.

Squarespace "hybrid" approach:
  - Each page's content goes in ONE full-width Code Block (HTML only, no JS).
  - All styling goes in Design > Custom CSS, scoped under `.crx` so it can't
    clash with Squarespace's own styles.
  - Squarespace's native header, navigation and Form Block are kept.

Outputs (squarespace/out/):
  custom-css-FULL.css -> the ENTIRE Custom CSS box (existing site rules + ours); replace, never append
  custom.css          -> just the generated part (for reference)
  page-home.html      -> Code Block on the home page
  page-about.html     -> Code Block on /our-team
  page-services.html  -> Code Block on /services
  page-contact.html   -> Code Block on /contact (intro only; form = native Form Block)
  footer.html         -> Code Block in the site footer
  images.txt          -> images to upload (Custom CSS > Manage Custom Files)

Image URLs: after uploading, record each Squarespace URL in
squarespace/image-urls.json  ({"banner.webp": "https://images.squarespace-cdn.com/..."})
and re-run. Missing ones are left as {{IMG:name}} placeholders and reported.

Usage: python3 squarespace/export.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(ROOT, "..", "CapRiver"))
OUT = os.path.join(ROOT, "out")
URLS_FILE = os.path.join(ROOT, "image-urls.json")
OVERRIDES = os.path.join(ROOT, "squarespace-overrides.css")
EXISTING_CSS = os.path.join(ROOT, "backup", "custom-css-original.css")  # site's pre-existing Custom CSS
SCOPE = ".crx"

PAGES = {  # local file -> (output name, Squarespace URL slug)
    "index.html": ("page-home.html", "/"),
    "about.html": ("page-about.html", "/our-team"),
    "services.html": ("page-services.html", "/services"),
    "contact.html": ("page-contact.html", "/contact"),
}
LINK_MAP = {f: slug for f, (_, slug) in PAGES.items()}

# Rules for parts Squarespace provides natively (header/nav/mobile menu, our JS form states)
DROP_SELECTOR_PREFIXES = (".site-header", ".brand", ".site-nav", ".menu-toggle", ".menu-open",
                          ".skip-link", ".logo img", ".form-success", ".form-error", ".hp",
                          ".reveal", ".form", "#contact-form", ".btn[disabled]")

image_urls = {}
missing_images = set()
used_images = set()


def img_url(name):
    used_images.add(name)
    if name in image_urls:
        return image_urls[name]
    missing_images.add(name)
    return "{{IMG:%s}}" % name


# ---------------------------------------------------------------- CSS ---
def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def match_brace(s, i):
    """i = index of '{'; return index of the matching '}'."""
    depth = 0
    for j in range(i, len(s)):
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return j
    raise ValueError("unbalanced braces")


def scope_selector(sel):
    sel = sel.strip()
    if sel in ("html", "body", ":root"):
        return SCOPE
    for root in ("html ", "body "):
        if sel.startswith(root):
            return SCOPE + " " + sel[len(root):]
    return SCOPE + " " + sel


def split_decls(body):
    """Split a rule body on ';' that are outside quotes/parentheses."""
    parts, buf, depth, quote = [], "", 0, None
    for ch in body:
        if quote:
            buf += ch
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == ";" and depth == 0:
            parts.append(buf)
            buf = ""
            continue
        buf += ch
    if buf.strip():
        parts.append(buf)
    return parts


def less_safe(body):
    """Squarespace compiles Custom CSS with LESS, which does maths on '/' and
    min()/max(). Wrap such values in LESS escapes (~"...") so they pass through."""
    out = []
    for decl in split_decls(body):
        if ":" not in decl:
            out.append(decl)
            continue
        prop, val = decl.split(":", 1)
        imp = ""
        if val.rstrip().endswith("!important"):
            val, imp = val.rstrip()[:-len("!important")], " !important"
        probe = re.sub(r"url\((\"[^\"]*\"|'[^']*'|[^)]*)\)", "URL", val)
        if "/" in probe or re.search(r"\b(min|max)\(", probe):
            v = val.strip()
            if '"' not in v:
                val = f' ~"{v}"'
            elif "'" not in v:
                val = f" ~'{v}'"
            else:
                raise ValueError(f"can't LESS-escape value: {v}")
        out.append(f"{prop}:{val}{imp}")
    return ";".join(out) + (";" if out else "")


def keep_rule(selectors):
    return not all(s.strip().startswith(DROP_SELECTOR_PREFIXES) for s in selectors)


def scope_css(css):
    out = []
    i = 0
    while True:
        j = css.find("{", i)
        if j == -1:
            break
        prelude = css[i:j].strip()
        k = match_brace(css, j)
        body = css[j + 1:k]
        if prelude.startswith("@media") or prelude.startswith("@supports"):
            inner = scope_css(body)
            if inner.strip():
                out.append(f"{prelude} {{\n{inner}}}\n")
        elif prelude.startswith("@"):
            out.append(f"{prelude} {{{body}}}\n")  # keyframes etc: unchanged
        else:
            sels = [s for s in prelude.split(",") if s.strip()]
            if keep_rule(sels):
                sels = [s for s in sels if not s.strip().startswith(DROP_SELECTOR_PREFIXES)]
                scoped = ",\n".join(scope_selector(s) for s in sels)
                out.append(f"{scoped} {{{less_safe(body)}}}\n")
        i = k + 1
    return "".join(out)


def build_css():
    css = strip_comments(open(os.path.join(SITE, "css", "styles.css"), encoding="utf-8").read())
    css = re.sub(r'url\("\.\./images/([^"]+)"\)', lambda m: f'url("{img_url(m.group(1))}")', css)
    scoped = scope_css(css)
    header = (
        "/* Capital River Advisors - generated by squarespace/export.py. Do not edit in Squarespace;\n"
        "   edit the repo and re-export. Everything is scoped under .crx */\n"
        "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');\n\n"
    )
    overrides = ""
    if os.path.exists(OVERRIDES):
        overrides = "\n/* ---- Squarespace overrides ---- */\n" + open(OVERRIDES, encoding="utf-8").read()
    return header + scoped + overrides


# --------------------------------------------------------------- HTML ---
def inner(html, tag_open_re, tag):
    m = re.search(tag_open_re, html)
    if not m:
        raise ValueError(f"no {tag}")
    start = m.end()
    end = html.index(f"</{tag}>", start)
    return html[start:end]


def clean_html(fragment):
    fragment = re.sub(r"<!--.*?-->", "", fragment, flags=re.S)
    # No JS on Squarespace: reveal-on-scroll elements must simply be visible
    fragment = re.sub(r'\s*\breveal\b', "", fragment)
    fragment = re.sub(r'class="\s*"', "", fragment)
    fragment = re.sub(r'class="\s+', 'class="', fragment)
    # Links to Squarespace slugs
    fragment = re.sub(r'href="(index|about|services|contact)\.html(#[\w-]+)?"',
                      lambda m: f'href="{LINK_MAP[m.group(1) + ".html"]}{m.group(2) or ""}"', fragment)
    # Images
    fragment = re.sub(r'src="images/([^"]+)"', lambda m: f'src="{img_url(m.group(1))}"', fragment)
    fragment = re.sub(r'\s+loading="lazy"', "", fragment)
    # Tidy blank lines
    fragment = re.sub(r"\n\s*\n+", "\n", fragment).strip("\n")
    return fragment


def contact_intro_only(main_html):
    """Keep the intro; the form + photo are built natively (Form Block + Image Block)."""
    m = re.search(r'<div class="contact-intro[^"]*">.*?</div>\s*</div>', main_html, flags=re.S)
    if not m:
        raise ValueError("contact intro not found")
    return ('<section class="section section--white page-intro" style="padding-bottom:0">\n'
            '  <div class="container">\n' + m.group(0) + "\n  </div>\n</section>")


def wrap(fragment, note):
    return f'<!-- {note} (generated by squarespace/export.py) -->\n<div class="crx">\n{fragment}\n</div>\n'


def main():
    global image_urls
    if os.path.exists(URLS_FILE):
        image_urls = json.load(open(URLS_FILE, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)

    for local, (outname, slug) in PAGES.items():
        html = open(os.path.join(SITE, local), encoding="utf-8").read()
        main_html = inner(html, r'<main id="main">', "main")
        if local == "contact.html":
            main_html = contact_intro_only(main_html)
        frag = clean_html(main_html)
        with open(os.path.join(OUT, outname), "w", encoding="utf-8") as f:
            f.write(wrap(frag, f"Code Block for {slug}"))

    home = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
    footer = inner(home, r'<footer class="site-footer">', "footer")
    with open(os.path.join(OUT, "footer.html"), "w", encoding="utf-8") as f:
        f.write(wrap('<footer class="site-footer">' + clean_html(footer) + "</footer>", "Footer Code Block"))

    generated = build_css()
    with open(os.path.join(OUT, "custom.css"), "w", encoding="utf-8") as f:
        f.write(generated)
    # The complete Custom CSS box: the site's existing rules (kept verbatim) + ours.
    # Always paste this whole file, replacing the box's contents.
    existing = open(EXISTING_CSS, encoding="utf-8").read().rstrip() + "\n"
    with open(os.path.join(OUT, "custom-css-FULL.css"), "w", encoding="utf-8") as f:
        f.write(existing + "\n/* ===== Capital River redesign: generated below this line ===== */\n" + generated)

    with open(os.path.join(OUT, "images.txt"), "w", encoding="utf-8") as f:
        for name in sorted(used_images):
            f.write(os.path.join(SITE, "images", name) + "\n")

    sizes = {n: os.path.getsize(os.path.join(OUT, n)) for n in sorted(os.listdir(OUT))}
    for n, sz in sizes.items():
        print(f"  {n:22} {sz:>7,} bytes")
    if missing_images:
        print("\nImages still needing Squarespace URLs (add to squarespace/image-urls.json):")
        for n in sorted(missing_images):
            print("  -", n)
    return 0


if __name__ == "__main__":
    sys.exit(main())
