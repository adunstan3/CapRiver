/* DEV-ONLY comment tool. Injected by dev/server.py; never referenced by the site itself.
 *
 *  Ctrl+click any element  -> comment box opens; Enter saves, Shift+Enter = newline, Esc cancels.
 *  Orange dot              -> element has comment(s); click the dot to read/delete them.
 *  Counter (top center)    -> total open comments across all pages.
 *  Page auto-reloads when site files change (unless a comment box is open).
 */
(function () {
  if (window.__devComments) return;
  window.__devComments = true;

  var API = '/__dev/comments';
  var ORANGE = '#ff7a1a';
  var comments = [];
  var lastJSON = '';
  var siteVersion = null;
  var popup = null;
  var hoverEl = null;
  var lastOpen = 0;

  var page = location.pathname === '/' || location.pathname === '' ? '/index.html' : location.pathname;
  if (page.endsWith('/')) page += 'index.html';

  // ---------- styles ----------
  var css = document.createElement('style');
  css.textContent = [
    '.__dc-ui{font:13px/1.4 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:0;color:#222;box-sizing:border-box}',
    '.__dc-ui *{box-sizing:border-box}',
    '.__dc-counter{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483646;background:' + ORANGE + ';color:#fff;border-radius:999px;padding:5px 12px 5px 8px;display:none;align-items:center;gap:7px;box-shadow:0 2px 10px rgba(0,0,0,.2);font-weight:600;cursor:default;user-select:none}',
    '.__dc-counter.show{display:flex}',
    '.__dc-counter b{background:#fff;color:' + ORANGE + ';border-radius:999px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px;font-size:12px}',
    '.__dc-dot{position:absolute;z-index:2147483645;width:16px;height:16px;border-radius:50%;background:' + ORANGE + ';border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15),0 2px 6px rgba(0,0,0,.25);cursor:pointer;color:#fff;font:700 9px/12px -apple-system,Arial,sans-serif;text-align:center;padding:0}',
    '.__dc-dot:hover{transform:scale(1.25)}',
    '.__dc-hover{outline:2px dashed ' + ORANGE + '!important;outline-offset:2px!important;cursor:crosshair!important}',
    '.__dc-target{outline:2px solid ' + ORANGE + '!important;outline-offset:2px!important}',
    '.__dc-pop{position:absolute;z-index:2147483647;width:300px;background:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:10px;border-top:3px solid ' + ORANGE + '}',
    '.__dc-pop textarea{width:100%;min-height:64px;resize:vertical;border:1px solid #ccc;border-radius:6px;padding:7px 8px;font:13px/1.4 inherit;font-family:inherit;color:#222;background:#fff;outline:none}',
    '.__dc-pop textarea:focus{border-color:' + ORANGE + '}',
    '.__dc-pop .__dc-hint{color:#888;font-size:11px;margin-top:6px}',
    '.__dc-pop .__dc-tag{color:#888;font:11px/1.3 ui-monospace,Menlo,monospace;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.__dc-item{padding:7px 0;border-bottom:1px solid #eee;display:flex;gap:8px;align-items:flex-start}',
    '.__dc-item:last-child{border-bottom:0}',
    '.__dc-item p{margin:0;flex:1;white-space:pre-wrap;word-break:break-word}',
    '.__dc-item button{border:0;background:#f2f2f2;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:11px;color:#a33}',
    '.__dc-item button:hover{background:#fde4e4}'
  ].join('\n');
  document.head.appendChild(css);

  // ---------- counter ----------
  var counter = document.createElement('div');
  counter.className = '__dc-ui __dc-counter';
  counter.innerHTML = '<b>0</b><span>comments</span>';
  document.body.appendChild(counter);

  var dotLayer = document.createElement('div');
  dotLayer.className = '__dc-ui';
  document.body.appendChild(dotLayer);

  function isOurs(el) {
    return el && el.closest && el.closest('.__dc-ui');
  }

  // ---------- selector ----------
  function cssEscape(s) { return window.CSS && CSS.escape ? CSS.escape(s) : s; }
  function selectorFor(el) {
    if (el.id && document.querySelectorAll('#' + cssEscape(el.id)).length === 1) return '#' + cssEscape(el.id);
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el === document.body) { parts.unshift('body'); break; }
      if (el.id && document.querySelectorAll('#' + cssEscape(el.id)).length === 1) { parts.unshift('#' + cssEscape(el.id)); break; }
      var tag = el.tagName.toLowerCase();
      var i = 1, sib = el;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) i++;
      var same = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.tagName === el.tagName; }).length : 1;
      parts.unshift(same > 1 ? tag + ':nth-of-type(' + i + ')' : tag);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function describe(el) {
    var clone = el.cloneNode(false);
    clone.classList && clone.classList.remove('__dc-hover', '__dc-target', 'in');
    if (clone.getAttribute && clone.getAttribute('class') === '') clone.removeAttribute('class');
    var open = clone.outerHTML.replace(/<\/[^>]+>$/, '');
    return open;
  }
  function tagLabel(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    Array.prototype.forEach.call(el.classList, function (c) { if (c.indexOf('__dc') !== 0 && c !== 'in') s += '.' + c; });
    return s;
  }

  // ---------- popups ----------
  function closePopup() {
    if (!popup) return;
    if (popup._target) popup._target.classList.remove('__dc-target');
    popup.remove();
    popup = null;
  }
  function placePopup(p, x, y) {
    document.body.appendChild(p);
    var w = p.offsetWidth, h = p.offsetHeight;
    var left = Math.min(Math.max(8, x + 10), window.scrollX + document.documentElement.clientWidth - w - 8);
    var top = y + 12;
    if (top + h > window.scrollY + window.innerHeight - 8) top = Math.max(window.scrollY + 8, y - h - 12);
    p.style.left = left + 'px';
    p.style.top = top + 'px';
  }

  function openComposer(target, pageX, pageY) {
    closePopup();
    clearHover();
    target.classList.add('__dc-target');
    var p = document.createElement('div');
    p.className = '__dc-ui __dc-pop';
    p._target = target;
    p.innerHTML = '<div class="__dc-tag"></div><textarea placeholder="How should this element change?"></textarea><div class="__dc-hint">Enter to save · Shift+Enter for new line · Esc to cancel</div>';
    p.querySelector('.__dc-tag').textContent = tagLabel(target);
    popup = p;
    placePopup(p, pageX, pageY);
    var ta = p.querySelector('textarea');
    ta.focus();
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePopup(); }
      else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        var text = ta.value.trim();
        if (!text) { closePopup(); return; }
        ta.disabled = true;
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: page,
            selector: selectorFor(target),
            element: describe(target),
            text: (target.innerText || target.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 200),
            comment: text
          })
        }).then(function () { closePopup(); refresh(); })
          .catch(function () { ta.disabled = false; alert('Could not save comment — is the dev server running?'); });
      }
    });
  }

  function openViewer(list, dot) {
    closePopup();
    var target = document.querySelector(list[0].selector);
    if (target) target.classList.add('__dc-target');
    var p = document.createElement('div');
    p.className = '__dc-ui __dc-pop';
    p._target = target;
    var html = '<div class="__dc-tag"></div>';
    list.forEach(function (c) {
      html += '<div class="__dc-item"><p></p><button data-id="' + c.id + '">Delete</button></div>';
    });
    p.innerHTML = html;
    p.querySelector('.__dc-tag').textContent = target ? tagLabel(target) : list[0].selector;
    var ps = p.querySelectorAll('.__dc-item p');
    list.forEach(function (c, i) { ps[i].textContent = c.comment; });
    p.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (!b) return;
      fetch(API + '/' + b.getAttribute('data-id'), { method: 'DELETE' }).then(function () { closePopup(); refresh(); });
    });
    popup = p;
    var r = dot.getBoundingClientRect();
    placePopup(p, r.left + window.scrollX, r.bottom + window.scrollY - 6);
  }

  // ---------- ctrl+click capture ----------
  function onCommentGesture(e) {
    if (!e.ctrlKey || isOurs(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var now = Date.now();
    if (now - lastOpen < 400) return; // contextmenu + click can both fire
    lastOpen = now;
    openComposer(e.target, e.pageX, e.pageY);
  }
  document.addEventListener('contextmenu', onCommentGesture, true); // macOS ctrl+click
  document.addEventListener('click', function (e) {
    if (e.ctrlKey) return onCommentGesture(e);
    if (popup && !isOurs(e.target)) closePopup();
  }, true);
  document.addEventListener('mousedown', function (e) {
    if (e.ctrlKey && !isOurs(e.target)) e.preventDefault(); // avoid text selection / focus shifts
  }, true);

  // Hover highlight while Ctrl is held
  function clearHover() { if (hoverEl) { hoverEl.classList.remove('__dc-hover'); hoverEl = null; } }
  document.addEventListener('mousemove', function (e) {
    if (!e.ctrlKey || popup || isOurs(e.target)) { clearHover(); return; }
    if (hoverEl !== e.target) { clearHover(); hoverEl = e.target; hoverEl.classList.add('__dc-hover'); }
  }, true);
  document.addEventListener('keyup', function (e) { if (e.key === 'Control') clearHover(); });
  window.addEventListener('blur', clearHover);

  // ---------- render ----------
  function render() {
    var total = comments.length;
    counter.querySelector('b').textContent = total;
    counter.querySelector('span').textContent = total === 1 ? 'comment' : 'comments';
    counter.classList.toggle('show', total > 0);
    var byPage = {};
    comments.forEach(function (c) { byPage[c.page] = (byPage[c.page] || 0) + 1; });
    counter.title = Object.keys(byPage).map(function (p) { return p + ': ' + byPage[p]; }).join('\n');

    dotLayer.innerHTML = '';
    var groups = {};
    comments.forEach(function (c) {
      if (c.page !== page) return;
      (groups[c.selector] = groups[c.selector] || []).push(c);
    });
    Object.keys(groups).forEach(function (sel) {
      var el;
      try { el = document.querySelector(sel); } catch (err) { el = null; }
      if (!el) return;
      var dot = document.createElement('button');
      dot.className = '__dc-dot';
      dot._el = el;
      dot.title = groups[sel].map(function (c) { return '• ' + c.comment; }).join('\n');
      if (groups[sel].length > 1) dot.textContent = groups[sel].length;
      dot.addEventListener('click', function (e) { e.stopPropagation(); openViewer(groups[sel], dot); });
      dotLayer.appendChild(dot);
    });
    positionDots();
  }

  function positionDots() {
    Array.prototype.forEach.call(dotLayer.children, function (dot) {
      var r = dot._el.getBoundingClientRect();
      var hidden = r.width === 0 && r.height === 0;
      dot.style.display = hidden ? 'none' : '';
      dot.style.left = (r.right + window.scrollX - 8) + 'px';
      dot.style.top = (r.top + window.scrollY - 8) + 'px';
    });
  }
  var raf = 0;
  function schedulePosition() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; positionDots(); }); }
  window.addEventListener('resize', schedulePosition);
  window.addEventListener('scroll', schedulePosition, true);
  window.addEventListener('load', schedulePosition);
  setInterval(positionDots, 1000);

  // ---------- sync with server ----------
  function refresh() {
    return fetch(API, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (data) {
      var j = JSON.stringify(data);
      if (j !== lastJSON) { lastJSON = j; comments = data; render(); }
    }).catch(function () {});
  }
  function checkVersion() {
    fetch('/__dev/version', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (siteVersion === null) { siteVersion = d.version; return; }
      if (d.version !== siteVersion && !popup) {
        try { sessionStorage.setItem('__dc_scroll', String(window.scrollY)); } catch (e) {}
        location.reload();
      }
    }).catch(function () {});
  }
  try {
    var y = sessionStorage.getItem('__dc_scroll');
    if (y !== null) {
      sessionStorage.removeItem('__dc_scroll');
      window.addEventListener('load', function () { window.scrollTo(0, +y); });
    }
  } catch (e) {}

  refresh();
  checkVersion();
  setInterval(refresh, 1500);
  setInterval(checkVersion, 1500);
})();
