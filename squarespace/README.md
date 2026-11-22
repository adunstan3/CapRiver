# Squarespace hybrid plan (option C)

The repo is the source of truth. Squarespace hosts the site. Page content and styling are generated from the repo and pasted into Squarespace. Squarespace's own header, navigation and Form Block are kept so its analytics, form emails and SEO tools keep working.

Run `python3 squarespace/export.py`. It writes the following to `squarespace/out/`:

| File | Where it goes in Squarespace |
|---|---|
| `custom.css` | Design › Custom CSS. Every rule is scoped under `.crx`, so it can't affect other content. |
| `page-home.html` | One full-width Code Block on the home page |
| `page-about.html` | One Code Block on `/our-team` |
| `page-services.html` | One Code Block on `/services` |
| `page-contact.html` | Code Block with the intro only. Below it, a native Form Block and an Image Block (`contact-river.jpg`). |
| `footer.html` | Code Block in the site footer |
| `logo-lockup.png` | Header logo: Design › Site Styles, or the header editor |
| `images.txt` | Images to upload in Custom CSS › Manage Custom Files. Record each URL in `image-urls.json`, then re-run the export. |

Snippets contain no JavaScript, and scroll fade-ins are removed. Some Squarespace plans restrict JavaScript, so nothing depends on it.

## Steps

The person driving is Claude through Claude in Chrome. Claude pauses for approval before anything that changes the live site.

1. **Sign in** to Squarespace in Chrome. The owner does this; Claude never types passwords.
2. **Look around, changing nothing.** Confirm the plan tier and whether Custom CSS and Code Blocks are available. Inspect the editor's section and block markup, then write `squarespace/squarespace-overrides.css`. This is what makes Code Block sections full-bleed and styles the native Form Block and header to match. The export appends it to `custom.css`.
3. **Upload images** through Custom CSS › Manage Custom Files. Visitors can't see them there. Fill in `image-urls.json` and re-export.
4. **Hidden draft pages.** Create pages in *Not Linked* (`/home-new`, etc.) and paste in the snippets. Paste `custom.css`, then check that the current live pages look unchanged.
5. **Review** the drafts on desktop and phone. Feedback goes into the repo, then gets re-exported and re-pasted.
6. **Swap in**, only on the owner's go-ahead. The drafts become the live pages, and the old pages move to Not Linked as the rollback.
7. **Later changes:** edit the repo, re-export, and re-paste only the snippets that changed. To roll back, re-paste an older export from git.

## Navigation

The local site shows **Home** (to the left of About) on every page except the homepage. On Squarespace the header is native:

1. Add a Home link to the Main Navigation, first in the list.
2. Hide it on the homepage with a rule in `squarespace-overrides.css`. Squarespace marks the homepage's `<body>` with a `homepage` class. The exact header-nav selector gets confirmed in step 2.

## Testimonials

- **Local dev site:** the testimonial is a carousel with dots, auto-advance every 7 s, a pause button, swipe and arrow keys, and pause on hover or keyboard focus. The dev server adds two clearly-labelled **placeholder** testimonials (`dev/fixtures.js`) so the carousel can be previewed. They never appear in `CapRiver/` or the export.
- **Squarespace:** there is only **one** testimonial, shown as a plain quote. The dots and pause controls stay hidden, and no script is needed.
- **When real testimonials arrive:** add them as extra `.carousel__slide` elements in `CapRiver/index.html` and re-export. The cycling then needs the carousel script on Squarespace, which requires a plan with JavaScript or Code Injection. Two fallbacks if the plan doesn't allow it:
  - (a) a CSS-only auto-cycle, which has no clickable dots
  - (b) stacking the testimonials

  Check the plan in step 2.

## Status

- [x] Exporter, logo lockup, carousel (single testimonial in the export)
- [x] Step 1: signed in (2026-11-22)
- [x] Step 2: looked around, changing nothing:
  - **Plan:** Business. Custom CSS, Code Injection and JavaScript in Code Blocks are all available, so the carousel script can run on Squarespace later.
  - **Existing Custom CSS:** 38 lines covering menu hover colours and alignment fixes for the current About and Contact pages, backed up verbatim to `backup/custom-css-original.css`. Always paste `out/custom-css-FULL.css` (existing rules followed by ours) to replace the whole box.
  - **LESS:** Squarespace compiles Custom CSS with LESS, as the existing `~"511 / 768"` shows. The exporter now escapes every value with `/`, `min()` or `max()`.
  - **Page structure:** `section.page-section > .content-wrapper > .content > .fluid-engine` (a 24-column grid with margin columns) `> .fe-block > .sqs-block`. Overrides are in `squarespace-overrides.css`.
  - **Fonts:** the site loads Poppins only in weights 300, 500 and 700. The `@import` adds 400 and 600.
  - **Homepage:** `<body>` has a `homepage` class, used to hide the Home nav link there.
  - **Pages:** Main Navigation has About, Services and Contact. Not Linked has the homepage plus several older copies ("… FIRM", "About Us", etc.), which must not be touched.
- [x] LESS compile confirmed: Squarespace's compiler (less.js 1.3.3) output keeps the escaped values intact.
- [x] Step 3: images uploaded to Custom CSS › Custom Files; URLs are in `image-urls.json`.
- [x] Custom CSS saved (`out/custom-css-FULL.css`). The live pages were checked and look unchanged.
- [x] Step 4: draft pages in Not Linked:
  - `/home-new-draft`, `/about-new-draft` and `/services-new-draft`: one Code Block each.
  - `/contact-new-draft`: an intro Code Block, then a copy of the live Contact section (saved to Saved Sections, with the copy's heading and text blocks deleted). It keeps Squarespace's native Form Block and photo, lined up by overrides that only target the section after `.crx`.
- **Lessons learned:**
  - Squarespace pads the first section's top by the header height (the header overlays the page), so only side and bottom padding are removed.
  - `.crx { display: flow-root }` stops margins leaking out of our content.
  - The Code Block editor is CodeMirror 6 (set it through `.cm-content.cmTile.view.dispatch`). The Custom CSS editor is CodeMirror 5. Content is loaded by script and checked against a SHA-256 of the export.
  - The admin's CSP blocks fetching from localhost.
- [x] Step 5: owner reviewed the drafts and asked for more space below the Contact form; done.
- [x] **Step 6: swap done (2026-11-22)**:
  - **Header:** logo is now `logo-lockup.png` (Logo Height 74px, Mobile Logo Max Height 50px). Header Height changed from 4.8vw to 1.2vw.
  - **Footer:** now one Code Block with `footer.html`. The old footer section is saved in Saved Sections as a backup.
  - **Navigation:**
    - A **Home** link (`/`) is first in Main Navigation, hidden on the homepage by CSS.
    - Main Navigation is Home, About (`/our-team`), Services (`/services`) and Contact (`/contact`), all pointing at the new pages.
    - The new pages got the old pages' SEO titles and descriptions.
    - The new homepage (slug `/home-2026`) is set as homepage. The homepage SEO comes from the site-wide SEO settings.
  - **Rollback copies in Not Linked:**
    - `Home OLD (backup)` at `/home-1`
    - `About OLD (backup)` at `/our-team-backup-2026`
    - `Services OLD (backup)` at `/services-backup-2026`
    - `Contact OLD (backup)` at `/contact-backup-2026`
  - **To roll back a page:** swap the slugs back, drag the pages back between Main Navigation and Not Linked, or use "Set as Homepage" on `Home OLD`.
  - **Not yet checked on a real phone:** the mobile header logo, the Contact photo being hidden, and the mobile menu.
  - **Not copied:** the pages' Social Image settings (link-preview images), if any were set.

## Updating the live site from now on

Edit `CapRiver/`, run `python3 squarespace/export.py`, then re-paste only what changed:

- a page's Code Block
- `custom-css-FULL.css`, via a targeted replace checked against SHA-256 (see the lessons learned above)
- `footer.html`
