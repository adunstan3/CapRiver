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
