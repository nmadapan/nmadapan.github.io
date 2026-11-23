(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  function apply(t) { root.setAttribute('data-theme', t); btn.textContent = t === 'dark' ? '☀️' : '🌙'; }
  apply(root.getAttribute('data-theme'));
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    apply(next);
  });

  var links = document.querySelectorAll('.nav ul a');
  var sections = Array.prototype.map.call(links, function (a) { return document.querySelector(a.getAttribute('href')); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(function (s) { if (s) io.observe(s); });
})();
