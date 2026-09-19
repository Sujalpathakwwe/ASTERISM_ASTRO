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

  function countryFlag(code) {
    return String(code || "IN")
      .toUpperCase()
      .replace(/[A-Z]/g, function (letter) {
        return String.fromCodePoint(127397 + letter.charCodeAt(0));
      });
  }

  function detectedCountryCode() {
    var saved = localStorage.getItem("selectedCountry");

    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        saved = parsed && (parsed.code || parsed.country_code) || saved;
      } catch (error) {
        /* The saved value is already a two-letter country code. */
      }

      if (/^[A-Za-z]{2}$/.test(saved)) return saved.toUpperCase();
    }

    return "IN";
  }

  function setCountryIndicator(button, code) {
    code = String(code || "IN").toUpperCase();
    button.textContent = countryFlag(code) + " " + code;
    button.setAttribute("aria-label", "Region: " + code);
    button.title = "Region: " + code;
  }

  function refreshCountryFromIp(button) {
    fetch("https://ipwho.is/")
      .then(function (response) {
        if (!response.ok) throw new Error("Country lookup failed");
        return response.json();
      })
      .then(function (data) {
        var code = data && data.success && data.country_code;
        if (!/^[A-Za-z]{2}$/.test(code || "")) return;
        code = code.toUpperCase();
        localStorage.setItem("selectedCountry", code);
        setCountryIndicator(button, code);
      })
      .catch(function () {
        /* India remains the reliable fallback if location lookup is unavailable. */
      });
  }

  function hasActiveSession() {
    for (var index = 0; index < localStorage.length; index += 1) {
      var storageKey = localStorage.key(index) || "";

      if (!/^sb-.*-auth-token$/.test(storageKey)) continue;

      try {
        var value = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (
          value &&
          (value.access_token ||
            (value.currentSession && value.currentSession.access_token) ||
            (value.session && value.session.access_token))
        ) return true;
      } catch (error) {
        /* Ignore invalid or expired local session data. */
      }
    }

    return false;
  }

  function injectHeaderUtilities() {
    var actions = document.querySelector(".site-header .actions");
    if (!actions) return;

    var themeButton = actions.querySelector("[data-theme-toggle]");
    var countryCode = detectedCountryCode();
    var countryButton = actions.querySelector(".country-indicator");

    if (!countryButton) {
      countryButton = document.createElement("button");
      countryButton.type = "button";
      countryButton.className = "country-indicator";
      setCountryIndicator(countryButton, countryCode);
      actions.insertBefore(countryButton, themeButton || actions.firstChild);
    }

    refreshCountryFromIp(countryButton);

    var signedIn = hasActiveSession();
    var accountLink = actions.querySelector(".session-account-link");

    if (!accountLink) {
      accountLink = document.createElement("a");
      accountLink.className = "session-account-link";
      actions.insertBefore(accountLink, themeButton || actions.firstChild);
    }

    accountLink.href = signedIn ? "/account" : "/login";
    accountLink.textContent = signedIn ? "My Account" : "Log In";

    var navigation = document.querySelector(".site-header .navlinks");
    if (navigation && !navigation.querySelector(".mobile-session-account-link")) {
      var mobileAccountLink = document.createElement("a");
      mobileAccountLink.className = "mobile-session-account-link";
      mobileAccountLink.href = accountLink.href;
      mobileAccountLink.textContent = accountLink.textContent;
      navigation.appendChild(mobileAccountLink);
    }
  }

  function bind() {
    applyTheme(getTheme());
    injectHeaderUtilities();
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
