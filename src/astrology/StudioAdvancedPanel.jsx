import React, { useMemo, useState } from "react";
import { calculateChart, currentTransits } from "./engine";

const fmt = (p) => `${p.sign} ${p.degree}° ${String(p.minute).padStart(2, "0")}′`;
const YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const addYears = (date, years) => new Date(new Date(date).getTime() + years * 365.2425 * 86400000);
function subPeriods(period) {
  let cursor = new Date(period.start);
  return LORDS.map((lord) => {
    const years = period.years * YEARS[lord] / 120;
    const end = addYears(cursor, years);
    const item = { lord, start: new Date(cursor), end, years };
    cursor = end;
    return item;
  });
}
const COPY = {
  vedic: ["VEDIC CALCULATION SETTINGS", "Sidereal chart controls"],
  western: ["WESTERN CALCULATION SETTINGS", "Tropical chart controls"],
  astrocartography: ["ASTROCARTOGRAPHY SETTINGS", "Map and relocation controls"],
  compatibility: ["COMPATIBILITY SETTINGS", "Synastry and matching controls"],
};

export default function StudioAdvancedPanel({ chart, system, layout, setLayout, division, setDivision, showWesternAspects, setShowWesternAspects, reportSections, setReportSections }) {
  const [open, setOpen] = useState(false);
  const [transitDate, setTransitDate] = useState(new Date().toISOString().slice(0, 10));
  const transits = useMemo(() => currentTransits(chart, new Date(`${transitDate}T12:00:00Z`)), [chart, transitDate]);
  const active = chart.dashas.find((d) => Date.now() >= new Date(d.start) && Date.now() < new Date(d.end)) || chart.dashas[0];
  const periods = subPeriods(active);
  const antar = periods.find((d) => Date.now() >= d.start && Date.now() < d.end) || periods[0];
  const saturn = transits.find((p) => p.name === "Saturn");
  const jupiter = transits.find((p) => p.name === "Jupiter");
  const moon = chart.planets.find((p) => p.name === "Moon");
  const year = new Date().getFullYear();
  const annual = useMemo(() => { try { return calculateChart({ ...chart.input, date: `${year}-${chart.input.date.slice(5)}` }); } catch { return null; } }, [chart, year]);
  const toggleReport = (key) => setReportSections((value) => ({ ...value, [key]: !value[key] }));
  const copy = COPY[system] || COPY.vedic;
  const shiftDate = (days) => setTransitDate(new Date(Date.parse(transitDate) + days * 86400000).toISOString().slice(0, 10));

  return <section className={`advanced-studio-panel advanced-${system}`}>
    <button className="advanced-panel-toggle" onClick={() => setOpen((value) => !value)}><span>{copy[0]}</span><b>{open ? "Close settings" : copy[1]}</b><i>{open ? "−" : "+"}</i></button>
    {open && <div className="advanced-panel-body">
      <div className="advanced-control-grid">
        <article><span>DATA VERIFICATION</span><h4>Birth moment</h4><dl>
          <div><dt>Local</dt><dd>{chart.input.date} · {chart.input.time}</dd></div>
          <div><dt>UTC</dt><dd>{new Date(chart.utcDate).toISOString().replace("T", " ").slice(0, 16)}</dd></div>
          <div><dt>Coordinates</dt><dd>{Number(chart.input.latitude).toFixed(4)}°, {Number(chart.input.longitude).toFixed(4)}°</dd></div>
          <div><dt>Timezone</dt><dd>{chart.input.timeZone || "Recorded offset"}</dd></div>
        </dl></article>
        <article><span>{copy[0]}</span><h4>{copy[1]}</h4>
          {system === "vedic" && <><label>Chart layout<select value={layout} onChange={(e) => setLayout(e.target.value)}><option value="north">North Indian</option><option value="south">South Indian</option><option value="east">East Indian</option></select></label><label>Detailed chart<select value={division} onChange={(e) => setDivision(Number(e.target.value))}>{[1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60].map((n) => <option key={n} value={n}>D{n}</option>)}</select></label><p>Lahiri sidereal zodiac, true nodes and Vimshottari timing are used by this window.</p></>}
          {system === "western" && <><label className="report-check"><input type="checkbox" checked={showWesternAspects} onChange={(e) => setShowWesternAspects(e.target.checked)} />Show major aspect lines</label><p>Tropical zodiac and equal houses are used. Planet names, degrees and exact aspect orbs remain visible.</p></>}
          {system === "astrocartography" && <p>Use the planet and angle chips above the map. Selecting a location recalculates its relocated chart at the same UTC birth moment.</p>}
          {system === "compatibility" && <p>Western synastry uses tropical positions. Vedic matching uses the sidereal Moon, nakshatra, D1 and D9. Person B controls are inside this workspace.</p>}
        </article>
        <article><span>REPORT BUILDER</span><h4>Include in PDF</h4>{Object.entries(reportSections).map(([key, value]) => <label className="report-check" key={key}><input type="checkbox" checked={value} onChange={() => toggleReport(key)} />{key[0].toUpperCase() + key.slice(1)}</label>)}<p>These switches now control which matching sections appear in the printed report.</p></article>
      </div>
      {system !== "astrocartography" && system !== "compatibility" && <>
        <section className="transit-date-panel"><div><span>FORECAST DATE</span><h4>{system === "vedic" ? "Gochar date" : "Transit date"}</h4></div><input type="date" value={transitDate} onClick={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setTransitDate(e.target.value)} /><button onClick={() => shiftDate(-1)}>Previous day</button><button onClick={() => shiftDate(1)}>Next day</button></section>
        <div className="forecast-grid">{system === "vedic" ? <><article><small>VIMSHOTTARI</small><h4>{active.lord} Mahadasha</h4><p>{antar.lord} Antardasha</p><span>{new Date(antar.start).toLocaleDateString()} — {new Date(antar.end).toLocaleDateString()}</span></article><article><small>SIDEREAL GOCHAR</small><h4>Jupiter and Saturn</h4><p>Jupiter: {jupiter ? fmt(jupiter.sidereal) : "—"}<br />Saturn: {saturn ? fmt(saturn.sidereal) : "—"}</p></article><article><small>NATAL MOON</small><h4>{fmt(moon.sidereal)}</h4><p>Timing is interpreted against the sidereal natal Moon.</p></article></> : <><article><small>TRANSIT SNAPSHOT</small><h4>{transitDate}</h4><p>{transits.filter((p) => p.aspect).slice(0, 4).map((p) => `${p.name} ${p.aspect.angle}°`).join(" · ") || "No same-planet major contacts inside the configured orb."}</p></article><article><small>SOLAR RETURN REFERENCE</small><h4>{year} birthday chart</h4><p>{annual ? `Tropical Ascendant: ${fmt(annual.ascendant.tropical)}` : "Unavailable"}</p></article><article><small>TROPICAL SKY</small><h4>Jupiter and Saturn</h4><p>Jupiter: {jupiter ? fmt(jupiter.tropical) : "—"}<br />Saturn: {saturn ? fmt(saturn.tropical) : "—"}</p></article></>}</div>
      </>}
      <p className="advanced-method-note">Only settings supported by the active calculation window are shown. Every control here is connected to the visible chart or its printed report.</p>
    </div>}
  </section>;
}
