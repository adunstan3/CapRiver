/* DEV-ONLY sample content, injected by dev/server.py. Never part of the site.
 *
 * Adds two clearly-labelled placeholder testimonials so the carousel (dots +
 * auto-cycling) can be previewed before real testimonials exist. Runs before
 * DOMContentLoaded, so main.js counts these slides when it sets up the carousel.
 */
(function () {
  var track = document.querySelector('[data-carousel] .carousel__track');
  if (!track) return;

  var samples = [
    {
      quote: 'Placeholder testimonial for previewing the carousel. A real client quote will replace this text when one arrives.',
      name: 'Sample Client (dev preview only)',
      role: 'Placeholder Company · Not shown on the live site'
    },
    {
      quote: 'A second placeholder quote, deliberately a little longer than the first, so you can see how the carousel handles testimonials of different lengths. This text exists only on the local dev server and is never published.',
      name: 'Another Sample Client (dev preview only)',
      role: 'Placeholder Company · Not shown on the live site'
    }
  ];

  samples.forEach(function (t) {
    var slide = document.createElement('div');
    slide.className = 'carousel__slide';
    slide.setAttribute('data-dev-fixture', '');
    var bq = document.createElement('blockquote');
    var p = document.createElement('p');
    p.textContent = '“' + t.quote + '”';
    var cite = document.createElement('cite');
    var strong = document.createElement('strong');
    strong.textContent = t.name;
    var span = document.createElement('span');
    span.textContent = t.role;
    cite.appendChild(strong);
    cite.appendChild(span);
    bq.appendChild(p);
    bq.appendChild(cite);
    slide.appendChild(bq);
    track.appendChild(slide);
  });
})();
