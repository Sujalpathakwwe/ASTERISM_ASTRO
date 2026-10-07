import * as Astronomy from "astronomy-engine";

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
const BODY_MAP = [
  ["Sun", Astronomy.Body.Sun, "☉"], ["Moon", Astronomy.Body.Moon, "☽"],
  ["Mercury", Astronomy.Body.Mercury, "☿"], ["Venus", Astronomy.Body.Venus, "♀"],
  ["Mars", Astronomy.Body.Mars, "♂"], ["Jupiter", Astronomy.Body.Jupiter, "♃"],
  ["Saturn", Astronomy.Body.Saturn, "♄"], ["Uranus", Astronomy.Body.Uranus, "♅"],
  ["Neptune", Astronomy.Body.Neptune, "♆"], ["Pluto", Astronomy.Body.Pluto, "♇"],
];

const mod = (value, divisor = 360) => ((value % divisor) + divisor) % divisor;
const rad = (degrees) => degrees * Math.PI / 180;
const deg = (radians) => radians * 180 / Math.PI;

// Standard Lahiri (Chitrapaksha) ayanamsha, anchored at J2000.0. The
// precession polynomial is expressed in arc-seconds per Julian century. This
// tracks the standard Lahiri value closely without shipping the GPL-licensed
// Swiss Ephemeris in the browser bundle.
export function lahiriAyanamsha(date) {
  const julianCenturies = (julianDay(date) - 2451545) / 36525;
  const precessionArcSeconds =
    5029.0966 * julianCenturies +
    1.11161 * julianCenturies ** 2 -
    0.000113 * julianCenturies ** 3;
  return 23.8570923537 + precessionArcSeconds / 3600;
}

export function localDateToUtc({ date, time, utcOffset }) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - Number(utcOffset) * 60000);
}

function longitudeInfo(longitude) {
  const value = mod(longitude);
  const signIndex = Math.floor(value / 30);
  const withinSign = value % 30;
  // Truncate only the displayed DMS components. Sign and house assignment
  // always use the unrounded astronomical longitude, especially at cusps.
  const totalSeconds = Math.floor(withinSign * 3600 + 1e-7);
  return {
    longitude: value,
    signIndex,
    sign: SIGNS[signIndex],
    degree: Math.floor(totalSeconds / 3600),
    minute: Math.floor((totalSeconds % 3600) / 60),
    second: totalSeconds % 60,
  };
}

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function ascendantLongitude(date, latitude, longitude) {
  const lst = mod(Astronomy.SiderealTime(date) * 15 + longitude);
  const jd = julianDay(date);
  const t = (jd - 2451545) / 36525;
  const epsilon = rad(23.439291 - 0.0130042 * t);
  const theta = rad(lst);
  const phi = rad(latitude);
  // atan2 selects the western intersection of the ecliptic and horizon for
  // this expression. The eastern intersection is the Ascendant, 180° away.
  return mod(
    deg(
      Math.atan2(
        -Math.cos(theta),
        Math.sin(theta) * Math.cos(epsilon) +
          Math.tan(phi) * Math.sin(epsilon)
      )
    ) + 180
  );
}

function meanNodeLongitude(date) {
  const jd = julianDay(date);
  const t = (jd - 2451545) / 36525;
  return mod(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t);
}

function apparentLongitude(body, date) {
  return Astronomy.Ecliptic(
    Astronomy.GeoVector(body, date, true)
  ).elon;
}

function geocentricEquatorial(body, date) {
  const vectorOfDate = Astronomy.RotateVector(
    Astronomy.Rotation_EQJ_EQD(date),
    Astronomy.GeoVector(body, date, true)
  );
  return Astronomy.EquatorFromVector(vectorOfDate);
}

function isRetrograde(body, date) {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false;
  const before = apparentLongitude(body, new Date(date.getTime() - 43200000));
  const after = apparentLongitude(body, new Date(date.getTime() + 43200000));
  return mod(after - before + 180) - 180 < 0;
}

export function calculateChart(input) {
  const utcDate = localDateToUtc(input);
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(utcDate.getTime())) throw new Error("Invalid birth date or time.");
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("Invalid latitude.");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Invalid longitude.");
  const ayanamsha = lahiriAyanamsha(utcDate);
  const tropicalAsc = ascendantLongitude(utcDate, latitude, longitude);
  const planets = BODY_MAP.map(([name, body, glyph]) => {
    const tropical = apparentLongitude(body, utcDate);
    const equator = geocentricEquatorial(body, utcDate);
    return {
      name, glyph, tropical: longitudeInfo(tropical), sidereal: longitudeInfo(tropical - ayanamsha),
      retrograde: isRetrograde(body, utcDate), rightAscension: equator.ra * 15, declination: equator.dec,
    };
  });
  const rahu = meanNodeLongitude(utcDate);
  planets.push({ name: "Rahu", glyph: "☊", tropical: longitudeInfo(rahu), sidereal: longitudeInfo(rahu - ayanamsha), retrograde: true });
  planets.push({ name: "Ketu", glyph: "☋", tropical: longitudeInfo(rahu + 180), sidereal: longitudeInfo(rahu + 180 - ayanamsha), retrograde: true });
  const siderealAsc = longitudeInfo(tropicalAsc - ayanamsha);
  const tropicalAscInfo = longitudeInfo(tropicalAsc);
  const moon = planets.find((planet) => planet.name === "Moon");
  return {
    input, utcDate, ayanamsha, planets,
    ascendant: { tropical: tropicalAscInfo, sidereal: siderealAsc },
    houses: Array.from({ length: 12 }, (_, index) => longitudeInfo(tropicalAsc + index * 30)),
    nakshatra: nakshatraInfo(moon.sidereal.longitude),
    dashas: vimshottariDashas(moon.sidereal.longitude, utcDate),
    generatedAt: new Date().toISOString(),
  };
}

export function nakshatraInfo(longitude) {
  const span = 360 / 27;
  const index = Math.floor(mod(longitude) / span);
  const progress = (mod(longitude) % span) / span;
  return { index, name: NAKSHATRAS[index], pada: Math.floor(progress * 4) + 1, lord: DASHA_LORDS[index % 9], progress };
}

export function vimshottariDashas(moonLongitude, birthDate) {
  const nak = nakshatraInfo(moonLongitude);
  const startLordIndex = nak.index % 9;
  const firstYears = DASHA_YEARS[startLordIndex] * (1 - nak.progress);
  let cursor = new Date(birthDate);
  const result = [];
  for (let offset = 0; offset < 9; offset += 1) {
    const index = (startLordIndex + offset) % 9;
    const years = offset === 0 ? firstYears : DASHA_YEARS[index];
    const end = new Date(cursor.getTime() + years * 365.2425 * 86400000);
    result.push({ lord: DASHA_LORDS[index], start: new Date(cursor), end, years });
    cursor = end;
  }
  return result;
}

export const DIVISIONAL_CHARTS = [
  [1, "Rashi"], [2, "Hora"], [3, "Drekkana"], [4, "Chaturthamsha"], [5, "Panchamsha"],
  [6, "Shashtamsha"], [7, "Saptamsha"], [8, "Ashtamsha"], [9, "Navamsha"], [10, "Dashamsha"],
  [11, "Rudramsha"], [12, "Dwadashamsha"], [16, "Shodashamsha"], [20, "Vimshamsha"],
  [24, "Chaturvimshamsha"], [27, "Bhamsa"], [30, "Trimshamsha"], [40, "Khavedamsha"],
  [45, "Akshavedamsha"], [60, "Shashtiamsha"],
];

const PANCHAMSHA_ODD = [0, 10, 8, 2, 6];
const PANCHAMSHA_EVEN = [1, 5, 11, 9, 7];

function regularVarga(longitude, division, startSign) {
  const value = mod(longitude);
  const withinSign = value % 30;
  const part = Math.min(division - 1, Math.floor(withinSign / (30 / division)));
  return mod(startSign + part, 12) * 30 + mod(withinSign * division, 30);
}

function trimshamshaLongitude(longitude) {
  const value = mod(longitude);
  const sign = Math.floor(value / 30);
  const within = value % 30;
  const odd = sign % 2 === 0;
  const segments = odd
    ? [
        [5, 0],  // Mars: Aries
        [5, 10], // Saturn: Aquarius
        [8, 8],  // Jupiter: Sagittarius
        [7, 2],  // Mercury: Gemini
        [5, 6],  // Venus: Libra
      ]
    : [
        [5, 1],  // Venus: Taurus
        [7, 5],  // Mercury: Virgo
        [8, 11], // Jupiter: Pisces
        [5, 9],  // Saturn: Capricorn
        [5, 7],  // Mars: Scorpio
      ];
  let start = 0;
  for (const [width, destination] of segments) {
    if (within < start + width || start + width >= 30) {
      const degrees = ((within - start) / width) * 30;
      return destination * 30 + Math.min(degrees, 30 - Number.EPSILON);
    }
    start += width;
  }
  return segments.at(-1)[1] * 30;
}

// Returns the longitude in a Parashari varga. D5, D6, D8 and D11 follow the
// widely used supplementary equal-division rules; the remaining entries are
// the classical Shodashavarga mappings described in BPHS.
export function divisionalLongitude(longitude, division) {
  const value = mod(longitude);
  const sign = Math.floor(value / 30);
  const within = value % 30;
  const odd = sign % 2 === 0;
  const modality = sign % 3; // 0 movable, 1 fixed, 2 dual
  const element = sign % 4;  // fire, earth, air, water

  switch (division) {
    case 1:
      return value;
    case 2: {
      const destination = odd
        ? (within < 15 ? 4 : 3)
        : (within < 15 ? 3 : 4);
      return destination * 30 + mod(within * 2, 30);
    }
    case 3:
      return regularVarga(value, 3, sign + Math.floor(within / 10) * 3);
    case 4:
      return regularVarga(value, 4, sign + Math.floor(within / 7.5) * 2);
    case 5: {
      const part = Math.min(4, Math.floor(within / 6));
      const destination = (odd ? PANCHAMSHA_ODD : PANCHAMSHA_EVEN)[part];
      return destination * 30 + mod(within * 5, 30);
    }
    case 6:
      return regularVarga(value, 6, odd ? 0 : 6);
    case 7:
      return regularVarga(value, 7, odd ? sign : sign + 6);
    case 8:
      return regularVarga(value, 8, [0, 8, 4][modality]);
    case 9:
      return regularVarga(value, 9, [0, 9, 6, 3][element]);
    case 10:
      return regularVarga(value, 10, odd ? sign : sign + 8);
    case 11:
      return regularVarga(value, 11, -sign);
    case 12:
      return regularVarga(value, 12, sign);
    case 16:
      return regularVarga(value, 16, [0, 4, 8][modality]);
    case 20:
      return regularVarga(value, 20, [0, 8, 4][modality]);
    case 24:
      return regularVarga(value, 24, odd ? 4 : 3);
    case 27:
      return regularVarga(value, 27, element * 3);
    case 30:
      return trimshamshaLongitude(value);
    case 40:
      return regularVarga(value, 40, odd ? 0 : 6);
    case 45:
      return regularVarga(value, 45, [0, 4, 8][modality]);
    case 60:
      return regularVarga(value, 60, 0);
    default:
      throw new Error(`Unsupported divisional chart: D${division}`);
  }
}

export function getDivisionalChart(chart, division) {
  return {
    ascendant: longitudeInfo(divisionalLongitude(chart.ascendant.sidereal.longitude, division)),
    planets: chart.planets.map((planet) => ({ ...planet, divisional: longitudeInfo(divisionalLongitude(planet.sidereal.longitude, division)) })),
  };
}

export function currentTransits(chart, date = new Date()) {
  const current = calculateChart({ ...chart.input, date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 16), utcOffset: 0 });
  return current.planets.map((planet) => {
    const natal = chart.planets.find((item) => item.name === planet.name);
    const separation = Math.abs(mod(planet.sidereal.longitude - natal.sidereal.longitude + 180) - 180);
    const aspect = [0, 60, 90, 120, 180].map((angle) => ({ angle, orb: Math.abs(separation - angle) })).sort((a, b) => a.orb - b.orb)[0];
    return { ...planet, natal: natal.sidereal, aspect: aspect.orb <= 6 ? aspect : null };
  });
}

export function astrocartographyLines(chart) {
  const gst = Astronomy.SiderealTime(chart.utcDate) * 15;
  return chart.planets.filter((planet) => Number.isFinite(planet.rightAscension)).flatMap((planet) => {
    const mc = mod(planet.rightAscension - gst + 180, 360) - 180;
    const ic = mod(mc + 180 + 180, 360) - 180;
    const curves = ["ASC", "DSC"].map((angle) => ({
      planet: planet.name, glyph: planet.glyph, angle,
      points: Array.from({ length: 35 }, (_, i) => {
        const lat = -85 + i * 5;
        const h = deg(Math.acos(Math.max(-1, Math.min(1, -Math.tan(rad(lat)) * Math.tan(rad(planet.declination))))));
        const longitude = mod(planet.rightAscension - gst + (angle === "ASC" ? -h : h) + 180, 360) - 180;
        return [longitude, lat];
      }).filter(([lon]) => Number.isFinite(lon)),
    }));
    return [{ planet: planet.name, glyph: planet.glyph, angle: "MC", longitude: mc }, { planet: planet.name, glyph: planet.glyph, angle: "IC", longitude: ic }, ...curves];
  });
}
