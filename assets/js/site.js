/* ============================================================================
   Prentice1 — shared behaviour
   No dependencies. Every effect here is capped by Brand Book §07: one curve,
   nothing over 600ms, nothing bounces, nothing slides in from an edge, and
   reduced motion collapses it all.
   ========================================================================= */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --------------------------------------------------------------------
     Motion gate.

     §13: "no content depends on motion." The stylesheet keeps every revealed
     element visible by default and only applies the hidden state under
     .motion-ready. We set that class here, after confirming the observer
     exists — so if this script fails to parse, fails to load, or runs in a
     browser without IntersectionObserver, the page still reads in full
     instead of staying blank.
     -------------------------------------------------------------------- */
  var canObserve = "IntersectionObserver" in window;
  if (canObserve && !reduced.matches) {
    document.documentElement.classList.add("motion-ready");
  }

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* --------------------------------------------------------------------
     Reveal on scroll
     -------------------------------------------------------------------- */
  function initReveal() {
    if (!canObserve || reduced.matches) return;

    var targets = document.querySelectorAll(".rv, .unveil");
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
        e.target.querySelectorAll("[data-count]").forEach(countUp);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    // A count-up that is already on screen at load never intersects, so it
    // would sit at its start value forever. Run those immediately.
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var box = el.getBoundingClientRect();
      if (box.top < window.innerHeight && box.bottom > 0) countUp(el);
    });
  }

  /* --------------------------------------------------------------------
     Count-up numerals — 560ms, inside the §07 cap (the old site ran 1600ms).
     -------------------------------------------------------------------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";

    var raw = el.dataset.count;
    var end = parseFloat(raw);
    if (isNaN(end)) return;

    // "3+" and similar keep their suffix through the animation.
    var suffix = String(raw).replace(/^[0-9.]+/, "");

    if (reduced.matches) { el.textContent = end + suffix; return; }

    var t0 = performance.now();
    var dur = 560;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* --------------------------------------------------------------------
     Scroll progress bar
     -------------------------------------------------------------------- */
  function initProgress() {
    var bar = document.querySelector(".progress");
    if (!bar || reduced.matches) return;

    var ticking = false;
    function update() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? window.scrollY / max : 0;
        bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)) + ")";
      });
    }
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  }

  /* --------------------------------------------------------------------
     Background and feature video

     Every clip is decorative and muted. We play only what is on screen, so a
     page with eight videos is not decoding eight streams at once, and we
     never autoplay under reduced motion — the poster frame stands in.
     -------------------------------------------------------------------- */
  function initVideo() {
    var videos = Array.prototype.slice.call(document.querySelectorAll("video[data-bgv]"));
    if (!videos.length) return;

    // Set by the pause control. Once a visitor has paused, scrolling a video
    // back into view must not quietly start it again.
    var userPaused = reduced.matches;

    function playable(v) { return !userPaused && !reduced.matches; }

    if (canObserve) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting && playable(v)) {
            // A rejected play() is normal (power saving, no user gesture on
            // some platforms) and must not throw into the console.
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.15 });
      videos.forEach(function (v) { io.observe(v); });
    } else if (!reduced.matches) {
      videos.forEach(function (v) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    }

    /* WCAG 2.2.2 — a pause control for moving content. Each pill controls
       every video on the page, not just its own section. */
    var pills = document.querySelectorAll("[data-video-toggle]");

    function render() {
      pills.forEach(function (btn) {
        btn.textContent = userPaused ? "▶ PLAY" : "❚❚ PAUSE";
        btn.setAttribute("aria-label",
          userPaused ? "Play background video" : "Pause background video");
      });
    }

    pills.forEach(function (btn) {
      btn.addEventListener("click", function () {
        userPaused = !userPaused;
        videos.forEach(function (v) {
          if (userPaused) {
            v.pause();
          } else {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          }
        });
        render();
      });
    });
    render();

    // Honour a mid-session change to the OS motion setting.
    reduced.addEventListener("change", function (e) {
      if (!e.matches) return;
      userPaused = true;
      videos.forEach(function (v) { v.pause(); });
      render();
    });
  }

  /* --------------------------------------------------------------------
     Faculty carousel
     -------------------------------------------------------------------- */
  function initCarousel() {
    var root = document.querySelector("[data-carousel]");
    if (!root) return;

    var track = root.querySelector("[data-carousel-track]");
    var cards = track ? track.children : [];
    var dots  = root.querySelectorAll("[data-carousel-dot]");
    var prev  = root.querySelector("[data-carousel-prev]");
    var next  = root.querySelector("[data-carousel-next]");
    if (!track || !cards.length) return;

    var GAP = 16;
    function step() { return cards[0].getBoundingClientRect().width + GAP; }
    function index() { return Math.round(track.scrollLeft / step()); }

    function goTo(i) {
      var last = cards.length - 1;
      var target = i > last ? 0 : (i < 0 ? last : i);
      // scrollIntoView would also scroll the page vertically to reach the
      // track; scrollTo moves only this container.
      track.scrollTo({ left: target * step(), behavior: reduced.matches ? "auto" : "smooth" });
    }

    function paint() {
      var i = index();
      dots.forEach(function (d, n) {
        var on = n === i;
        d.classList.toggle("is-on", on);
        d.setAttribute("aria-current", on ? "true" : "false");
      });
    }

    track.addEventListener("scroll", function () {
      clearTimeout(track._t);
      track._t = setTimeout(paint, 80);
    }, { passive: true });

    if (prev) prev.addEventListener("click", function () { goTo(index() - 1); });
    if (next) next.addEventListener("click", function () { goTo(index() + 1); });
    dots.forEach(function (d, n) {
      d.addEventListener("click", function () { goTo(n); });
    });

    paint();

    /* Auto-advance, 4s. Stops while the track is hovered or holds focus,
       while the tab is hidden, and entirely under reduced motion. */
    if (reduced.matches) return;

    var timer = null;
    function start() { if (!timer) timer = setInterval(function () { goTo(index() + 1); }, 4000); }
    function stop()  { clearInterval(timer); timer = null; }

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
    start();
  }

  /* --------------------------------------------------------------------
     FAQ accordion — one open at a time, opacity only (§07).
     -------------------------------------------------------------------- */
  function initFaq() {
    var items = document.querySelectorAll("[data-faq] [data-faq-q]");
    if (!items.length) return;

    items.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        items.forEach(function (other) {
          other.setAttribute("aria-expanded", "false");
          var panel = document.getElementById(other.getAttribute("aria-controls"));
          if (panel) panel.hidden = true;
        });
        if (!open) {
          btn.setAttribute("aria-expanded", "true");
          var panel = document.getElementById(btn.getAttribute("aria-controls"));
          if (panel) panel.hidden = false;
        }
      });
    });
  }

  /* --------------------------------------------------------------------
     Nav auth state

     prentice1.com is static and on a different origin from the app, so it
     cannot read the session cookie. It asks the app instead: the endpoint
     returns one boolean and nothing else, and the cookie is scoped to
     .prentice1.com so the browser sends it.

     SIGNED OUT IS THE DEFAULT. If the app is unreachable, slow, or answers
     with anything unexpected, "Log in" is the honest thing to show, and it
     still works — the app sends anyone without a session to its own sign-in.

     The path is /v1/session-state. An earlier draft of this script called
     /api/session-state, which 404s; because the failure path is also the
     default, that bug was invisible — it just never showed Dashboard to
     anyone. Verify against the live app after any change here.
     -------------------------------------------------------------------- */
  function initAuthNav() {
    var APP = "https://app.prentice1.com";
    var logIn = document.getElementById("authLogIn");
    var dash  = document.getElementById("authDashboard");
    var out   = document.getElementById("authLogOut");
    if (!logIn || !dash || !out) return;

    function show(signedIn) {
      logIn.hidden = !!signedIn;
      dash.hidden = !signedIn;
      out.hidden = !signedIn;
    }
    show(false);

    function check() {
      fetch(APP + "/v1/session-state", { credentials: "include", cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (s) { show(!!(s && s.signed_in === true)); })
        .catch(function () { show(false); });
    }
    check();

    // The back button can restore this page from the bfcache with its old nav
    // — after signing out in the app that would still read "Dashboard".
    window.addEventListener("pageshow", function (e) { if (e.persisted) check(); });
  }

  /* --------------------------------------------------------------------
     Mobile nav
     -------------------------------------------------------------------- */
  function initMenu() {
    var btn = document.querySelector("[data-menu-toggle]");
    var nav = document.getElementById("primary-nav");
    if (!btn || !nav) return;

    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* --------------------------------------------------------------------
     Legacy hash routes

     The previous site was a hash-routed SPA, so shared and bookmarked links
     look like prentice1.com/#/practices. A fragment never reaches the server,
     so no redirect rule at any host can catch these — it has to happen here.
     -------------------------------------------------------------------- */
  function initHashRedirect() {
    var map = {
      "#/practices": "/practices/",
      "#/sponsors":  "/sponsors/",
      "#/applicants": "/",
      "#/": "/"
    };
    var h = location.hash;
    if (!h || h.indexOf("#/") !== 0) return;

    var to = map[h];
    if (!to && h.indexOf("#/checkout") === 0) to = "/apply/";
    if (!to && h.indexOf("#/confirmation") === 0) to = "/apply/";
    if (to && to !== location.pathname) location.replace(to);
  }

  /* -------------------------------------------------------------------- */
  initHashRedirect();
  onReady(function () {
    initMenu();
    initAuthNav();
    initVideo();
    initCarousel();
    initFaq();
    initReveal();
    initProgress();
  });
})();
