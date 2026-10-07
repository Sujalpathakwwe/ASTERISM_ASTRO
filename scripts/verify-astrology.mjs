import assert from "node:assert/strict";
import {
  calculateChart,
  divisionalLongitude,
  SIGNS,
} from "../src/astrology/engine.js";

const angularDistance = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const expectNear = (actual, expected, tolerance, label) => {
  assert.ok(
    angularDistance(actual, expected) <= tolerance,
    `${label}: expected ${expected.toFixed(6)}°, received ${actual.toFixed(6)}°`
  );
};
const vargaSign = (longitude, division) => SIGNS[Math.floor(divisionalLongitude(longitude, division) / 30)];

// Regression chart supplied for West Delhi. The values below are taken from
// the provided Lahiri reference chart; small ephemeris differences are allowed
// while signs, houses and the node axis must agree exactly.
const chart = calculateChart({
  name: "Sujal",
  date: "2005-01-15",
  time: "21:42",
  utcOffset: 330,
  latitude: 28.65655,
  longitude: 77.10068,
});

expectNear(chart.ayanamsha, 23 + 55 / 60 + 37 / 3600, 0.01, "Lahiri ayanamsha");
expectNear(chart.ascendant.sidereal.longitude, 120 + 23 + 8 / 60 + 25 / 3600, 0.05, "Sidereal ascendant");
assert.equal(chart.ascendant.sidereal.sign, "Leo");

const expected = {
  Sun: ["Capricorn", 270 + 1 + 42 / 60],
  Moon: ["Pisces", 330 + 12 + 9 / 60],
  Mars: ["Scorpio", 210 + 20 + 37 / 60],
  Mercury: ["Sagittarius", 240 + 13 + 51 / 60],
  Jupiter: ["Virgo", 150 + 24 + 29 / 60],
  Venus: ["Sagittarius", 240 + 13 + 34 / 60],
  Saturn: ["Gemini", 60 + 29 + 48 / 60],
  Rahu: ["Aries", 3 + 37 / 60],
  Ketu: ["Libra", 180 + 3 + 37 / 60],
};

for (const [name, [sign, longitude]] of Object.entries(expected)) {
  const planet = chart.planets.find((item) => item.name === name);
  assert.ok(planet, `${name} is missing`);
  assert.equal(planet.sidereal.sign, sign, `${name} rashi`);
  expectNear(planet.sidereal.longitude, longitude, 0.08, `${name} longitude`);
}
assert.equal(chart.planets.find((item) => item.name === "Saturn").retrograde, true);
assert.equal(chart.nakshatra.name, "Uttara Bhadrapada");
assert.equal(chart.nakshatra.pada, 3);

// Boundary-independent checks for the supported Parashari mappings.
assert.equal(vargaSign(5, 2), "Leo");
assert.equal(vargaSign(20, 2), "Cancer");
assert.equal(vargaSign(35, 2), "Cancer");
assert.equal(vargaSign(50, 2), "Leo");
assert.equal(vargaSign(41, 3), "Virgo");
assert.equal(vargaSign(38, 4), "Leo");
assert.equal(vargaSign(30, 5), "Taurus");
assert.equal(vargaSign(30, 6), "Libra");
assert.equal(vargaSign(30, 7), "Scorpio");
assert.equal(vargaSign(30, 8), "Sagittarius");
assert.equal(vargaSign(30, 9), "Capricorn");
assert.equal(vargaSign(30, 10), "Capricorn");
assert.equal(vargaSign(60, 11), "Aquarius");
assert.equal(vargaSign(30, 12), "Taurus");
assert.equal(vargaSign(30, 16), "Leo");
assert.equal(vargaSign(30, 20), "Sagittarius");
assert.equal(vargaSign(30, 24), "Cancer");
assert.equal(vargaSign(30, 27), "Cancer");
assert.equal(vargaSign(1, 30), "Aries");
assert.equal(vargaSign(6, 30), "Aquarius");
assert.equal(vargaSign(30, 40), "Libra");
assert.equal(vargaSign(30, 45), "Leo");
assert.equal(vargaSign(30, 60), "Aries");

console.log("Astrology calculations verified against the supplied Lahiri reference chart.");
