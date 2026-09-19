/* Rotate the existing optimized photo without video or extra image requests. */
(function () {
  "use strict";
  var hero = document.querySelector(".lux-hero");
  var button = document.querySelector("[data-pizza-motion]");
  if (!hero || !button) return;
  var paused = false, inView = true;
  function update() {
    hero.classList.toggle("is-motion-paused", paused);
    document.body.classList.toggle("brand-motion-paused", paused || document.hidden);
    hero.classList.toggle("is-outside", !inView || document.hidden);
    button.setAttribute("aria-pressed", String(paused));
    button.textContent = paused ? "Pornește animația" : "Pauză animație";
  }
  button.addEventListener("click", function () { paused = !paused; update(); });
  document.addEventListener("visibilitychange", update);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; update(); }).observe(hero);
  }
  update();
})();
