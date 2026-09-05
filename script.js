/* Asterism Astro — global theme controller */
(function () {
  "use strict";

  var KEY = "asterism-theme";
  var root = document.documentElement;

  function getTheme() {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    theme = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    root.classList.toggle("light-mode", theme === "light");
    root.classList.toggle("dark-mode", theme === "dark");
    if (document.body) {
      document.body.classList.toggle("light-mode", theme === "light");
      document.body.classList.toggle("dark-mode", theme === "dark");
    }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      button.setAttribute("title", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
      button.textContent = theme === "light" ? "☾" : "☼";
    });
    localStorage.setItem(KEY, theme);
  }

  function bind() {
    applyTheme(getTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      if (button.dataset.asterismThemeBound === "1") return;
      button.dataset.asterismThemeBound = "1";
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        applyTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
    });
  }

  /* Apply the stored theme as early as possible. */
  applyTheme(getTheme());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();


