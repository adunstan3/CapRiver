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

// Contact form: validate, then open the visitor's email client with the details
// (a static site has no server to receive form posts).
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

    var d = new FormData(form);
    var declined = d.getAll('declined').join(', ') || '—';
    var body = [
      'Name: ' + d.get('fname') + ' ' + d.get('lname'),
      'Email: ' + d.get('email'),
      'Phone: ' + (d.get('phone') || '—'),
      'Business name: ' + (d.get('business') || '—'),
      'Roughly how much financing: ' + (d.get('amount') || '—'),
      "What it's for: " + (d.get('purpose') || '—'),
      'Declined for a loan in the last 12 months: ' + declined,
      '',
      d.get('message')
    ].join('\n');
    var subject = 'Consultation request from ' + d.get('fname') + ' ' + d.get('lname');
    window.location.href = 'mailto:contact@capitalriveradvisors.com?subject=' +
      encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

    form.style.display = 'none';
    document.querySelector('.form-success').classList.add('show');
  });

  // "No" / "Yes" behave like a single choice
  var boxes = form.querySelectorAll('input[name="declined"]');
  boxes.forEach(function (b) {
    b.addEventListener('change', function () {
      if (b.checked) boxes.forEach(function (o) { if (o !== b) o.checked = false; });
    });
  });
})();
