"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Activity, AlertTriangle, ArrowUpRight, Bell, Bot, BrainCircuit, CheckCircle2, ChevronDown, CircleUser, ClipboardList, Eye, LayoutDashboard, Network, Radio, Truck } from "lucide-react";

const LiveVehicleMap = dynamic(() => import("./LeafletVehicleMap"), { ssr: false });

type Stats = { totalTelemetry: number; totalAlerts: number; avgSpeed: number; avgFuel: number };
type Signal = { _id?: string; vehicleId?: string; speed?: number; fuelLevel?: number; rpm?: number; riskScore?: number; prediction?: number; engineTemp?: number; latitude?: number; longitude?: number; lat?: number; lng?: number; timestamp?: string; createdAt?: string; alertType?: string; status?: string };
type DataState = "loading" | "ready" | "error";

function displayValue(value: number | string | undefined, suffix = "") {
  return value === undefined || value === null || value === "" ? "N/A" : `${value}${suffix}`;
}
function chartPath(values: number[], width: number, height: number, close = false) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * width} ${height - 12 - ((value - min) / range) * (height - 26)}`);
  const path = `M${points.join(" L")}`;
  return close ? `${path} V${height} H0Z` : path;
}
function relativeTime(value?: string) {
  if (!value) return "time unavailable";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return "time unavailable";
  const minutes = Math.floor(elapsed / 60000);
  return minutes < 1 ? "just now" : `${minutes}m ago`;
}
function Sparkline({ values, risk = false }: { values: number[]; risk?: boolean }) {
  return <svg className="sparkline" viewBox="0 0 140 42" preserveAspectRatio="none" aria-hidden="true"><path d={chartPath(values, 140, 42)} fill="none" stroke={risk ? "#ff4d6d" : "#49b8ff"} strokeWidth="2.5" /></svg>;
}
function Ring({ value }: { value: number }) { return <div className="ring ring-cyan"><strong>{value}<small>%</small></strong></div>; }

type DashboardView = "command" | "graph" | "predictions" | "playbooks";
const navigation = [
  { id: "command" as const, label: "Command Center", icon: LayoutDashboard },
  { id: "graph" as const, label: "Fleet Graph", icon: Network },
  { id: "predictions" as const, label: "Predictions", icon: BrainCircuit },
  { id: "playbooks" as const, label: "Playbooks", icon: ClipboardList },
];

function FleetNav({ activeView, onChange, lastSync }: { activeView: DashboardView; onChange: (view: DashboardView) => void; lastSync: Date }) {
  return <nav className="topbar"><div className="brand-mark"><span className="brand-symbol"><LayoutDashboard size={21} /></span><div><b>FLEETGUARD</b><span>INTELLIGENCE PLATFORM</span></div></div><div className="nav-center">{navigation.map(({ id, label, icon: Icon }) => <button className={`nav-tab ${activeView === id ? "nav-active" : ""}`} key={id} onClick={() => onChange(id)}><Icon size={14} strokeWidth={1.8} /><span>{label}</span></button>)}</div><div className="top-actions"><span className="utc">{lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><button className="icon-button" aria-label="Notifications"><Bell size={17} strokeWidth={1.8} /><i /></button><button className="profile-button" aria-label="Open profile"><CircleUser size={28} strokeWidth={1.5} /></button></div></nav>;
}

function uniqueVehicleCount(records: Signal[]) {
  return new Set(records.map((record) => record.vehicleId).filter(Boolean)).size;
}

function PlaybooksView({ telemetry, alerts, onReturn }: { telemetry: Signal[]; alerts: Signal[]; onReturn: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const playbooks = [
    { id: "engine", icon: Activity, title: "Engine Health", trigger: "Engine temperature above 100 C", vehicles: telemetry.filter((item) => (item.engineTemp || 0) > 100), priority: "HIGH", priorityClass: "high", actions: ["Inspect cooling system", "Check coolant level", "Schedule maintenance"] },
    { id: "fuel", icon: Radio, title: "Fuel Optimization", trigger: "Fuel level below 15 percent", vehicles: telemetry.filter((item) => (item.fuelLevel || 0) < 15), priority: "MEDIUM", priorityClass: "medium", actions: ["Refuel vehicle", "Review route efficiency"] },
    { id: "risk", icon: AlertTriangle, title: "High Risk Intervention", trigger: "AI risk score above 80 percent", vehicles: telemetry.filter((item) => item.prediction === 1 || (item.riskScore || 0) > .8), priority: "CRITICAL", priorityClass: "critical", actions: ["Perform preventive inspection", "Review latest telemetry", "Assign maintenance owner"] },
  ];
  const selected = playbooks.find((playbook) => playbook.id === expanded);
  return <section className="secondary-view playbooks-view"><div className="secondary-heading"><span className="secondary-icon"><ClipboardList size={24} /></span><div><span className="eyebrow">OPERATIONS / AI GENERATED ACTIONS</span><h1>Maintenance playbooks</h1><p>Convert current AI predictions into clear actions for fleet managers.</p></div><button className="secondary-return" onClick={onReturn}><LayoutDashboard size={15} /> Command Center</button></div><div className="playbook-summary"><span><Bot size={15} /> AI recommendations from live telemetry</span><span><Radio size={15} /> {alerts.length} alert records in current queue</span></div><div className="playbook-grid">{playbooks.map((playbook) => { const Icon = playbook.icon; const isExpanded = expanded === playbook.id; return <article className={`playbook-card ${isExpanded ? "playbook-card-active" : ""}`} key={playbook.id}><div className="playbook-card-top"><span className="playbook-icon"><Icon size={21} /></span><span className={`priority-badge ${playbook.priorityClass}`}>{playbook.priority}</span></div><h2>{playbook.title}</h2><div className="playbook-trigger"><span>TRIGGER</span><b>{playbook.trigger}</b></div><div className="playbook-vehicles"><strong>{uniqueVehicleCount(playbook.vehicles)}</strong><span>affected vehicles</span></div><div className="playbook-actions"><span>RECOMMENDED ACTION</span><ol>{playbook.actions.map((action) => <li key={action}>{action}</li>)}</ol></div><button className="playbook-button" onClick={() => setExpanded(isExpanded ? null : playbook.id)}><Eye size={15} /> {isExpanded ? "Hide vehicles" : "View vehicles"}<ArrowUpRight size={14} /></button></article>; })}</div>{selected && <div className="playbook-review panel"><div className="panel-heading"><div><span className="eyebrow">VEHICLE REVIEW / {selected.title.toUpperCase()}</span><h2>Vehicles requiring action</h2></div><button className="text-button" onClick={() => setExpanded(null)}>Close review</button></div><div className="secondary-row-list">{selected.vehicles.map((vehicle, index) => <div className="secondary-row" key={vehicle._id || vehicle.vehicleId || index}><span className="secondary-row-icon"><Truck size={16} /></span><div><b>{vehicle.vehicleId || "Vehicle record"}</b><small>Temperature {displayValue(vehicle.engineTemp, " C")} / Fuel {displayValue(vehicle.fuelLevel, "%")} / Risk {displayValue(typeof vehicle.riskScore === "number" ? `${Math.round(vehicle.riskScore * 100)}%` : undefined)}</small></div><CheckCircle2 size={16} /></div>)}{!selected.vehicles.length && <div className="empty-state">No matching vehicles in the current telemetry snapshot.</div>}</div></div>}</section>;
}

function SecondaryView({ view, metrics, alerts, telemetry, onReturn }: { view: Exclude<DashboardView, "command">; metrics: ReturnType<typeof getMetrics>; alerts: Signal[]; telemetry: Signal[]; onReturn: () => void }) {
  if (view === "playbooks") return <PlaybooksView telemetry={telemetry} alerts={alerts} onReturn={onReturn} />;
  const details = {
    graph: { icon: Network, eyebrow: "FLEET GRAPH / LIVE RELATIONSHIPS", title: "Fleet relationship network", description: "Explore vehicle, risk, and telemetry relationships from the current fleet snapshot." },
    predictions: { icon: BrainCircuit, eyebrow: "PREDICTIVE LAYER / LIVE MODEL OUTPUT", title: "Prediction intelligence", description: "Review current risk signals and the vehicles most likely to require intervention." },
    playbooks: { icon: ClipboardList, eyebrow: "OPERATIONS / RECOMMENDED ACTIONS", title: "Recommended playbooks", description: "Prioritize operational actions from the latest alert and telemetry records." },
  }[view];
  const Icon = details.icon;
  return <section className="secondary-view"><div className="secondary-heading"><span className="secondary-icon"><Icon size={24} /></span><div><span className="eyebrow">{details.eyebrow}</span><h1>{details.title}</h1><p>{details.description}</p></div><button className="secondary-return" onClick={onReturn}><LayoutDashboard size={15} /> Command Center</button></div><div className="secondary-grid"><div className="secondary-card"><span className="eyebrow">FLEET SIGNAL</span><strong>{metrics.activeVehicles}</strong><span>Active vehicles</span></div><div className="secondary-card"><span className="eyebrow">RISK QUEUE</span><strong className="orange-text">{metrics.riskyVehicles.length}</strong><span>Vehicles requiring review</span></div><div className="secondary-card"><span className="eyebrow">TELEMETRY</span><strong>{telemetry.length}</strong><span>Current vehicle records</span></div></div><div className="secondary-table panel"><div className="panel-heading"><div><span className="eyebrow">CURRENT DATASET</span><h2>{view === "graph" ? "Connected fleet nodes" : "Highest risk vehicles"}</h2></div><span className="live-pill"><Radio size={11} /> STREAM ACTIVE</span></div>{(view === "predictions" ? metrics.riskyVehicles : telemetry).slice(0, 8).map((item, index) => <div className="secondary-row" key={item._id || item.vehicleId || index}><span className="secondary-row-icon">{view === "graph" ? <Truck size={16} /> : <AlertTriangle size={16} />}</span><div><b>{item.vehicleId || "Vehicle record"}</b><small>{view === "predictions" ? `Risk score ${displayValue(typeof item.riskScore === "number" ? `${Math.round(item.riskScore * 100)}%` : undefined)}` : `Speed ${displayValue(item.speed, " km/h")}`}</small></div><ArrowUpRight size={16} /></div>)}{!telemetry.length && <div className="empty-state">No live telemetry records are currently available.</div>}</div></section>;
}

function getMetrics(telemetry: Signal[]) {
  const activeVehicles = new Set(telemetry.map((item) => item.vehicleId).filter(Boolean)).size;
  const riskyVehicles = telemetry.filter((item) => item.prediction === 1 || (item.riskScore || 0) > .6);
  const monitorVehicles = telemetry.filter((item) => item.prediction !== 1 && (item.riskScore || 0) > .3 && (item.riskScore || 0) <= .6);
  const safeVehicles = Math.max(telemetry.length - riskyVehicles.length - monitorVehicles.length, 0);
  const riskScores = telemetry.map((item) => item.riskScore).filter((score): score is number => typeof score === "number");
  const averageRisk = riskScores.length ? Math.round((riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length) * 100) : undefined;
  const averageTemperature = telemetry.length ? Math.round(telemetry.reduce((sum, item) => sum + (item.engineTemp || 0), 0) / telemetry.length) : undefined;
  const fleetHealth = telemetry.length ? Math.round((safeVehicles / telemetry.length) * 100) : undefined;
  const highestRisk = [...telemetry].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0];
  const riskCoverage = telemetry.length ? Math.round((riskScores.length / telemetry.length) * 100) : undefined;
  const speedValues = telemetry.map((item) => item.speed).filter((speed): speed is number => typeof speed === "number");
  const riskValues = telemetry.map((item) => item.riskScore).filter((risk): risk is number => typeof risk === "number");
  return { activeVehicles, riskyVehicles, monitorVehicles, safeVehicles, averageRisk, averageTemperature, fleetHealth, highestRisk, riskCoverage, speedValues, riskValues };
}
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Signal[]>([]);
  const [telemetry, setTelemetry] = useState<Signal[]>([]);
  const [state, setState] = useState<DataState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSync, setLastSync] = useState(new Date());
  const [activeView, setActiveView] = useState<DashboardView>("command");
  const refreshInFlight = useRef(false);
  const dashboardAbort = useRef<AbortController | null>(null);

  async function loadData() {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const requestConfig = { signal: dashboardAbort.current?.signal, timeout: 10000 };
      const [statsRes, alertsRes, telemetryRes] = await Promise.all([axios.get<Stats>("/api/dashboard/stats", requestConfig), axios.get<Signal[]>("/api/dashboard/alerts", requestConfig), axios.get<Signal[]>("/api/dashboard/telemetry", requestConfig)]);
      setStats(statsRes.data); setAlerts(alertsRes.data); setTelemetry(telemetryRes.data); setLastSync(new Date()); setErrorMessage(""); setState("ready");
    } catch (error) {
      if (axios.isCancel(error)) return;
      setErrorMessage(axios.isAxiosError(error) ? error.message : "Unable to load dashboard data."); setState("error");
    } finally {
      refreshInFlight.current = false;
    }
  }
  useEffect(() => {
    dashboardAbort.current = new AbortController();
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => {
      clearInterval(interval);
      dashboardAbort.current?.abort();
      dashboardAbort.current = null;
    };
  }, []);

  const metrics = useMemo(() => getMetrics(telemetry), [telemetry]);

  if (state === "loading") return <main className="command-shell"><div className="loading-state"><div className="loading-orbit" /><span>CONNECTING TO FLEET DATA FABRIC</span><small>Awaiting telemetry, alerts, and fleet statistics</small></div></main>;
  if (state === "error" || !stats) return <main className="command-shell"><div className="error-state"><span className="signal-icon orange"><AlertTriangle size={16} /></span><span className="eyebrow">DATA FABRIC UNAVAILABLE</span><h1>Live signal interrupted.</h1><p>{errorMessage || "The dashboard APIs did not return a usable response."}</p><button className="primary-button" onClick={loadData}>Retry connection <span>Reconnect</span></button></div></main>;

  const timeline = [...alerts, ...telemetry].filter((item) => item.timestamp || item.createdAt).sort((a, b) => new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime()).slice(0, 4);
  const fleetHealth = metrics.fleetHealth ?? 0;
  const riskValues = metrics.riskValues.length ? metrics.riskValues : [0];
  return <main className="command-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <FleetNav activeView={activeView} onChange={setActiveView} lastSync={lastSync} />
    {activeView !== "command" ? <SecondaryView view={activeView} metrics={metrics} alerts={alerts} telemetry={telemetry} onReturn={() => setActiveView("command")} /> : <>
    <section className="hero"><div><div className="hero-kicker"><Activity className="hero-status-icon" size={12} /> AUTONOMOUS FLEET OPERATIONS <span className="divider" /> REAL-TIME DATA LINK</div><h1>See the signal.<br /><em>Move before failure.</em></h1><p>AI-powered fleet intelligence for the decisions that keep <strong>{metrics.activeVehicles.toLocaleString()} vehicles</strong> in motion.</p><div className="hero-actions"><button className="primary-button">Open operations view <span>View</span></button><button className="ghost-button">View latest briefing <span>Briefing</span></button></div></div><div className="system-orbit"><div className="orbit-ring ring-back" /><div className="orbit-ring ring-front" /><div className="orbit-core"><span className="orbit-number">N/A</span><span className="orbit-caption">SYSTEM UPTIME</span></div><span className="orbit-tag tag-one"><Radio size={10} /> INGESTION</span><span className="orbit-tag tag-two"><BrainCircuit size={10} /> INFERENCE</span><span className="orbit-tag tag-three"><Truck size={10} /> {metrics.activeVehicles.toLocaleString()} ACTIVE</span></div></section>
    <section className="signal-strip"><div className="strip-item"><span className="signal-icon cyan" aria-hidden="true"><Radio size={16} /></span><div><span>EVENTS PROCESSED</span><strong>{stats.totalTelemetry.toLocaleString()} <small>/ API TOTAL</small></strong></div><Sparkline values={metrics.speedValues} /></div><div className="strip-item"><span className="signal-icon purple" aria-hidden="true"><AlertTriangle size={16} /></span><div><span>RISK DATA COVERAGE</span><strong>{displayValue(metrics.riskCoverage, "%")}</strong></div><div className="confidence-bar"><i style={{ width: `${metrics.riskCoverage || 0}%` }} /></div></div><div className="strip-item"><span className="signal-icon orange" aria-hidden="true"><Bell size={16} /></span><div><span>ACTIVE INTERVENTIONS</span><strong>{alerts.length} <small>API ALERTS</small></strong></div><span className="delta negative">MONITORING</span></div><div className="strip-item"><span className="signal-icon green" aria-hidden="true"><Network size={16} /></span><div><span>NETWORK LATENCY</span><strong>N/A <small>NOT EXPOSED</small></strong></div><span className="delta positive">API</span></div></section>
    <div className="content-grid"><section className="panel fleet-health"><div className="panel-heading"><div><span className="eyebrow">FLEET PULSE / API SNAPSHOT</span><h2>Operational health</h2></div><button className="select-button">Live telemetry <ChevronDown size={13} /></button></div><div className="health-layout"><div className="health-score"><Ring value={fleetHealth} /><span>FLEET HEALTH</span><b>{displayValue(metrics.averageRisk, "%")} <small>average risk</small></b></div><div className="chart-area"><div className="chart-legend"><span><i className="legend-dot cyan" /> Healthy <b>{metrics.safeVehicles}</b></span><span><i className="legend-dot orange" /> At risk <b>{metrics.monitorVehicles.length}</b></span><span><i className="legend-dot red" /> Critical <b>{metrics.riskyVehicles.length}</b></span></div><svg className="health-chart" viewBox="0 0 700 190" preserveAspectRatio="none"><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#25d9dc" stopOpacity=".24" /><stop offset="1" stopColor="#25d9dc" stopOpacity="0" /></linearGradient></defs><path d={chartPath(riskValues, 700, 190, true)} fill="url(#areaFill)" /><path d={chartPath(riskValues, 700, 190)} fill="none" stroke="#25d9dc" strokeWidth="3" /><path d={chartPath(metrics.speedValues.length ? metrics.speedValues : [0], 700, 190)} fill="none" stroke="#ff9f43" strokeDasharray="4 6" strokeWidth="2" /></svg><div className="chart-axis"><span>FIRST RECORD</span><span>LIVE SAMPLE</span></div></div></div></section><section className="panel risk-panel"><div className="panel-heading"><div><span className="eyebrow">PREDICTIVE LAYER</span><h2>Risk radar</h2></div><span className="model-badge">PREDICTIVE MODEL <i /></span></div><div className="risk-visual"><div className="radar-grid"><i /><i /><i /><i /><span className="radar-sweep" />{metrics.riskyVehicles.slice(0, 3).map((item, index) => <b key={item._id || item.vehicleId || index} className={`radar-point point-${String.fromCharCode(97 + index)}`} />)}</div><div className="risk-number"><strong>{displayValue(metrics.averageRisk)}<small>{metrics.averageRisk === undefined ? "" : "%"}</small></strong><span>AVG. RISK INDEX</span></div></div><div className="risk-footer"><div><span>LOW RISK</span><b>{metrics.safeVehicles}</b></div><div><span>MONITOR</span><b>{metrics.monitorVehicles.length}</b></div><div><span>INTERVENE</span><b className="orange-text">{metrics.riskyVehicles.length}</b></div></div></section></div>
    <div className="split-grid"><LiveVehicleMap /><section className="panel insight-panel"><div className="panel-heading"><div><span className="eyebrow">AI COPILOT / TELEMETRY FEED</span><h2>What needs your attention</h2></div><span className="ai-badge"><Bot size={14} /> AI</span></div><div className="insight-lead"><span className="insight-spark"><Bot size={22} /></span><div><b>{metrics.riskyVehicles.length ? `Highest risk: ${metrics.highestRisk?.vehicleId || "vehicle record"}` : "No elevated risk detected"}</b><p>{metrics.riskyVehicles.length ? `${metrics.riskyVehicles.length} vehicle${metrics.riskyVehicles.length === 1 ? "" : "s"} require attention. Average engine temperature is ${displayValue(metrics.averageTemperature, " C")}.` : `The current telemetry sample contains no vehicles above the intervention threshold. Average engine temperature is ${displayValue(metrics.averageTemperature, " C")}.`}</p></div></div><div className="recommendation"><span className="rec-icon"><ClipboardList size={15} /></span><div><span>RECOMMENDED PLAYBOOK</span><b>{metrics.riskyVehicles.length ? "Review highest-risk vehicle records" : "Continue monitoring live telemetry"}</b><p>{metrics.riskyVehicles.length} vehicles  /  {alerts.length} alert records from API</p></div><button aria-label="Open recommendation"><ArrowUpRight size={17} /></button></div><div className="insight-footer"><span><i className="green-dot" /> {metrics.riskyVehicles.length} vehicles requiring maintenance review</span><button>View all insights</button></div></section></div>
    <div className="lower-grid"><section className="panel alerts-panel"><div className="panel-heading"><div><span className="eyebrow">ALERT QUEUE / AUTO-REFRESH 5 SEC</span><h2>Attention required <span className="count-badge">{alerts.length}</span></h2></div><button className="text-button">View incident log</button></div><div className="alert-list">{alerts.slice(0, 4).map((alert, index) => <div className="alert-row" key={alert._id || alert.vehicleId || index}><span className={`severity ${alert.prediction === 1 || (alert.riskScore || 0) > .8 ? "critical" : alert.riskScore && alert.riskScore > .6 ? "warning" : "notice"}`} /><div className="alert-copy"><b>{alert.alertType || alert.status || "Risk threshold exceeded"}</b><span>{alert.vehicleId || "Vehicle ID unavailable"}  /  {relativeTime(alert.timestamp || alert.createdAt)}</span></div><span className="alert-reading">{displayValue(alert.engineTemp, " C")} <small>ENGINE</small></span><button className="row-arrow" aria-label="View alert"><ArrowUpRight size={16} /></button></div>)}</div>{!alerts.length && <div className="empty-state">No alert records returned by the API.</div>}</section><section className="panel timeline-panel"><div className="panel-heading"><div><span className="eyebrow">SYSTEM ACTIVITY</span><h2>Mission timeline</h2></div><span className="live-pill"><Activity size={11} /> MONITORING</span></div><div className="timeline">{timeline.map((item, index) => <div key={item._id || item.vehicleId || index}><span className={`timeline-dot ${index % 3 === 0 ? "cyan" : index % 3 === 1 ? "purple" : "orange"}`} /><b>{item.alertType || item.status || (item.prediction === 1 ? "Risk prediction generated" : "Telemetry received")}</b><small>{item.vehicleId || "Vehicle ID unavailable"}  /  {relativeTime(item.timestamp || item.createdAt)}</small></div>)}{!timeline.length && <div className="empty-state">No timestamped activity returned by the API.</div>}</div></section></div>
    <section className="panel telemetry-panel"><div className="panel-heading"><div><span className="eyebrow">EDGE STREAM / {metrics.activeVehicles.toLocaleString()} VEHICLES</span><h2>Live telemetry</h2></div><div className="table-actions"><span className="data-fresh"><i /> STREAM ACTIVE</span><button className="select-button">All vehicles <ChevronDown size={13} /></button></div></div><div className="table-wrap"><table><thead><tr><th>VEHICLE ID</th><th>VELOCITY</th><th>FUEL LEVEL</th><th>ENGINE RPM</th><th>RISK SCORE</th><th>AI VERDICT</th><th /></tr></thead><tbody>{telemetry.slice(0, 6).map((item, index) => <tr key={item._id || item.vehicleId || index}><td><span className="vehicle-orb"><Truck size={16} /></span><b>{item.vehicleId || "Vehicle ID unavailable"}</b><small>  /  ACTIVE</small></td><td>{displayValue(item.speed)}<small> {item.speed === undefined ? "" : "km/h"}</small></td><td><div className="mini-bar"><i style={{ width: `${item.fuelLevel || 0}%` }} /></div>{displayValue(item.fuelLevel, "%")}</td><td>{displayValue(item.rpm)}</td><td><span className={`risk-value ${(item.riskScore || 0) > .6 ? "high" : "low"}`}>{displayValue(typeof item.riskScore === "number" ? `${(item.riskScore * 100).toFixed(0)}%` : undefined)}</span></td><td><span className={`verdict ${item.prediction === 1 ? "risk" : "safe"}`}><i />{item.prediction === 1 ? "INTERVENE" : item.prediction === undefined ? "N/A" : "NOMINAL"}</span></td><td><button className="row-arrow" aria-label="View vehicle"><ArrowUpRight size={16} /></button></td></tr>)}</tbody></table></div>{!telemetry.length && <div className="empty-state">No telemetry records returned by the API.</div>}</section>
    <section className="architecture"><div><span className="eyebrow">THE INTELLIGENCE STACK</span><h2>From raw signal to<br /><em>confident action.</em></h2><p>One operating layer for every vehicle, sensor, and decision in your network.</p></div><div className="arch-flow"><div><span>01</span><b>EDGE NODES</b><small>{metrics.activeVehicles} vehicles</small></div><ArrowUpRight size={14} /><div><span>02</span><b>SIGNAL FABRIC</b><small>{telemetry.length} records</small></div><ArrowUpRight size={14} /><div className="arch-active"><span>03</span><b>FLEETGUARD AI</b><small>{displayValue(metrics.riskCoverage, "%")} coverage</small></div><ArrowUpRight size={14} /><div><span>04</span><b>COMMAND LAYER</b><small>{alerts.length} open alerts</small></div></div></section><footer><span>FLEETGUARD AI  /  OPERATIONS CONTROL</span><span>API data synchronized <i className="green-dot" />  /  Last sync {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></footer>
  </>}
  </main>;
}









