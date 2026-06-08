/* jshint esversion: 6 */
;(function () {
  'use strict';

  /* ── Header scroll class ── */
  var header = document.getElementById('site-header');
  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ── Smooth scroll for every internal anchor ── */
  var HEADER_H = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '80', 10
  );
  function scrollToSection(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.scrollY - HEADER_H;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      scrollToSection(href);
      closeMenu();
    });
  });

  /* ── Mobile menu ── */
  var menuToggle = document.querySelector('.menu-toggle');
  var navOverlay = document.getElementById('nav-overlay');
  var closeBtn   = document.querySelector('.nav-overlay-close');

  function openMenu() {
    document.body.classList.add('nav-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    navOverlay.removeAttribute('aria-hidden');
  }
  function closeMenu() {
    document.body.classList.remove('nav-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    navOverlay.setAttribute('aria-hidden', 'true');
  }
  if (menuToggle) menuToggle.addEventListener('click', function () {
    document.body.classList.contains('nav-open') ? closeMenu() : openMenu();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ── Reveal on scroll ── */
  /* Hero items fire immediately */
  window.addEventListener('load', function () {
    document.querySelectorAll('.reveal-hero').forEach(function (el) {
      setTimeout(function () { el.classList.add('is-visible'); }, 80);
    });
  });

  /* Set stagger delays per section so grouped items animate in sequence */
  document.querySelectorAll('section').forEach(function (section) {
    var reveals = section.querySelectorAll('.reveal');
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 0.08, 0.48) + 's';
    });
  });

  /* IntersectionObserver for .reveal */
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -32px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) {
      revealObs.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ── Philosophy: spotlight (desktop) + swipe deck progress (mobile) ── */
  (function () {
    var principlesEl = document.querySelector('.principles');
    if (!principlesEl) return;
    var phItems = Array.prototype.slice.call(principlesEl.querySelectorAll('.principle'));

    if (window.innerWidth <= 767) {
      /* Mobile: inject a thin segmented progress track */
      var prog = document.createElement('div');
      prog.className = 'principle-progress';
      phItems.forEach(function (_, i) {
        var seg = document.createElement('span');
        seg.className = 'principle-progress-seg' + (i === 0 ? ' is-active' : '');
        prog.appendChild(seg);
      });
      principlesEl.parentNode.insertBefore(prog, principlesEl.nextSibling);

      principlesEl.addEventListener('scroll', function () {
        var contLeft = principlesEl.getBoundingClientRect().left;
        var activeIdx = 0, minDist = Infinity;
        phItems.forEach(function (el, i) {
          var d = Math.abs(el.getBoundingClientRect().left - contLeft);
          if (d < minDist) { minDist = d; activeIdx = i; }
        });
        prog.querySelectorAll('.principle-progress-seg').forEach(function (seg, i) {
          seg.classList.toggle('is-active', i === activeIdx);
        });
      }, { passive: true });

    } else {
      /* Desktop: scroll-driven spotlight */
      var phSection    = document.getElementById('philosophy');
      var phInView     = false;
      var phRafPending = false;
      var phActive     = null;

      function updateSpotlight() {
        phRafPending = false;
        if (!phInView) return;
        var midY = window.scrollY + window.innerHeight * 0.5;
        var best = null, bestDist = Infinity;
        phItems.forEach(function (el) {
          var r   = el.getBoundingClientRect();
          var mid = window.scrollY + r.top + r.height / 2;
          var d   = Math.abs(midY - mid);
          if (d < bestDist) { bestDist = d; best = el; }
        });
        if (best === phActive) return;
        /* Dead zone: don't switch unless new winner is at least 15px clearly closer */
        if (phActive) {
          var ar = phActive.getBoundingClientRect();
          var activeDist = Math.abs(midY - (window.scrollY + ar.top + ar.height / 2));
          if (activeDist - bestDist < 15) return;
        }
        phActive = best;
        phItems.forEach(function (el) { el.classList.toggle('is-active', el === best); });
        principlesEl.classList.toggle('has-active', !!best);
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          phInView = entries[0].isIntersecting;
          if (!phInView) {
            phItems.forEach(function (el) { el.classList.remove('is-active'); });
            principlesEl.classList.remove('has-active');
            phActive = null;
          } else {
            updateSpotlight();
          }
        }, { threshold: 0.05 }).observe(phSection);
      }

      window.addEventListener('scroll', function () {
        if (phRafPending) return;
        phRafPending = true;
        requestAnimationFrame(updateSpotlight);
      }, { passive: true });
    }
  })();

  /* ── Timeline: draw animation + scroll-active highlight ── */
  (function () {
    var expSection = document.getElementById('experience');
    if (!expSection) return;
    var tl      = expSection.querySelector('.timeline');
    var tlItems = Array.prototype.slice.call(expSection.querySelectorAll('.tl-item'));
    if (!tl || !tlItems.length) return;

    /* Draw the vertical line when section enters view */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) tl.classList.add('is-drawn');
      }, { threshold: 0.06 }).observe(expSection);
    }

    /* Highlight whichever timeline item is closest to viewport centre */
    var expInView = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        expInView = entries[0].isIntersecting;
        if (!expInView) {
          tlItems.forEach(function (el) { el.classList.remove('is-active'); });
          expSection.classList.remove('has-active');
        } else {
          updateTimeline();
        }
      }, { threshold: 0.05 }).observe(expSection);
    }

    var expRafPending = false;
    var expActive     = null;

    function updateTimeline() {
      expRafPending = false;
      if (!expInView) return;
      var midY = window.scrollY + window.innerHeight * 0.5;
      var best = null, bestDist = Infinity;
      tlItems.forEach(function (el) {
        var r   = el.getBoundingClientRect();
        var mid = window.scrollY + r.top + r.height / 2;
        var d   = Math.abs(midY - mid);
        if (d < bestDist) { bestDist = d; best = el; }
      });
      if (best === expActive) return;
      if (expActive) {
        var ar = expActive.getBoundingClientRect();
        var activeDist = Math.abs(midY - (window.scrollY + ar.top + ar.height / 2));
        if (activeDist - bestDist < 15) return;
      }
      expActive = best;
      tlItems.forEach(function (el) { el.classList.toggle('is-active', el === best); });
      expSection.classList.toggle('has-active', !!best);
    }

    window.addEventListener('scroll', function () {
      if (expRafPending) return;
      expRafPending = true;
      requestAnimationFrame(updateTimeline);
    }, { passive: true });
    updateTimeline();
  })();

  /* ── Active nav highlight ── */
  var sections  = document.querySelectorAll('section[data-section]');
  var navLinks  = document.querySelectorAll('#site-nav .nav-link');

  if ('IntersectionObserver' in window && navLinks.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute('data-section');
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { threshold: 0.38 });

    sections.forEach(function (s) { navObs.observe(s); });
  }

})();
