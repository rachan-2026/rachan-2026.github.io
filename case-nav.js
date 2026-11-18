// Case-study section navigator.
// - Shows the nav once the reader scrolls into the case study.
// - On phones, a button shows the current section's name and opens the list.
// - Highlights the section currently being read.
// - Clicking a section scrolls to it (without changing the page address).
// Works with several navs on one page; a nav inside a hidden area is skipped.
(function () {
  if (window.__caseNavReady) {
    if (window.initCaseNav) window.initCaseNav();
    return;
  }
  window.__caseNavReady = true;

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function scopeOf(nav) {
    return nav.closest("[data-route]") || document;
  }
  function find(scope, id) {
    return scope.querySelector('[id="' + id + '"]');
  }

  // A section the reader just clicked stays highlighted until they scroll
  // on their own (wheel, touch or keyboard), even if the page can't scroll far
  // enough to bring that section to the top.
  var pinned = null;
  function unpin() {
    if (pinned) {
      pinned = null;
      schedule();
    }
  }
  window.addEventListener("wheel", unpin, { passive: true });
  window.addEventListener("touchmove", unpin, { passive: true });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var open = document.querySelector("[data-case-nav][data-open]");
      if (open) {
        setOpen(open, false);
        var t = open.querySelector("[data-case-nav-toggle]");
        if (t) t.focus();
        return;
      }
    }
    unpin();
  });

  function update() {
    var vh = window.innerHeight;
    var doc = document.documentElement;
    var atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
    var navs = document.querySelectorAll("[data-case-nav]");
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      if (!nav.getClientRects().length) continue; // hidden (display: none)
      var scope = scopeOf(nav);
      var start = scope.querySelector("[data-case-start]");
      var end = scope.querySelector("[data-case-end]");
      // The column stays until the "Next case study" link nears the top.
      // The phone button stays to the end of the case study.
      var isPhone = nav.classList.contains("case-nav--phone");
      var endLimit = isPhone ? -Infinity : vh * 0.15;
      var show =
        !!start &&
        start.getBoundingClientRect().top < vh * 0.4 &&
        (!end || end.getBoundingClientRect().top > endLimit);
      if (show) nav.setAttribute("data-visible", "");
      else {
        nav.removeAttribute("data-visible");
        setOpen(nav, false);
      }

      var links = nav.querySelectorAll("a[data-target]");
      var active = links[0] || null;
      var line = atBottom ? vh * 0.85 : vh * 0.3;
      for (var j = 0; j < links.length; j++) {
        var target = links[j].getAttribute("data-target");
        var heading = find(scope, target);
        if (heading && heading.getBoundingClientRect().top <= line) active = links[j];
        if (pinned && pinned === target && heading && heading.getClientRects().length) {
          active = links[j];
          break;
        }
      }
      for (var k = 0; k < links.length; k++) {
        if (links[k] === active) links[k].setAttribute("aria-current", "true");
        else links[k].removeAttribute("aria-current");
      }
      // Phone button shows the name of the current section
      var current = nav.querySelector("[data-case-nav-current]");
      if (current && active) {
        var name = active.textContent.trim();
        if (current.textContent !== name) current.textContent = name;
      }
    }
  }

  // Open or close the phone list
  function setOpen(nav, open) {
    var toggle = nav.querySelector("[data-case-nav-toggle]");
    if (!toggle) return;
    if (open) nav.setAttribute("data-open", "");
    else nav.removeAttribute("data-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeAll(except) {
    var open = document.querySelectorAll("[data-case-nav][data-open]");
    for (var i = 0; i < open.length; i++) if (open[i] !== except) setOpen(open[i], false);
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      update();
    });
  }

  document.addEventListener(
    "click",
    function (e) {
      if (!e.target.closest) return;
      var toggle = e.target.closest("[data-case-nav-toggle]");
      if (toggle) {
        var tnav = toggle.closest("[data-case-nav]");
        e.preventDefault();
        e.stopPropagation();
        var willOpen = !tnav.hasAttribute("data-open");
        closeAll(tnav);
        setOpen(tnav, willOpen);
        return;
      }
      var link = e.target.closest("[data-case-nav] a[data-target]");
      if (!link) {
        // Tapping anywhere else closes an open phone list
        if (!e.target.closest("[data-case-nav]")) closeAll(null);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setOpen(link.closest("[data-case-nav]"), false);
      var heading = find(scopeOf(link), link.getAttribute("data-target"));
      if (!heading) return;
      pinned = link.getAttribute("data-target");
      heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    },
    true
  );

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  // Called when the page content changes (e.g. switching case studies in the preview)
  window.initCaseNav = function () {
    pinned = null;
    closeAll(null);
    update();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update);
  } else {
    update();
  }
})();
