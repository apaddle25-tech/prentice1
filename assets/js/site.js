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

    /* Visibility is held as state and playback is derived from it, rather than
       play/pause being fired straight from the observer callback. Two reasons,
       both found in testing:

       - The first IntersectionObserver callback can report isIntersecting
         false while layout is still settling. Pausing directly from that
         callback stops the hero that the autoplay attribute had just started,
         and nothing ever starts it again.
       - At DOMContentLoaded a video may still be at readyState 0. play() then
         can reject, and a one-shot attempt leaves it paused for good.

       sync() is idempotent, so it is safe to call from the observer, from
       canplay, from the pause pill and from a reduced-motion change. */
    var visible = new WeakMap();

    function sync() {
      videos.forEach(function (v) {
        var shouldPlay = !userPaused && !reduced.matches && visible.get(v) !== false;
        if (shouldPlay && v.paused) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});   // power saving, etc.
        } else if (!shouldPlay && !v.paused) {
          v.pause();
        }
      });
    }

    if (canObserve) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
        sync();
      }, { threshold: 0.15 });
      videos.forEach(function (v) { io.observe(v); });
    }

    // A video that was not ready on the first attempt gets another one.
    videos.forEach(function (v) { v.addEventListener("canplay", sync); });
    sync();

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
        sync();
        render();
      });
    });
    render();

    // Honour a mid-session change to the OS motion setting.
    reduced.addEventListener("change", function (e) {
      if (e.matches) userPaused = true;
      sync();
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

    /* The track is scrolled by a rAF tween rather than
       scrollTo({behavior:'smooth'}), for two reasons.

       Correctness: native smooth scrolling on this container was measured not
       to move it at all — scrollLeft stayed at 0 with snap set to mandatory,
       proximity and none alike, while behavior:'auto' worked every time.
       Assigning scrollLeft per frame avoids that path entirely.

       Brand: §07 puts every motion on cubic-bezier(0.22,0.7,0.2,1) under
       600ms. Native smooth scroll has its own duration and curve and cannot
       be told otherwise, so it could not have satisfied the rule regardless. */
    function bezier(x) {
      // cubic-bezier(0.22, 0.7, 0.2, 1) solved for y at progress x.
      var x1 = 0.22, y1 = 0.7, x2 = 0.2, y2 = 1;
      function cx(t) { return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t; }
      function cy(t) { return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t; }
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 20; i++) {         // bisection: plenty for 420ms
        if (cx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return cy(t);
    }

    var tween = null;
    function scrollTrackTo(left) {
      if (tween) cancelAnimationFrame(tween);
      var from = track.scrollLeft;
      var delta = left - from;
      if (reduced.matches || !delta) { track.scrollLeft = left; return; }

      var t0 = performance.now(), dur = 420;
      (function frame(now) {
        var p = Math.min(1, (now - t0) / dur);
        track.scrollLeft = from + delta * bezier(p);
        if (p < 1) tween = requestAnimationFrame(frame); else tween = null;
      })(t0);
    }

    /* `wrap` is set by the → button and the auto-advance, not by the dots.

       The last card cannot usually be scrolled to its own offset: several
       cards fit at once, so scrollLeft maxes out at scrollWidth - clientWidth
       and the final index is unreachable. Without the atEnd test, advancing
       from the last reachable position asks for an offset the browser clamps,
       the track does not move, and the carousel silently stops cycling. */
    function goTo(i, wrap) {
      var last = cards.length - 1;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      var target = (wrap && (i > last || atEnd)) ? 0 : Math.max(0, Math.min(last, i));
      // scrollIntoView would also scroll the page vertically to reach the
      // track; this moves only this container.
      scrollTrackTo(target * step());
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
    if (next) next.addEventListener("click", function () { goTo(index() + 1, true); });
    dots.forEach(function (d, n) {
      d.addEventListener("click", function () { goTo(n); });
    });

    paint();

    /* Auto-advance, 4s. Stops while the track is hovered or holds focus,
       while the tab is hidden, and entirely under reduced motion. */
    if (reduced.matches) return;

    var timer = null;
    function start() { if (!timer) timer = setInterval(function () { goTo(index() + 1, true); }, 4000); }
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
     Online classroom feature tour

     The markup is a plain list, each item carrying its own figure, so the
     section reads in full without this script (§13). Here the list becomes
     a vertical tablist and every figure moves into one stage beside it.

     It steps every 6s. It stops while the pointer is over it or focus is in
     it, while it is off screen or the tab is hidden, and never starts under
     reduced motion. A visitor who picks a feature has taken over, so the
     tour stops for good. The pause pill is the WCAG 2.2.2 control. The only
     motion is a 380ms crossfade (§07).
     -------------------------------------------------------------------- */
  function initFeatures() {
    var root = document.querySelector("[data-features]");
    if (!root) return;

    var list  = root.querySelector(".features__list");
    var items = Array.prototype.slice.call(root.querySelectorAll(".features__item"));
    if (!list || items.length < 2) return;

    var menu  = document.createElement("div");
    var stage = document.createElement("div");
    var ctrl  = document.createElement("div");
    var pause = document.createElement("button");
    menu.className = "features__menu";
    stage.className = "features__stage";
    ctrl.className = "features__ctrl";
    pause.type = "button";
    pause.className = "features__pause";

    list.setAttribute("role", "tablist");
    list.setAttribute("aria-orientation", "vertical");

    var tabs = [], bodies = [], figs = [];
    items.forEach(function (item, i) {
      var head = item.querySelector(".features__t");
      var body = item.querySelector(".features__b");
      var fig  = item.querySelector(".features__fig");

      // The heading's content moves into a button that takes its place; the
      // tablist must own its tabs, so the list item becomes presentational.
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "features__tab";
      tab.id = "feature-tab-" + (i + 1);
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "feature-panel-" + (i + 1));
      while (head.firstChild) tab.appendChild(head.firstChild);
      item.replaceChild(tab, head);
      item.setAttribute("role", "presentation");

      fig.id = "feature-panel-" + (i + 1);
      fig.setAttribute("role", "tabpanel");
      fig.setAttribute("aria-labelledby", tab.id);
      stage.appendChild(fig);

      tabs.push(tab); bodies.push(body); figs.push(fig);
    });

    root.insertBefore(menu, list);
    menu.appendChild(list);
    ctrl.appendChild(pause);
    menu.appendChild(ctrl);
    root.appendChild(stage);
    root.classList.add("features--on");

    var current = 0;
    var video = stage.querySelector("[data-features-video]");
    if (video) {
      // The autoplay attribute is for a visitor without this script; with it,
      // playback is ours, and a hidden panel's clip must not decode unseen.
      video.removeAttribute("autoplay");
      video.addEventListener("play", function () { syncVideo(); });
    }

    function select(i, focus) {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, n) {
        var on = n === current;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        bodies[n].hidden = !on;
        figs[n].setAttribute("aria-hidden", on ? "false" : "true");
      });
      if (focus) tabs[current].focus();
      syncVideo();
    }

    /* Autoplay state. `stopped` is the visitor's choice (the pill, or picking
       a feature) and outlasts hover and focus; hover, focus and visibility are
       momentary. `pilled` is only the pill: picking the 3D feature should play
       its clip, but a visitor who pressed pause has asked for nothing to move. */
    var stopped = reduced.matches;
    var pilled = reduced.matches;
    var hovered = false, focused = false, onScreen = true;
    var timer = null;

    function running() { return !stopped && !hovered && !focused && onScreen && !document.hidden; }

    function syncVideo() {
      if (!video) return;
      var shouldPlay = !pilled && !reduced.matches && onScreen && !document.hidden && figs[current].contains(video);
      if (shouldPlay && video.paused) {
        if (video.preload === "none") video.preload = "metadata";
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!shouldPlay && !video.paused) {
        video.pause();
      }
    }

    function sync() {
      if (running() && !timer) {
        timer = setInterval(function () { select(current + 1, false); }, 6000);
      } else if (!running() && timer) {
        clearInterval(timer); timer = null;
      }
      pause.textContent = stopped ? "▶ PLAY" : "❚❚ PAUSE";
      pause.setAttribute("aria-label", stopped ? "Play the feature tour" : "Pause the feature tour");
      syncVideo();
    }

    tabs.forEach(function (t, n) {
      t.addEventListener("click", function () {
        stopped = true;
        select(n, false);
        sync();
      });
      t.addEventListener("keydown", function (e) {
        var to = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") to = current + 1;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = current - 1;
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = tabs.length - 1;
        if (to === null) return;
        e.preventDefault();
        stopped = true;
        select(to, true);
        sync();
      });
    });

    pause.addEventListener("click", function () {
      stopped = !stopped;
      pilled = stopped;
      // Leaving focus on the pill would otherwise hold the tour paused.
      if (!stopped) { focused = false; }
      sync();
    });

    root.addEventListener("mouseenter", function () { hovered = true; sync(); });
    root.addEventListener("mouseleave", function () { hovered = false; sync(); });
    root.addEventListener("focusin", function (e) { if (e.target !== pause) { focused = true; sync(); } });
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) { focused = false; sync(); }
    });
    document.addEventListener("visibilitychange", sync);
    if (canObserve) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.25 }).observe(root);
    }
    reduced.addEventListener("change", function (e) {
      if (e.matches) stopped = pilled = true;
      sync();
    });

    select(0, false);
    sync();
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

     THE PATH IS /api/, NOT /v1/. The API defines the route as
     /v1/session-state, but the API is a PRIVATE Render service that nothing
     outside can reach. app.prentice1.com is Next, and next.config.ts rewrites
     /api/:path* to the API's /v1/:path*. So /v1/session-state 404s from a
     browser and /api/session-state is the public path — measured, not
     reasoned: 404 and 200 respectively.

     This is worth a comment because the failure is invisible. Signed-out is
     also the designed fallback, so a wrong path here does not throw or look
     broken; it just silently never shows Dashboard to anyone, ever. Verify
     against the live app after any change.
     -------------------------------------------------------------------- */
  function initAuthNav() {
    var APP = "https://app.prentice1.com";
    var logIn = document.getElementById("authLogIn");
    var dash  = document.getElementById("authDashboard");
    var out   = document.getElementById("authLogOut");
    var rule  = document.getElementById("authDivider");
    if (!logIn || !dash || !out) return;

    function show(signedIn) {
      logIn.hidden = !!signedIn;
      dash.hidden = !signedIn;
      out.hidden = !signedIn;
      // Exactly one of the three is now visible, so the divider has something
      // to separate. It stays hidden if this never runs.
      if (rule) rule.hidden = false;
    }
    show(false);

    function check() {
      fetch(APP + "/api/session-state", { credentials: "include", cache: "no-store" })
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

  /* --------------------------------------------------------------------
     Analytics

     GA4 is agreed but the property does not exist yet. The tag is wired and
     inert: set GA4_ID to the measurement ID and it starts, change nothing
     else. It stays empty rather than carrying a placeholder because a tag
     with a bogus ID still sends hits to Google — it would set cookies and
     create a consent obligation while collecting nothing usable.
     -------------------------------------------------------------------- */
  var GA4_ID = "";   // e.g. "G-XXXXXXXXXX"

  function initAnalytics() {
    if (!GA4_ID) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }

  /* -------------------------------------------------------------------- */
  initHashRedirect();
  onReady(function () {
    initMenu();
    initAuthNav();
    initVideo();
    initCarousel();
    initFeatures();
    initFaq();
    initReveal();
    initProgress();
    initAnalytics();
  });
})();
