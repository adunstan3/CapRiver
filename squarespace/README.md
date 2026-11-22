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

## Testimonials

- **Local dev site:** the testimonial is a carousel with dots, auto-advance every 7 s, a pause button, swipe and arrow keys, and pause on hover or keyboard focus. The dev server adds two clearly-labelled **placeholder** testimonials (`dev/fixtures.js`) so the carousel can be previewed. They never appear in `CapRiver/` or the export.
- **Squarespace:** there is only **one** testimonial, shown as a plain quote. The dots and pause controls stay hidden, and no script is needed.
- **When real testimonials arrive:** add them as extra `.carousel__slide` elements in `CapRiver/index.html` and re-export. The cycling then needs the carousel script on Squarespace, which requires a plan with JavaScript or Code Injection. Two fallbacks if the plan doesn't allow it:
  - (a) a CSS-only auto-cycle, which has no clickable dots
  - (b) stacking the testimonials

  Check the plan in step 2.

## Status

- [x] Exporter, logo lockup, carousel (single testimonial in the export)
- [ ] Step 1: Squarespace sign-in (waiting on the owner)
- [ ] Steps 2–6
