'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

/* ============================================================
   MERIDIAN — Gestión patrimonial personal
   Camino A: frontend vivo con persistencia local,
   autocompletado de precios y motor de insights.
   No constituye asesoramiento financiero.
   ============================================================ */

/* ---------- SISTEMA DE DISEÑO ---------- */
const C = {
  ink: "#0A0C0F", graphite: "#111519", slate: "#171C22", slate2: "#1D242B",
  line: "#262E36", lineSoft: "#1E252C",
  pearl: "#ECEFF2", mist: "#8C97A3", ash: "#5A636D",
  steel: "#5B7C9E", steelSoft: "#3E566E",
  verde: "#5FA88A", rojo: "#C16B6B", gold: "#B8975A",
};
const CHART_NEUTRALS = ["#5B7C9E", "#5FA88A", "#B8975A", "#7C8A99", "#8A6F9E", "#A8857A", "#4E5862"];
const FONTS = {
  display: "'Newsreader', Georgia, 'Times New Roman', serif",
  sans: "'IBM Plex Sans', -apple-system, system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
};

/* ---------- ICONOS ---------- */
const Icon = ({ d, size = 18, stroke = "currentColor", sw = 1.4, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const ICONS = {
  report: "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM13 3v6h6M9 13h6M9 17h4",
  analysis: ["M4 19V5M4 19h16", "M8 16l3-4 3 2 4-7"],
  overview: ["M3 12l9-8 9 8", "M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"],
  income: ["M12 2v20", "M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  holdings: ["M3 6a1 1 0 0 1 1-1h6l2 2h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"],
  alerts: ["M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"],
  plus: ["M12 5v14", "M5 12h14"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  trash: ["M3 6h18", "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2", "M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"],
  chevron: "M6 9l6 6 6-6",
  empty: ["M3 3v18h18", "M7 14l3-3 3 2 4-5"],
  check: "M5 13l4 4L19 7",
  warning: ["M12 9v4", "M12 17h.01", "M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"],
  spark: ["M12 2v4", "M12 18v4", "M4.93 4.93l2.83 2.83", "M16.24 16.24l2.83 2.83", "M2 12h4", "M18 12h4", "M4.93 19.07l2.83-2.83", "M16.24 7.76l2.83-2.83"],
};

/* ---------- UTILIDADES ---------- */
const fmtEUR = (n, dec = 0) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);
const fmtNum = (n, dec = 2) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);
const fmtPct = (n, dec = 1) => `${n >= 0 ? "+" : ""}${fmtNum(n, dec)}%`;
const signColor = (n) => (n > 0 ? C.verde : n < 0 ? C.rojo : C.mist);

/* ---------- HOOK DE PERSISTENCIA LOCAL ---------- */
function usePersistedState(key, initialValue) {
  const [state, setState] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`meridian:${key}`);
      if (stored !== null) setState(JSON.parse(stored));
    } catch (e) { /* ignore */ }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(`meridian:${key}`, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }, [key, state, loaded]);
  return [state, setState, loaded];
}

/* ---------- BÚSQUEDA DE PRECIO (Yahoo via proxy CORS gratuito) ----------
   Funciona desde el navegador. Es no oficial, puede fallar; siempre se permite edición manual.
   --------------------------------------------------------------- */
async function fetchPriceData(ticker) {
  if (!ticker) return null;
  const symbol = ticker.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  // Proxy CORS público (allorigins). Si falla, la app sigue funcionando manualmente.
  const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxied, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta || {};
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const currency = meta.currency || "USD";
    const name = meta.longName || meta.shortName || symbol;
    const exchange = meta.exchangeName || "";
    if (!price) return null;
    const dvar = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    return { symbol, name, price: +price, currency, exchange, dvar: +dvar.toFixed(2) };
  } catch (e) {
    return null;
  }
}

/* ---------- INFERENCIA SIMPLE DE TIPO/SECTOR/PAÍS ---------- */
const HEURISTICS = {
  // ETFs muy comunes
  VWCE: { type: "ETF", sector: "Diversificado", country: "Global" },
  CSPX: { type: "ETF", sector: "Diversificado", country: "EEUU" },
  VUSA: { type: "ETF", sector: "Diversificado", country: "EEUU" },
  VHYL: { type: "ETF", sector: "Diversificado", country: "Global" },
  EUNL: { type: "ETF", sector: "Diversificado", country: "Global" },
  IWDA: { type: "ETF", sector: "Diversificado", country: "Global" },
  // Tecnología EEUU
  AAPL: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  MSFT: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  GOOGL: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  GOOG: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  NVDA: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  AMD: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  META: { type: "Acción", sector: "Tecnología", country: "EEUU" },
  AMZN: { type: "Acción", sector: "Consumo", country: "EEUU" },
  TSLA: { type: "Acción", sector: "Consumo", country: "EEUU" },
  // Europa
  ASML: { type: "Acción", sector: "Tecnología", country: "Europa" },
  SAP: { type: "Acción", sector: "Tecnología", country: "Europa" },
  NESN: { type: "Acción", sector: "Consumo", country: "Europa" },
  // Salud
  JNJ: { type: "Acción", sector: "Salud", country: "EEUU" },
  PFE: { type: "Acción", sector: "Salud", country: "EEUU" },
  // Dividendos clásicos
  O: { type: "Acción", sector: "Inmobiliario", country: "EEUU" },
  KO: { type: "Acción", sector: "Consumo", country: "EEUU" },
  PG: { type: "Acción", sector: "Consumo", country: "EEUU" },
  ENB: { type: "Acción", sector: "Energía", country: "Canadá" },
};
function inferMeta(ticker) {
  return HEURISTICS[ticker?.toUpperCase()] || null;
}

/* ============================================================
   MOTOR FINANCIERO
   ============================================================ */
function useEngine(holdings, snapshots) {
  return useMemo(() => {
    const pos = holdings.map((h) => {
      const value = h.qty * h.price;
      const cost = h.qty * h.avg;
      const pl = value - cost;
      const plPct = cost ? (pl / cost) * 100 : 0;
      return { ...h, value, cost, pl, plPct, dayPL: value * ((h.dvar || 0) / 100) };
    });
    const totalValue = pos.reduce((s, p) => s + p.value, 0);
    const totalCost = pos.reduce((s, p) => s + p.cost, 0);
    const totalPL = totalValue - totalCost;
    const totalPLPct = totalCost ? (totalPL / totalCost) * 100 : 0;
    const dayPL = pos.reduce((s, p) => s + p.dayPL, 0);
    const dayPLPct = (totalValue - dayPL) ? (dayPL / (totalValue - dayPL)) * 100 : 0;
    pos.forEach((p) => (p.weight = totalValue ? (p.value / totalValue) * 100 : 0));
    pos.sort((a, b) => b.value - a.value);

    const groupBy = (key) => {
      const m = {};
      pos.forEach((p) => (m[p[key] || "Sin clasificar"] = (m[p[key] || "Sin clasificar"] || 0) + p.value));
      return Object.entries(m).map(([name, v]) => ({ name, value: v, pct: totalValue ? (v / totalValue) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);
    };

    const hasData = pos.length > 0;
    const snaps = snapshots || [];
    const enoughHistory = snaps.length >= 6;

    let volAnnual = null, maxDrawdown = null, twrTotal = null;
    if (enoughHistory) {
      const idx = snaps.map((s) => s.value);
      const rets = idx.slice(1).map((v, i) => idx[i] ? v / idx[i] - 1 : 0);
      const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
      const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
      volAnnual = Math.sqrt(variance) * Math.sqrt(252) * 100; // diario anualizado
      let peak = -Infinity, dd = 0;
      idx.forEach((v) => { peak = Math.max(peak, v); if (peak) dd = Math.min(dd, (v - peak) / peak); });
      maxDrawdown = dd * 100;
      twrTotal = idx[0] ? (idx[idx.length - 1] / idx[0] - 1) * 100 : 0;
    }

    return {
      pos, totalValue, totalCost, totalPL, totalPLPct, dayPL, dayPLPct,
      bySector: groupBy("sector"), byCountry: groupBy("country"), byType: groupBy("type"),
      hasData, enoughHistory, volAnnual, maxDrawdown, twrTotal,
      snapshots: snaps,
    };
  }, [holdings, snapshots]);
}

/* ============================================================
   SCORE
   ============================================================ */
function computeScore(e) {
  if (!e.hasData) return null;
  const top = e.pos[0];
  const top5 = e.pos.slice(0, 5).reduce((s, p) => s + p.weight, 0);
  const maxSector = e.bySector[0];
  const maxCountry = e.byCountry[0];
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const divComp = clamp((e.pos.length / 15) * 100);
  const concComp = clamp(100 - Math.max(0, top.weight - 5) * 3 - Math.max(0, top5 - 50) * 1.2);
  const expComp = clamp(100 - Math.max(0, maxSector.pct - 30) * 1.6 - Math.max(0, maxCountry.pct - 45) * 1.1);
  const riskComp = e.volAnnual != null ? clamp(100 - Math.max(0, e.volAnnual - 12) * 2.2) : 60;
  const retComp = e.twrTotal != null ? clamp(50 + (e.twrTotal / 2) / (e.volAnnual || 1) * 120) : 55;
  const consComp = Math.min(100, 50 + e.pos.length * 4);
  const parts = [
    { key: "Diversificación", v: divComp, w: 0.20 },
    { key: "Concentración", v: concComp, w: 0.20 },
    { key: "Exposición", v: expComp, w: 0.15 },
    { key: "Riesgo", v: riskComp, w: 0.15 },
    { key: "Rentabilidad ajustada", v: retComp, w: 0.15 },
    { key: "Consistencia", v: consComp, w: 0.15 },
  ];
  const total = Math.round(parts.reduce((s, p) => s + p.v * p.w, 0));
  const label = total >= 90 ? "Excelente" : total >= 75 ? "Muy sólida" : total >= 60 ? "Aceptable" : total >= 40 ? "Riesgo elevado" : "Desequilibrada";
  const labelColor = total >= 75 ? C.verde : total >= 60 ? C.steel : total >= 40 ? C.gold : C.rojo;
  return { total, label, labelColor, parts, top, top5, maxSector, maxCountry };
}

/* ============================================================
   MOTOR DE INSIGHTS — basado en reglas, sin LLM
   Genera observaciones desde 5 ángulos profesionales.
   ============================================================ */
function generateInsights(e, score) {
  if (!e.hasData) return [];
  const out = [];
  const top = e.pos[0];
  const top5 = e.pos.slice(0, 5).reduce((s, p) => s + p.weight, 0);

  // PORTFOLIO MANAGER — equilibrio, concentración
  if (top.weight > 18) out.push({ kind: "Portfolio Manager", sev: "alta", text: `Tu mayor posición, ${top.ticker}, representa el ${fmtNum(top.weight, 1)}% del patrimonio. Una concentración de este tamaño hace que el rendimiento global dependa fuertemente de un único activo.` });
  else if (top.weight > 10) out.push({ kind: "Portfolio Manager", sev: "media", text: `${top.ticker} pondera un ${fmtNum(top.weight, 1)}% en la cartera. Su comportamiento influye de forma notable en el rendimiento global.` });
  if (e.pos.length < 5) out.push({ kind: "Portfolio Manager", sev: "media", text: `La cartera contiene ${e.pos.length} posición${e.pos.length === 1 ? "" : "es"}. La diversificación estructural es limitada hasta alcanzar al menos 8-10 activos descorrelacionados.` });
  if (top5 > 80 && e.pos.length > 5) out.push({ kind: "Portfolio Manager", sev: "media", text: `Las cinco mayores posiciones concentran el ${fmtNum(top5, 0)}% del capital. La cartera funciona estructuralmente como un núcleo de pocos activos.` });

  // ANALISTA FINANCIERO — rendimiento
  if (e.totalPLPct > 15) out.push({ kind: "Analista financiero", sev: "info", text: `El resultado acumulado de la cartera es de ${fmtPct(e.totalPLPct)} sobre el coste invertido (${fmtEUR(e.totalCost)} → ${fmtEUR(e.totalValue)}).` });
  else if (e.totalPLPct < -10) out.push({ kind: "Analista financiero", sev: "media", text: `El resultado acumulado es de ${fmtPct(e.totalPLPct)}. Conviene revisar qué posiciones están detrayendo más rendimiento.` });
  if (e.pos.length > 1) {
    const worst = [...e.pos].sort((a, b) => a.plPct - b.plPct)[0];
    const best = [...e.pos].sort((a, b) => b.plPct - a.plPct)[0];
    if (worst.plPct < -15) out.push({ kind: "Analista financiero", sev: "media", text: `${worst.ticker} acumula una caída del ${fmtPct(worst.plPct)} desde tu precio medio. Es la posición que más resta a tu resultado.` });
    if (best.plPct > 25) out.push({ kind: "Analista financiero", sev: "info", text: `${best.ticker} lidera con ${fmtPct(best.plPct)} sobre precio medio. Es la posición que más aporta al resultado.` });
  }

  // GESTOR PATRIMONIAL — evolución, consistencia
  if (e.snapshots.length >= 2) {
    const first = e.snapshots[0].value;
    const last = e.snapshots[e.snapshots.length - 1].value;
    if (first && last) {
      const growth = ((last / first) - 1) * 100;
      out.push({ kind: "Gestor patrimonial", sev: "info", text: `El valor de la cartera ha evolucionado un ${fmtPct(growth)} desde el primer registro guardado (${e.snapshots.length} actualizaciones almacenadas).` });
    }
  } else {
    out.push({ kind: "Gestor patrimonial", sev: "info", text: `Actualiza los precios periódicamente para que MERIDIAN construya el histórico patrimonial. Con seis registros se activan las métricas de riesgo y evolución.` });
  }

  // ANALISTA DE RIESGO — sector, geografía
  if (e.bySector[0] && e.bySector[0].pct > 40) out.push({ kind: "Analista de riesgo", sev: e.bySector[0].pct > 55 ? "alta" : "media", text: `El sector ${e.bySector[0].name} concentra el ${fmtNum(e.bySector[0].pct, 0)}% del capital. La exposición sectorial es elevada.` });
  if (e.byCountry[0] && e.byCountry[0].pct > 55) out.push({ kind: "Analista de riesgo", sev: "media", text: `${fmtNum(e.byCountry[0].pct, 0)}% del patrimonio está expuesto a ${e.byCountry[0].name}. La diversificación geográfica es limitada.` });
  if (e.volAnnual != null && e.volAnnual > 22) out.push({ kind: "Analista de riesgo", sev: "media", text: `La volatilidad anualizada estimada es del ${fmtNum(e.volAnnual, 1)}%, por encima de lo habitual en carteras diversificadas. Refleja una sensibilidad alta al mercado.` });

  // CONSULTOR — score
  if (score) {
    out.push({ kind: "Consultor financiero", sev: "info", text: `El score patrimonial agregado es de ${score.total}/100 (${score.label}). Los componentes que más lo limitan son los que aparecen con menor barra en el desglose.` });
  }

  return out;
}

/* ============================================================
   COMPONENTES UI BASE
   ============================================================ */
const Card = ({ children, style, pad = 24 }) => (
  <div style={{ background: C.slate, border: `1px solid ${C.lineSoft}`, borderRadius: 4, padding: pad, boxShadow: "0 1px 2px rgba(0,0,0,0.4)", ...style }}>{children}</div>
);
const Eyebrow = ({ children, color = C.ash }) => (
  <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color, fontWeight: 600, fontFamily: FONTS.sans }}>{children}</div>
);
const SectionHeader = ({ title, sub, right }) => (
  <div style={{ marginBottom: 28, borderBottom: `1px solid ${C.lineSoft}`, paddingBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
    <div>
      <h2 style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 500, margin: 0, color: C.pearl, letterSpacing: -0.3 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13.5, color: C.mist, margin: "8px 0 0", fontFamily: FONTS.sans, lineHeight: 1.5, maxWidth: 620 }}>{sub}</p>}
    </div>
    {right}
  </div>
);
const KPI = ({ label, value, sub, subColor }) => (
  <Card pad={20} style={{ flex: 1, minWidth: 158 }}>
    <Eyebrow>{label}</Eyebrow>
    <div style={{ fontSize: 23, fontWeight: 500, marginTop: 10, color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.display, letterSpacing: -0.4 }}>{value}</div>
    {sub != null && <div style={{ fontSize: 12, marginTop: 6, color: subColor || C.mist, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{sub}</div>}
  </Card>
);
const Pill = ({ children, color = C.mist }) => (
  <span style={{ fontSize: 10, fontWeight: 600, color, border: `1px solid ${color}40`, background: `${color}12`, padding: "3px 9px", borderRadius: 3, letterSpacing: 0.6, textTransform: "uppercase", fontFamily: FONTS.sans }}>{children}</span>
);
const Btn = ({ children, onClick, variant = "primary", icon, style, disabled, size = "md" }) => {
  const styles = {
    primary: { background: C.pearl, color: C.ink, border: `1px solid ${C.pearl}` },
    ghost: { background: "transparent", color: C.mist, border: `1px solid ${C.line}` },
    accent: { background: "transparent", color: C.steel, border: `1px solid ${C.steelSoft}` },
    danger: { background: "transparent", color: C.rojo, border: `1px solid ${C.rojo}40` },
  }[variant];
  const pad = size === "sm" ? "6px 12px" : "10px 18px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: pad, borderRadius: 3,
      fontSize: fs, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONTS.sans,
      transition: "all .18s", letterSpacing: 0.2, opacity: disabled ? 0.5 : 1, ...styles, ...style }}>
      {icon && <Icon d={ICONS[icon]} size={size === "sm" ? 13 : 15} sw={1.6} />}{children}
    </button>
  );
};
const ChartTip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.slate2, border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 14px", fontSize: 12, fontFamily: FONTS.mono }}>
      <div style={{ color: C.ash, marginBottom: 5, fontSize: 10.5, letterSpacing: 0.5, fontFamily: FONTS.sans, textTransform: "uppercase" }}>{label}</div>
      {payload.map((p, i) => (<div key={i} style={{ color: p.color || C.pearl, fontVariantNumeric: "tabular-nums" }}>{p.name}: {fmt ? fmt(p.value) : p.value}</div>))}
    </div>
  );
};
const EmptyState = ({ title, message, onPrimary, primaryLabel = "Añadir inversión", icon = "empty" }) => (
  <Card style={{ padding: "64px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", background: `linear-gradient(180deg, ${C.slate} 0%, ${C.graphite} 100%)` }}>
    <div style={{ width: 64, height: 64, borderRadius: "50%", border: `1px solid ${C.line}`, display: "grid", placeItems: "center", color: C.ash, marginBottom: 24, background: C.graphite }}>
      <Icon d={ICONS[icon]} size={26} sw={1.2} />
    </div>
    <h3 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 500, color: C.pearl, margin: 0, letterSpacing: -0.2 }}>{title}</h3>
    <p style={{ fontSize: 13.5, color: C.mist, margin: "12px 0 28px", maxWidth: 380, lineHeight: 1.6, fontFamily: FONTS.sans }}>{message}</p>
    {onPrimary && <Btn onClick={onPrimary} icon="plus">{primaryLabel}</Btn>}
  </Card>
);
const ChartPlaceholder = ({ height = 200, label }) => (
  <div style={{ height, position: "relative", display: "grid", placeItems: "center" }}>
    <svg width="100%" height={height} style={{ position: "absolute", inset: 0, opacity: 0.25 }} preserveAspectRatio="none" viewBox="0 0 400 200">
      <path d="M0 150 C60 120 100 160 160 110 C220 60 260 90 320 70 C360 56 380 64 400 50" fill="none" stroke={C.line} strokeWidth="1.5" />
      {[0,1,2,3].map((i) => <line key={i} x1="0" x2="400" y1={40 + i*40} y2={40 + i*40} stroke={C.lineSoft} strokeWidth="1" />)}
    </svg>
    <span style={{ fontSize: 12, color: C.ash, fontFamily: FONTS.sans, zIndex: 1, letterSpacing: 0.3 }}>{label}</span>
  </div>
);
const Donut = ({ data, title, empty }) => {
  if (empty || !data?.length) {
    return (
      <Card style={{ flex: 1, minWidth: 220 }}>
        <Eyebrow>{title}</Eyebrow>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", border: `1.5px dashed ${C.line}` }} />
          <span style={{ fontSize: 12, color: C.ash, fontFamily: FONTS.sans }}>Sin datos todavía</span>
        </div>
      </Card>
    );
  }
  const top = data[0];
  return (
    <Card style={{ flex: 1, minWidth: 220 }}>
      <Eyebrow>{title}</Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
        <div style={{ width: 104, height: 104, position: "relative" }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={34} outerRadius={50} paddingAngle={1.5} stroke="none">
                {data.map((_, i) => <Cell key={i} fill={CHART_NEUTRALS[i % CHART_NEUTRALS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.pearl, fontFamily: FONTS.display }}>{fmtNum(top.pct, 0)}%</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          {data.slice(0, 5).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontFamily: FONTS.sans }}>
              <span style={{ width: 7, height: 7, borderRadius: 1, background: CHART_NEUTRALS[i % CHART_NEUTRALS.length] }} />
              <span style={{ color: C.mist, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
              <span style={{ color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtNum(d.pct, 0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

/* ============================================================
   FORMULARIO DE POSICIÓN CON AUTOCOMPLETADO
   ============================================================ */
function PositionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ticker: "", name: "", type: "Acción", sector: "Tecnología", country: "EEUU", qty: "", avg: "", price: "", dyield: "", dvar: 0 });
  const [lookup, setLookup] = useState({ loading: false, msg: null, ok: null });

  const doLookup = async () => {
    if (!form.ticker) return;
    setLookup({ loading: true, msg: "Buscando precio…", ok: null });
    const data = await fetchPriceData(form.ticker);
    if (data) {
      const meta = inferMeta(form.ticker) || {};
      setForm((f) => ({
        ...f,
        name: f.name || data.name,
        price: data.price.toFixed(2),
        avg: f.avg || data.price.toFixed(2),
        dvar: data.dvar,
        type: f.type || meta.type || "Acción",
        sector: f.sector || meta.sector || "Tecnología",
        country: f.country || meta.country || "EEUU",
      }));
      setLookup({ loading: false, msg: `Precio encontrado: ${data.price.toFixed(2)} ${data.currency} (${data.exchange || "?"})`, ok: true });
    } else {
      setLookup({ loading: false, msg: "No se encontró precio automático. Introdúcelo manualmente.", ok: false });
    }
  };

  const submit = () => {
    if (!form.ticker || !form.qty || !form.price) return;
    onSave({
      ticker: form.ticker.toUpperCase().trim(),
      name: form.name || form.ticker.toUpperCase().trim(),
      type: form.type, sector: form.sector, country: form.country,
      qty: +form.qty, avg: +form.avg || +form.price, price: +form.price,
      dvar: +form.dvar || 0, dyield: +form.dyield || 0,
    });
  };

  const inputStyle = { width: "100%", background: C.graphite, border: `1px solid ${C.line}`, borderRadius: 3, padding: "10px 12px", color: C.pearl, fontSize: 13, boxSizing: "border-box", fontFamily: FONTS.mono };
  const labelStyle = { fontSize: 10.5, color: C.ash, display: "block", marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase", fontFamily: FONTS.sans };

  return (
    <Card style={{ marginBottom: 20, border: `1px solid ${C.steelSoft}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <Eyebrow color={C.steel}>{initial ? "Editar posición" : "Nueva posición"}</Eyebrow>
        <div style={{ fontSize: 11, color: C.ash, fontFamily: FONTS.sans, fontStyle: "italic" }}>Escribe el ticker y pulsa "Buscar precio" para autocompletar</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginTop: 16 }}>
        <div>
          <label style={labelStyle}>Ticker</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={form.ticker} onChange={(ev) => setForm({ ...form, ticker: ev.target.value })} style={{ ...inputStyle, flex: 1 }} placeholder="AAPL, VWCE…" />
          </div>
        </div>
        {[["name","Nombre"],["qty","Cantidad"],["avg","Precio medio"],["price","Precio actual"],["dyield","Rentab. div. %"]].map(([k,l]) => (
          <div key={k}>
            <label style={labelStyle}>{l}</label>
            <input value={form[k]} onChange={(ev) => setForm({ ...form, [k]: ev.target.value })} style={inputStyle} />
          </div>
        ))}
        {[["type",["Acción","ETF","Fondo"]],["sector",["Tecnología","Salud","Consumo","Energía","Financiero","Industrial","Inmobiliario","Diversificado","Comunicaciones","Utilities","Materiales"]],["country",["EEUU","Europa","Global","Reino Unido","Canadá","Asia","España","Japón","Emergentes"]]].map(([k, opts]) => (
          <div key={k}>
            <label style={labelStyle}>{k === "type" ? "Tipo" : k === "sector" ? "Sector" : "Región"}</label>
            <select value={form[k]} onChange={(ev) => setForm({ ...form, [k]: ev.target.value })} style={{ ...inputStyle, fontFamily: FONTS.sans }}>
              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {lookup.msg && (
        <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 3, background: lookup.ok === true ? `${C.verde}14` : lookup.ok === false ? `${C.gold}14` : C.graphite, border: `1px solid ${lookup.ok === true ? C.verde : lookup.ok === false ? C.gold : C.line}40`, fontSize: 12, color: lookup.ok === true ? C.verde : lookup.ok === false ? C.gold : C.mist, fontFamily: FONTS.sans }}>
          {lookup.msg}
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn onClick={submit} disabled={!form.ticker || !form.qty || !form.price}>Guardar posición</Btn>
        <Btn variant="accent" onClick={doLookup} disabled={!form.ticker || lookup.loading} icon="refresh">{lookup.loading ? "Buscando…" : "Buscar precio"}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </Card>
  );
}

/* ============================================================
   VISTAS
   ============================================================ */
function MonthlyView({ e, score, insights, onAdd }) {
  if (!e.hasData) {
    return (
      <div>
        <SectionHeader title="Informe mensual" sub="Al cierre de cada mes, MERIDIAN preparará un informe patrimonial completo con rendimiento, composición, riesgo y observaciones de los cinco perfiles de análisis." />
        <EmptyState icon="report" title="Aún no hay informes" message="Tu primer informe se construirá al disponer de un mes con posiciones y actualizaciones de precio registradas." onPrimary={onAdd} primaryLabel="Registrar primera posición" />
      </div>
    );
  }
  const now = new Date();
  const monthName = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][now.getMonth()];
  return (
    <div>
      <SectionHeader title="Informe mensual" sub="Foto del patrimonio al día de hoy. Los informes mensuales se irán congelando al cierre de cada mes." />
      <Card style={{ marginBottom: 20, background: `linear-gradient(135deg, ${C.slate} 0%, ${C.slate2} 100%)` }}>
        <Eyebrow color={C.steel}>Patrimonio · {monthName} {now.getFullYear()}</Eyebrow>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, color: C.mist }}>Tu patrimonio actual es de</div>
          <div style={{ fontSize: 36, fontWeight: 500, color: C.pearl, fontFamily: FONTS.display, letterSpacing: -0.6, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmtEUR(e.totalValue)}</div>
          <div style={{ fontSize: 14, color: C.mist, marginTop: 8 }}>
            Resultado acumulado: <b style={{ color: signColor(e.totalPL), fontFamily: FONTS.mono, fontWeight: 500 }}>{fmtEUR(e.totalPL)} ({fmtPct(e.totalPLPct)})</b>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Posiciones" value={e.pos.length} sub={`${e.bySector.length} sectores`} />
        <KPI label="Resultado total" value={fmtPct(e.totalPLPct)} subColor={signColor(e.totalPL)} sub={fmtEUR(e.totalPL)} />
        <KPI label="Mayor posición" value={e.pos[0]?.ticker || "—"} sub={`${fmtNum(e.pos[0]?.weight || 0, 1)}% del total`} />
        <KPI label="Histórico" value={`${e.snapshots.length} reg.`} sub={e.snapshots.length >= 6 ? "Métricas activas" : "Necesita más datos"} />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <Eyebrow>Observaciones del mes</Eyebrow>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {insights.map((i, idx) => (
            <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 8, flexShrink: 0,
                background: i.sev === "alta" ? C.rojo : i.sev === "media" ? C.gold : C.steel }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.ash, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: FONTS.sans, fontWeight: 600 }}>{i.kind}</div>
                <p style={{ margin: 0, fontSize: 13, color: C.pearl, lineHeight: 1.55, fontFamily: FONTS.sans }}>{i.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}`, fontSize: 11, color: C.ash, fontStyle: "italic", fontFamily: FONTS.sans }}>
          Información generada automáticamente con fines de organización personal. No constituye asesoramiento financiero.
        </p>
      </Card>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Donut data={e.bySector} title="Composición por sector" />
        <Donut data={e.byCountry} title="Composición geográfica" />
      </div>
    </div>
  );
}

function AnalysisView({ e, score, insights, onAdd }) {
  if (!e.hasData) {
    return (
      <div>
        <SectionHeader title="Análisis" sub="Score patrimonial, observaciones de los cinco perfiles profesionales, exposiciones y métricas de riesgo." />
        <EmptyState icon="analysis" title="El análisis aparecerá aquí" message="Cuando registres posiciones, MERIDIAN evaluará tu cartera desde los enfoques de portfolio manager, analista, gestor patrimonial, riesgo y consultor." onPrimary={onAdd} />
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Análisis" sub="Score patrimonial y lectura desde los cinco perfiles profesionales." />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ textAlign: "center", minWidth: 150 }}>
            <ScoreGauge value={score.total} color={score.labelColor} />
            <Pill color={score.labelColor}>{score.label}</Pill>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <Eyebrow>Desglose del score</Eyebrow>
            <div style={{ marginTop: 14 }}>
              {score.parts.map((p) => (
                <div key={p.key} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, fontFamily: FONTS.sans }}>
                    <span style={{ color: C.mist }}>{p.key}<span style={{ color: C.ash }}> · {(p.w*100).toFixed(0)}%</span></span>
                    <span style={{ color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{Math.round(p.v)}</span>
                  </div>
                  <div style={{ height: 3, background: C.graphite, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${p.v}%`, height: "100%", background: p.v >= 75 ? C.verde : p.v >= 50 ? C.steel : p.v >= 35 ? C.gold : C.rojo, transition: "width .6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Eyebrow>Observaciones por perfil profesional</Eyebrow>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {insights.map((i, idx) => (
            <div key={idx} style={{ padding: "12px 14px", background: C.graphite, borderLeft: `2px solid ${i.sev === "alta" ? C.rojo : i.sev === "media" ? C.gold : C.steel}`, borderRadius: "0 3px 3px 0" }}>
              <div style={{ fontSize: 10, color: C.ash, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontFamily: FONTS.sans, fontWeight: 600 }}>{i.kind}</div>
              <p style={{ margin: 0, fontSize: 13, color: C.pearl, lineHeight: 1.55, fontFamily: FONTS.sans }}>{i.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Donut data={e.bySector} title="Exposición sectorial" />
        <Donut data={e.byCountry} title="Exposición geográfica" />
        <Donut data={e.byType} title="Por tipo de activo" />
      </div>
    </div>
  );
}

const ScoreGauge = ({ value, color }) => {
  const r = 52, circ = Math.PI * r, pct = value / 100;
  return (
    <svg width="150" height="92" viewBox="0 0 150 92" style={{ marginBottom: 8 }}>
      <path d={`M 19 82 A ${r} ${r} 0 0 1 131 82`} fill="none" stroke={C.graphite} strokeWidth="8" strokeLinecap="round" />
      <path d={`M 19 82 A ${r} ${r} 0 0 1 131 82`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} style={{ transition: "stroke-dasharray .8s ease" }} />
      <text x="75" y="76" textAnchor="middle" fontSize="36" fontWeight="500" fill={C.pearl} fontFamily={FONTS.display}>{value}</text>
    </svg>
  );
};

function OverviewView({ e, score, onAdd, onRefresh, refreshing, lastRefresh }) {
  const histData = e.snapshots.map((s) => ({ label: new Date(s.t).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }), value: s.value }));
  if (!e.hasData) {
    return (
      <div>
        <SectionHeader title="Resumen" sub="Visión consolidada de tu patrimonio." />
        <Card style={{ marginBottom: 20, padding: "40px" }}>
          <Eyebrow>Patrimonio total</Eyebrow>
          <div style={{ fontSize: 44, fontWeight: 500, color: C.ash, fontFamily: FONTS.display, marginTop: 8, letterSpacing: -1 }}>{fmtEUR(0)}</div>
          <div style={{ fontSize: 13, color: C.ash, marginTop: 6, fontFamily: FONTS.sans }}>Tu cartera aparecerá aquí en cuanto registres tu primera posición.</div>
          <div style={{ marginTop: 24 }}><Btn onClick={onAdd} icon="plus">Añadir primera inversión</Btn></div>
        </Card>
        <Card style={{ marginBottom: 20 }}>
          <Eyebrow>Evolución del patrimonio</Eyebrow>
          <div style={{ marginTop: 8 }}><ChartPlaceholder label="La evolución se trazará a medida que actualices precios" /></div>
        </Card>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Donut empty title="Por tipo de activo" /><Donut empty title="Por sector" /><Donut empty title="Geográfica" />
        </div>
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Resumen" sub="Visión consolidada del patrimonio. Actualiza los precios para refrescar todo." right={
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {lastRefresh && <span style={{ fontSize: 11, color: C.ash, fontFamily: FONTS.sans }}>Actualizado {new Date(lastRefresh).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>}
          <Btn variant="ghost" icon="refresh" onClick={onRefresh} disabled={refreshing} size="sm">{refreshing ? "Actualizando…" : "Actualizar precios"}</Btn>
        </div>
      } />
      <Card style={{ marginBottom: 20, padding: 32, background: `radial-gradient(140% 140% at 0% 0%, ${C.slate2} 0%, ${C.slate} 55%)` }}>
        <Eyebrow>Patrimonio total</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ fontSize: 44, fontWeight: 500, color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.display, letterSpacing: -1 }}>{fmtEUR(e.totalValue)}</span>
          {e.dayPL !== 0 && <span style={{ fontSize: 16, color: signColor(e.dayPL), fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtEUR(e.dayPL)} ({fmtPct(e.dayPLPct)}) hoy</span>}
        </div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 16, fontSize: 13, fontFamily: FONTS.sans }}>
          <span style={{ color: C.mist }}>Resultado <b style={{ color: signColor(e.totalPL), fontFamily: FONTS.mono, fontWeight: 500 }}>{fmtEUR(e.totalPL)} ({fmtPct(e.totalPLPct)})</b></span>
          <span style={{ color: C.mist }}>Coste <b style={{ color: C.pearl, fontFamily: FONTS.mono, fontWeight: 500 }}>{fmtEUR(e.totalCost)}</b></span>
          <span style={{ color: C.mist }}>Posiciones <b style={{ color: C.pearl, fontFamily: FONTS.mono, fontWeight: 500 }}>{e.pos.length}</b></span>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Resultado total" value={fmtPct(e.totalPLPct)} subColor={signColor(e.totalPL)} sub={fmtEUR(e.totalPL)} />
        <KPI label="Variación hoy" value={fmtPct(e.dayPLPct)} subColor={signColor(e.dayPL)} sub={fmtEUR(e.dayPL)} />
        <KPI label="Volatilidad" value={e.enoughHistory ? `${fmtNum(e.volAnnual,1)}%` : "—"} sub={e.enoughHistory ? "anualizada" : `${e.snapshots.length}/6 registros`} />
        {score && <KPI label="Score" value={score.total} sub={score.label} subColor={score.labelColor} />}
      </div>

      <Card style={{ marginBottom: 20 }}>
        <Eyebrow>Evolución del patrimonio</Eyebrow>
        <div style={{ marginTop: 12, height: 220 }}>
          {histData.length >= 2 ? (
            <ResponsiveContainer>
              <AreaChart data={histData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs><linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.steel} stopOpacity={0.4} /><stop offset="100%" stopColor={C.steel} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke={C.lineSoft} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: C.ash, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.ash, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip fmt={(v) => fmtEUR(v)} />} />
                <Area type="monotone" dataKey="value" name="Patrimonio" stroke={C.steel} strokeWidth={2} fill="url(#gPat)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartPlaceholder height={200} label={`Necesitas al menos 2 registros (tienes ${e.snapshots.length}). Pulsa "Actualizar precios" para empezar a construir el histórico.`} />
          )}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <Donut data={e.byType} title="Por tipo de activo" />
        <Donut data={e.bySector} title="Por sector" />
        <Donut data={e.byCountry} title="Geográfica" />
      </div>

      <Card>
        <Eyebrow>Mayores posiciones</Eyebrow>
        <div style={{ marginTop: 12 }}>
          {e.pos.slice(0, 5).map((p) => (
            <div key={p.ticker} style={{ display: "flex", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
              <div style={{ flex: 1, fontFamily: FONTS.sans }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: C.pearl }}>{p.ticker}</span>
                <span style={{ fontSize: 12, color: C.ash, marginLeft: 10 }}>{p.name}</span>
              </div>
              <div style={{ width: 70, textAlign: "right", fontSize: 13, color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtNum(p.weight,1)}%</div>
              <div style={{ width: 90, textAlign: "right", fontSize: 13, color: signColor(p.plPct), fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtPct(p.plPct)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function IncomeView({ e, onAdd }) {
  return (
    <div>
      <SectionHeader title="Dividendos y rentas" sub="Calendario de dividendos, ingresos pasivos, yield on cost y proyección anual." />
      <EmptyState icon="income" title="Sin rentas registradas" message="Esta sección se desplegará cuando MERIDIAN integre el registro de dividendos (próxima iteración)." onPrimary={onAdd} primaryLabel="Añadir posición" />
    </div>
  );
}

function HoldingsView({ e, onAdd, onEdit, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const handleSave = (h) => {
    if (editing) onEdit(editing, h); else onAdd(h);
    setShowForm(false); setEditing(null);
  };

  if (!e.hasData && !showForm) {
    return (
      <div>
        <SectionHeader title="Cartera" sub="Tus posiciones consolidadas. Construye desde cero registrando lo que ya tienes." />
        <EmptyState icon="holdings" title="No hay posiciones registradas" message="Añade tu primera posición. El precio actual se intentará autocompletar desde el mercado." onPrimary={() => setShowForm(true)} primaryLabel="Añadir primera posición" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Cartera" sub="Todo se recalcula al instante. Pulsa el lápiz para editar una posición o la papelera para eliminarla." right={
        !showForm && <Btn onClick={() => { setShowForm(true); setEditing(null); }} icon="plus">Añadir posición</Btn>
      } />
      {showForm && <PositionForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      {e.hasData && (
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720, fontFamily: FONTS.sans }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.line}` }}>
                  {[["Activo","left"],["Cant.","right"],["P. medio","right"],["P. actual","right"],["Día","right"],["Valor","right"],["Resultado","right"],["Peso","right"],["","right"]].map(([l, al], i) => (
                    <th key={i} style={{ textAlign: al, padding: "14px 16px", color: C.ash, fontWeight: 600, fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", whiteSpace: "nowrap" }}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.pos.map((p) => (
                  <tr key={p.ticker} style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: C.pearl }}>{p.ticker}</div>
                      <div style={{ fontSize: 11, color: C.ash }}>{p.name} · {p.sector}</div>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: C.mist, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtNum(p.qty, p.qty % 1 === 0 ? 0 : 4)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: C.mist, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtNum(p.avg)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtNum(p.price)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: signColor(p.dvar), fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{p.dvar ? fmtPct(p.dvar) : "—"}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: C.pearl, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtEUR(p.value)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: signColor(p.plPct), fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtPct(p.plPct)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: C.mist, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtNum(p.weight, 1)}%</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => { setEditing(p); setShowForm(true); }} style={{ background: "transparent", border: "none", color: C.ash, cursor: "pointer", padding: 6, marginRight: 4 }} title="Editar"><Icon d={ICONS.edit} size={15} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar ${p.ticker}?`)) onDelete(p.ticker); }} style={{ background: "transparent", border: "none", color: C.ash, cursor: "pointer", padding: 6 }} title="Eliminar"><Icon d={ICONS.trash} size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AlertsView({ e, insights, onAdd }) {
  return (
    <div>
      <SectionHeader title="Alertas e indicadores" sub="Observaciones generadas automáticamente por el motor de análisis. Se actualizan con cada cambio en la cartera." />
      {!e.hasData ? (
        <EmptyState icon="alerts" title="Sin observaciones" message="Cuando registres posiciones, MERIDIAN generará alertas automáticas de concentración, exposición y rendimiento." onPrimary={onAdd} primaryLabel="Añadir inversión" />
      ) : (
        <Card>
          <Eyebrow>Bandeja de observaciones · {insights.length}</Eyebrow>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.map((i, idx) => (
              <div key={idx} style={{ display: "flex", gap: 12, padding: "14px 16px", background: C.graphite, borderRadius: 3, borderLeft: `2px solid ${i.sev === "alta" ? C.rojo : i.sev === "media" ? C.gold : C.steel}` }}>
                <Icon d={ICONS[i.sev === "alta" ? "warning" : "spark"]} size={16} stroke={i.sev === "alta" ? C.rojo : i.sev === "media" ? C.gold : C.steel} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: C.ash, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: FONTS.sans, fontWeight: 600 }}>{i.kind} · {i.sev}</div>
                  <p style={{ margin: 0, fontSize: 13, color: C.pearl, lineHeight: 1.5, fontFamily: FONTS.sans }}>{i.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Onboarding({ onStart, onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,7,9,0.78)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}>
      <div style={{ maxWidth: 520, width: "100%", background: C.slate, border: `1px solid ${C.line}`, borderRadius: 6, padding: 40, animation: "fadeUp .4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Logo size={34} />
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 500, color: C.pearl, letterSpacing: 0.5 }}>MERIDIAN</div>
            <div style={{ fontSize: 10.5, color: C.ash, letterSpacing: 2, textTransform: "uppercase", fontFamily: FONTS.sans }}>Wealth management</div>
          </div>
        </div>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 500, color: C.pearl, margin: "0 0 14px", letterSpacing: -0.3, lineHeight: 1.25 }}>
          Tu centro de control patrimonial.
        </h2>
        <p style={{ fontSize: 14, color: C.mist, lineHeight: 1.65, fontFamily: FONTS.sans, margin: "0 0 28px" }}>
          MERIDIAN registra tus posiciones, autocompleta precios de mercado, evalúa la salud de tu cartera desde cinco perfiles profesionales (portfolio manager, analista financiero, gestor patrimonial, riesgo y consultor) y guarda tu histórico patrimonial en tu navegador.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={onStart} icon="plus">Registrar primera posición</Btn>
          <Btn variant="ghost" onClick={onDismiss}>Explorar primero</Btn>
        </div>
        <p style={{ fontSize: 11, color: C.ash, marginTop: 24, fontStyle: "italic", fontFamily: FONTS.sans }}>
          Información de organización personal. No constituye asesoramiento financiero.
        </p>
      </div>
    </div>
  );
}

const Logo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18.5" stroke={C.steel} strokeWidth="1.2" />
    <line x1="2" y1="20" x2="38" y2="20" stroke={C.steel} strokeWidth="1.2" opacity="0.5" />
    <path d="M20 1.5 V 38.5" stroke={C.steel} strokeWidth="0.8" opacity="0.3" />
    <circle cx="20" cy="20" r="3" fill={C.gold} />
    <path d="M11 24 L17 17 L23 21 L29 13" stroke={C.pearl} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ============================================================
   APP SHELL
   ============================================================ */
const NAV = [
  ["overview", "Resumen", "overview"],
  ["monthly", "Informe mensual", "report"],
  ["analysis", "Análisis", "analysis"],
  ["income", "Dividendos", "income"],
  ["holdings", "Cartera", "holdings"],
  ["alerts", "Alertas", "alerts"],
];

export default function Meridian() {
  const [tab, setTab, tabLoaded] = usePersistedState("tab", "overview");
  const [holdings, setHoldings, holdingsLoaded] = usePersistedState("holdings", []);
  const [snapshots, setSnapshots] = usePersistedState("snapshots", []);
  const [lastRefresh, setLastRefresh] = usePersistedState("lastRefresh", null);
  const [onboardDismissed, setOnboardDismissed] = usePersistedState("onboardDismissed", false);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const e = useEngine(holdings, snapshots);
  const score = useMemo(() => computeScore(e), [e]);
  const insights = useMemo(() => generateInsights(e, score), [e, score]);

  const addHolding = (h) => {
    setHoldings((prev) => {
      // si el ticker ya existe, mejor avisar — pero permitir editar desde la tabla
      if (prev.find((x) => x.ticker === h.ticker)) {
        if (!confirm(`${h.ticker} ya existe en tu cartera. ¿Reemplazarla?`)) return prev;
        return prev.map((x) => x.ticker === h.ticker ? h : x);
      }
      const next = [...prev, h];
      // Snapshot inicial al añadir primera posición
      if (prev.length === 0) {
        const total = h.qty * h.price;
        setSnapshots([{ t: Date.now(), value: total }]);
      }
      return next;
    });
  };

  const editHolding = (oldPos, h) => {
    setHoldings((prev) => prev.map((x) => x.ticker === oldPos.ticker ? h : x));
  };

  const deleteHolding = (ticker) => {
    setHoldings((prev) => prev.filter((x) => x.ticker !== ticker));
  };

  const refreshPrices = useCallback(async () => {
    if (holdings.length === 0) return;
    setRefreshing(true);
    const updated = [...holdings];
    let any = false;
    for (let i = 0; i < updated.length; i++) {
      const data = await fetchPriceData(updated[i].ticker);
      if (data) {
        updated[i] = { ...updated[i], price: data.price, dvar: data.dvar };
        any = true;
      }
    }
    if (any) {
      setHoldings(updated);
      const newTotal = updated.reduce((s, p) => s + p.qty * p.price, 0);
      setSnapshots((prev) => {
        // evitar duplicados muy seguidos
        const last = prev[prev.length - 1];
        if (last && Date.now() - last.t < 1000 * 60 * 5) return prev;
        return [...prev, { t: Date.now(), value: newTotal }].slice(-365);
      });
    }
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [holdings, setHoldings, setSnapshots, setLastRefresh]);

  const goAdd = () => { setOnboardDismissed(true); setTab("holdings"); };
  const showOnboarding = tabLoaded && holdingsLoaded && holdings.length === 0 && !onboardDismissed;

  return (
    <div style={{ minHeight: "100vh", background: C.ink, color: C.pearl, fontFamily: FONTS.sans, display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 9px; height: 9px; }
        ::-webkit-scrollbar-track { background: ${C.ink}; }
        ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 0; }
        ::selection { background: ${C.steel}40; }
        input:focus, select:focus { outline: none; border-color: ${C.steel} !important; }
        button:hover:not(:disabled) { opacity: 0.88; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .nav-item:hover { background: ${C.slate} !important; color: ${C.pearl} !important; }
        @media (max-width: 800px) {
          .sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
          .main-pad { padding: 20px 16px 90px !important; }
        }
      `}</style>

      {showOnboarding && <Onboarding onStart={goAdd} onDismiss={() => setOnboardDismissed(true)} />}

      <aside className="sidebar" style={{ width: 248, background: C.graphite, borderRight: `1px solid ${C.lineSoft}`, padding: "26px 16px", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "0 10px 26px", display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={32} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 17, letterSpacing: 2.5, fontFamily: FONTS.display, color: C.pearl }}>MERIDIAN</div>
            <div style={{ fontSize: 9, color: C.ash, letterSpacing: 1.8, textTransform: "uppercase" }}>Wealth</div>
          </div>
        </div>
        {NAV.map(([id, label, icon]) => (
          <div key={id} className="nav-item" onClick={() => setTab(id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 3, cursor: "pointer",
            background: tab === id ? C.slate : "transparent", color: tab === id ? C.pearl : C.mist,
            fontSize: 13, fontWeight: tab === id ? 600 : 400, transition: "all .15s",
            borderLeft: tab === id ? `2px solid ${C.steel}` : "2px solid transparent" }}>
            <Icon d={ICONS[icon]} size={17} sw={1.4} stroke={tab === id ? C.steel : C.ash} />{label}
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "14px 12px", borderTop: `1px solid ${C.lineSoft}`, fontSize: 10.5, color: C.ash, lineHeight: 1.6, fontFamily: FONTS.sans }}>
          Información de organización personal. No constituye asesoramiento financiero.
        </div>
      </aside>

      <main className="main-pad" style={{ flex: 1, padding: "28px 36px 48px", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <Eyebrow>Patrimonio</Eyebrow>
            <span style={{ fontSize: 19, fontWeight: 500, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.display, color: C.pearl }}>{fmtEUR(e.totalValue)}</span>
            {e.hasData && e.dayPLPct !== 0 && <span style={{ fontSize: 13, color: signColor(e.dayPL), fontVariantNumeric: "tabular-nums", fontFamily: FONTS.mono }}>{fmtPct(e.dayPLPct)}</span>}
          </div>
          {e.hasData && (
            <Btn variant="ghost" icon="refresh" onClick={refreshPrices} disabled={refreshing} size="sm" style={refreshing ? { animation: "none" } : {}}>
              {refreshing ? "Actualizando…" : "Actualizar"}
            </Btn>
          )}
        </div>

        <div key={tab} style={{ animation: mounted ? "fadeUp .4s ease both" : "none" }}>
          {tab === "overview" && <OverviewView e={e} score={score} onAdd={goAdd} onRefresh={refreshPrices} refreshing={refreshing} lastRefresh={lastRefresh} />}
          {tab === "monthly" && <MonthlyView e={e} score={score} insights={insights} onAdd={goAdd} />}
          {tab === "analysis" && <AnalysisView e={e} score={score} insights={insights} onAdd={goAdd} />}
          {tab === "income" && <IncomeView e={e} onAdd={goAdd} />}
          {tab === "holdings" && <HoldingsView e={e} onAdd={addHolding} onEdit={editHolding} onDelete={deleteHolding} />}
          {tab === "alerts" && <AlertsView e={e} insights={insights} onAdd={goAdd} />}
        </div>
      </main>

      <nav className="mobile-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: C.graphite, borderTop: `1px solid ${C.line}`, padding: "10px 4px", justifyContent: "space-around", zIndex: 50 }}>
        {NAV.map(([id, label, icon]) => (
          <div key={id} onClick={() => setTab(id)} style={{ textAlign: "center", padding: "2px 4px", color: tab === id ? C.steel : C.ash, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Icon d={ICONS[icon]} size={19} stroke={tab === id ? C.steel : C.ash} />
            <span style={{ fontSize: 8.5, fontFamily: FONTS.sans, letterSpacing: 0.2 }}>{label.split(" ")[0]}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
