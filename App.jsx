import { useState, useEffect, useCallback } from "react";

const defaultDates = { fechaInicio: "", fechaFin: "" };

const FUNNEL_STAGES = [
  { key: "prospectos", label: "Prospectos", color: "#a855f7" },
  { key: "interesados", label: "Interesados", color: "#00d4ff" },
  { key: "porCerrar", label: "Por Cerrar", color: "#ffaa00" },
  { key: "cerrados", label: "Cerrados", color: "#00ff88" },
];

const defaultState = {
  meta: {
    goals: {
      upsalePercent: 10, ingresoPesos: 400000,
      activosNuevos: 5, activosProceso: 8,
      scoutingVisitas: 20, scoutingContratacion: 5,
      ventasCerradas: 10, ventasValor: 500000,
    },
    dates: {
      upsale: { ...defaultDates }, ingreso: { ...defaultDates },
      activos: { ...defaultDates }, scouting: { ...defaultDates },
      ventas: { ...defaultDates },
    },
  },
  clients: [],
  activos: { nuevos: [], enProceso: [] },
  scouting: { visitas: [], contratacion: [], contratados: [] },
  ventas: { prospectos: [], interesados: [], porCerrar: [], cerrados: [] },
  history: [],
};

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(n);
const pct = (val, goal) => (goal === 0 ? 0 : Math.min((val / goal) * 100, 100));
const fmtDate = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const today = () => { const d = new Date(); return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`; };

const calcExpected = (dates) => {
  if (!dates || !dates.fechaInicio || !dates.fechaFin) return null;
  const oneDay = 86400000;
  const start = new Date(dates.fechaInicio + "T00:00:00");
  const end = new Date(dates.fechaFin + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const totalDays = Math.round((end - start) / oneDay);
  if (totalDays <= 0) return null;
  const elapsedDays = Math.round((now - start) / oneDay) + 1;
  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 100;
  return (elapsedDays / totalDays) * 100;
};

const daysLeft = (dates) => {
  if (!dates || !dates.fechaFin) return null;
  const end = new Date(dates.fechaFin + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

// ── UI Components ──

const ZebraBar = ({ children, index }) => (
  <div style={{
    background: index % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
    padding: "10px 14px", borderLeft: index % 2 === 0 ? "3px solid #fff" : "3px solid #555",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 42,
  }}>{children}</div>
);

const ProgressRing = ({ value, max, size = 120, color = "#fff", expectedPct }) => {
  const r = (size - 12) / 2; const circ = 2 * Math.PI * r;
  const p = pct(value, max); const offset = circ - (p / 100) * circ;
  const expAngle = expectedPct != null ? (expectedPct / 100) * 360 - 90 : null;
  const expRad = expAngle != null ? (expAngle * Math.PI) / 180 : null;
  const mx = expRad != null ? size / 2 + r * Math.cos(expRad) : 0;
  const my = expRad != null ? size / 2 + r * Math.sin(expRad) : 0;
  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      {expRad != null && <circle cx={mx} cy={my} r={5} fill="none" stroke="#ff4444" strokeWidth="2.5" opacity="0.9" />}
      <text x={size/2} y={size/2-6} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800" fontFamily="'DM Mono', monospace">{Math.round(p)}%</text>
      <text x={size/2} y={size/2+14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="'DM Mono', monospace">de meta</text>
    </svg>
  );
};

const TimelineStrip = ({ dates, actualPct, color }) => {
  const exp = calcExpected(dates); const dl = daysLeft(dates); const hasTimeline = exp != null;
  const status = !hasTimeline ? "none" : actualPct >= exp ? "ahead" : actualPct >= exp * 0.7 ? "ontrack" : "behind";
  const sC = { ahead: "#c8ff00", ontrack: "#ffaa00", behind: "#ff4444", none: "#555" };
  const sL = { ahead: "ADELANTADO", ontrack: "EN RANGO", behind: "ATRASADO", none: "SIN FECHAS" };
  return (
    <div style={{ marginTop: 8 }}>
      {hasTimeline && (
        <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.08)", marginBottom: 6 }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(actualPct, 100)}%`, background: color, transition: "width .6s", opacity: 0.9 }} />
          <div style={{ position: "absolute", top: -3, left: `${Math.min(exp, 100)}%`, width: 2, height: 12, background: "#ff4444", transform: "translateX(-1px)" }} />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 8, padding: "1px 6px", fontWeight: 800, letterSpacing: 1, background: sC[status], color: "#0a0a0a", fontFamily: "'DM Mono', monospace" }}>{sL[status]}</span>
          {hasTimeline && <span style={{ fontSize: 9, opacity: 0.4, fontFamily: "'DM Mono', monospace" }}>Esperado: {exp.toFixed(0)}% • Real: {actualPct.toFixed(0)}%</span>}
        </div>
        {dl != null && <span style={{ fontSize: 9, opacity: 0.5, fontFamily: "'DM Mono', monospace", color: dl <= 7 ? "#ff4444" : dl <= 30 ? "#ffaa00" : "inherit" }}>{dl > 0 ? `${dl}d restantes` : dl === 0 ? "VENCE HOY" : `VENCIÓ hace ${Math.abs(dl)}d`}</span>}
      </div>
      {hasTimeline && <div style={{ fontSize: 9, opacity: 0.3, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{fmtDate(dates.fechaInicio)} → {fmtDate(dates.fechaFin)}</div>}
    </div>
  );
};

const ParallelBars = ({ label1, val1, max1, color1, label2, val2, max2, color2 }) => {
  const p1 = pct(val1, Math.max(max1, val1, 1)); const p2 = pct(val2, Math.max(max2, val2, 1));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: color1, fontWeight: 700, width: 140, fontFamily: "'DM Mono', monospace" }}>{label1}: {val1}</span>
        <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${p1}%`, height: "100%", background: color1, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: color2, fontWeight: 700, width: 140, fontFamily: "'DM Mono', monospace" }}>{label2}: {val2}</span>
        <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${p2}%`, height: "100%", background: color2, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
      </div>
    </div>
  );
};

const FunnelChart = ({ ventas }) => {
  const counts = FUNNEL_STAGES.map(s => (ventas[s.key] || []).length);
  const maxC = Math.max(...counts, 1);
  const h = 28; const gap = 4; const totalH = FUNNEL_STAGES.length * (h + gap);
  return (
    <svg width="100%" height={totalH} viewBox={`0 0 200 ${totalH}`} style={{ display: "block" }}>
      {FUNNEL_STAGES.map((s, i) => {
        const w = Math.max((counts[i] / maxC) * 180, 18);
        const x = (200 - w) / 2; const y = i * (h + gap);
        return (
          <g key={s.key}>
            <rect x={x} y={y} width={w} height={h} fill={s.color} opacity="0.85" rx="2" style={{ transition: "all .5s" }} />
            <text x={100} y={y + h / 2 + 1} textAnchor="middle" fill="#0a0a0a" fontSize="10" fontWeight="800" fontFamily="'DM Mono', monospace" dominantBaseline="middle">
              {s.label} ({counts[i]})
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const Btn = ({ children, onClick, variant = "primary", small, style: sx }) => {
  const base = { border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: small ? 11 : 13, padding: small ? "4px 10px" : "8px 18px", borderRadius: 0, transition: "all .15s", textTransform: "uppercase", letterSpacing: 1, ...sx };
  const styles = { primary: { ...base, background: "#fff", color: "#0a0a0a" }, danger: { ...base, background: "#ff4444", color: "#fff" }, ghost: { ...base, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }, accent: { ...base, background: "#c8ff00", color: "#0a0a0a" } };
  return <button style={styles[variant] || styles.primary} onClick={onClick}>{children}</button>;
};

const Input = ({ value, onChange, placeholder, type = "text", style: sx }) => (
  <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 12px", fontFamily: "'DM Mono', monospace", fontSize: 13, borderRadius: 0, outline: "none", width: "100%", boxSizing: "border-box", ...sx }} />
);

const DateInput = ({ value, onChange }) => (
  <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)}
    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 12px", fontFamily: "'DM Mono', monospace", fontSize: 12, borderRadius: 0, outline: "none", width: "100%", boxSizing: "border-box", colorScheme: "dark" }} />
);

const SectionHeader = ({ title, icon, count }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 8px", borderBottom: "2px solid #fff", marginBottom: 2 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{title}</h3>
    {count !== undefined && <span style={{ marginLeft: "auto", background: "#fff", color: "#0a0a0a", padding: "2px 10px", fontSize: 12, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{count}</span>}
  </div>
);

const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#1a1a1a", border: "2px solid #fff", padding: 28, maxWidth: 560, width: "92%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>{title}</h3>
          <span style={{ cursor: "pointer", fontSize: 22, opacity: 0.6 }} onClick={onClose}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
};

const GoalBlock = ({ label, valueKey, editGoals, setEditGoals, kpiKey, editDates, setEditDates, placeholder, prefix, suffix }) => (
  <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#c8ff00", textTransform: "uppercase" }}>{label}</p>
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
      {prefix && <span style={{ fontSize: 11, opacity: 0.5, whiteSpace: "nowrap" }}>{prefix}</span>}
      <Input type="number" value={editGoals[valueKey] || ""} onChange={(v) => setEditGoals({ ...editGoals, [valueKey]: v })} placeholder={placeholder} />
      {suffix && <span style={{ fontSize: 11, opacity: 0.5, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA INICIO</label>
        <DateInput value={editDates[kpiKey]?.fechaInicio || ""} onChange={(v) => setEditDates({ ...editDates, [kpiKey]: { ...editDates[kpiKey], fechaInicio: v } })} /></div>
      <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA FIN</label>
        <DateInput value={editDates[kpiKey]?.fechaFin || ""} onChange={(v) => setEditDates({ ...editDates, [kpiKey]: { ...editDates[kpiKey], fechaFin: v } })} /></div>
    </div>
  </div>
);

// ── Main Dashboard ──

export default function KPIDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showGoals, setShowGoals] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddActivo, setShowAddActivo] = useState(false);
  const [showAddScouting, setShowAddScouting] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [editGoals, setEditGoals] = useState({});
  const [editDates, setEditDates] = useState({});
  const [newClient, setNewClient] = useState({ name: "", pagoInicial: "", pagoActual: "" });
  const [newActivo, setNewActivo] = useState({ name: "", tipo: "nuevo" });
  const [newScouting, setNewScouting] = useState({ name: "" });
  const [newLead, setNewLead] = useState({ name: "", valor: "" });
  const [editingClient, setEditingClient] = useState(null);
  const [editPago, setEditPago] = useState("");
  const [upsaleClient, setUpsaleClient] = useState(null);
  const [upsaleAmount, setUpsaleAmount] = useState("");
  const [editingLead, setEditingLead] = useState(null);
  const [editLeadValor, setEditLeadValor] = useState("");

  // ── Load from server ──
  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((parsed) => {
        if (parsed) {
          const merged = {
            ...defaultState, ...parsed,
            meta: {
              ...defaultState.meta, ...parsed.meta,
              goals: { ...defaultState.meta.goals, ...(parsed.meta?.goals || {}) },
              dates: { ...defaultState.meta.dates, ...(parsed.meta?.dates || {}) }
            },
            ventas: { ...defaultState.ventas, ...(parsed.ventas || {}) },
          };
          setData(merged);
        } else {
          setData(defaultState);
        }
      })
      .catch(() => setData(defaultState))
      .finally(() => setLoading(false));
  }, []);

  // ── Save to server ──
  const save = useCallback((nd) => {
    setData(nd);
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nd),
    }).catch((e) => console.error("Error saving:", e));
  }, []);

  // ── Handlers ──
  const openGoalsModal = () => { setEditGoals({ ...data.meta.goals }); setEditDates(JSON.parse(JSON.stringify(data.meta.dates))); setShowGoals(true); };
  const saveGoals = () => { const g2 = { ...data.meta.goals }; Object.keys(editGoals).forEach((k) => { const v = parseFloat(editGoals[k]); if (!isNaN(v)) g2[k] = v; }); save({ ...data, meta: { ...data.meta, goals: g2, dates: editDates } }); setShowGoals(false); };

  const addClient = () => { if (!newClient.name) return; const pi = parseFloat(newClient.pagoInicial) || 0; const pa = parseFloat(newClient.pagoActual) || pi; const c = { id: Date.now(), name: newClient.name, pagoInicial: pi, pagoActual: pa, historial: [{ fecha: today(), monto: pa }], createdAt: today() }; save({ ...data, clients: [...data.clients, c], history: [...data.history, { fecha: today(), tipo: "cliente_agregado", desc: `${c.name}: ${fmt(pi)} → ${fmt(pa)}` }] }); setNewClient({ name: "", pagoInicial: "", pagoActual: "" }); setShowAddClient(false); };
  const updateClientPago = (cid) => { const val = parseFloat(editPago); if (isNaN(val)) return; const cl = data.clients.find(c => c.id === cid); const clients = data.clients.map(c => c.id === cid ? { ...c, pagoActual: val, historial: [...(c.historial||[]), { fecha: today(), monto: val }] } : c); save({ ...data, clients, history: [...data.history, { fecha: today(), tipo: "pago_actualizado", desc: `${cl.name}: ${fmt(cl.pagoActual)} → ${fmt(val)}` }] }); setEditingClient(null); setEditPago(""); };
  const removeClient = (id) => save({ ...data, clients: data.clients.filter(c => c.id !== id) });
  const applyUpsale = (cid) => { const val = parseFloat(upsaleAmount); if (isNaN(val) || val <= 0) return; const cl = data.clients.find(c => c.id === cid); if (!cl) return; const np = cl.pagoActual + val; const clients = data.clients.map(c => c.id === cid ? { ...c, pagoActual: np, historial: [...(c.historial||[]), { fecha: today(), monto: np, upsale: val }] } : c); save({ ...data, clients, history: [...data.history, { fecha: today(), tipo: "upsale", desc: `${cl.name}: +${fmt(val)} (${fmt(cl.pagoActual)} → ${fmt(np)})` }] }); setUpsaleClient(null); setUpsaleAmount(""); };

  const addActivo = () => { if (!newActivo.name) return; const item = { id: Date.now(), name: newActivo.name, createdAt: today() }; const act = { ...data.activos }; if (newActivo.tipo === "nuevo") act.nuevos = [...act.nuevos, item]; else act.enProceso = [...act.enProceso, item]; save({ ...data, activos: act, history: [...data.history, { fecha: today(), tipo: "activo_ia", desc: `${newActivo.tipo === "nuevo" ? "Nuevo" : "En proceso"}: ${newActivo.name}` }] }); setNewActivo({ name: "", tipo: "nuevo" }); setShowAddActivo(false); };
  const moveActivo = (id, from, to) => { const item = data.activos[from].find(a => a.id === id); if (!item) return; save({ ...data, activos: { ...data.activos, [from]: data.activos[from].filter(a => a.id !== id), [to]: [...data.activos[to], item] } }); };
  const removeActivo = (id, key) => save({ ...data, activos: { ...data.activos, [key]: data.activos[key].filter(a => a.id !== id) } });

  const addScouting = () => { if (!newScouting.name) return; const item = { id: Date.now(), name: newScouting.name, createdAt: today() }; save({ ...data, scouting: { ...data.scouting, visitas: [...data.scouting.visitas, item] }, history: [...data.history, { fecha: today(), tipo: "scouting", desc: `Visita: ${newScouting.name}` }] }); setNewScouting({ name: "" }); setShowAddScouting(false); };
  const removeScouting = (id, key) => save({ ...data, scouting: { ...data.scouting, [key]: data.scouting[key].filter(a => a.id !== id) } });
  const markContratado = (id, fk) => { const item = data.scouting[fk].find(a => a.id === id); if (!item) return; save({ ...data, scouting: { ...data.scouting, [fk]: data.scouting[fk].filter(a => a.id !== id), contratados: [...(data.scouting.contratados||[]), { ...item, contratadoAt: today() }] }, history: [...data.history, { fecha: today(), tipo: "contratado", desc: `Contratado: ${item.name}` }] }); };
  const markDescartado = (id, fk) => { const item = data.scouting[fk].find(a => a.id === id); if (!item) return; save({ ...data, scouting: { ...data.scouting, [fk]: data.scouting[fk].filter(a => a.id !== id) }, history: [...data.history, { fecha: today(), tipo: "descartado", desc: `Descartado: ${item.name}` }] }); };

  const addLead = () => { if (!newLead.name) return; const v = parseFloat(newLead.valor) || 0; const item = { id: Date.now(), name: newLead.name, valor: v, createdAt: today() }; save({ ...data, ventas: { ...data.ventas, prospectos: [...data.ventas.prospectos, item] }, history: [...data.history, { fecha: today(), tipo: "lead_nuevo", desc: `Prospecto: ${item.name} (${fmt(v)})` }] }); setNewLead({ name: "", valor: "" }); setShowAddLead(false); };
  const moveLead = (id, from, to) => { const item = data.ventas[from].find(a => a.id === id); if (!item) return; save({ ...data, ventas: { ...data.ventas, [from]: data.ventas[from].filter(a => a.id !== id), [to]: [...data.ventas[to], item] }, history: [...data.history, { fecha: today(), tipo: "lead_movido", desc: `${item.name}: ${FUNNEL_STAGES.find(s=>s.key===from)?.label} → ${FUNNEL_STAGES.find(s=>s.key===to)?.label}` }] }); };
  const discardLead = (id, from) => { const item = data.ventas[from].find(a => a.id === id); if (!item) return; save({ ...data, ventas: { ...data.ventas, [from]: data.ventas[from].filter(a => a.id !== id) }, history: [...data.history, { fecha: today(), tipo: "lead_descartado", desc: `Descartado: ${item.name} (${fmt(item.valor)})` }] }); };
  const updateLeadValor = (id, stageKey) => { const val = parseFloat(editLeadValor); if (isNaN(val)) return; const lead = data.ventas[stageKey].find(a => a.id === id); if (!lead) return; const updated = data.ventas[stageKey].map(a => a.id === id ? { ...a, valor: val } : a); save({ ...data, ventas: { ...data.ventas, [stageKey]: updated }, history: [...data.history, { fecha: today(), tipo: "lead_movido", desc: `${lead.name}: valor ${fmt(lead.valor)} → ${fmt(val)}` }] }); setEditingLead(null); setEditLeadValor(""); };

  if (loading || !data) return (
    <div style={{ background: "#0a0a0a", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace" }}>
      <span style={{ fontSize: 18, letterSpacing: 4, animation: "pulse 1.5s infinite" }}>CARGANDO...</span>
    </div>
  );

  const g = data.meta.goals; const dt = data.meta.dates;
  const totalIngresoActual = data.clients.reduce((s, c) => s + (c.pagoActual || 0), 0);
  const totalIngresoInicial = data.clients.reduce((s, c) => s + (c.pagoInicial || 0), 0);
  const upsaleActual = totalIngresoInicial > 0 ? ((totalIngresoActual - totalIngresoInicial) / totalIngresoInicial) * 100 : 0;
  const upsalePct = pct(Math.max(upsaleActual, 0), g.upsalePercent);
  const ingresoPct = pct(totalIngresoActual, g.ingresoPesos);
  const activosTotalPct = pct(data.activos.nuevos.length + data.activos.enProceso.length, g.activosNuevos + g.activosProceso);
  const scoutingTotalPct = pct(data.scouting.visitas.length + (data.scouting.contratados||[]).length, g.scoutingVisitas + g.scoutingContratacion);
  const ventasCerradas = (data.ventas.cerrados || []);
  const ventasValorCerrado = ventasCerradas.reduce((s, l) => s + (l.valor || 0), 0);
  const ventasCerradasPct = pct(ventasCerradas.length, g.ventasCerradas);
  const ventasValorPct = pct(ventasValorCerrado, g.ventasValor);
  const ventasTotalLeads = FUNNEL_STAGES.reduce((s, st) => s + (data.ventas[st.key]||[]).length, 0);

  const tabs = [
    { id: "overview", label: "General" }, { id: "upsale", label: "Upsale" },
    { id: "activos", label: "Activos IA" }, { id: "ventas", label: "Ventas" },
    { id: "scouting", label: "Scouting" }, { id: "historial", label: "Historial" },
  ];

  const badgeColor = (t) => ({ cliente_agregado:"#c8ff00", pago_actualizado:"#00d4ff", upsale:"#00ff88", activo_ia:"#ff8800", scouting:"#a855f7", contratado:"#22d3ee", descartado:"#ff4444", lead_nuevo:"#a855f7", lead_movido:"#ffaa00", lead_descartado:"#ff4444" })[t] || "#555";
  const cardStyle = { border: "1px solid rgba(255,255,255,0.2)", padding: 20, background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 20px, transparent 20px, transparent 40px)" };
  const nextStage = (key) => { const i = FUNNEL_STAGES.findIndex(s => s.key === key); return i < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[i+1] : null; };

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", minHeight: "100vh", fontFamily: "'DM Mono', monospace", padding: 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0a; } ::-webkit-scrollbar-thumb { background: #333; }
        input:focus, select:focus { border-color: #c8ff00 !important; }
        select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 12px; font-family: 'DM Mono', monospace; font-size: 13px; border-radius: 0; outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#0a0a0a", fontWeight: 800, fontSize: 18 }}>Z</span></div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>KPI Tracker</h1>
            <p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 2 }}>ZEBRA DASHBOARD • {today()}</p>
          </div>
        </div>
        <Btn variant="ghost" small onClick={openGoalsModal}>⚙ Metas & Fechas</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.15)", overflow: "auto" }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "12px 20px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", borderBottom: activeTab === t.id ? "3px solid #c8ff00" : "3px solid transparent", color: activeTab === t.id ? "#c8ff00" : "rgba(255,255,255,0.5)", transition: "all .2s", whiteSpace: "nowrap" }}>{t.label}</div>
        ))}
      </div>

      <div style={{ padding: "20px 24px", animation: "slideIn .3s ease" }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              <div style={cardStyle}>
                <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, opacity: 0.5, textTransform: "uppercase" }}>Upsale</p>
                <ProgressRing value={Math.max(upsaleActual,0)} max={g.upsalePercent} size={100} color="#c8ff00" expectedPct={calcExpected(dt.upsale)} />
                <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: 11, opacity: 0.6 }}>{upsaleActual.toFixed(1)}% / {g.upsalePercent}%</p>
                <TimelineStrip dates={dt.upsale} actualPct={upsalePct} color="#c8ff00" />
              </div>
              <div style={cardStyle}>
                <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, opacity: 0.5, textTransform: "uppercase" }}>Ingreso Recurrente</p>
                <ProgressRing value={totalIngresoActual} max={g.ingresoPesos} size={100} color="#00d4ff" expectedPct={calcExpected(dt.ingreso)} />
                <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: 11, opacity: 0.6 }}>{fmt(totalIngresoActual)} / {fmt(g.ingresoPesos)}</p>
                <TimelineStrip dates={dt.ingreso} actualPct={ingresoPct} color="#00d4ff" />
              </div>
              <div style={cardStyle}>
                <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, opacity: 0.5, textTransform: "uppercase" }}>Activos IA</p>
                <div style={{ marginTop: 8 }}><ParallelBars label1="Nuevos" val1={data.activos.nuevos.length} max1={g.activosNuevos} color1="#c8ff00" label2="En Proceso" val2={data.activos.enProceso.length} max2={g.activosProceso} color2="#ff8800" /></div>
                <TimelineStrip dates={dt.activos} actualPct={activosTotalPct} color="#ff8800" />
              </div>
              <div style={cardStyle}>
                <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, opacity: 0.5, textTransform: "uppercase" }}>Ventas</p>
                <FunnelChart ventas={data.ventas} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, opacity: 0.6 }}>
                  <span>Cerrados: {ventasCerradas.length}/{g.ventasCerradas}</span>
                  <span>{fmt(ventasValorCerrado)}</span>
                </div>
                <TimelineStrip dates={dt.ventas} actualPct={ventasCerradasPct} color="#00ff88" />
              </div>
              <div style={cardStyle}>
                <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: 2, opacity: 0.5, textTransform: "uppercase" }}>Scouting Talento</p>
                <div style={{ marginTop: 8 }}><ParallelBars label1="Visitas" val1={data.scouting.visitas.length} max1={g.scoutingVisitas} color1="#a855f7" label2="Contratados" val2={(data.scouting.contratados||[]).length} max2={g.scoutingContratacion} color2="#00ff88" /></div>
                <TimelineStrip dates={dt.scouting} actualPct={scoutingTotalPct} color="#a855f7" />
              </div>
            </div>
            <SectionHeader title="Actividad Reciente" icon="⚡" count={data.history.length} />
            {data.history.length === 0 && <p style={{ opacity: 0.4, fontSize: 13, padding: 14 }}>Sin actividad registrada.</p>}
            {data.history.slice(-8).reverse().map((h, i) => (
              <ZebraBar key={i} index={i}>
                <span style={{ fontSize: 10, opacity: 0.5, minWidth: 80 }}>{h.fecha}</span>
                <span style={{ fontSize: 9, padding: "2px 8px", background: badgeColor(h.tipo), color: "#0a0a0a", fontWeight: 700, letterSpacing: 1 }}>{h.tipo.replace(/_/g, " ").toUpperCase()}</span>
                <span style={{ fontSize: 12, flex: 1, textAlign: "right" }}>{h.desc}</span>
              </ZebraBar>
            ))}
          </div>
        )}

        {/* UPSALE */}
        {activeTab === "upsale" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <SectionHeader title={`Clientes & Upsale (Meta: ${g.upsalePercent}%)`} icon="📈" count={data.clients.length} />
              <Btn variant="accent" small onClick={() => setShowAddClient(true)}>+ Cliente</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20, padding: 16, border: "1px solid rgba(255,255,255,0.15)", background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 16px, transparent 16px, transparent 32px)" }}>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>PAGO INICIAL</p><p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{fmt(totalIngresoInicial)}</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>PAGO ACTUAL</p><p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#c8ff00" }}>{fmt(totalIngresoActual)}</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>UPSALE</p><p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: upsaleActual >= g.upsalePercent ? "#c8ff00" : "#ff4444" }}>{upsaleActual.toFixed(1)}%</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>ACUMULADO</p><p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#00ff88" }}>{fmt(totalIngresoActual - totalIngresoInicial)}</p></div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginBottom: 4 }}><span>Progreso a {fmt(g.ingresoPesos)}</span><span>{ingresoPct.toFixed(1)}%</span></div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.06)" }}><div style={{ width: `${ingresoPct}%`, height: "100%", background: "linear-gradient(90deg, #00d4ff, #c8ff00)", transition: "width .6s" }} /></div>
              <TimelineStrip dates={dt.ingreso} actualPct={ingresoPct} color="#00d4ff" />
            </div>
            {data.clients.length === 0 && <p style={{ opacity: 0.4, fontSize: 13, padding: 20, textAlign: "center" }}>Agrega tu primer cliente.</p>}
            {data.clients.map((c, i) => {
              const cu = c.pagoInicial > 0 ? ((c.pagoActual - c.pagoInicial) / c.pagoInicial * 100) : 0;
              return (
                <ZebraBar key={c.id} index={i}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", fontWeight: 700, background: cu > 0 ? "#c8ff00" : cu < 0 ? "#ff4444" : "#555", color: "#0a0a0a" }}>{cu > 0 ? "+" : ""}{cu.toFixed(1)}%</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Inicio: {fmt(c.pagoInicial)} → Actual: <span style={{ color: "#c8ff00", fontWeight: 700 }}>{fmt(c.pagoActual)}</span>{c.historial && c.historial.length > 1 && <span> • {c.historial.length} cambios</span>}</div>
                    {c.historial && c.historial.length > 1 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {c.historial.slice(-5).map((h, j) => (<span key={j} style={{ fontSize: 9, background: h.upsale ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.06)", color: h.upsale ? "#00ff88" : "rgba(255,255,255,0.4)", padding: "1px 6px", fontWeight: h.upsale ? 700 : 400 }}>{h.fecha}: {h.upsale ? `+${fmt(h.upsale)}` : fmt(h.monto)}</span>))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {upsaleClient === c.id ? (<><Input value={upsaleAmount} onChange={setUpsaleAmount} placeholder="Monto" type="number" style={{ width: 100 }} /><Btn variant="accent" small onClick={() => applyUpsale(c.id)}>+</Btn><Btn variant="ghost" small onClick={() => { setUpsaleClient(null); setUpsaleAmount(""); }}>✕</Btn></>)
                    : editingClient === c.id ? (<><Input value={editPago} onChange={setEditPago} placeholder="Total" type="number" style={{ width: 100 }} /><Btn variant="primary" small onClick={() => updateClientPago(c.id)}>✓</Btn><Btn variant="ghost" small onClick={() => setEditingClient(null)}>✕</Btn></>)
                    : (<><Btn variant="accent" small onClick={() => { setUpsaleClient(c.id); setUpsaleAmount(""); setEditingClient(null); }}>↑ Upsale</Btn><Btn variant="ghost" small onClick={() => { setEditingClient(c.id); setEditPago(String(c.pagoActual)); setUpsaleClient(null); }}>Editar</Btn><Btn variant="danger" small onClick={() => removeClient(c.id)}>✕</Btn></>)}
                  </div>
                </ZebraBar>
              );
            })}
          </div>
        )}

        {/* ACTIVOS IA */}
        {activeTab === "activos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <SectionHeader title="Activos IA" icon="🤖" />
              <Btn variant="accent" small onClick={() => setShowAddActivo(true)}>+ Proyecto</Btn>
            </div>
            <ParallelBars label1={`Nuevos (${data.activos.nuevos.length}/${g.activosNuevos})`} val1={data.activos.nuevos.length} max1={g.activosNuevos} color1="#c8ff00" label2={`Proceso (${data.activos.enProceso.length}/${g.activosProceso})`} val2={data.activos.enProceso.length} max2={g.activosProceso} color2="#ff8800" />
            <TimelineStrip dates={dt.activos} actualPct={activosTotalPct} color="#ff8800" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#c8ff00", marginBottom: 6 }}>■ NUEVOS</p>
                {data.activos.nuevos.length === 0 && <p style={{ opacity: 0.3, fontSize: 12 }}>Vacío</p>}
                {data.activos.nuevos.map((a, i) => (<ZebraBar key={a.id} index={i}><span style={{ fontSize: 12, flex: 1 }}>{a.name}</span><div style={{ display: "flex", gap: 4 }}><Btn variant="ghost" small onClick={() => moveActivo(a.id, "nuevos", "enProceso")} style={{ fontSize: 9 }}>→</Btn><Btn variant="danger" small onClick={() => removeActivo(a.id, "nuevos")}>✕</Btn></div></ZebraBar>))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#ff8800", marginBottom: 6 }}>■ EN PROCESO</p>
                {data.activos.enProceso.length === 0 && <p style={{ opacity: 0.3, fontSize: 12 }}>Vacío</p>}
                {data.activos.enProceso.map((a, i) => (<ZebraBar key={a.id} index={i}><span style={{ fontSize: 12, flex: 1 }}>{a.name}</span><div style={{ display: "flex", gap: 4 }}><Btn variant="ghost" small onClick={() => moveActivo(a.id, "enProceso", "nuevos")} style={{ fontSize: 9 }}>←</Btn><Btn variant="danger" small onClick={() => removeActivo(a.id, "enProceso")}>✕</Btn></div></ZebraBar>))}
              </div>
            </div>
          </div>
        )}

        {/* VENTAS */}
        {activeTab === "ventas" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <SectionHeader title="Embudo de Ventas" icon="💰" count={ventasTotalLeads} />
              <Btn variant="accent" small onClick={() => setShowAddLead(true)}>+ Prospecto</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20, padding: 16, border: "1px solid rgba(255,255,255,0.15)", background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 16px, transparent 16px, transparent 32px)" }}>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>EN EMBUDO</p><p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800 }}>{ventasTotalLeads}</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>VALOR PIPELINE</p><p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#a855f7" }}>{fmt(FUNNEL_STAGES.reduce((s, st) => s + (data.ventas[st.key]||[]).reduce((a, l) => a + (l.valor||0), 0), 0))}</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>CERRADOS</p><p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#00ff88" }}>{ventasCerradas.length} / {g.ventasCerradas}</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>VALOR CERRADO</p><p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#00ff88" }}>{fmt(ventasValorCerrado)}</p></div>
              <div><p style={{ margin: 0, fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>META VALOR</p><p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800 }}>{fmt(g.ventasValor)}</p></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 20, marginBottom: 20, alignItems: "start" }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 14 }}>
                <FunnelChart ventas={data.ventas} />
              </div>
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginBottom: 4 }}><span>Cerrados: {ventasCerradas.length}/{g.ventasCerradas}</span><span>{ventasCerradasPct.toFixed(0)}%</span></div>
                  <div style={{ height: 10, background: "rgba(255,255,255,0.06)" }}><div style={{ width: `${ventasCerradasPct}%`, height: "100%", background: "#00ff88", transition: "width .6s" }} /></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginBottom: 4 }}><span>Valor: {fmt(ventasValorCerrado)}/{fmt(g.ventasValor)}</span><span>{ventasValorPct.toFixed(0)}%</span></div>
                  <div style={{ height: 10, background: "rgba(255,255,255,0.06)" }}><div style={{ width: `${ventasValorPct}%`, height: "100%", background: "linear-gradient(90deg, #a855f7, #00ff88)", transition: "width .6s" }} /></div>
                </div>
                <TimelineStrip dates={dt.ventas} actualPct={ventasCerradasPct} color="#00ff88" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {FUNNEL_STAGES.map((stage) => {
                const items = data.ventas[stage.key] || [];
                const ns = nextStage(stage.key);
                const stageVal = items.reduce((s, l) => s + (l.valor || 0), 0);
                return (
                  <div key={stage.key}>
                    <div style={{ marginBottom: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${stage.color}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: stage.color, margin: 0 }}>■ {stage.label.toUpperCase()} ({items.length})</p>
                      <p style={{ fontSize: 16, fontWeight: 800, margin: "4px 0 0", color: stage.color }}>{fmt(stageVal)}</p>
                    </div>
                    {items.length === 0 && <p style={{ opacity: 0.3, fontSize: 11 }}>Vacío</p>}
                    {items.map((lead, i) => (
                      <ZebraBar key={lead.id} index={i}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, display: "block" }}>{lead.name}</span>
                          {editingLead === lead.id ? (
                            <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                              <Input value={editLeadValor} onChange={setEditLeadValor} placeholder="Valor" type="number" style={{ width: 90, fontSize: 11, padding: "4px 8px" }} />
                              <Btn variant="accent" small onClick={() => updateLeadValor(lead.id, stage.key)} style={{ fontSize: 8, padding: "2px 6px" }}>✓</Btn>
                              <Btn variant="ghost" small onClick={() => { setEditingLead(null); setEditLeadValor(""); }} style={{ fontSize: 8, padding: "2px 6px" }}>✕</Btn>
                            </div>
                          ) : (
                            <span style={{ fontSize: 10, color: stage.color, cursor: "pointer" }} onClick={() => { setEditingLead(lead.id); setEditLeadValor(String(lead.valor)); }}>{fmt(lead.valor)} ✎</span>
                          )}
                        </div>
                        {editingLead !== lead.id && (
                          <div style={{ display: "flex", gap: 3, flexDirection: "column" }}>
                            {ns && <Btn variant="ghost" small onClick={() => moveLead(lead.id, stage.key, ns.key)} style={{ fontSize: 8, padding: "2px 6px" }}>→ {ns.label.slice(0,3)}</Btn>}
                            {stage.key !== "cerrados" && <Btn variant="danger" small onClick={() => discardLead(lead.id, stage.key)} style={{ fontSize: 8, padding: "2px 6px" }}>✕</Btn>}
                          </div>
                        )}
                      </ZebraBar>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCOUTING */}
        {activeTab === "scouting" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <SectionHeader title="Scouting de Talento" icon="🎯" />
              <Btn variant="accent" small onClick={() => setShowAddScouting(true)}>+ Visita</Btn>
            </div>
            <ParallelBars label1={`Visitas (${data.scouting.visitas.length}/${g.scoutingVisitas})`} val1={data.scouting.visitas.length} max1={g.scoutingVisitas} color1="#a855f7" label2={`Contratados (${(data.scouting.contratados||[]).length}/${g.scoutingContratacion})`} val2={(data.scouting.contratados||[]).length} max2={g.scoutingContratacion} color2="#00ff88" />
            <TimelineStrip dates={dt.scouting} actualPct={scoutingTotalPct} color="#a855f7" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#a855f7", marginBottom: 6 }}>■ VISITAS</p>
                {data.scouting.visitas.length === 0 && <p style={{ opacity: 0.3, fontSize: 12 }}>Vacío</p>}
                {data.scouting.visitas.map((s, i) => (<ZebraBar key={s.id} index={i}><div style={{ flex: 1 }}><span style={{ fontSize: 12 }}>{s.name}</span><span style={{ fontSize: 9, opacity: 0.4, display: "block" }}>{s.createdAt}</span></div><div style={{ display: "flex", gap: 3 }}><Btn variant="accent" small onClick={() => markContratado(s.id, "visitas")} style={{ fontSize: 9 }}>✓</Btn><Btn variant="danger" small onClick={() => markDescartado(s.id, "visitas")} style={{ fontSize: 9 }}>✕</Btn></div></ZebraBar>))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#00ff88", marginBottom: 6 }}>■ CONTRATADOS</p>
                {(!data.scouting.contratados || data.scouting.contratados.length === 0) && <p style={{ opacity: 0.3, fontSize: 12 }}>Vacío</p>}
                {(data.scouting.contratados||[]).map((s, i) => (<ZebraBar key={s.id} index={i}><div style={{ flex: 1 }}><span style={{ fontSize: 12, color: "#00ff88" }}>{s.name}</span><span style={{ fontSize: 9, opacity: 0.4, display: "block" }}>{s.contratadoAt || s.createdAt}</span></div><Btn variant="danger" small onClick={() => removeScouting(s.id, "contratados")} style={{ fontSize: 9 }}>✕</Btn></ZebraBar>))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {activeTab === "historial" && (
          <div>
            <SectionHeader title="Historial Completo" icon="📋" count={data.history.length} />
            {data.history.length === 0 && <p style={{ opacity: 0.4, fontSize: 13, padding: 20 }}>Sin registros.</p>}
            {[...data.history].reverse().map((h, i) => (
              <ZebraBar key={i} index={i}>
                <span style={{ fontSize: 10, opacity: 0.5, minWidth: 80 }}>{h.fecha}</span>
                <span style={{ fontSize: 9, padding: "2px 8px", fontWeight: 700, letterSpacing: 1, background: badgeColor(h.tipo), color: "#0a0a0a" }}>{h.tipo.replace(/_/g, " ").toUpperCase()}</span>
                <span style={{ fontSize: 12, flex: 1, textAlign: "right" }}>{h.desc}</span>
              </ZebraBar>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal show={showGoals} onClose={() => setShowGoals(false)} title="METAS & FECHAS">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <GoalBlock label="1. Upsale" valueKey="upsalePercent" editGoals={editGoals} setEditGoals={setEditGoals} kpiKey="upsale" editDates={editDates} setEditDates={setEditDates} placeholder="10" suffix="%" />
          <GoalBlock label="2. Ingreso Recurrente" valueKey="ingresoPesos" editGoals={editGoals} setEditGoals={setEditGoals} kpiKey="ingreso" editDates={editDates} setEditDates={setEditDates} placeholder="400000" prefix="$" suffix="MXN" />
          <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#c8ff00", textTransform: "uppercase" }}>3. Activos IA</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>META NUEVOS</label><Input type="number" value={editGoals.activosNuevos || ""} onChange={(v) => setEditGoals({ ...editGoals, activosNuevos: v })} placeholder="5" /></div>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>META EN PROCESO</label><Input type="number" value={editGoals.activosProceso || ""} onChange={(v) => setEditGoals({ ...editGoals, activosProceso: v })} placeholder="8" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA INICIO</label><DateInput value={editDates.activos?.fechaInicio || ""} onChange={(v) => setEditDates({ ...editDates, activos: { ...editDates.activos, fechaInicio: v } })} /></div>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA FIN</label><DateInput value={editDates.activos?.fechaFin || ""} onChange={(v) => setEditDates({ ...editDates, activos: { ...editDates.activos, fechaFin: v } })} /></div>
            </div>
          </div>
          <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#c8ff00", textTransform: "uppercase" }}>4. Ventas</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>META CERRADOS (#)</label><Input type="number" value={editGoals.ventasCerradas || ""} onChange={(v) => setEditGoals({ ...editGoals, ventasCerradas: v })} placeholder="10" /></div>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>META VALOR ($)</label><Input type="number" value={editGoals.ventasValor || ""} onChange={(v) => setEditGoals({ ...editGoals, ventasValor: v })} placeholder="500000" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA INICIO</label><DateInput value={editDates.ventas?.fechaInicio || ""} onChange={(v) => setEditDates({ ...editDates, ventas: { ...editDates.ventas, fechaInicio: v } })} /></div>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA FIN</label><DateInput value={editDates.ventas?.fechaFin || ""} onChange={(v) => setEditDates({ ...editDates, ventas: { ...editDates.ventas, fechaFin: v } })} /></div>
            </div>
          </div>
          <div style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#c8ff00", textTransform: "uppercase" }}>5. Scouting de Talento</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>META VISITAS</label><Input type="number" value={editGoals.scoutingVisitas || ""} onChange={(v) => setEditGoals({ ...editGoals, scoutingVisitas: v })} placeholder="20" /></div>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>META CONTRATADOS</label><Input type="number" value={editGoals.scoutingContratacion || ""} onChange={(v) => setEditGoals({ ...editGoals, scoutingContratacion: v })} placeholder="5" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA INICIO</label><DateInput value={editDates.scouting?.fechaInicio || ""} onChange={(v) => setEditDates({ ...editDates, scouting: { ...editDates.scouting, fechaInicio: v } })} /></div>
              <div><label style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1, display: "block", marginBottom: 3 }}>FECHA FIN</label><DateInput value={editDates.scouting?.fechaFin || ""} onChange={(v) => setEditDates({ ...editDates, scouting: { ...editDates.scouting, fechaFin: v } })} /></div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}><Btn variant="accent" onClick={saveGoals} style={{ width: "100%" }}>Guardar Metas & Fechas</Btn></div>
        </div>
      </Modal>

      <Modal show={showAddClient} onClose={() => setShowAddClient(false)} title="AGREGAR CLIENTE">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>NOMBRE</label><Input value={newClient.name} onChange={(v) => setNewClient({ ...newClient, name: v })} placeholder="Empresa ABC" /></div>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>PAGO INICIAL (MXN)</label><Input type="number" value={newClient.pagoInicial} onChange={(v) => setNewClient({ ...newClient, pagoInicial: v })} placeholder="50000" /></div>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>PAGO ACTUAL (MXN)</label><Input type="number" value={newClient.pagoActual} onChange={(v) => setNewClient({ ...newClient, pagoActual: v })} placeholder="55000" /></div>
          <Btn variant="accent" onClick={addClient}>Agregar Cliente</Btn>
        </div>
      </Modal>

      <Modal show={showAddActivo} onClose={() => setShowAddActivo(false)} title="AGREGAR PROYECTO IA">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>NOMBRE</label><Input value={newActivo.name} onChange={(v) => setNewActivo({ ...newActivo, name: v })} placeholder="Chatbot Ventas" /></div>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>TIPO</label>
            <select value={newActivo.tipo} onChange={(e) => setNewActivo({ ...newActivo, tipo: e.target.value })} style={{ width: "100%" }}><option value="nuevo">Nuevo</option><option value="enProceso">En Proceso</option></select></div>
          <Btn variant="accent" onClick={addActivo}>Agregar Proyecto</Btn>
        </div>
      </Modal>

      <Modal show={showAddScouting} onClose={() => setShowAddScouting(false)} title="AGREGAR VISITA">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>NOMBRE</label><Input value={newScouting.name} onChange={(v) => setNewScouting({ ...newScouting, name: v })} placeholder="Juan Pérez — Dev Senior" /></div>
          <Btn variant="accent" onClick={addScouting}>Agregar Visita</Btn>
        </div>
      </Modal>

      <Modal show={showAddLead} onClose={() => setShowAddLead(false)} title="NUEVO PROSPECTO">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>NOMBRE / EMPRESA</label><Input value={newLead.name} onChange={(v) => setNewLead({ ...newLead, name: v })} placeholder="Empresa XYZ" /></div>
          <div><label style={{ fontSize: 10, opacity: 0.5, letterSpacing: 1, display: "block", marginBottom: 4 }}>VALOR ESTIMADO (MXN)</label><Input type="number" value={newLead.valor} onChange={(v) => setNewLead({ ...newLead, valor: v })} placeholder="100000" /></div>
          <Btn variant="accent" onClick={addLead}>Agregar Prospecto</Btn>
        </div>
      </Modal>
    </div>
  );
}
