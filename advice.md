# Advice for the next agent working on Capital River Advisors

This is a handover. It records how this project works, what the owner likes, and the hard-won tricks for making changes safely. Read it fully before touching anything. Also read `squarespace/README.md`, which has the detailed Squarespace record and status, and `dev/README.md`.

---

## 1. What this project is

- **Live site:** https://www.capitalriveradvisors.com, a consulting business (Ethan Dunstan, a former commercial banker).
- **Host:** Squarespace, **Business plan**, version **7.1** (Fluid Engine). It stays on Squarespace. Netlify was explored (`netlify.toml` exists) but is not used.
- **Source of truth:** this repo. The site is designed and edited as plain static HTML/CSS in `CapRiver/`, then exported into Squarespace by `squarespace/export.py` (the "hybrid" approach, see section 5).
- **Repo:** https://github.com/adunstan3/CapRiver (public, branch `main`). Never commit secrets or personal details.

```
CapRiver/            the site (index, about, services, contact .html; css/styles.css; js/main.js; images/)
dev/                 dev-only tools, never deployed (server.py, comments.js, phone.html, fixtures.js)
squarespace/         export.py → out/ (paste-ready pieces), squarespace-overrides.css,
                     image-urls.json, backup/custom-css-original.css, README.md (status + record)
netlify.toml         unused alternative host config
```

---

## 2. Working agreement with the owner

- **Commit locally whenever you like. Push to GitHub only when the owner asks.** End commit messages with the attribution line the harness gives you.
- **Ask before any change that reaches the live Squarespace site.** Use hidden draft pages first (section 5). Site-wide changes count: Custom CSS, header, footer, navigation and page swaps. Once the owner has approved a specific plan, carry it out fully and report back.
- **Never type passwords.** The owner signs in to Squarespace themselves in Chrome.
- **Never delete or modify these Squarespace pages:**
  - the old pages in *Not Linked*: `Home OLD (backup)`, `About/Services/Contact OLD (backup)` (slugs `*-backup-2026`), and the "… FIRM", "About Us" and similar copies
  - the saved footer and contact sections
  
  They are rollbacks and the owner's own drafts.
- **Domain/DNS:** the domain is registered at Cloudflare and its DNS is managed there, and email runs through **iCloud** MX records. Never touch MX or TXT records.
- **Finish what you start:** the owner expects you to keep going without check-ins once a task is approved. Do verify your work with screenshots and measurements, and report results plainly.

---

## 3. The owner's review loop (most work arrives this way)

1. Start the dev server: `python3 dev/server.py` (port 8000). Add `--lan` to test on a real phone over Wi-Fi.
2. The owner Ctrl+clicks elements on http://localhost:8000 and types or dictates comments. These are saved to `dev/comments.json`; an orange counter and dots show open comments.
3. **When the owner says "implement the comments" / "do the next round":**
   - Read `dev/comments.json`. Each comment has `page`, `selector`, `element`, `text`, `comment` and `viewport`.
   - **`viewport` matters.** A narrow width (for example `390x844`) or one marked `(phone view)` means the comment is about the **phone layout only**. Fix it inside `@media (max-width: 900px)` and leave desktop alone. Desktop-width comments apply generally, unless they're clearly desktop-only.
   - Fix everything, check it visually, then delete each comment: `curl -s -X DELETE http://localhost:8000/__dev/comments/<id>`. The counter drops live. End the turn only when the file is `[]`.
   - Commit locally with a message listing what each comment asked for.
4. If a change must also go live, update Squarespace afterwards (section 6). The owner usually says so, or asks you to.

**Dev tools:**
- `dev/phone.html` (the 📱 button on every page) shows the site in a phone frame with a device picker.
- `dev/fixtures.js` injects **two clearly-labelled placeholder testimonials** so the carousel can be previewed. They must never appear in `CapRiver/` or in the Squarespace export.
- The dev server also auto-reloads pages when files change, and mocks Netlify Forms locally.

---

## 4. Design decisions and owner preferences (keep these consistent)

- **Font:** Poppins. Weights 300 for body, 500 for headings, plus 400 and 600.
- **Colours:** navy `#04083a`, teal `#0ca9bc`, ink `#34363b`, tint (light blue-grey) `#e9f1f5`.
- **Section rhythm:** sections alternate **white ↔ tint**. The owner removed the navy sections; one consistent secondary colour. Neighbouring sections must always differ, and the footer is tint.
- **Hero (homepage):** the covered-bridge photo sits behind a **light, even navy overlay**, with soft text shadows for readability. The owner wanted to *see* the photo.
  - The text is **locked to bands of the photo**: headline in the sky, intro on the bridge's dark body, and "Virtual engagements" plus the button over the **water**, not the light sand or gravel.
  - Band percentages, measured from pixel rows of `banner.webp` (2500×1011, ratio 2.47):

    | Band | % of photo height |
    |---|---|
    | sky and hills | 0–30 |
    | roof | 30–37.5 |
    | bridge body | 37.5–59 |
    | bank and gravel bar | 59–74 |
    | water | 74–91 |
    | gravel | 91–100 |

  - **Trick:** if the hero is never wider than the photo's ratio, `background-size: cover` scales by height, so hero % equals photo %.
    - **Desktop:** `height: max(620px, min(82vh, 900px), calc(100vw / 2.47))`.
    - **Phones:** fixed 760 px.
    - Grid rows match the bands.
    - Re-measure if the photo or the text changes. I checked placement at 360/375/390/430/768/1024/1280/1440/1920/2560 px.
  - **Desktop:** headline centred; intro block centred with the text left-aligned inside it; button group centred. No full stop on the headline.
- **Header:** the icon and "CAPITAL RIVER / ADVISORS" text side by side, compact, about 100 px tall.
- **Copy:** the owner edits wording via comments. Examples: no first-person "I" in the homepage service cards; "Wachovia Bank" not "Wachovia"; "engaging in" not "sitting in". Don't rewrite copy unprompted.
- **Services page:**
  - no service icons
  - "My approach" comes before the three engagements and ends with "I offer three kinds of engagements:"
  - "I'm not a broker" is its own callout (no full stop)
- **Testimonials:** a carousel. Dots, 7 s per slide (the owner's preference was about 5 s; 7 s was chosen for readability, with a pause button), pause on hover or keyboard focus, swipe, and no autoplay with reduced motion.
  - With **one** testimonial it's a plain quote with the controls hidden. **Squarespace gets exactly one testimonial** until real new ones arrive.
  - The carousel script then needs adding on Squarespace (the Business plan allows JavaScript).
- **Phone-specific choices:**
  - Contact page: photo hidden, Send button centred.
  - "Meet Ethan" and About: heading above the photo.
  - The "Why" cards are 2×2 on desktop and a single column on phones.
  - Left-aligned "Why" heading and closing CTA text on phones, with the button centred.
  - Landscape phones: spacing is capped with `min(…vw, …px)` so there are no huge gaps.
- **Navigation:** Home, About, Services, Contact. **Home is hidden on the homepage** (CSS `.homepage …`).
- **Homepage "Learn more" links** go to `/services#bank-ready`, `#right-capital` and `#cash-flow`.

---

## 5. How the site lives on Squarespace (hybrid "option C")

- **Page content:** each page's content (`<main>`) is **one full-width Code Block**, plain HTML wrapped in `<div class="crx">`. There's no JavaScript; reveal animations are stripped.
- **Styling:** all of it is in **Design › Custom CSS**, scoped under `.crx`.
  - The box holds the site's **original 38 lines first**, kept verbatim (backed up in `squarespace/backup/custom-css-original.css`), then ours.
  - `out/custom-css-FULL.css` is the complete box content.
- **Native pieces:**
  - the header (logo `out/logo-lockup.png`, Logo Height 74 px, mobile max 50 px, header Height 1.2vw)
  - the navigation
  - the **Contact Form Block**: a copy of the old contact section, sitting right after our intro Code Block
- **Footer:** one Code Block (`out/footer.html`).
- **Images:** in Custom CSS › Custom Files. The URLs are in `squarespace/image-urls.json`, and the export substitutes them.
- **Slugs:** `/` (homepage page slug `home-2026`), `/our-team` (About), `/services`, `/contact`. The SEO titles and descriptions were copied from the old pages; the homepage SEO is site-wide.

Run `python3 squarespace/export.py` after any change in `CapRiver/` or in `squarespace-overrides.css`.

**Squarespace gotchas (all learned the hard way):**
- **Custom CSS is compiled by LESS 1.3.3.** It does maths on `/`, `min()` and `max()`. The exporter wraps such values as `~"…"`. Hand-written overrides must avoid `/` (use `grid-row-start` and `grid-row-end`, not `grid-row: 1 / 2`).
- **The header overlays the first section.** Squarespace pads the first section's top by the header height, so the overrides remove only side and bottom padding (`.page-section:has(.crx)`).
- **Margins leaking out of `.crx`** made strips of the grey section background show through. `.crx { display: flow-root }` fixes that.
- **The Fluid Engine grid** has margin columns. For sections holding `.crx` it's turned off (`.fluid-engine:has(.crx) { display:block }`).
- **Contact form section:** it's targeted only as the section **after** our intro (`.page-section:has(.crx) + .page-section`). Its rows collapse to one auto row so the form and photo tops align. Native blocks centre their content vertically, so it uses `justify-content: flex-start`.
- **Squarespace form class names:**
  - `.form-button-wrapper` (button)
  - `.fields.name .caption` (the "(required)" labels)
  - `.form-item.textarea textarea`
- **The homepage `<body>`** has class `homepage`.
- **Page slugs must be unique**; `/our-team-old` was already taken, so backups use `-backup-2026`. The slug field adds the leading `/` itself, so don't type one.
- **Moving pages between Main Navigation and Not Linked** works by dragging in the Pages panel, and often needs two drags. Check the result by reading the header nav links in the preview iframe.

---

## 6. Updating the live Squarespace site (Claude in Chrome)

- **Setup:** the owner runs Claude Code with `claude --chrome`, then signs in at `https://www.capitalriveradvisors.com/config`. The admin lives at `https://sheep-blueberry-ymkx.squarespace.com/config/…`.
- **Always paste content by script and verify it with SHA-256 against the export.** Never retype it by hand:
  - **Custom CSS editor = CodeMirror 5:** `document.querySelector('.CodeMirror').CodeMirror`. Read with `getValue()`, write with `setValue()`.
    - Prefer **targeted replacements**: compute old→new hunks with difflib, from the last committed `out/custom-css-FULL.css` (= what's saved) to the new one.
    - Apply them in the page, check the SHA-256 equals the new export's, then click Save.
  - **Code Block editor = CodeMirror 6:** `document.querySelector('.cm-editor .cm-content').cmTile.view`, then `view.dispatch({changes:{from:0,to:len,insert}})`. Open it with the block's pencil icon. A new Code Block starts as `<p>Hello, World!</p>`.
  - The tool output filter blocks base64 and long hex, so **compare hashes inside the page** and return only true or false.
  - The admin's Content-Security-Policy blocks `fetch` to localhost. `dev/server.py`'s `/__dev/export/` endpoint therefore doesn't help from the admin.
- **New pages:** Pages › Not Linked **+** › Add Blank › Page, then name it. Then Edit › Add Section › Add Blank, hover › Add Block › search "Code" › pencil › paste › Esc › Save.
- **Testing**
  - Squarespace refuses to be framed, so use the admin's **Mobile View** toggle for phone checks. You can script the preview iframe there, since it's same-origin.
  - Headless Chrome can't go narrower than 500 px.
  - For the local site, use the dev phone frame. It's same-origin, so the iframe can be scripted for measurements.
- **After saving CSS:** spot-check that the live pages (home/about/services/contact) haven't changed, unless they were meant to.
- **Rollback:**
  - Re-paste an older export from git.
  - Or swap slugs and navigation back to the `*-backup-2026` pages.
  - Or use "Set as Homepage" on `Home OLD (backup)`.
  - The old footer is in Saved Sections.

---

## 7. Local verification habits

- **Screenshots:** headless Chrome works, but force `.reveal` elements visible and use `--virtual-time-budget`. When a screenshot looks broken, re-check before "fixing"; it's often load timing.
- **Measure, don't guess:** element bands as % of the hero, horizontal overflow (`scrollWidth > clientWidth`), gaps between elements.
- **Check phones at 360–430 px and landscape at 844×390**, as well as desktop at 1440 and wide screens.

---

## 8. Open items

- Real new testimonials: add them as `.carousel__slide` elements, then add the carousel script on Squarespace (Code Injection, or a script in the homepage Code Block). Mention it to the owner when it comes up.
- The old pages' **social share images** were not copied to the new pages.
- `sitemap`, analytics (Squarespace provides these) and `robots.txt` choices were discussed but not changed. Ask the owner before blocking AI crawlers.
