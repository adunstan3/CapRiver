#!/usr/bin/env python3
"""
DEV-ONLY local server for the Capital River static site.

- Serves ../CapRiver (the production site folder) unchanged on disk.
- Injects dev/comments.js into every HTML response, so the comment tool
  exists only when viewing through this server. Nothing in the site
  folder references it, so it never ships to production.
- Stores comments in dev/comments.json.
- Mocks Netlify Forms: POSTs to "/" are saved to dev/form-submissions.json
  (no email is sent locally).
- Exposes a "version" stamp of the site files so open pages reload
  automatically after the site is edited.

Usage:  python3 dev/server.py [port]      (default port 8000)
"""
import json
import os
import sys
import threading
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DEV_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.path.normpath(os.path.join(DEV_DIR, "..", "CapRiver"))
COMMENTS_FILE = os.path.join(DEV_DIR, "comments.json")
CLIENT_JS = os.path.join(DEV_DIR, "comments.js")
FORMS_FILE = os.path.join(DEV_DIR, "form-submissions.json")
INJECT = b'<script src="/__dev/comments.js"></script>'
LOCK = threading.Lock()


def load_comments():
    try:
        with open(COMMENTS_FILE, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_comments(comments):
    tmp = COMMENTS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(comments, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, COMMENTS_FILE)


def site_version():
    newest = 0.0
    for root, _dirs, files in os.walk(SITE_DIR):
        for name in files:
            try:
                newest = max(newest, os.path.getmtime(os.path.join(root, name)))
            except OSError:
                pass
    return newest


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_DIR, **kwargs)

    def log_message(self, fmt, *args):
        if not self.path.startswith("/__dev/"):
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---- helpers ----
    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 100_000:
            raise ValueError("too large")
        return json.loads(self.rfile.read(length) or b"{}")

    # ---- routes ----
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/__dev/comments.js":
            with open(CLIENT_JS, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/__dev/comments":
            with LOCK:
                self.send_json(load_comments())
            return
        if path == "/__dev/version":
            self.send_json({"version": site_version()})
            return

        # Serve HTML with the dev script injected
        fs_path = self.translate_path(path)
        if os.path.isdir(fs_path):
            fs_path = os.path.join(fs_path, "index.html")
        if fs_path.endswith(".html") and os.path.isfile(fs_path):
            with open(fs_path, "rb") as f:
                html = f.read()
            if b"</body>" in html:
                html = html.replace(b"</body>", INJECT + b"\n</body>", 1)
            else:
                html += INJECT
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return
        super().do_GET()

    def mock_netlify_form(self):
        """Stand-in for Netlify Forms: record the submission locally, send no email."""
        from urllib.parse import parse_qs
        length = int(self.headers.get("Content-Length") or 0)
        fields = parse_qs(self.rfile.read(length).decode("utf-8", "replace"))
        entry = {k: (v if len(v) > 1 else v[0]) for k, v in fields.items()}
        entry["_received"] = time.strftime("%Y-%m-%d %H:%M:%S")
        with LOCK:
            try:
                with open(FORMS_FILE, encoding="utf-8") as f:
                    subs = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                subs = []
            subs.append(entry)
            with open(FORMS_FILE, "w", encoding="utf-8") as f:
                json.dump(subs, f, indent=2, ensure_ascii=False)
        print(f"[dev] form '{entry.get('form-name')}' submission saved to {FORMS_FILE} (no email sent)")
        self.send_json({"ok": True})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        ctype = self.headers.get("Content-Type", "")
        if path == "/" and ctype.startswith("application/x-www-form-urlencoded"):
            self.mock_netlify_form()
            return
        if path != "/__dev/comments":
            self.send_error(404)
            return
        try:
            data = self.read_json()
        except ValueError:
            self.send_error(400)
            return
        text = str(data.get("comment", "")).strip()
        if not text:
            self.send_json({"error": "empty comment"}, 400)
            return
        comment = {
            "id": uuid.uuid4().hex[:8],
            "page": str(data.get("page", "")),
            "selector": str(data.get("selector", "")),
            "element": str(data.get("element", ""))[:600],
            "text": str(data.get("text", ""))[:200],
            "comment": text,
            "created": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        with LOCK:
            comments = load_comments()
            comments.append(comment)
            save_comments(comments)
        self.send_json(comment, 201)

    def do_DELETE(self):
        prefix = "/__dev/comments/"
        if not self.path.startswith(prefix):
            self.send_error(404)
            return
        cid = self.path[len(prefix):]
        with LOCK:
            comments = load_comments()
            remaining = [c for c in comments if c.get("id") != cid]
            save_comments(remaining)
        self.send_json({"deleted": len(comments) - len(remaining)})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    if not os.path.exists(COMMENTS_FILE):
        save_comments([])
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Dev server: http://localhost:{port}/  (serving {SITE_DIR})")
    print(f"Comments:   {COMMENTS_FILE}")
    server.serve_forever()
