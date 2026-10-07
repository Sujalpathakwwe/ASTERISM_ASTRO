import React, { useMemo, useState } from "react";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { SIGNS, SIGN_GLYPHS, calculateChart } from "./engine";

const COLORS = [
  "#e8b747",
  "#d88f70",
  "#8eb7c7",
  "#b79ae0",
  "#a8bd72",
  "#e2c98b",
  "#d58ab4",
  "#72a8a1",
  "#d69462",
  "#9ca7c6",
  "#78b8d7",
  "#c887c8",
];
const SOUTH_CELLS = [
  11,
  0,
  1,
  2,
  10,
  null,
  null,
  3,
  9,
  null,
  null,
  4,
  8,
  7,
  6,
  5,
];

const exact = (position) =>
  `${position.degree}°${String(position.minute).padStart(2, "0")}′${String(position.second ?? 0).padStart(2, "0")}″`;
const signGroups = (planets, key) =>
  Array.from({ length: 12 }, (_, sign) =>
    planets.filter((planet) => planet[key]?.signIndex === sign),
  );
const houseNumber = (sign, ascendantSign) =>
  ((sign - ascendantSign + 12) % 12) + 1;

function Placement({ planet, position }) {
  return (
    <div
      className="chart-placement"
      title={`${planet.name}, ${position.sign}, ${exact(position)}${planet.retrograde ? ", retrograde" : ""}`}
    >
      <span className="placement-glyph">{planet.glyph}</span>
      <span className="placement-detail">
        <b>
          {planet.name}
          {planet.retrograde ? " ℞" : ""}
        </b>
        <small>
          {exact(position)} {position.sign}
        </small>
      </span>
    </div>
  );
}

function SignCell({ sign, planets, ascendant, house }) {
  return (
    <div className="detailed-sign-cell">
      <header>
        <span className="cell-sign">
          <b>{SIGNS[sign]}</b>
        </span>
        <span>
          H{house}
          {ascendant ? " · ASC" : ""}
        </span>
      </header>
      <div className="cell-placements">
        {planets.map((planet) => (
          <Placement
            key={planet.name}
            planet={planet}
            position={planet._display}
          />
        ))}
      </div>
    </div>
  );
}

function preparedGroups(chart, positionKey) {
  return signGroups(
    chart.planets.map((planet) => ({
      ...planet,
      _display: planet[positionKey],
    })),
    positionKey,
  );
}

export function SouthIndianChart({ chart, positionKey = "sidereal" }) {
  const groups = preparedGroups(chart, positionKey);
  const asc = chart.ascendant[positionKey].signIndex;
  return (
    <div className="south-chart detailed-chart">
      {SOUTH_CELLS.map((sign, index) =>
        sign === null ? (
          <div key={index} className="south-empty">
            <span className="center-mark">
              ASTERISM
              <br />
              <small>{positionKey.toUpperCase()}</small>
            </span>
          </div>
        ) : (
          <SignCell
            key={sign}
            sign={sign}
            planets={groups[sign]}
            ascendant={asc === sign}
            house={houseNumber(sign, asc)}
          />
        ),
      )}
    </div>
  );
}

export function EastIndianChart({ chart, positionKey = "sidereal" }) {
  const groups = preparedGroups(chart, positionKey);
  const asc = chart.ascendant[positionKey].signIndex;
  return (
    <div className="east-chart detailed-chart">
      {Array.from({ length: 12 }, (_, house) => {
        const sign = (asc + house) % 12;
        return (
          <div key={house} className={`east-house east-house-${house + 1}`}>
            <SignCell
              sign={sign}
              planets={groups[sign]}
              ascendant={house === 0}
              house={house + 1}
            />
          </div>
        );
      })}
    </div>
  );
}

export function NorthIndianChart({ chart, positionKey = "sidereal" }) {
  const groups = preparedGroups(chart, positionKey);
  const asc = chart.ascendant[positionKey].signIndex;
  // Fixed houses: H1 is the upper diamond and H2-H12 run anticlockwise.
  const positions = [
    [50, 25],
    [25, 12],
    [12, 25],
    [25, 50],
    [12, 75],
    [25, 88],
    [50, 75],
    [75, 88],
    [88, 75],
    [75, 50],
    [88, 25],
    [75, 12],
  ];
  return (
    <svg
      className="astro-chart-svg north-detailed"
      viewBox="0 0 100 100"
      aria-label="North Indian Vedic chart"
    >
      <rect x="2" y="2" width="96" height="96" rx="2" />
      <path d="M2 2L98 98M98 2L2 98M50 2L98 50L50 98L2 50Z" />
      {positions.map(([x, y], house) => {
        const sign = (asc + house) % 12;
        return (
          <foreignObject
            key={house}
            x={x - 12}
            y={y - 6}
            width="24"
            height="14"
          >
            <div className="north-house">
              <header>
                H{house + 1} · {SIGNS[sign]} {house === 0 ? "· ASC" : ""}
              </header>
              {groups[sign].map((p) => (
                <div key={p.name}>
                  <b>
                    {p.name.slice(0, 3)}
                    {p.retrograde ? "℞" : ""}
                  </b>{" "}
                  {exact(p._display)}
                </div>
              ))}
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}

const WHEEL_ASPECTS = [
  { name: "Conjunction", angle: 0, orb: 8 },
  { name: "Sextile", angle: 60, orb: 5 },
  { name: "Square", angle: 90, orb: 7 },
  { name: "Trine", angle: 120, orb: 7 },
  { name: "Opposition", angle: 180, orb: 8 },
];

export function WesternWheel({
  chart,
  positionKey = "tropical",
  showAspects = true,
}) {
  const asc = chart.ascendant[positionKey].longitude;
  const westernPlanets = chart.planets.map((planet) =>
    planet.name === "Rahu"
      ? { ...planet, name: "North Node", glyph: "☊" }
      : planet.name === "Ketu"
        ? { ...planet, name: "South Node", glyph: "☋" }
        : planet,
  );
  const plotted = [...westernPlanets].sort(
    (a, b) => a[positionKey].longitude - b[positionKey].longitude,
  );
  const lanes = [];
  plotted.forEach((planet, index) => {
    const longitude = planet[positionKey].longitude;
    const nearby = plotted
      .slice(0, index)
      .filter(
        (other) =>
          Math.abs(
            ((longitude - other[positionKey].longitude + 540) % 360) - 180,
          ) < 9,
      ).length;
    lanes.push(nearby % 4);
  });
  const points = plotted.map((planet, index) => {
    const a = rad(planet[positionKey].longitude - asc - 180),
      radius = [164, 139, 114, 91][lanes[index]];
    return {
      planet,
      x: 250 + radius * Math.cos(a),
      y: 250 + radius * Math.sin(a),
    };
  });
  const aspects = [];
  points.forEach((first, index) =>
    points.slice(index + 1).forEach((second) => {
      const separation = Math.abs(
        ((first.planet[positionKey].longitude -
          second.planet[positionKey].longitude +
          540) %
          360) -
          180,
      );
      const match = WHEEL_ASPECTS.map((item) => ({
        ...item,
        distance: Math.abs(separation - item.angle),
      })).sort((a, b) => a.distance - b.distance)[0];
      if (match.distance <= match.orb)
        aspects.push({ first, second, ...match });
    }),
  );
  return (
    <div className="western-chart-wrap">
      <div className="western-wheel-card">
        <svg
          className="astro-wheel-svg"
          viewBox="0 0 500 500"
          aria-label="Western tropical circular chart"
        >
          <circle className="wheel-outer" cx="250" cy="250" r="232" />
          <circle className="wheel-zodiac-inner" cx="250" cy="250" r="184" />
          <circle className="wheel-planet-inner" cx="250" cy="250" r="76" />
          {Array.from({ length: 12 }, (_, index) => {
            const signCusp = rad(index * 30 - asc - 180),
              signCenter = rad(index * 30 + 15 - asc - 180),
              houseCusp = rad(index * 30 - 180),
              houseCenter = rad(index * 30 + 15 - 180);
            return (
              <g key={index}>
                <line
                  className="wheel-sign-cusp"
                  x1={250 + 184 * Math.cos(signCusp)}
                  y1={250 + 184 * Math.sin(signCusp)}
                  x2={250 + 232 * Math.cos(signCusp)}
                  y2={250 + 232 * Math.sin(signCusp)}
                />
                <line
                  className="wheel-house-cusp"
                  x1={250 + 76 * Math.cos(houseCusp)}
                  y1={250 + 76 * Math.sin(houseCusp)}
                  x2={250 + 184 * Math.cos(houseCusp)}
                  y2={250 + 184 * Math.sin(houseCusp)}
                />
                <text
                  className="wheel-sign"
                  x={250 + 208 * Math.cos(signCenter)}
                  y={255 + 208 * Math.sin(signCenter)}
                >{`${SIGN_GLYPHS[index]}\uFE0E`}</text>
                <text
                  className="wheel-house-number"
                  x={250 + 89 * Math.cos(houseCenter)}
                  y={253 + 89 * Math.sin(houseCenter)}
                >
                  {index + 1}
                </text>
              </g>
            );
          })}
          <g className="wheel-axis">
            <line x1="18" y1="250" x2="482" y2="250" />
            <text x="30" y="242" className="wheel-axis-label">
              ASC
            </text>
            <text x="470" y="242" className="wheel-axis-label">
              DSC
            </text>
          </g>
          {showAspects && (
            <g className="wheel-aspects">
              {aspects.map((aspect, index) => (
                <line
                  key={index}
                  className={`wheel-aspect aspect-${aspect.name.toLowerCase()}`}
                  x1={aspect.first.x}
                  y1={aspect.first.y}
                  x2={aspect.second.x}
                  y2={aspect.second.y}
                />
              ))}
            </g>
          )}
          {points.map(({ planet, x, y }, index) => {
            const p = planet[positionKey];
            return (
              <g key={planet.name} className="wheel-body">
                <circle
                  className="planet-disc"
                  cx={x}
                  cy={y}
                  r="13"
                  fill={COLORS[index % COLORS.length]}
                />
                <text
                  className="wheel-planet"
                  x={x}
                  y={y + 5}
                >{`${planet.glyph}\uFE0E`}</text>
                <text className="wheel-degree" x={x} y={y + 23}>
                  {planet.name.replace(" Node", " N.")} {exact(p)}
                </text>
              </g>
            );
          })}
          <circle className="wheel-center-mark" cx="250" cy="250" r="4" />
        </svg>
      </div>
      <aside className="wheel-details">
        <div className="wheel-details-heading">
          <span>PLANETARY POSITIONS</span>
          <b>Tropical zodiac</b>
        </div>
        {westernPlanets.map((planet) => (
          <Placement
            key={planet.name}
            planet={planet}
            position={planet[positionKey]}
          />
        ))}
      </aside>
    </div>
  );
}

const rad = (value) => (value * Math.PI) / 180;

const ANGLE_TEXT = {
  ASC: "identity and personal visibility",
  DSC: "relationships and important encounters",
  MC: "career and public direction",
  IC: "home and inner foundations",
};
const PLANET_TEXT = {
  Sun: "confidence, recognition and purpose",
  Moon: "belonging, family and emotional sensitivity",
  Mercury: "learning, communication and trade",
  Venus: "relationships, art and ease",
  Mars: "drive, competition and decisive action",
  Jupiter: "growth, opportunity and perspective",
  Saturn: "responsibility, discipline and lasting achievement",
  Uranus: "freedom, disruption and reinvention",
  Neptune: "inspiration, spirituality and blurred boundaries",
  Pluto: "power, intensity and transformation",
};
const GOAL_PLANETS = {
  Career: ["Sun", "Jupiter", "Saturn", "Mercury"],
  Relationships: ["Venus", "Moon", "Jupiter"],
  Finances: ["Venus", "Jupiter", "Mercury", "Saturn"],
  Home: ["Moon", "Venus", "Sun"],
  Creativity: ["Sun", "Venus", "Neptune"],
  Study: ["Mercury", "Jupiter", "Uranus"],
  Wellbeing: ["Sun", "Moon", "Venus", "Jupiter"],
  Spirituality: ["Neptune", "Jupiter", "Moon", "Pluto"],
  Settlement: ["Moon", "Venus", "Jupiter", "Saturn"],
  Transformation: ["Pluto", "Mars", "Saturn"],
};
const SUPPORTIVE_ANGLES = { Career: ["MC", "ASC"], Relationships: ["DSC", "ASC"], Finances: ["MC", "ASC"], Home: ["IC"], Creativity: ["ASC", "MC"], Study: ["MC", "ASC"], Wellbeing: ["ASC", "IC"], Spirituality: ["IC", "ASC"], Settlement: ["IC", "ASC"], Transformation: ["ASC", "MC"] };
const haversine = (a, b) => {
  const r = 6371,
    dLat = rad(b[1] - a[1]),
    dLon = rad(b[0] - a[0]),
    lat1 = rad(a[1]),
    lat2 = rad(b[1]);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(value));
};

export function AstroMap({
  lines,
  chart,
  cities = [],
  countries: countryList = [],
  states = [],
}) {
  const projection = useMemo(
    () =>
      geoEquirectangular().fitExtent(
        [
          [12, 12],
          [988, 488],
        ],
        { type: "Sphere" },
      ),
    [],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const mapCountries = useMemo(
    () => feature(worldData, worldData.objects.countries),
    [],
  );
  const borders = useMemo(
    () => mesh(worldData, worldData.objects.countries, (a, b) => a !== b),
    [],
  );
  const planets = useMemo(
    () => [...new Set(lines.map((line) => line.planet))],
    [lines],
  );
  const [visiblePlanets, setVisiblePlanets] = useState(() => new Set(planets));
  const [visibleAngles, setVisibleAngles] = useState(
    () => new Set(["ASC", "DSC", "MC", "IC"]),
  );
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [comparisons, setComparisons] = useState([]);
  const filtered = lines.filter(
    (line) => visiblePlanets.has(line.planet) && visibleAngles.has(line.angle),
  );
  const countryNames = useMemo(
    () =>
      Object.fromEntries(
        countryList.map((country) => [country.isoCode, country.name]),
      ),
    [countryList],
  );
  const stateNames = useMemo(
    () =>
      Object.fromEntries(
        states.map((state) => [
          `${state.countryCode}-${state.isoCode}`,
          state.name,
        ]),
      ),
    [states],
  );
  const cityLabel = (city) =>
    [
      city.name,
      stateNames[`${city.countryCode}-${city.stateCode}`],
      countryNames[city.countryCode] || city.countryCode,
    ]
      .filter(Boolean)
      .join(", ");
  const suggestions = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (value.length < 2) return [];
    return cities
      .filter(
        (city) =>
          city.name.toLowerCase().includes(value) ||
          countryNames[city.countryCode]?.toLowerCase().includes(value),
      )
      .slice(0, 12);
  }, [query, cities, countryNames]);
  const linePath = (points) =>
    path({ type: "LineString", coordinates: points });
  const distanceTo = (line) => {
    if (!selected) return Infinity;
    const points = line.points || [[line.longitude, selected.lat]];
    return Math.min(
      ...points.map((point) => haversine([selected.lon, selected.lat], point)),
    );
  };
  const nearby = selected
    ? [...filtered]
        .map((line) => ({ ...line, distance: distanceTo(line) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    : [];
  const influence = (distance) =>
    distance <= 100
      ? "Direct"
      : distance <= 300
        ? "Strong"
        : distance <= 700
          ? "Moderate"
          : "Background";
  const selectPoint = (name, lat, lon) =>
    setSelected({ name, lat: Number(lat), lon: Number(lon) });
  const selectCity = (city) => {
    const label = cityLabel(city);
    setQuery(label);
    setSearchOpen(false);
    selectPoint(label, city.latitude, city.longitude);
  };
  const search = (event) => {
    event.preventDefault();
    if (suggestions[0]) selectCity(suggestions[0]);
  };
  const mapClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect(),
      point = [
        ((event.clientX - rect.left) / rect.width) * 1000,
        ((event.clientY - rect.top) / rect.height) * 500,
      ],
      geo = projection.invert(point);
    if (geo)
      selectPoint(
        `${Math.abs(geo[1]).toFixed(2)}°${geo[1] >= 0 ? "N" : "S"}, ${Math.abs(geo[0]).toFixed(2)}°${geo[0] >= 0 ? "E" : "W"}`,
        geo[1],
        geo[0],
      );
  };
  const toggle = (setter, current, value) =>
    setter((previous) => {
      const next = new Set(previous);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  const crossings = useMemo(() => {
    const vertical = lines.filter((line) => Number.isFinite(line.longitude)),
      curves = lines.filter((line) => line.points);
    const found = [];
    vertical.forEach((a) =>
      curves.forEach((b) => {
        if (a.planet === b.planet) return;
        const point = b.points.reduce(
          (best, item) =>
            Math.abs(item[0] - a.longitude) < Math.abs(best[0] - a.longitude)
              ? item
              : best,
          b.points[0],
        );
        if (Math.abs(point[0] - a.longitude) < 3)
          found.push({ a, b, lon: a.longitude, lat: point[1] });
      }),
    );
    return found.slice(0, 12);
  }, [lines]);
  const relocated = useMemo(() => {
    if (!selected || !chart) return null;
    const utc = new Date(chart.utcDate);
    try {
      return calculateChart({
        ...chart.input,
        date: utc.toISOString().slice(0, 10),
        time: utc.toISOString().slice(11, 16),
        utcOffset: 0,
        latitude: selected.lat,
        longitude: selected.lon,
        place: selected.name,
      });
    } catch {
      return null;
    }
  }, [selected, chart]);
  const comparisonResults = comparisons.map((place) => {
    const scored = Object.fromEntries(
      Object.entries(GOAL_PLANETS).map(([category, names]) => {
        const nearest = lines
          .map((line) => {
            const points = line.points || [[line.longitude, place.lat]];
            return {
              ...line,
              distance: Math.min(
                ...points.map((point) =>
                  haversine([place.lon, place.lat], point),
                ),
              ),
            };
          })
          .filter((line) => names.includes(line.planet))
          .sort((a, b) => a.distance - b.distance)[0];
        return [
          category,
          {
            score: nearest
              ? Math.max(0, Math.min(100, 92 - Math.round(nearest.distance / 14) + (SUPPORTIVE_ANGLES[category]?.includes(nearest.angle) ? 8 : 0)))
              : 0,
            nearest,
          },
        ];
      }),
    );
    const utc = new Date(chart.utcDate);
    let relocatedChart = null;
    try {
      relocatedChart = calculateChart({
        ...chart.input,
        date: utc.toISOString().slice(0, 10),
        time: utc.toISOString().slice(11, 16),
        utcOffset: 0,
        latitude: place.lat,
        longitude: place.lon,
        place: place.name,
      });
    } catch {}
    const values=Object.values(scored).map(item=>item.score);
    const overall=Math.round(values.reduce((sum,value)=>sum+value,0)/(values.length||1));
    const challenging=lines.map(line=>{const points=line.points||[[line.longitude,place.lat]];return {...line,distance:Math.min(...points.map(point=>haversine([place.lon,place.lat],point)))};}).filter(line=>["Mars","Saturn","Pluto"].includes(line.planet)).sort((a,b)=>a.distance-b.distance)[0];
    const challenge=challenging?Math.max(0,100-Math.round(challenging.distance/12)):0;
    return { ...place, scored, relocatedChart, overall, challenging, challenge };
  });
  const ranked=[...comparisonResults].sort((a,b)=>b.overall-a.overall);
  const categoryWinners=Object.keys(GOAL_PLANETS).map(category=>({category,place:[...comparisonResults].sort((a,b)=>b.scored[category].score-a.scored[category].score)[0]})).filter(item=>item.place);
  const mostChallenging=[...comparisonResults].sort((a,b)=>b.challenge-a.challenge)[0];
  return (
    <div className="astro-explorer">
      <div className="map-controls">
        <div className="map-control-group">
          <form className="map-search" onSubmit={search}>
            <div className="location-combobox">
              <input
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search city or country"
                autoComplete="off"
                aria-label="Search city, state and country"
              />
              {searchOpen && suggestions.length > 0 && (
                <div className="location-dropdown">
                  {suggestions.map((city, index) => (
                    <button
                      type="button"
                      key={`${city.name}-${city.stateCode}-${city.countryCode}-${city.latitude}-${index}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectCity(city)}
                    >
                      <b>{city.name}</b>
                      <span>
                        {[
                          stateNames[`${city.countryCode}-${city.stateCode}`],
                          countryNames[city.countryCode] || city.countryCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button>Find location</button>
          </form>
          <div className="map-chip-row planet-filter">
            {planets.map((planet, index) => (
              <button
                type="button"
                key={planet}
                className={visiblePlanets.has(planet) ? "active" : ""}
                style={{ "--chip-color": COLORS[index % COLORS.length] }}
                onClick={() =>
                  toggle(setVisiblePlanets, visiblePlanets, planet)
                }
              >
                {lines.find((line) => line.planet === planet)?.glyph} {planet}
              </button>
            ))}
          </div>
        </div>
        <div className="map-control-group angle-filter">
          <b>Angular lines</b>
          <div className="map-chip-row">
            {["ASC", "DSC", "MC", "IC"].map((angle) => (
              <button
                type="button"
                key={angle}
                className={visibleAngles.has(angle) ? "active" : ""}
                onClick={() => toggle(setVisibleAngles, visibleAngles, angle)}
              >
                <b>{angle}</b>
                {ANGLE_TEXT[angle]}
              </button>
            ))}
          </div>
          <div className="map-control-actions">
            <button
              type="button"
              onClick={() => {
                setVisiblePlanets(new Set(planets));
                setVisibleAngles(new Set(["ASC", "DSC", "MC", "IC"]));
              }}
            >
              Show all
            </button>
            <button
              type="button"
              onClick={() => {
                setVisiblePlanets(new Set());
              }}
            >
              Clear planets
            </button>
          </div>
        </div>
      </div>
      <div className="astro-map-shell">
        <svg
          className="astro-map"
          viewBox="0 0 1000 500"
          role="img"
          aria-label="Interactive world astrocartography map"
          onClick={mapClick}
        >
          <defs>
            <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#102b42" />
              <stop offset="1" stopColor="#071a2b" />
            </linearGradient>
          </defs>
          <path className="map-ocean" d={path({ type: "Sphere" })} />
          <path className="map-graticule" d={path(geoGraticule10())} />
          <path className="map-land" d={path(mapCountries)} />
          <path className="map-borders" d={path(borders)} />
          {filtered.map((line, index) => {
            const color = COLORS[planets.indexOf(line.planet) % COLORS.length];
            if (line.points) {
              return (
                <path
                  key={`${line.planet}-${line.angle}`}
                  className="map-planet-line"
                  d={linePath(line.points)}
                  stroke={color}
                />
              );
            }
            const x = projection([line.longitude, 0])?.[0];
            return (
              <g key={`${line.planet}-${line.angle}`}>
                <path
                  className="map-planet-line"
                  d={linePath([
                    [line.longitude, -89],
                    [line.longitude, 89],
                  ])}
                  stroke={color}
                />
                <text className="map-line-label" x={x + 3} y="27" fill={color}>
                  {line.glyph} {line.angle}
                </text>
              </g>
            );
          })}
          {selected &&
            (() => {
              const point = projection([selected.lon, selected.lat]);
              return point ? (
                <g className="map-pin">
                  <circle cx={point[0]} cy={point[1]} r="6" />
                  <circle cx={point[0]} cy={point[1]} r="11" />
                </g>
              ) : null;
            })()}
        </svg>
        <div className="map-caption">
          <b>Click anywhere to inspect</b>
          <span>
            Clearer boundaries, stronger lines and location-based distance
            ranking.
          </span>
        </div>
      </div>
      {selected ? (
        <>
          <div className="map-inspection">
            <div className="inspection-location">
              <span>SELECTED LOCATION</span>
              <h4>{selected.name}</h4>
              <p>
                {selected.lat.toFixed(4)}°, {selected.lon.toFixed(4)}°
              </p>
              <button
                type="button"
                onClick={() =>
                  setComparisons((list) =>
                    list.some((item) => item.name === selected.name)
                      ? list
                      : list.length < 5
                        ? [...list, selected]
                        : [...list.slice(1), selected],
                  )
                }
              >
                Add to comparison
              </button>
            </div>
            <div className="nearby-lines">
              {nearby.slice(0, 3).map((line, index) => (
                <article
                  key={`${line.planet}-${line.angle}`}
                  style={{
                    "--line-color":
                      COLORS[planets.indexOf(line.planet) % COLORS.length],
                  }}
                >
                  <div>
                    <span>{line.glyph}</span>
                    <b>
                      {line.planet} {line.angle}
                    </b>
                    <small>
                      {Math.round(line.distance).toLocaleString()} km ·{" "}
                      {influence(line.distance)}
                    </small>
                  </div>
                  <p>
                    {PLANET_TEXT[line.planet]} expressed through{" "}
                    {ANGLE_TEXT[line.angle]}.{" "}
                    <strong>
                      {line.distance <= 700
                        ? "This line is within the practical influence range."
                        : "This influence is comparatively subtle here."}
                    </strong>
                  </p>
                </article>
              ))}
            </div>
          </div>
          {relocated && (
            <section className="relocated-chart-panel">
              <div className="section-heading">
                <span className="studio-kicker">RELOCATED CHART</span>
                <h3>{selected.name}</h3>
                <p>
                  The birth moment is preserved while the angles and houses are
                  relocated to the selected coordinates.
                </p>
              </div>
              <WesternWheel chart={relocated} positionKey="tropical" />
              <div className="relocated-facts">
                <div>
                  <small>Relocated Ascendant</small>
                  <b>
                    {relocated.ascendant.tropical.sign}{" "}
                    {relocated.ascendant.tropical.degree}°
                  </b>
                </div>
                <div>
                  <small>Closest line</small>
                  <b>
                    {nearby[0]?.planet} {nearby[0]?.angle}
                  </b>
                </div>
                <div>
                  <small>Travel or settlement</small>
                  <b>
                    {nearby[0]?.distance <= 300
                      ? "Strong for focused experience"
                      : nearby[0]?.distance <= 700
                        ? "Suitable for exploration"
                        : "Relatively neutral base"}
                  </b>
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="map-empty-inspection">
          <span>✦</span>
          <p>
            Search for a city or click the map to see its closest lines,
            distance and relocated chart.
          </p>
        </div>
      )}
      <section className="astro-advanced-grid">
        <article className="astro-report-card crossings-card">
          <span className="studio-kicker">LINE CROSSINGS &amp; PARANS</span>
          <h3>Combined planetary zones</h3>
          {crossings.slice(0, 6).map((item, index) => (
            <p key={index}>
              <b>
                {item.a.planet} {item.a.angle} × {item.b.planet} {item.b.angle}
              </b>
              <br />
              {Math.abs(item.lat).toFixed(1)}°{item.lat >= 0 ? "N" : "S"},{" "}
              {Math.abs(item.lon).toFixed(1)}°{item.lon >= 0 ? "E" : "W"} ·
              combined {PLANET_TEXT[item.a.planet]} and{" "}
              {PLANET_TEXT[item.b.planet]}
            </p>
          ))}
        </article>
        <article className="astro-report-card comparison-card comparison-card-wide">
          <span className="studio-kicker">CITY COMPARISON</span>
          <h3>Compare up to five locations across every aspect</h3>
          {comparisonResults.length ? (
            <>
            {comparisonResults.length>1&&<section className="comparison-verdict"><div className="verdict-winner"><span>BEST OVERALL LOCATION</span><h4>{ranked[0]?.name}</h4><b>{ranked[0]?.overall}/100</b><p>{ranked[0]?.name} has the strongest combined result across the complete comparison, with its best performance in {Object.entries(ranked[0]?.scored||{}).sort((a,b)=>b[1].score-a[1].score)[0]?.[0]}.</p></div><div className="verdict-rankings">{ranked.map((place,index)=><div key={place.name}><span>{index+1}</span><b>{place.name}</b><strong>{place.overall}/100</strong></div>)}</div><div className="verdict-categories">{categoryWinners.map(item=><div key={item.category}><span>Best for {item.category}</span><b>{item.place.name}</b><small>{item.place.scored[item.category].score}/100</small></div>)}</div><div className="verdict-caution"><span>MOST CHALLENGING</span><b>{mostChallenging?.name}</b><p>{mostChallenging?.challenging?.planet} {mostChallenging?.challenging?.angle} is the closest intense line, at approximately {Math.round(mostChallenging?.challenging?.distance||0).toLocaleString()} km.</p></div></section>}
            <div className="comparison-location-grid">
              {comparisonResults.map((place, index) => (
                <section className="comparison-location" key={place.name}>
                  <header><span>LOCATION {index + 1}</span><h4>{place.name}</h4><button type="button" onClick={()=>setComparisons(list=>list.filter(item=>item.name!==place.name))}>Remove</button></header>
                  {place.relocatedChart && <div className="comparison-wheel"><WesternWheel chart={place.relocatedChart} positionKey="tropical" showAspects={false}/></div>}
                  <div className="comparison-angle"><span>Relocated Ascendant</span><b>{place.relocatedChart?.ascendant.tropical.sign} {place.relocatedChart?.ascendant.tropical.degree}°</b><strong>Overall {place.overall}/100</strong></div>
                  <div className="comparison-aspects">
                    {Object.entries(place.scored).map(([category,result])=><div key={category}><span>{category}</span><b>{result.score}/100</b><small>{result.nearest?.planet} {result.nearest?.angle} · {Math.round(result.nearest?.distance||0).toLocaleString()} km</small></div>)}
                  </div>
                </section>
              ))}
            </div>
            </>
          ) : (
            <p>Add locations from the map to compare their charts, angles and every life category.</p>
          )}
        </article>
      </section>
      <section className="astro-technique-guide">
        <article className="astro-guide-card">
          <b>Local-space direction</b>
          <p>
            The selected point and birth location provide a practical
            directional reference for travel and regional exploration.
          </p>
        </article>
        <article className="astro-guide-card">
          <b>Latitude crossings</b>
          <p>
            Crossing cards identify regions where angular planetary influences
            overlap along nearby latitudes.
          </p>
        </article>
        <article className="astro-guide-card">
          <b>Transit activation</b>
          <p>
            Use the report's current-transit section alongside close natal lines
            to judge when a location theme is more active.
          </p>
        </article>
        <article className="astro-guide-card">
          <b>Natal promise</b>
          <p>
            Every location interpretation remains tied to the planet's actual
            natal sign and condition, rather than a generic line meaning.
          </p>
        </article>
      </section>
    </div>
  );
}
