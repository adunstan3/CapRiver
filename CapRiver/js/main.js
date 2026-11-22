// Mobile menu
(function () {
  var toggle = document.querySelector('.menu-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close Menu' : 'Open Menu');
  });
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
  });
})();

// Fade-in on scroll
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();

// Contact form: validate, then submit to Netlify Forms without leaving the page.
// Netlify emails each submission to contact@capitalriveradvisors.com.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var ok = true;
    form.querySelectorAll('[data-required]').forEach(function (field) {
      var input = field.querySelector('input, textarea');
      var valid = input.value.trim() !== '' && (input.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim()));
      field.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    if (!ok) {
      var first = form.querySelector('.invalid input, .invalid textarea');
      if (first) first.focus();
      return;
    }

    // Personalise the notification email subject
    var subjectInput = form.querySelector('input[name="subject"]');
    subjectInput.value = 'Consultation request from ' +
      form.fname.value.trim() + ' ' + form.lname.value.trim() + ' (capitalriveradvisors.com)';

    var button = form.querySelector('button[type="submit"]');
    var errorBox = document.querySelector('.form-error');
    errorBox.classList.remove('show');
    button.disabled = true;
    button.textContent = 'Sending…';

    // Netlify Forms: POST url-encoded data to the site root
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.style.display = 'none';
      document.querySelector('.form-success').classList.add('show');
    }).catch(function () {
      errorBox.classList.add('show');
      button.disabled = false;
      button.textContent = 'Send message';
    });
  });

  // "No" / "Yes" behave like a single choice
  var boxes = form.querySelectorAll('input[name="declined"]');
  boxes.forEach(function (b) {
    b.addEventListener('change', function () {
      if (b.checked) boxes.forEach(function (o) { if (o !== b) o.checked = false; });
    });
  });
})();

// Testimonial carousel. With a single slide nothing happens (plain quote).
// With 2+ slides: dots, auto-advance every data-interval ms, pause button,
// pauses on hover/focus/hidden tab, swipe on touch, arrow keys, and no
// auto-advance for visitors who prefer reduced motion.
// Runs on DOMContentLoaded so slides added by other scripts are counted.
(function () {
  function init(root) {
    var track = root.querySelector('.carousel__track');
    var slides = track ? track.querySelectorAll('.carousel__slide') : [];
    if (slides.length < 2) return;

    var controls = root.querySelector('.carousel__controls');
    var dotsBox = root.querySelector('.carousel__dots');
    var pauseBtn = root.querySelector('.carousel__pause');
    var interval = parseInt(root.getAttribute('data-interval'), 10) || 7000;
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var index = 0, timer = null, userPaused = reduced, hovering = false, focused = false;

    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'Client testimonials');

    var dots = [];
    slides.forEach(function (slide, i) {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', 'Show testimonial ' + (i + 1) + ' of ' + slides.length);
      dot.addEventListener('click', function () { go(i); restart(); });
      dotsBox.appendChild(dot);
      dots.push(dot);
    });
    controls.hidden = false;

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * index) + '%)';
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === index ? 'false' : 'true'); });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === index ? 'true' : 'false'); });
    }
    function running() { return !userPaused && !hovering && !focused && !document.hidden; }
    function restart() {
      clearInterval(timer);
      timer = running() ? setInterval(function () { go(index + 1); }, interval) : null;
    }
    function setPaused(p) {
      userPaused = p;
      pauseBtn.setAttribute('data-paused', p ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', p ? 'Play testimonials' : 'Pause testimonials');
      restart();
    }

    pauseBtn.addEventListener('click', function () { setPaused(!userPaused); });
    root.addEventListener('mouseenter', function () { hovering = true; restart(); });
    root.addEventListener('mouseleave', function () { hovering = false; restart(); });
    root.addEventListener('focusin', function () {
      // pause for keyboard focus only (a mouse click on a dot shouldn't keep it paused)
      var el = document.activeElement;
      focused = !!(el && el.matches && el.matches(':focus-visible'));
      restart();
    });
    root.addEventListener('focusout', function () { focused = false; restart(); });
    document.addEventListener('visibilitychange', restart);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(index + 1); restart(); }
      else if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
    });

    // Swipe
    var startX = null;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    go(0);
    setPaused(userPaused);
  }

  function initAll() { document.querySelectorAll('[data-carousel]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
})();
