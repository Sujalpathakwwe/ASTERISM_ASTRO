import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import {
  calculateChart,
  currentTransits,
  astrocartographyLines,
  DIVISIONAL_CHARTS,
  getDivisionalChart,
  nakshatraInfo,
} from "./astrology/engine";
import {
  NorthIndianChart,
  SouthIndianChart,
  EastIndianChart,
  WesternWheel,
  AstroMap,
} from "./astrology/ChartViews";
import CompatibilityWorkspace from "./astrology/CompatibilityWorkspace";
import StudioAdvancedPanel from "./astrology/StudioAdvancedPanel";
import { supabase } from "./lib/supabase";

const INITIAL = {
  name: "",
  date: "",
  time: "12:00",
  countryCode: "IN",
  stateCode: "",
  cityName: "",
  timeZone: "Asia/Kolkata",
  place: "",
  latitude: "",
  longitude: "",
  utcOffset: "330",
};
const VEDIC_TABS = [
  "Birth chart",
  "Planet table",
  "Divisional charts",
  "Dashas",
  "Transits",
  "BNN insights",
];
const WESTERN_TABS = [];
const VARGA_MEANINGS = {
  1: "The complete natal chart and foundation of identity, body and life direction.",
  2: "Resources, accumulated wealth, speech and the way material security is handled.",
  3: "Courage, initiative, siblings and the strength to act under pressure.",
  4: "Home, property, emotional roots and inherited fortune.",
  7: "Children, creativity, fertility and the continuation of lineage.",
  9: "Marriage, dharma, inner maturity and the deeper strength of every planet.",
  10: "Profession, public responsibility, authority and visible contribution.",
  12: "Parents, ancestry and inherited family patterns.",
  16: "Vehicles, comforts, residence and the experience of happiness.",
  20: "Spiritual practice, devotion and the inner path.",
  24: "Education, learning capacity, scholarship and mastery.",
  27: "Physical and psychological strengths and vulnerabilities.",
  30: "Misfortune, difficult tendencies and subtle weaknesses.",
  40: "Maternal lineage, auspiciousness and inherited blessings.",
  45: "Paternal lineage, character and accumulated dharma.",
  60: "Fine karmic background and the most subtle layer of planetary results.",
};
const LAYOUT_MEANINGS = {
  north:
    "The North Indian diamond keeps houses fixed. Sign numbers and planetary placements move according to the Ascendant, making house emphasis immediately visible.",
  south:
    "The South Indian square keeps zodiac signs fixed. The Ascendant marker identifies the first house and the houses proceed clockwise through the fixed-sign grid.",
  east: "The East Indian layout combines fixed structural sectors with house-based reading. Each panel shows the house, rashi and exact planetary placements.",
  western:
    "The Western wheel plots tropical or sidereal longitude around a circular zodiac, with the Ascendant rotated to the left-hand horizon and exact degrees listed beside the wheel.",
};
const PLANET_MEANINGS = {
  Sun: "identity, confidence, purpose and authority",
  Moon: "emotions, habits, receptivity and the inner mind",
  Mercury: "thinking, communication, learning and trade",
  Venus: "relationships, attraction, pleasure and values",
  Mars: "drive, courage, competition and decisive action",
  Jupiter: "growth, wisdom, opportunity and guiding principles",
  Saturn: "discipline, responsibility, delay and long-term mastery",
  Rahu: "ambition, appetite, experimentation and unfamiliar territory",
  Ketu: "detachment, instinct, prior familiarity and spiritualisation",
  Uranus: "independence, disruption and unconventional change",
  Neptune: "imagination, ideals, sensitivity and blurred boundaries",
  Pluto: "power, compulsion, endings and deep transformation",
};
const SIGN_TONES = {
  Aries: "direct and pioneering",
  Taurus: "steady and materially grounded",
  Gemini: "curious and communicative",
  Cancer: "protective and emotionally responsive",
  Leo: "expressive and self-directed",
  Virgo: "analytical and improvement-oriented",
  Libra: "relational and balance-seeking",
  Scorpio: "intense and transformative",
  Sagittarius: "expansive and principle-led",
  Capricorn: "structured and achievement-focused",
  Aquarius: "independent and systems-oriented",
  Pisces: "intuitive and receptive",
};
const SIGN_DATA = {
  Aries: ["Fire", "Cardinal", "Mars"],
  Taurus: ["Earth", "Fixed", "Venus"],
  Gemini: ["Air", "Mutable", "Mercury"],
  Cancer: ["Water", "Cardinal", "Moon"],
  Leo: ["Fire", "Fixed", "Sun"],
  Virgo: ["Earth", "Mutable", "Mercury"],
  Libra: ["Air", "Cardinal", "Venus"],
  Scorpio: ["Water", "Fixed", "Mars"],
  Sagittarius: ["Fire", "Mutable", "Jupiter"],
  Capricorn: ["Earth", "Cardinal", "Saturn"],
  Aquarius: ["Air", "Fixed", "Saturn"],
  Pisces: ["Water", "Mutable", "Jupiter"],
};
const DIGNITIES = {
  Sun: {
    domicile: ["Leo"],
    exaltation: ["Aries"],
    detriment: ["Aquarius"],
    fall: ["Libra"],
  },
  Moon: {
    domicile: ["Cancer"],
    exaltation: ["Taurus"],
    detriment: ["Capricorn"],
    fall: ["Scorpio"],
  },
  Mercury: {
    domicile: ["Gemini", "Virgo"],
    exaltation: ["Virgo"],
    detriment: ["Sagittarius", "Pisces"],
    fall: ["Pisces"],
  },
  Venus: {
    domicile: ["Taurus", "Libra"],
    exaltation: ["Pisces"],
    detriment: ["Aries", "Scorpio"],
    fall: ["Virgo"],
  },
  Mars: {
    domicile: ["Aries", "Scorpio"],
    exaltation: ["Capricorn"],
    detriment: ["Taurus", "Libra"],
    fall: ["Cancer"],
  },
  Jupiter: {
    domicile: ["Sagittarius", "Pisces"],
    exaltation: ["Cancer"],
    detriment: ["Gemini", "Virgo"],
    fall: ["Capricorn"],
  },
  Saturn: {
    domicile: ["Capricorn", "Aquarius"],
    exaltation: ["Libra"],
    detriment: ["Cancer", "Leo"],
    fall: ["Aries"],
  },
};
const WESTERN_ASPECTS = [
  { name: "Conjunction", angle: 0, orb: 8, symbol: "☌" },
  { name: "Sextile", angle: 60, orb: 5, symbol: "⚹" },
  { name: "Square", angle: 90, orb: 7, symbol: "□" },
  { name: "Trine", angle: 120, orb: 7, symbol: "△" },
  { name: "Opposition", angle: 180, orb: 8, symbol: "☍" },
];
const HOUSE_TOPICS = [
  "identity, approach and self-expression",
  "resources, values and self-worth",
  "communication, learning and local life",
  "home, family and emotional roots",
  "creativity, pleasure and self-expression",
  "work, wellbeing and daily systems",
  "partnership, cooperation and projection",
  "intimacy, shared resources and transformation",
  "belief, higher learning and wider horizons",
  "career, reputation and responsibility",
  "friends, community and future goals",
  "rest, retreat, closure and the inner life",
];

const formatPosition = (position) =>
  `${position.sign} ${String(position.degree).padStart(2, "0")}° ${String(position.minute).padStart(2, "0")}′ ${String(position.second ?? 0).padStart(2, "0")}″`;
const formatDate = (date) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date));

function historicalOffsetMinutes(timeZone, date, time) {
  if (!timeZone || !date || !time) return "";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(localAsUtc);
  let offset = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    offset = Math.round(
      (Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
      ) -
        instant.getTime()) /
        60000,
    );
    instant = new Date(localAsUtc - offset * 60000);
  }
  return String(offset);
}

export default function AstrologyStudio({ session, detectedCountry }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [chart, setChart] = useState(null);
  const [error, setError] = useState("");
  const [system, setSystem] = useState("vedic");
  const [tab, setTab] = useState("Birth chart");
  const [layout, setLayout] = useState("north");
  const [division, setDivision] = useState(1);
  const [zodiac, setZodiac] = useState("sidereal");
  const [theme, setTheme] = useState(() =>
    window.localStorage.getItem("asterism-theme") === "light"
      ? "light"
      : "dark",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWesternAspects, setShowWesternAspects] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBirthDetails() {
      const userId = session?.user?.id;
      if (!userId) return;

      try {
        const [profileResult, consultationResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("consultations")
            .select(
              "client_birth_date, client_birth_time, client_birth_country, client_birth_region, client_birth_city, client_birth_latitude, client_birth_longitude, client_birth_timezone, created_at",
            )
            .eq("user_id", userId)
            .not("client_birth_date", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (consultationResult.error) throw consultationResult.error;
        if (!active) return;

        const birth = consultationResult.data;
        const country = birth?.client_birth_country
          ? Country.getAllCountries().find(
              (item) =>
                item.isoCode === birth.client_birth_country ||
                item.name.toLowerCase() ===
                  String(birth.client_birth_country).toLowerCase(),
            )
          : null;
        const countryCode = country?.isoCode || "IN";
        const countryStates = State.getStatesOfCountry(countryCode);
        const matchedState = birth?.client_birth_region
          ? countryStates.find(
              (item) =>
                item.isoCode === birth.client_birth_region ||
                item.name.toLowerCase() ===
                  String(birth.client_birth_region).toLowerCase(),
            )
          : null;
        // Region names saved by the booking form are not always identical to
        // country-state-city labels (common with European counties/regions).
        // Search the entire country first, then derive the library state code.
        const countryCities = City.getCitiesOfCountry(countryCode) || [];
        const city = birth?.client_birth_city
          ? countryCities.find(
              (item) =>
                item.name.toLowerCase() ===
                String(birth.client_birth_city).toLowerCase(),
            )
          : null;
        const state =
          matchedState ||
          countryStates.find((item) => item.isoCode === city?.stateCode) ||
          null;
        const stateCode = state?.isoCode || city?.stateCode || "";
        const cityName = city?.name || birth?.client_birth_city || "";
        const timeZone =
          birth?.client_birth_timezone ||
          country?.timezones?.[0]?.zoneName ||
          "Asia/Kolkata";
        const date = birth?.client_birth_date || "";
        const time = birth?.client_birth_time
          ? String(birth.client_birth_time).slice(0, 5)
          : "12:00";
        const latitude =
          birth?.client_birth_latitude || city?.latitude || "";
        const longitude =
          birth?.client_birth_longitude || city?.longitude || "";

        setForm((current) => ({
          ...current,
          name:
            profileResult.data?.full_name ||
            session.user.user_metadata?.full_name ||
            current.name,
          date,
          time,
          countryCode,
          stateCode,
          cityName,
          timeZone,
          place: cityName
            ? [cityName, state?.name, country?.name].filter(Boolean).join(", ")
            : "",
          latitude: String(latitude),
          longitude: String(longitude),
          utcOffset: historicalOffsetMinutes(timeZone, date, time),
        }));
      } catch (loadError) {
        console.error("Unable to load saved birth details:", loadError);
      }
    }

    loadBirthDetails();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const countries = useMemo(() => Country.getAllCountries(), []);
  const allStates = useMemo(() => State.getAllStates(), []);
  const worldCities = useMemo(() => City.getAllCities(), []);
  const states = useMemo(
    () => (form.countryCode ? State.getStatesOfCountry(form.countryCode) : []),
    [form.countryCode],
  );
  const cities = useMemo(
    () => {
      if (!form.countryCode) return [];
      if (form.stateCode) {
        return City.getCitiesOfState(form.countryCode, form.stateCode);
      }
      // Countries without a state-level selection still need a usable city
      // list, which is especially important for European birth locations.
      return State.getStatesOfCountry(form.countryCode).length
        ? []
        : City.getCitiesOfCountry(form.countryCode) || [];
    },
    [form.countryCode, form.stateCode],
  );
  const selectedCountry = useMemo(
    () => Country.getCountryByCode(form.countryCode),
    [form.countryCode],
  );
  const timeZones = selectedCountry?.timezones || [];

  const divisional = useMemo(
    () => (chart ? getDivisionalChart(chart, division) : null),
    [chart, division],
  );
  const transits = useMemo(
    () => (chart ? currentTransits(chart) : []),
    [chart],
  );
  const lines = useMemo(
    () => (chart ? astrocartographyLines(chart) : []),
    [chart],
  );

  function update(event) {
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  }
  function selectCountry(event) {
    const countryCode = event.target.value;
    const country = Country.getCountryByCode(countryCode);
    const timeZone = country?.timezones?.[0]?.zoneName || "UTC";
    setForm((value) => ({
      ...value,
      countryCode,
      stateCode: "",
      cityName: "",
      place: "",
      latitude: "",
      longitude: "",
      timeZone,
      utcOffset: historicalOffsetMinutes(timeZone, value.date, value.time),
    }));
  }
  function selectState(event) {
    setForm((value) => ({
      ...value,
      stateCode: event.target.value,
      cityName: "",
      place: "",
      latitude: "",
      longitude: "",
    }));
  }
  function selectCity(event) {
    const city = cities.find((item) => item.name === event.target.value);
    const state = states.find(
      (item) => item.isoCode === (city?.stateCode || form.stateCode),
    );
    setForm((value) => ({
      ...value,
      stateCode: city?.stateCode || value.stateCode,
      cityName: city?.name || "",
      place: city
        ? `${city.name}, ${state?.name || ""}, ${selectedCountry?.name || ""}`
        : "",
      latitude: city?.latitude || "",
      longitude: city?.longitude || "",
    }));
  }
  function selectTimeZone(event) {
    const timeZone = event.target.value;
    setForm((value) => ({
      ...value,
      timeZone,
      utcOffset: historicalOffsetMinutes(timeZone, value.date, value.time),
    }));
  }
  function updateBirthMoment(event) {
    const next = { ...form, [event.target.name]: event.target.value };
    next.utcOffset = historicalOffsetMinutes(
      next.timeZone,
      next.date,
      next.time,
    );
    setForm(next);
  }
  function submit(event) {
    event.preventDefault();
    setError("");
    if (
      !form.name ||
      !form.date ||
      !form.time ||
      !form.place ||
      form.latitude === "" ||
      form.longitude === ""
    ) {
      setError("Complete the birth name, date, time and location details.");
      return;
    }
    try {
      setChart(
        calculateChart({
          ...form,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          utcOffset: Number(form.utcOffset),
        }),
      );
      setSystem("vedic");
      setTab("Birth chart");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      console.error(caught);
      setError(
        "The chart could not be calculated. Check the date, coordinates and UTC offset.",
      );
    }
  }
  function printChartReport() {
    const previousTitle = document.title;
    const reportName =
      system === "western"
        ? "Western Natal Chart"
        : system === "astrocartography"
          ? "Astrocartography Report"
          : system === "compatibility"
            ? "Compatibility Report"
            : "Vedic Natal Chart";
    document.title = `${chart.input.name} - ${reportName} - Asterism Astro`;
    const restoreTitle = () => {
      document.title = previousTitle;
    };
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.print();
  }
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("asterism-theme", next);
  }

  const activePlanets =
    division === 1
      ? chart?.planets
      : divisional?.planets.map((planet) => ({
          ...planet,
          sidereal: planet.divisional,
        }));
  const displayChart = chart && {
    ...chart,
    planets: activePlanets,
    ascendant: {
      ...chart.ascendant,
      sidereal:
        division === 1 ? chart.ascendant.sidereal : divisional.ascendant,
    },
  };
  const activeDashaIndex =
    chart?.dashas.findIndex((dasha) => {
      const now = Date.now();
      return (
        now >= new Date(dasha.start).getTime() &&
        now < new Date(dasha.end).getTime()
      );
    }) ?? -1;
  const isWesternView = system === "western";
  const isMapView = system === "astrocartography";
  const isCompatibilityView = system === "compatibility";
  function changeSystem(next) {
    setSystem(next);
    setTab(
      next === "vedic"
        ? "Birth chart"
        : next === "western"
          ? "Circular chart"
          : next === "astrocartography"
            ? "Map explorer"
            : "Compatibility",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      className={`chart-studio-page ${theme === "light" ? "studio-light" : "studio-dark"}`}
    >
      <StudioHeader
        navigate={navigate}
        theme={theme}
        toggleTheme={toggleTheme}
        session={session}
        detectedCountry={detectedCountry}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
      <main className="astrology-studio">
        {!chart ? (
          <section className="birth-entry">
            <div className="birth-intro">
              <span className="studio-kicker">PRECISION BIRTH CHARTS</span>
              <h2>Your sky, mapped in full.</h2>
              <p>
                Create Vedic, divisional, Western and astrocartography charts
                from one set of birth details. Explore Vimshottari dashas,
                current transits and Bhrigu Nandi Nadi connections.
              </p>
              <ul>
                <li>Lahiri sidereal + tropical zodiac</li>
                <li>20 divisional chart views</li>
                <li>Four traditional chart layouts</li>
                <li>Private calculation in your browser</li>
              </ul>
            </div>
            <form className="birth-form" onSubmit={submit}>
              <h3>Birth details</h3>
              <label>
                Chart name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </label>
              <div className="studio-grid">
                <label>
                  Birth date
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={updateBirthMoment}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                  />
                </label>
                <label>
                  Exact birth time
                  <input
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={updateBirthMoment}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                  />
                </label>
              </div>
              <div className="studio-grid">
                <label>
                  Country
                  <select
                    name="countryCode"
                    value={form.countryCode}
                    onChange={selectCountry}
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.isoCode} value={country.isoCode}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  State / region
                  <select
                    name="stateCode"
                    value={form.stateCode}
                    onChange={selectState}
                    disabled={!states.length}
                  >
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state.isoCode} value={state.isoCode}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="studio-grid">
                <label>
                  City
                  <select
                    name="cityName"
                    value={form.cityName}
                    onChange={selectCity}
                    disabled={!cities.length}
                  >
                    <option value="">Select city</option>
                    {cities.map((city) => (
                      <option
                        key={`${city.name}-${city.latitude}-${city.longitude}`}
                        value={city.name}
                      >
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Birth timezone
                  <select
                    name="timeZone"
                    value={form.timeZone}
                    onChange={selectTimeZone}
                  >
                    <option value="">Select timezone</option>
                    {timeZones.map((zone) => (
                      <option key={zone.zoneName} value={zone.zoneName}>
                        {zone.zoneName} · {zone.gmtOffsetName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="studio-grid three location-values">
                <label>
                  Latitude
                  <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    name="latitude"
                    value={form.latitude}
                    onChange={update}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    name="longitude"
                    value={form.longitude}
                    onChange={update}
                  />
                </label>
                <label>
                  UTC offset
                  <input
                    type="number"
                    min="-840"
                    max="840"
                    name="utcOffset"
                    value={form.utcOffset}
                    onChange={update}
                  />
                </label>
              </div>
              <p className="field-note">
                The city fills the coordinates automatically. The timezone
                calculates the historical UTC offset for the selected birth
                date.
              </p>
              {error && <div className="studio-error">{error}</div>}
              <button type="submit" className="calculate-chart">
                Create complete chart <span>→</span>
              </button>
              <p className="calculation-note">
                Astronomical positions: Astronomy Engine. Vedic standard: Lahiri
                ayanamsha. BNN insights are interpretive and not deterministic
                predictions.
              </p>
            </form>
          </section>
        ) : (
          <>
            <img
              className="print-report-watermark"
              src="/asterism-astro-logo-transparent.png"
              alt=""
              aria-hidden="true"
            />
            <div className="print-report-footer" aria-hidden="true">
              <span>✧</span> Asterism Astro
            </div>
            <div className="print-cover">
              <section className="print-report-masthead" aria-hidden="true">
                <div className="print-report-brand">
                  <img
                    className="print-report-logo"
                    src="/asterism-astro-logo-transparent.png"
                    alt="Asterism Astro"
                  />
                  <div>
                    <b>Asterism Astro</b>
                    <small>Personal Astrology Report</small>
                  </div>
                </div>
                <div className="print-report-type">
                  {isMapView
                    ? "Astrocartography"
                    : isWesternView
                      ? "Western Natal Chart"
                      : isCompatibilityView
                        ? "Western Synastry · Vedic Matching"
                        : "Vedic Natal Chart · Begins with D1 Rashi"}
                </div>
              </section>
              <section className="chart-summary">
                <div>
                  <button
                    type="button"
                    onClick={() => setChart(null)}
                    className="new-chart"
                  >
                    ← New chart
                  </button>
                  <span className="studio-kicker">
                    {isMapView
                      ? "ASTROCARTOGRAPHY PROFILE"
                      : isWesternView
                        ? "WESTERN NATAL CHART"
                        : isCompatibilityView
                          ? "COMPATIBILITY REPORT"
                          : "VEDIC NATAL CHART"}
                  </span>
                  <h2>{chart.input.name}</h2>
                  <p>
                    {chart.input.place} · {chart.input.date} ·{" "}
                    {chart.input.time}
                  </p>
                  <div className="chart-actions">
                    <button onClick={printChartReport}>Print / Save PDF</button>
                  </div>
                </div>
                {isMapView ? (
                  <div className="summary-facts">
                    <div>
                      <small>Birth location</small>
                      <b>{chart.input.cityName || chart.input.place}</b>
                    </div>
                    <div>
                      <small>Coordinates</small>
                      <b>
                        {Number(chart.input.latitude).toFixed(2)}°,{" "}
                        {Number(chart.input.longitude).toFixed(2)}°
                      </b>
                    </div>
                    <div>
                      <small>Planetary bodies</small>
                      <b>
                        {
                          chart.planets.filter(
                            (p) => !["Rahu", "Ketu"].includes(p.name),
                          ).length
                        }
                      </b>
                    </div>
                    <div>
                      <small>Angular lines</small>
                      <b>{lines.length} · AC DC MC IC</b>
                    </div>
                  </div>
                ) : isWesternView ? (
                  <div className="summary-facts">
                    <div>
                      <small>Tropical Ascendant</small>
                      <b>{formatPosition(chart.ascendant.tropical)}</b>
                    </div>
                    <div>
                      <small>Tropical Sun</small>
                      <b>
                        {formatPosition(
                          chart.planets.find((p) => p.name === "Sun").tropical,
                        )}
                      </b>
                    </div>
                    <div>
                      <small>Tropical Moon</small>
                      <b>
                        {formatPosition(
                          chart.planets.find((p) => p.name === "Moon").tropical,
                        )}
                      </b>
                    </div>
                    <div>
                      <small>House system</small>
                      <b>Equal houses</b>
                    </div>
                  </div>
                ) : (
                  <div className="summary-facts">
                    <div>
                      <small>Sidereal Ascendant</small>
                      <b>{formatPosition(chart.ascendant.sidereal)}</b>
                    </div>
                    <div>
                      <small>Sidereal Moon</small>
                      <b>
                        {formatPosition(
                          chart.planets.find((p) => p.name === "Moon").sidereal,
                        )}
                      </b>
                    </div>
                    <div>
                      <small>Nakshatra</small>
                      <b>
                        {chart.nakshatra.name} · Pada {chart.nakshatra.pada}
                      </b>
                    </div>
                    <div>
                      <small>Ayanamsha</small>
                      <b>{chart.ayanamsha.toFixed(4)}° Lahiri</b>
                    </div>
                  </div>
                )}
              </section>
            </div>
            <nav className="studio-system-tabs" aria-label="Astrology systems">
              <button
                className={system === "vedic" ? "active" : ""}
                onClick={() => changeSystem("vedic")}
              >
                <span>01</span>
                <b>Vedic Astrology</b>
                <small>Charts, vargas, dashas and BNN</small>
              </button>
              <button
                className={system === "western" ? "active" : ""}
                onClick={() => changeSystem("western")}
              >
                <span>02</span>
                <b>Western Astrology</b>
                <small>Tropical wheel and insights</small>
              </button>
              <button
                className={system === "astrocartography" ? "active" : ""}
                onClick={() => changeSystem("astrocartography")}
              >
                <span>03</span>
                <b>Astrocartography</b>
                <small>World lines and locations</small>
              </button>
              <button
                className={system === "compatibility" ? "active" : ""}
                onClick={() => changeSystem("compatibility")}
              >
                <span>04</span>
                <b>Compatibility</b>
                <small>Synastry and Vedic matching</small>
              </button>
            </nav>
            <StudioAdvancedPanel chart={chart} system={system} />
            <section className="studio-panel">
              {system === "vedic" && (
                <div className="vedic-complete-report">
                  <section className="vedic-report-section vedic-birth-chart">
                    <div className="section-heading chart-area-heading">
                      <span className="studio-kicker">VEDIC CHART STUDIO</span>
                      <h3>Sidereal birth and divisional charts</h3>
                      <p>
                        Explore the Lahiri sidereal chart through North Indian,
                        South Indian and East Indian layouts.
                      </p>
                    </div>
                    <div className="chart-toolbar">
                      <label>
                        Vedic layout
                        <select
                          value={layout}
                          onChange={(e) => setLayout(e.target.value)}
                        >
                          <option value="north">North Indian</option>
                          <option value="south">South Indian</option>
                          <option value="east">East Indian</option>
                        </select>
                      </label>
                      <label>
                        Ayanamsha
                        <select value="sidereal" disabled>
                          <option value="sidereal">Sidereal · Lahiri</option>
                        </select>
                      </label>
                      <label>
                        Varga
                        <select
                          value={division}
                          onChange={(e) => setDivision(Number(e.target.value))}
                        >
                          {DIVISIONAL_CHARTS.map(([number, name]) => (
                            <option value={number} key={number}>
                              D{number} · {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="screen-selected-varga">
                      <ChartExplanation
                        layout={layout}
                        zodiac="sidereal"
                        division={division}
                      />
                      <div className="chart-stage">
                        {layout === "north" && (
                          <NorthIndianChart
                            chart={displayChart}
                            positionKey="sidereal"
                          />
                        )}{" "}
                        {layout === "south" && (
                          <SouthIndianChart
                            chart={displayChart}
                            positionKey="sidereal"
                          />
                        )}{" "}
                        {layout === "east" && (
                          <EastIndianChart
                            chart={displayChart}
                            positionKey="sidereal"
                          />
                        )}
                      </div>
                      <ChartInterpretation
                        chart={displayChart}
                        positionKey="sidereal"
                        division={division}
                      />
                    </div>
                    <div className="print-d1-chart">
                      <ChartExplanation
                        layout="north"
                        zodiac="sidereal"
                        division={1}
                      />
                      <div className="chart-stage">
                        <NorthIndianChart
                          chart={chart}
                          positionKey="sidereal"
                        />
                      </div>
                      <ChartInterpretation
                        chart={chart}
                        positionKey="sidereal"
                        division={1}
                      />
                    </div>
                  </section>
                  <section className="vedic-report-section vedic-planet-section">
                    <PlanetTable planets={chart.planets} mode="vedic" />
                  </section>
                  <section className="vedic-report-section vedic-varga-section">
                    <div className="section-heading">
                      <span className="studio-kicker">VARGA EXPLORER</span>
                      <h3>Divisional charts</h3>
                      <p>
                        Each varga magnifies a particular field of life. Select
                        any card to bring that chart into the main detailed view
                        above.
                      </p>
                    </div>
                    <div className="varga-grid">
                      {DIVISIONAL_CHARTS.map(([number, name]) => (
                        <button
                          key={number}
                          onClick={() => {
                            setDivision(number);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <b>D{number}</b>
                          <span>{name}</span>
                          <p>
                            {VARGA_MEANINGS[number] ||
                              `A specialised D${number} harmonic view used for focused analysis.`}
                          </p>
                          <small>Open detailed Vedic chart →</small>
                        </button>
                      ))}
                    </div>
                    <VedicDivisionalAtlas chart={chart} />
                  </section>
                  <section className="vedic-report-section vedic-dasha-section">
                    <div className="section-heading">
                      <span className="studio-kicker">VIMSHOTTARI</span>
                      <h3>Mahadasha timeline</h3>
                      <p>
                        Calculated from the Moon's sidereal nakshatra position
                        at birth.
                      </p>
                    </div>
                    <div className="dasha-list">
                      {chart.dashas.map((dasha, index) => (
                        <div
                          key={dasha.lord}
                          className={
                            index === activeDashaIndex ? "current" : ""
                          }
                        >
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <b>{dasha.lord}</b>
                          <time>
                            {formatDate(dasha.start)} — {formatDate(dasha.end)}
                          </time>
                          <small>
                            {dasha.years.toFixed(2)} years
                            {index === activeDashaIndex ? " · Current" : ""}
                          </small>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="vedic-report-section vedic-transit-section">
                    <div className="section-heading">
                      <span className="studio-kicker">LIVE SKY</span>
                      <h3>Current sidereal transits</h3>
                      <p>
                        Positions and closest major natal aspects for{" "}
                        {new Date().toLocaleDateString()}.
                      </p>
                    </div>
                    <table className="planet-table">
                      <thead>
                        <tr>
                          <th>Body</th>
                          <th>Current position</th>
                          <th>Motion</th>
                          <th>Natal aspect</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transits.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <b>
                                {p.glyph} {p.name}
                              </b>
                            </td>
                            <td>{formatPosition(p.sidereal)}</td>
                            <td>{p.retrograde ? "Retrograde" : "Direct"}</td>
                            <td>
                              {p.aspect
                                ? `${p.aspect.angle}° · orb ${p.aspect.orb.toFixed(2)}°`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                  <section className="vedic-report-section vedic-bnn-section">
                    <BnnInsights chart={chart} />
                  </section>
                </div>
              )}
              {system === "western" && (
                <div className="western-complete-report">
                  <section className="western-report-section western-chart-page">
                    <div className="section-heading chart-area-heading">
                      <span className="studio-kicker">WESTERN ASTROLOGY</span>
                      <h3>Tropical circular birth chart</h3>
                      <p>
                        A dedicated Western wheel showing tropical zodiac
                        positions, equal houses from the Ascendant and exact
                        planetary degrees.
                      </p>
                    </div>
                    <div className="chart-explainer">
                      <div>
                        <span className="studio-kicker">
                          HOW TO READ THIS VIEW
                        </span>
                        <h3>Western circular wheel</h3>
                      </div>
                      <p>
                        The twelve zodiac signs form the outer ring while
                        planets are plotted by exact <b>tropical longitude</b>.
                        North and South Node use their Western names. Houses use
                        the equal-house system from the Ascendant.
                      </p>
                    </div>
                    <div className="western-wheel-controls">
                      <label>
                        <input
                          type="checkbox"
                          checked={showWesternAspects}
                          onChange={(event) =>
                            setShowWesternAspects(event.target.checked)
                          }
                        />{" "}
                        Show major aspect lines
                      </label>
                    </div>
                    <div className="chart-stage western-section-stage">
                      <WesternWheel
                        chart={chart}
                        positionKey="tropical"
                        showAspects={showWesternAspects}
                      />
                    </div>
                  </section>
                  <section className="western-report-section western-placements-page">
                    <PlanetTable planets={chart.planets} mode="western" />
                  </section>
                  <WesternAnalysis chart={chart} transits={transits} />
                  <section className="western-report-section western-insights-page">
                    <ChartInterpretation
                      chart={chart}
                      positionKey="tropical"
                      division={1}
                      houseMode="western"
                    />
                  </section>
                </div>
              )}
              {system === "astrocartography" && (
                <div className="astro-complete-report">
                  <section className="astro-report-section astro-map-page">
                    <div className="section-heading">
                      <span className="studio-kicker">WORLD LINES</span>
                      <h3>Astrocartography explorer</h3>
                      <p>
                        Filter the exact planetary lines from the birth moment,
                        then select any location to examine its nearest visible
                        influences.
                      </p>
                    </div>
                    <AstroMap
                      lines={lines}
                      chart={chart}
                      cities={worldCities}
                      countries={countries}
                      states={allStates}
                    />
                  </section>
                  <section className="astro-report-section astro-insights-page">
                    <div className="angle-guide">
                      <article>
                        <b>AC · Ascendant</b>
                        <p>
                          Places where the planet was rising. These locations
                          tend to make its qualities personal, visible and
                          embodied.
                        </p>
                      </article>
                      <article>
                        <b>DC · Descendant</b>
                        <p>
                          Places where the planet was setting. Its themes are
                          commonly encountered through partners, clients and
                          other people.
                        </p>
                      </article>
                      <article>
                        <b>MC · Midheaven</b>
                        <p>
                          Places where the planet was at the top of the sky.
                          Career, reputation, ambition and public visibility
                          become prominent.
                        </p>
                      </article>
                      <article>
                        <b>IC · Imum Coeli</b>
                        <p>
                          Places where the planet was beneath the Earth. Home,
                          family, roots, privacy and inner life receive the
                          emphasis.
                        </p>
                      </article>
                    </div>
                    <AstrocartographyInsights chart={chart} lines={lines} />
                    <div className="studio-disclaimer">
                      <b>How to use this responsibly</b>
                      <p>
                        Effects are usually strongest close to a line and become
                        more contextual farther away. Crossings combine two
                        planetary themes. Distance shown by this map is an
                        approximate visual measure, not a travel recommendation.
                        Astrocartography should be read together with the natal
                        chart and a relocated chart.
                      </p>
                    </div>
                  </section>
                </div>
              )}
              {system === "compatibility" && (
                <CompatibilityWorkspace primaryChart={chart} />
              )}
            </section>
          </>
        )}
      </main>
      <StudioFooter navigate={navigate} />
    </div>
  );
}

function ChartExplanation({ layout, zodiac, division }) {
  const varga = DIVISIONAL_CHARTS.find(([number]) => number === division);
  return (
    <div className="chart-explainer">
      <div>
        <span className="studio-kicker">HOW TO READ THIS VIEW</span>
        <h3>
          D{division} · {varga?.[1] || "Divisional chart"}
        </h3>
      </div>
      <p>
        {VARGA_MEANINGS[division] ||
          `This D${division} division provides a specialised harmonic lens for focused analysis.`}{" "}
        {LAYOUT_MEANINGS[layout]} Positions currently use the{" "}
        <b>
          {zodiac === "sidereal" ? "Lahiri sidereal zodiac" : "tropical zodiac"}
        </b>
        .
      </p>
    </div>
  );
}

function VedicDivisionalAtlas({ chart }) {
  const charts = DIVISIONAL_CHARTS.filter(([number]) => number !== 1).map(
    ([number, name]) => {
      const divisional = getDivisionalChart(chart, number);
      return {
        number,
        name,
        chart: {
          ...chart,
          planets: divisional.planets.map((planet) => ({
            ...planet,
            sidereal: planet.divisional,
          })),
          ascendant: { ...chart.ascendant, sidereal: divisional.ascendant },
        },
      };
    },
  );
  const pages = [];
  for (let index = 0; index < charts.length; index += 4)
    pages.push(charts.slice(index, index + 4));
  return (
    <div className="print-divisional-atlas">
      {pages.map((page, pageIndex) => (
        <section className="print-varga-page" key={pageIndex}>
          <header className="print-varga-page-heading">
            <span>VARGA ATLAS</span>
            <h3>Divisional Charts</h3>
            <p>
              Four focused Vedic charts · Page {pageIndex + 1} of {pages.length}
            </p>
          </header>
          {page.map((item) => (
            <article className="print-varga-chart" key={item.number}>
              <div className="print-varga-heading">
                <span>D{item.number}</span>
                <div>
                  <h4>{item.name}</h4>
                  <p>
                    {VARGA_MEANINGS[item.number] ||
                      `Specialised D${item.number} divisional chart.`}
                  </p>
                </div>
              </div>
              <NorthIndianChart chart={item.chart} positionKey="sidereal" />
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function ChartInterpretation({
  chart,
  positionKey,
  division,
  houseMode = "vedic",
}) {
  const asc = chart.ascendant[positionKey];
  const sun = chart.planets.find((p) => p.name === "Sun");
  const moon = chart.planets.find((p) => p.name === "Moon");
  const planets = chart.planets;
  const houseOf = (position) => {
    if (houseMode === "western") {
      const distance =
        (((position.longitude - asc.longitude) % 360) + 360) % 360;
      return Math.floor(distance / 30) + 1;
    }
    return ((position.signIndex - asc.signIndex + 12) % 12) + 1;
  };
  const emphasisPlanets =
    houseMode === "western"
      ? planets.filter((planet) => !["Rahu", "Ketu"].includes(planet.name))
      : planets;
  const occupied = emphasisPlanets.reduce((map, planet) => {
    const house = houseOf(planet[positionKey]);
    map[house] = (map[house] || 0) + 1;
    return map;
  }, {});
  const strongest = Object.entries(occupied).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  return (
    <section className="chart-reading">
      <div className="reading-heading">
        <span className="studio-kicker">CHART OVERVIEW</span>
        <h3>What this chart emphasises</h3>
        <p>
          This is a concise, generalised interpretation of the selected{" "}
          {houseMode === "western" ? "Western tropical" : "D" + division} chart.
          It describes themes rather than guaranteeing events.
        </p>
      </div>
      <div className="general-reading">
        <article>
          <small>ASCENDANT</small>
          <h4>{formatPosition(asc)}</h4>
          <p>
            The chart begins through a {SIGN_TONES[asc.sign]} style. Matters
            tend to be approached through the qualities of {asc.sign}.
          </p>
        </article>
        <article>
          <small>SUN AND MOON</small>
          <h4>
            {sun[positionKey].sign} Sun · {moon[positionKey].sign} Moon
          </h4>
          <p>
            The conscious direction is {SIGN_TONES[sun[positionKey].sign]},
            while the emotional response is {SIGN_TONES[moon[positionKey].sign]}
            . Their interaction is central to how the chart is expressed.
          </p>
        </article>
        <article>
          <small>HOUSE EMPHASIS</small>
          <h4>House {strongest || "—"}</h4>
          <p>
            {strongest
              ? `House ${strongest} contains the largest concentration of ${houseMode === "western" ? "planets, excluding the lunar nodes" : "planets"}, so its topics become a major area of activity and development${houseMode === "western" ? " in the equal-house view" : ""}.`
              : "The planets are broadly distributed, suggesting that no single house dominates this chart."}
          </p>
        </article>
      </div>
      <div className="planet-reading-grid">
        {planets.map((planet) => {
          const position = planet[positionKey];
          const house = houseOf(position);
          const displayName =
            houseMode === "western" && planet.name === "Rahu"
              ? "North Node"
              : houseMode === "western" && planet.name === "Ketu"
                ? "South Node"
                : planet.name;
          return (
            <article key={planet.name}>
              <div className="planet-reading-title">
                <span>{planet.glyph}</span>
                <div>
                  <h4>
                    {displayName}
                    {planet.retrograde ? " ℞" : ""}
                  </h4>
                  <small>
                    {formatPosition(position)} · House {house}
                  </small>
                </div>
              </div>
              <p>
                {displayName} represents {PLANET_MEANINGS[planet.name]}. In{" "}
                {position.sign}, it operates in a {SIGN_TONES[position.sign]}{" "}
                manner, with its results directed through the subjects of house{" "}
                {house}.
                {planet.retrograde
                  ? " Retrograde motion makes the expression more internal, reflective or non-linear."
                  : " Direct motion supports a more outward and immediate expression."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WesternAnalysis({ chart, transits }) {
  const planets = chart.planets.filter(
    (planet) => !["Rahu", "Ketu"].includes(planet.name),
  );
  const asc = chart.ascendant.tropical;
  const houseOf = (position) =>
    Math.floor(
      ((((position.longitude - asc.longitude) % 360) + 360) % 360) / 30,
    ) + 1;
  const aspects = [];
  planets.forEach((first, index) =>
    planets.slice(index + 1).forEach((second) => {
      const separation = Math.abs(
        ((first.tropical.longitude - second.tropical.longitude + 540) % 360) -
          180,
      );
      const closest = WESTERN_ASPECTS.map((item) => ({
        ...item,
        orbValue: Math.abs(separation - item.angle),
      })).sort((a, b) => a.orbValue - b.orbValue)[0];
      if (closest.orbValue <= closest.orb)
        aspects.push({
          first,
          second,
          ...closest,
          strength:
            closest.orbValue <= 2
              ? "Strong"
              : closest.orbValue <= 4
                ? "Moderate"
                : "Wide",
        });
    }),
  );
  const counts = (key, labels) =>
    labels.map((label) => ({
      label,
      value: planets.reduce(
        (sum, planet) =>
          sum + (SIGN_DATA[planet.tropical.sign]?.[key] === label ? 1 : 0),
        0,
      ),
    }));
  const elements = counts(0, ["Fire", "Earth", "Air", "Water"]),
    modalities = counts(1, ["Cardinal", "Fixed", "Mutable"]);
  const dignityRows = planets
    .filter((planet) => DIGNITIES[planet.name])
    .map((planet) => {
      const sign = planet.tropical.sign,
        rule = DIGNITIES[planet.name];
      const dignity = rule.domicile.includes(sign)
        ? "Domicile"
        : rule.exaltation.includes(sign)
          ? "Exaltation"
          : rule.detriment.includes(sign)
            ? "Detriment"
            : rule.fall.includes(sign)
              ? "Fall"
              : "Peregrine";
      return { ...planet, dignity };
    });
  const rulerName = SIGN_DATA[asc.sign]?.[2];
  const ruler = planets.find((planet) => planet.name === rulerName);
  const scores = planets
    .map((planet) => {
      const angular = [1, 4, 7, 10].includes(houseOf(planet.tropical)) ? 3 : 0;
      const links = aspects.filter(
        (aspect) =>
          aspect.first.name === planet.name ||
          aspect.second.name === planet.name,
      ).length;
      const dignity = dignityRows.find(
        (item) => item.name === planet.name,
      )?.dignity;
      return {
        planet,
        score:
          angular +
          links +
          (dignity === "Domicile" ? 3 : dignity === "Exaltation" ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score);
  const signGroups = planets.reduce((map, planet) => {
    (map[planet.tropical.sign] ??= []).push(planet.name);
    return map;
  }, {});
  const stelliums = Object.entries(signGroups).filter(
    ([, members]) => members.length >= 3,
  );
  const occupied = Array.from({ length: 12 }, (_, index) => ({
    house: index + 1,
    planets: planets.filter((planet) => houseOf(planet.tropical) === index + 1),
  }));
  const transitRows = transits
    .filter((planet) => !["Rahu", "Ketu"].includes(planet.name))
    .map((planet) => {
      const natal = chart.planets.find((item) => item.name === planet.name);
      const separation = Math.abs(
        ((planet.tropical.longitude - natal.tropical.longitude + 540) % 360) -
          180,
      );
      const closest = WESTERN_ASPECTS.map((item) => ({
        ...item,
        orbValue: Math.abs(separation - item.angle),
      })).sort((a, b) => a.orbValue - b.orbValue)[0];
      return {
        ...planet,
        westernAspect: closest.orbValue <= closest.orb ? closest : null,
      };
    });
  return (
    <>
      <section className="western-report-section western-structure-page">
        <div className="section-heading">
          <span className="studio-kicker">CHART STRUCTURE</span>
          <h3>Ruler, balance and dominant signatures</h3>
          <p>
            A clear summary of the chart's strongest patterns. Calculation
            mechanics are intentionally omitted from the report.
          </p>
        </div>
        <div className="western-summary-grid">
          <article>
            <small>CHART RULER</small>
            <h4>
              {ruler?.glyph} {rulerName}
            </h4>
            <p>
              {asc.sign} rises, making {rulerName} the chart ruler. It is placed
              in {ruler?.tropical.sign}, house{" "}
              {ruler ? houseOf(ruler.tropical) : "—"}.
            </p>
          </article>
          <article>
            <small>DOMINANT PLANETS</small>
            <h4>
              {scores
                .slice(0, 3)
                .map((item) => item.planet.name)
                .join(" · ")}
            </h4>
            <p>
              These bodies stand out through angularity, essential condition and
              major aspect connections.
            </p>
          </article>
          <article>
            <small>CHART PATTERN</small>
            <h4>
              {stelliums.length ? "Stellium emphasis" : "Distributed emphasis"}
            </h4>
            <p>
              {stelliums.length
                ? stelliums
                    .map(([sign, members]) => `${sign}: ${members.join(", ")}`)
                    .join(" · ")
                : "No sign contains three or more principal planets; attention is spread across several life areas."}
            </p>
          </article>
        </div>
        <div className="balance-grid">
          <Balance title="Element balance" rows={elements} />
          <Balance title="Modality balance" rows={modalities} />
          <article className="dignity-card">
            <h4>Essential dignities</h4>
            {dignityRows.map((planet) => (
              <div key={planet.name}>
                <span>
                  {planet.glyph} {planet.name} in {planet.tropical.sign}
                </span>
                <b>{planet.dignity}</b>
              </div>
            ))}
          </article>
        </div>
      </section>
      <section className="western-report-section western-aspects-page">
        <div className="section-heading">
          <span className="studio-kicker">PLANETARY DYNAMICS</span>
          <h3>Major natal aspects</h3>
          <p>
            Exact aspect type, orb and relative strength, followed by concise
            interpretations.
          </p>
        </div>
        <table className="planet-table western-aspect-table">
          <thead>
            <tr>
              <th>Planet pair</th>
              <th>Aspect</th>
              <th>Orb</th>
              <th>Strength</th>
            </tr>
          </thead>
          <tbody>
            {aspects.map((aspect, index) => (
              <tr key={index}>
                <td>
                  <b>
                    {aspect.first.glyph} {aspect.first.name} —{" "}
                    {aspect.second.glyph} {aspect.second.name}
                  </b>
                </td>
                <td>
                  {aspect.symbol} {aspect.name}
                </td>
                <td>{aspect.orbValue.toFixed(2)}°</td>
                <td>{aspect.strength}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="aspect-reading-grid">
          {aspects.slice(0, 12).map((aspect, index) => (
            <article key={index}>
              <h4>
                {aspect.first.name} {aspect.name.toLowerCase()}{" "}
                {aspect.second.name}
              </h4>
              <p>
                {aspect.name === "Trine" || aspect.name === "Sextile"
                  ? "A cooperative connection that helps these two functions support and develop one another."
                  : aspect.name === "Square" || aspect.name === "Opposition"
                    ? "A dynamic tension that asks for awareness, adjustment and productive integration."
                    : "A concentrated blend that makes both planetary themes operate together."}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="western-report-section western-houses-page">
        <div className="section-heading">
          <span className="studio-kicker">TWELVE LIFE AREAS</span>
          <h3>House cusps and natal emphasis</h3>
          <p>
            Equal-house cusps begin from the tropical Ascendant. Only
            interpreted results are shown.
          </p>
        </div>
        <div className="house-reading-grid">
          {occupied.map((item) => {
            const cusp = (asc.longitude + (item.house - 1) * 30) % 360;
            const signIndex = Math.floor(cusp / 30),
              degree = Math.floor(cusp % 30);
            return (
              <article key={item.house}>
                <small>
                  HOUSE {item.house} · {degree}°{" "}
                  {Object.keys(SIGN_DATA)[signIndex]}
                </small>
                <h4>
                  {item.planets.length
                    ? item.planets
                        .map((planet) => `${planet.glyph} ${planet.name}`)
                        .join(" · ")
                    : "Unoccupied house"}
                </h4>
                <p>
                  This house focuses on {HOUSE_TOPICS[item.house - 1]}.
                  {item.planets.length
                    ? ` ${item.planets.map((planet) => planet.name).join(" and ")} brings added attention here.`
                    : " Its ruler and aspects still carry its topics."}
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="western-report-section western-transits-page">
        <div className="section-heading">
          <span className="studio-kicker">CURRENT SKY</span>
          <h3>Western transits</h3>
          <p>
            Current tropical placements and same-planet natal contacts for{" "}
            {new Date().toLocaleDateString()}.
          </p>
        </div>
        <table className="planet-table">
          <thead>
            <tr>
              <th>Body</th>
              <th>Current tropical position</th>
              <th>Motion</th>
              <th>Natal contact</th>
            </tr>
          </thead>
          <tbody>
            {transitRows.map((planet) => (
              <tr key={planet.name}>
                <td>
                  <b>
                    {planet.glyph} {planet.name}
                  </b>
                </td>
                <td>{formatPosition(planet.tropical)}</td>
                <td>{planet.retrograde ? "Retrograde" : "Direct"}</td>
                <td>
                  {planet.westernAspect
                    ? `${planet.westernAspect.name} · ${planet.westernAspect.orbValue.toFixed(2)}° orb`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="advanced-western-note">
          <b>Advanced forecasting and relationship charts</b>
          <p>
            Solar returns, secondary progressions, synastry and composite charts
            require a selected return year or a second person's complete birth
            details. They are kept input-dependent so the report never displays
            fabricated or generic results.
          </p>
        </div>
      </section>
    </>
  );
}

function Balance({ title, rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  return (
    <article className="balance-card">
      <h4>{title}</h4>
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <i>
            <em style={{ width: `${(row.value / total) * 100}%` }} />
          </i>
          <b>{row.value}</b>
        </div>
      ))}
    </article>
  );
}

function AstrocartographyInsights({ chart, lines }) {
  const planets = chart.planets.filter(
    (planet) => !["Rahu", "Ketu"].includes(planet.name),
  );
  const angleMeaning = {
    AC: "identity, confidence and personal expression",
    DC: "partnerships, clients and important encounters",
    MC: "career, reputation and public direction",
    IC: "home, family and inner stability",
  };
  const lineCount = (name) =>
    lines.filter((line) => line.planet === name).length;
  return (
    <section className="astro-chart-insights">
      <div className="reading-heading">
        <span className="studio-kicker">
          YOUR MAP, THROUGH YOUR NATAL CHART
        </span>
        <h3>Personalised astrocartography insights</h3>
        <p>
          These interpretations connect each world line to the actual tropical
          placement in this birth chart. They explain how a planet is likely to
          express itself when angular in a location.
        </p>
      </div>
      <div className="astro-focus-grid">
        <article>
          <small>VISIBILITY &amp; CAREER</small>
          <h4>Sun and Jupiter lines</h4>
          <p>
            Sun and Jupiter MC or AC regions can support recognition,
            confidence, leadership and expansion. Their exact tone comes from{" "}
            {planets.find((p) => p.name === "Sun")?.tropical.sign} and{" "}
            {planets.find((p) => p.name === "Jupiter")?.tropical.sign} in this
            natal chart.
          </p>
        </article>
        <article>
          <small>RELATIONSHIPS &amp; BELONGING</small>
          <h4>Venus and Moon lines</h4>
          <p>
            Venus and Moon DC or IC regions emphasise connection, emotional
            familiarity, pleasure and belonging. Their natal signs show what
            kind of relationships and environments feel most natural.
          </p>
        </article>
        <article>
          <small>EFFORT &amp; REINVENTION</small>
          <h4>Mars, Saturn and outer planets</h4>
          <p>
            Mars and Saturn locations can demand action and responsibility,
            while Uranus, Neptune and Pluto lines tend to intensify change,
            inspiration or deep personal transformation.
          </p>
        </article>
      </div>
      <div className="astro-planet-insights">
        {planets.map((planet) => {
          const position = planet.tropical;
          const planetLines = lines.filter(
            (line) => line.planet === planet.name,
          );
          const angles = [
            ...new Set(
              planetLines
                .map((line) => line.angle || line.type)
                .filter(Boolean),
            ),
          ];
          return (
            <article key={planet.name}>
              <div className="planet-reading-title">
                <span>{planet.glyph}</span>
                <div>
                  <h4>
                    {planet.name}
                    {planet.retrograde ? " ℞" : ""}
                  </h4>
                  <small>
                    {formatPosition(position)} · {lineCount(planet.name)} map
                    lines
                  </small>
                </div>
              </div>
              <p>
                In this chart, {planet.name} expresses{" "}
                {PLANET_MEANINGS[planet.name]} through a{" "}
                {SIGN_TONES[position.sign]} {position.sign} style. Its{" "}
                {angles.length ? angles.join(", ") : "angular"} lines bring
                these natal qualities into the foreground through{" "}
                {angles
                  .map((angle) => angleMeaning[angle])
                  .filter(Boolean)
                  .join(", ") || "location-specific life themes"}
                .
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StudioHeader({
  navigate,
  theme,
  toggleTheme,
  session,
  detectedCountry,
  menuOpen,
  setMenuOpen,
}) {
  const go = (event, path) => {
    event.preventDefault();
    setMenuOpen(false);
    navigate(path);
  };
  const links = [
    ["Home", "/"],
    ["Services", "/services"],
    ["About", "/about"],
    ["Pricing", "/pricing"],
    ["Testimonials", "/testimonials"],
    ["Blog", "/blog"],
    ["Contact", "/contact"],
  ];
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <a
            className="brand"
            href="/"
            onClick={(event) => go(event, "/")}
            aria-label="Asterism Astro Home"
          >
            <img
              src="/asterism-astro-logo-transparent.png"
              alt="Asterism Astro"
              className="brand-logo"
            />
          </a>
          <nav className="navlinks">
            {links.map(([label, path]) => (
              <a key={path} href={path} onClick={(event) => go(event, path)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="actions">
            {detectedCountry && (
              <button
                type="button"
                className="country-indicator"
                title={`${detectedCountry.name || ""} • ${detectedCountry.currency || ""}`}
              >
                {detectedCountry.flag || "🌐"} {detectedCountry.code || ""}
              </button>
            )}
            <a
              className="session-account-link"
              href={session ? "/account" : "/login"}
              onClick={(event) => go(event, session ? "/account" : "/login")}
            >
              {session ? "My Account" : "Log In"}
            </a>
            <button
              type="button"
              data-theme-toggle
              className="theme-toggle"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === "dark" ? "☼" : "☾"}
            </button>
            <a
              className="btn btn-gold"
              href="/book-consultation"
              onClick={(event) => go(event, "/book-consultation")}
            >
              Book a Consultation
            </a>
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
            >
              ☰
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div className="studio-mobile-menu">
          <nav>
            {links.map(([label, path]) => (
              <a key={path} href={path} onClick={(event) => go(event, path)}>
                {label}
              </a>
            ))}
            <a
              href={session ? "/account" : "/login"}
              onClick={(event) => go(event, session ? "/account" : "/login")}
            >
              {session ? "My Account" : "Log In"}
            </a>
            <a
              className="mobile-consultation"
              href="/book-consultation"
              onClick={(event) => go(event, "/book-consultation")}
            >
              Book a Consultation
            </a>
          </nav>
        </div>
      )}
    </>
  );
}

function StudioFooter({ navigate }) {
  const go = (event, path) => {
    event.preventDefault();
    navigate(path);
  };
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand">
            <span className="brand-mark">✧</span>Asterism Astro
          </div>
          <p>
            Ancient wisdom, modern guidance. Thoughtful astrology and divinatory
            consultations for curious individuals.
          </p>
          <div className="social-links" aria-label="Social links">
            <a
              className="social-icon"
              href="https://www.instagram.com/asterism_astro/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              ◎
            </a>
            <a
              className="social-icon"
              href="https://discord.gg/Puj8sHbJ9"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              ◈
            </a>
            <a
              className="social-icon"
              href="https://www.reddit.com/r/PalmReading/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Reddit"
            >
              ●
            </a>
            <a
              className="social-icon"
              href="https://linktr.ee/asterismastro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Linktree"
            >
              ✣
            </a>
          </div>
        </div>
        <div>
          <h4>Services</h4>
          <a href="/services" onClick={(event) => go(event, "/services")}>
            Palmistry
          </a>
          <a href="/services" onClick={(event) => go(event, "/services")}>
            Vedic Astrology
          </a>
          <a href="/services" onClick={(event) => go(event, "/services")}>
            Relationship Analysis
          </a>
          <a href="/services" onClick={(event) => go(event, "/services")}>
            Career &amp; Finance
          </a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="/about" onClick={(event) => go(event, "/about")}>
            About Us
          </a>
          <a href="/pricing" onClick={(event) => go(event, "/pricing")}>
            Pricing
          </a>
          <a
            href="/testimonials"
            onClick={(event) => go(event, "/testimonials")}
          >
            Testimonials
          </a>
          <a href="/blog" onClick={(event) => go(event, "/blog")}>
            Journal
          </a>
          <a href="/contact" onClick={(event) => go(event, "/contact")}>
            Contact
          </a>
        </div>
        <div>
          <h4>Legal</h4>
          <a
            href="/privacy-policy"
            onClick={(event) => go(event, "/privacy-policy")}
          >
            Privacy Policy
          </a>
          <a
            href="/terms-of-service"
            onClick={(event) => go(event, "/terms-of-service")}
          >
            Terms of Service
          </a>
          <a
            href="/refund-policy"
            onClick={(event) => go(event, "/refund-policy")}
          >
            Refund Policy
          </a>
          <a href="/disclaimer" onClick={(event) => go(event, "/disclaimer")}>
            Disclaimer
          </a>
        </div>
      </div>
      <div className="container copyright">
        © {new Date().getFullYear()} Asterism Astro. All rights reserved.
      </div>
    </footer>
  );
}

function PlanetTable({ planets, mode = "vedic" }) {
  const western = mode === "western";
  return (
    <div>
      <div className="section-heading">
        <span className="studio-kicker">
          {western ? "TROPICAL POSITIONS" : "SIDEREAL POSITIONS"}
        </span>
        <h3>
          {western ? "Western planetary placements" : "Vedic planetary table"}
        </h3>
        <p>
          {western
            ? "Exact tropical longitude, zodiac sign and motion, with the lunar nodes shown by their Western names."
            : "Exact Lahiri sidereal longitude, rashi, nakshatra, pada and motion."}
        </p>
      </div>
      <table className="planet-table detailed-planet-table">
        <thead>
          {western ? (
            <tr>
              <th>Body</th>
              <th>Tropical longitude</th>
              <th>Zodiac sign</th>
              <th>Exact position</th>
              <th>Motion</th>
            </tr>
          ) : (
            <tr>
              <th>Graha</th>
              <th>Sidereal longitude</th>
              <th>Rashi</th>
              <th>Nakshatra</th>
              <th>Pada</th>
              <th>Motion</th>
            </tr>
          )}
        </thead>
        <tbody>
          {planets.map((p) => {
            const nak = nakshatraInfo(p.sidereal.longitude);
            const westernName =
              p.name === "Rahu"
                ? "North Node"
                : p.name === "Ketu"
                  ? "South Node"
                  : p.name;
            return western ? (
              <tr key={p.name}>
                <td>
                  <b>
                    <span className="table-glyph">{p.glyph}</span> {westernName}
                  </b>
                </td>
                <td>{p.tropical.longitude.toFixed(4)}°</td>
                <td>{p.tropical.sign}</td>
                <td>{formatPosition(p.tropical)}</td>
                <td>
                  <span className={p.retrograde ? "motion retro" : "motion"}>
                    {p.retrograde ? "Retrograde" : "Direct"}
                  </span>
                </td>
              </tr>
            ) : (
              <tr key={p.name}>
                <td>
                  <b>
                    <span className="table-glyph">{p.glyph}</span> {p.name}
                  </b>
                </td>
                <td>
                  {p.sidereal.longitude.toFixed(4)}°
                  <small>{formatPosition(p.sidereal)}</small>
                </td>
                <td>{p.sidereal.sign}</td>
                <td>
                  {nak.name}
                  <small>Lord: {nak.lord}</small>
                </td>
                <td>{nak.pada}</td>
                <td>
                  <span className={p.retrograde ? "motion retro" : "motion"}>
                    {p.retrograde ? "Retrograde" : "Direct"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BnnInsights({ chart }) {
  const sidereal = chart.planets.filter(
    (p) => !["Uranus", "Neptune", "Pluto"].includes(p.name),
  );
  const connections = [];
  sidereal.forEach((planet, index) =>
    sidereal.slice(index + 1).forEach((other) => {
      const difference = Math.abs(
        ((planet.sidereal.signIndex - other.sidereal.signIndex + 6) % 12) - 6,
      );
      if ([0, 2, 4, 6].includes(difference))
        connections.push({
          planet,
          other,
          difference,
          label:
            difference === 0
              ? "Conjunction"
              : difference === 2
                ? "Trinal sign flow"
                : difference === 4
                  ? "Fifth-sign linkage"
                  : "Opposition axis",
        });
    }),
  );
  const explain = (planet, other, label) => {
    const first = PLANET_MEANINGS[planet.name] || "its natural significations";
    const second = PLANET_MEANINGS[other.name] || "its natural significations";
    const link =
      label === "Conjunction"
        ? "operate as one concentrated stream, so one planet immediately activates the other"
        : label === "Trinal sign flow"
          ? "support each other through an easy, repeating flow of experience"
          : label === "Fifth-sign linkage"
            ? "create a developmental link in which intelligence, choices and past patterns connect their results"
            : "pull in opposite directions and produce results through balancing two competing needs";
    const outcome =
      label === "Conjunction"
        ? "This makes the combination prominent and difficult to express separately."
        : label === "Trinal sign flow"
          ? "The connection tends to repeat naturally and can become a dependable strength when used consciously."
          : label === "Fifth-sign linkage"
            ? "Its results grow through learning, responsibility and deliberate decisions rather than immediate ease."
            : "Events often arrive through other people or external circumstances until both sides are integrated.";
    return `${planet.name} signifies ${first}, while ${other.name} governs ${second}. In this ${label.toLowerCase()}, they ${link}. ${planet.name} acts through the ${SIGN_TONES[planet.sidereal.sign]} nature of ${planet.sidereal.sign}, while ${other.name} responds through the ${SIGN_TONES[other.sidereal.sign]} nature of ${other.sidereal.sign}. ${outcome}`;
  };
  return (
    <div>
      <div className="section-heading">
        <span className="studio-kicker">BHRIGU NANDI NADI</span>
        <h3>Planetary connection matrix</h3>
        <p>
          Sign-based conjunction, trinal, fifth-sign and opposition links with a
          precise interpretation of how each planetary pair operates.
        </p>
      </div>
      <div className="bnn-cards">
        {connections.slice(0, 18).map(({ planet, other, label }) => (
          <article key={`${planet.name}${other.name}`}>
            <span>
              {planet.glyph} {planet.name}
            </span>
            <b>{label}</b>
            <span>
              {other.glyph} {other.name}
            </span>
            <small>
              {planet.sidereal.sign} ↔ {other.sidereal.sign}
            </small>
            <p>{explain(planet, other, label)}</p>
          </article>
        ))}
      </div>
      <div className="studio-disclaimer">
        <b>Interpretation note</b>
        <p>
          BNN is a lineage-based interpretive method. These descriptions explain
          the actual planetary pair and sign relationship in this chart; timing
          and final outcomes still depend on the full chart and active dasha.
        </p>
      </div>
    </div>
  );
}
