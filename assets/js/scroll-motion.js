/* Entry-only motion: content is visible by default, even without JavaScript. */
(function () {
  "use strict";
  var main = document.querySelector("main");
  var preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!main || preference.matches || !("IntersectionObserver" in window)) return;
  var cards = ".lux-menu-card,.lux-gallery > a,.lux-events__copy,.lux-events__media,.prod,.card,.product-card,.contact-card,.address-card,.gallery-item,.sala-cutie,.sala-foto,.split-media,.form";
  var seen = new WeakSet(), sequence = 0, active = new Set();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      observer.unobserve(el);
      if (preference.matches || document.hidden || !el.animate || el.contains(document.activeElement)) return;
      var distance = window.innerWidth < 700 ? 24 : 44;
      var x = el.dataset.scrollSide === "left" ? -distance : distance;
      var menuCategory = el.matches(".lux-menu-card");
      var animation = el.animate(menuCategory ? [
        { opacity: .7 }, { opacity: 1 }
      ] : [
        { translate: x + "px 0", opacity: .45 },
        { translate: "0px 0", opacity: 1 }
      ], { duration: 620, easing: "cubic-bezier(.22,1,.36,1)" });
      active.add(animation);
      animation.onfinish = animation.oncancel = function () { active.delete(animation); };
    });
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
  function register(el) {
    if (seen.has(el)) return;
    if (el.matches(".reveal") && !el.matches(cards) && el.querySelector(cards)) return;
    if (el.parentElement && el.parentElement.closest(cards)) return;
    seen.add(el);
    el.dataset.scrollSide = sequence++ % 2 ? "right" : "left";
    var box = el.getBoundingClientRect();
    // Never fade content already visible at initial load or restored scroll position.
    if (box.width && box.height && box.top < window.innerHeight && box.bottom > 0) return;
    observer.observe(el);
  }
  function scan(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.matches && root.matches(cards + ",.reveal")) register(root);
    root.querySelectorAll(cards + ",.reveal").forEach(register);
  }
  scan(main);
  var mutations = new MutationObserver(function (changes) {
    changes.forEach(function (change) { change.addedNodes.forEach(scan); });
  });
  mutations.observe(main, { childList: true, subtree: true });
  function stop() { active.forEach(function (a) { a.cancel(); }); }
  main.addEventListener("focusin", stop);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
  window.addEventListener("pageshow", function (event) { if (event.persisted) stop(); });
  preference.addEventListener("change", function () {
    if (preference.matches) { stop(); observer.disconnect(); mutations.disconnect(); }
  });
})();