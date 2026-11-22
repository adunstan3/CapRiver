# Dev-only tools (do not deploy)

The production site is the `../CapRiver` folder. Deploy only that folder. Nothing in it references this `dev/` folder.

## Run locally

```
python3 dev/server.py        # http://localhost:8000
```

The server serves `../CapRiver` and adds `comments.js` to every HTML page it serves. The script is added in memory only; the HTML files on disk are never changed. Open pages reload automatically when site files change.

## Commenting

- **Ctrl+click** any element to open a comment box. **Enter** saves, **Shift+Enter** adds a new line, and **Esc** cancels.
- An orange dot marks each element that has a comment. Click the dot to read or delete its comments.
- The orange counter at the top center shows the total number of open comments across all pages.
- Comments are saved in `dev/comments.json`. Each entry has `page`, `selector`, `element` (the element's opening tag), `text` (its visible text) and `comment`.

## Resolving comments (workflow for Claude)

1. Read `dev/comments.json`.
2. For each comment, make the change in `../CapRiver`, then remove that comment:
   `curl -s -X DELETE http://localhost:8000/__dev/comments/<id>`
   The counter drops live as each comment is removed.
3. Finish when `comments.json` is `[]`.
