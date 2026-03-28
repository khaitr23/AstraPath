import React, { useState, useEffect, useRef, useCallback } from "react";
import { useClerk } from "@clerk/nextjs";
import { ActivePath } from "./GraphVisualizer";
import { Conditions } from "../pages/index";
import { NodeTypeDef, EdgeTypeDef, DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES, TYPE_COLORS } from "../lib/types";

type OptMode = "distance" | "co2Emission" | "moneyCost" | "timeTaken";
type Tab = "node" | "route" | "path" | "types";

const DEFAULT_PAYLOAD_T = 10;

const OPT: { key: OptMode; label: string; icon: string }[] = [
  { key: "distance",    label: "Shortest", icon: "📏" },
  { key: "timeTaken",   label: "Fastest",  icon: "⏱️" },
  { key: "moneyCost",   label: "Cheapest", icon: "💰" },
  { key: "co2Emission", label: "Greenest", icon: "🌱" },
];

// ── Shared styles ──────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 7,
  color: "#c8d8f0", padding: "8px 11px", fontSize: 13, outline: "none",
  boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 10, color: "#4a5568",
  textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 5,
};
const fld: React.CSSProperties = { marginBottom: 14 };
const primaryBtn: React.CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: 0.7,
};
const dangerBtn: React.CSSProperties = {
  width: "100%", padding: "9px", borderRadius: 8,
  border: "1px solid rgba(239,68,68,0.3)",
  background: "rgba(239,68,68,0.07)", color: "#ef4444",
  cursor: "pointer", fontSize: 12, fontWeight: 600,
};

function iconBtn(active: boolean, stroke?: string): React.CSSProperties {
  return {
    flex: 1, padding: "8px 4px", borderRadius: 8,
    border: `1.5px solid ${active ? (stroke ?? "#2563eb") : "rgba(255,255,255,0.07)"}`,
    background: active ? `${stroke ?? "#2563eb"}22` : "transparent",
    color: active ? (stroke ?? "#60a5fa") : "#3d4f66",
    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
  };
}

// ─── Add Node ──────────────────────────────────────────────────────────────────
function AddNodeForm({ onDone, nodeTypes }: { onDone: () => void; nodeTypes: NodeTypeDef[] }) {
  const [kind, setKind] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [flash, setFlash] = useState(false);

  const submit = async () => {
    if (!kind) { alert("Choose a type"); return; }
    if (!name.trim()) { alert("Enter a name"); return; }
    if (!address.trim()) { alert("Enter an address"); return; }
    try {
      const res = await fetch("/api/addNodes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: name.trim(), address: address.trim(), type: kind }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setKind(null); setName(""); setAddress("");
      setFlash(true); setTimeout(() => setFlash(false), 2000);
      onDone();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  return (
    <div>
      <div style={fld}>
        <span style={lbl}>Type</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {nodeTypes.map(nt => (
            <button key={nt.key} onClick={() => setKind(nt.key)} style={{ ...iconBtn(kind === nt.key, nt.stroke), minWidth: 56 }}>
              <span style={{ fontSize: 17 }}>{nt.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 700 }}>{nt.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={fld}>
        <span style={lbl}>Name / ID</span>
        <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FactoryA" />
      </div>
      <div style={fld}>
        <span style={lbl}>Address</span>
        <input style={inp} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State, ZIP" />
      </div>
      <button style={primaryBtn} onClick={submit}>ADD NODE</button>
      {flash && <div style={{ color: "#4ade80", fontSize: 11, textAlign: "center", marginTop: 8 }}>Node added ✓</div>}
    </div>
  );
}

// ─── Add Route ─────────────────────────────────────────────────────────────────
function AddRouteForm({ onDone, refreshKey, edgeTypes }: { onDone: () => void; refreshKey: number; edgeTypes: EdgeTypeDef[] }) {
  const [nodes, setNodes] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end,   setEnd]   = useState("");
  const [transport, setTransport] = useState(edgeTypes[0]?.key ?? "trucks");
  const [distance, setDistance]   = useState("");
  const [cost,     setCost]       = useState("");
  const [flash, setFlash]         = useState(false);

  useEffect(() => {
    fetch("/api/getAllNodes").then(r => r.json()).then((data: any[]) => {
      const ids = Array.from(new Set<string>(data.map(n => n.id)));
      setNodes(ids);
      setStart(s => s || ids[0] || "");
      setEnd(e => e || ids[1] || "");
    }).catch(() => {});
  }, [refreshKey]);

  // Keep transport valid when edgeTypes changes
  useEffect(() => {
    if (!edgeTypes.find(e => e.key === transport)) setTransport(edgeTypes[0]?.key ?? "");
  }, [edgeTypes]);

  const submit = async () => {
    if (!start || !end) { alert("Choose origin and destination"); return; }
    if (start === end)  { alert("Origin and destination must differ"); return; }
    const def  = edgeTypes.find(e => e.key === transport);
    const dist = Number(distance);
    const co2  = dist * (def?.co2PerTonneMile ?? 0.1661) * DEFAULT_PAYLOAD_T;
    const time = dist / (def?.speedMph ?? 55);
    try {
      const res = await fetch("/api/addEdge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: start, toId: end, co2Emission: co2, timeTaken: time, distance: dist, moneyCost: Number(cost), transportType: transport }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDistance(""); setCost("");
      setFlash(true); setTimeout(() => setFlash(false), 2000);
      onDone();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  return (
    <div>
      <div style={fld}>
        <span style={lbl}>Transport Type</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {edgeTypes.map(et => (
            <button key={et.key} onClick={() => setTransport(et.key)} style={{ ...iconBtn(transport === et.key), minWidth: 52 }}>
              <span style={{ fontSize: 17 }}>{et.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 700 }}>{et.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Origin</span>
          <select style={inp} value={start} onChange={e => setStart(e.target.value)}>
            {nodes.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, color: "#3d4f66" }}>→</div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Destination</span>
          <select style={inp} value={end} onChange={e => setEnd(e.target.value)}>
            {nodes.filter(n => n !== start).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Distance (mi)</span>
          <input style={inp} value={distance} onChange={e => setDistance(e.target.value)} placeholder="0" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Cost ($)</span>
          <input style={inp} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
        </div>
      </div>
      <button style={primaryBtn} onClick={submit}>ADD ROUTE</button>
      {flash && <div style={{ color: "#4ade80", fontSize: 11, textAlign: "center", marginTop: 8 }}>Route added ✓</div>}
    </div>
  );
}

// ─── Route metric helpers ──────────────────────────────────────────────────────
function sumPath(pathNodes: any[]) {
  return pathNodes.reduce((acc, seg) => ({
    distance:    acc.distance    + Number(seg.relationship.distance    ?? 0),
    moneyCost:   acc.moneyCost   + Number(seg.relationship.moneyCost   ?? 0),
    co2Emission: acc.co2Emission + Number(seg.relationship.co2Emission ?? 0),
    timeTaken:   acc.timeTaken   + Number(seg.relationship.timeTaken   ?? 0),
  }), { distance: 0, moneyCost: 0, co2Emission: 0, timeTaken: 0 });
}
function routeString(pathNodes: any[]) {
  if (!pathNodes?.length) return "";
  return [pathNodes[0].startNode.id, ...pathNodes.map((s: any) => s.endNode.id)].join(" → ");
}

// ─── Find Path ─────────────────────────────────────────────────────────────────
function FindPathForm({
  onSelectionChange, onPathFound, conditions, onConditionsChange, edgeTypes,
}: {
  onSelectionChange: (from: string | null, to: string | null) => void;
  onPathFound: (path: ActivePath) => void;
  conditions: Conditions;
  onConditionsChange: (c: Conditions) => void;
  edgeTypes: EdgeTypeDef[];
}) {
  const [optPriority, setOptPriority] = useState<OptMode[]>(["distance", "timeTaken", "moneyCost", "co2Emission"]);
  const [dragIdx,     setDragIdx]     = useState<number | null>(null);
  const [from, setFrom]               = useState("");
  const [to,   setTo]                 = useState("");
  const [nodes, setNodes]             = useState<string[]>([]);
  const [path,  setPath]              = useState<any>(null);
  const [comparisons, setComparisons] = useState<Record<OptMode, any> | null>(null);
  const [loading,   setLoading]       = useState(false);
  const [comparing, setComparing]     = useState(false);
  const [error,     setError]         = useState("");

  useEffect(() => {
    fetch("/api/getAllNodes").then(r => r.json()).then((data: any[]) => {
      const ids = Array.from(new Set<string>(data.map((n: any) => n.id)));
      setNodes(ids);
      setFrom(f => f || ids[0] || "");
      setTo(t => t || ids[1] || ids[0] || "");
    }).catch(() => {});
  }, []);

  const updateFrom = (v: string) => { setFrom(v); onSelectionChange(v || null, to || null); clearPathOnly(); };
  const updateTo   = (v: string) => { setTo(v);   onSelectionChange(from || null, v || null); clearPathOnly(); };
  const clearPathOnly = () => { setPath(null); setComparisons(null); onPathFound(null); };
  const clearResults  = () => { clearPathOnly(); onSelectionChange(null, null); setFrom(nodes[0] || ""); setTo(nodes[1] || nodes[0] || ""); };

  const runQuery = async (criteriaOrder: OptMode[], fromId: string, toId: string) => {
    const res = await fetch("/api/findShortestPath", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startId: fromId, endId: toId, criteriaOrder, conditions, edgeTypes }),
    });
    if (!res.ok) throw new Error("Path not found");
    const data = await res.json();
    return data[0] ?? null;
  };

  const submit = async () => {
    if (!from || !to) { alert("Enter both node IDs"); return; }
    setLoading(true); setError(""); clearPathOnly();
    try {
      const result = await runQuery(optPriority, from, to);
      setPath(result);
      if (result) {
        const nodeSet = new Set<string>();
        const links: Array<{ source: string; target: string; elementId?: string }> = [];
        result.pathNodes?.forEach((seg: any) => {
          nodeSet.add(seg.startNode.id); nodeSet.add(seg.endNode.id);
          links.push({ source: seg.startNode.id, target: seg.endNode.id, elementId: seg.relationship.elementId });
        });
        onPathFound({ nodes: Array.from(nodeSet), links });
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const compareAll = async () => {
    if (!from || !to) { alert("Enter both node IDs first"); return; }
    setComparing(true); setError("");
    try {
      const modes: OptMode[] = ["distance", "timeTaken", "moneyCost", "co2Emission"];
      const results = await Promise.all(modes.map(m => runQuery([m], from, to).catch(() => null)));
      const cmp: any = {};
      modes.forEach((m, i) => { cmp[m] = results[i]; });
      setComparisons(cmp);
    } catch (e: any) { setError(e.message); }
    finally { setComparing(false); }
  };

  const totals = path ? sumPath(path.pathNodes ?? []) : null;

  // Build fuel/congestion "affects" labels dynamically from edgeTypes
  const fuelAffected = edgeTypes.filter(e => e.isFuelDependent).map(e => e.label).join(" · ") || "fuel-dep. types";
  const congAffected = edgeTypes.filter(e => e.isCongestionDependent).map(e => e.label).join(" · ") || "congestion-dep. types";

  return (
    <div>
      {/* Market Conditions */}
      <div style={{ marginBottom: 16, padding: "12px 12px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
        <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 10 }}>
          Market Conditions
        </div>
        {([
          { key: "fuelIndex",  icon: "⛽", label: "Fuel Price",  min: 0.5, max: 3,  step: 0.05, affects: fuelAffected + " cost" },
          { key: "congestion", icon: "🚦", label: "Congestion",  min: 1,   max: 3,  step: 0.05, affects: congAffected + " time" },
          { key: "weather",    icon: "🌧️", label: "Weather",     min: 1,   max: 2,  step: 0.05, affects: "all transit time" },
          { key: "payload",    icon: "⚖️", label: "Payload",     min: 1,   max: 40, step: 1,    affects: "CO₂ weight (t)" },
        ] as { key: keyof Conditions; icon: string; label: string; min: number; max: number; step: number; affects: string }[]).map(({ key, icon, label, min, max, step, affects }) => {
          const val = conditions[key];
          const defaultVal = key === "payload" ? DEFAULT_PAYLOAD_T : 1;
          const isNeutral = Math.abs(val - defaultVal) < (key === "payload" ? 0.5 : 0.01);
          const valLabel = key === "payload" ? `${val}t` : `${val.toFixed(2)}×`;
          const color = isNeutral ? "#4a5568" : (key === "payload" ? "#a78bfa" : val > defaultVal ? "#f87171" : "#4ade80");
          return (
            <div key={key} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: isNeutral ? "#4a5568" : "#fbbf24" }}>
                  {icon} {label}
                  <span style={{ fontSize: 9, color: "#3d4f66", marginLeft: 5 }}>{affects}</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color, background: isNeutral ? "transparent" : "rgba(255,255,255,0.05)", padding: isNeutral ? 0 : "1px 5px", borderRadius: 4 }}>
                  {valLabel}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: "#3d4f66", width: 22 }}>{min}{key === "payload" ? "t" : "×"}</span>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => onConditionsChange({ ...conditions, [key]: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: color, cursor: "pointer" }} />
                <span style={{ fontSize: 9, color: "#3d4f66", width: 22 }}>{max}{key === "payload" ? "t" : "×"}</span>
                {!isNeutral && (
                  <button onClick={() => onConditionsChange({ ...conditions, [key]: defaultVal })}
                    style={{ background: "none", border: "none", color: "#3d4f66", cursor: "pointer", fontSize: 10, padding: 0 }}>↺</button>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ fontSize: 9, color: "#2d3f55", marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 6 }}>
          CO₂ factors: DEFRA 2023 GHG Conversion Factors · ICAO RFI ×1.9 (air)
        </div>
      </div>

      {/* Priority ordering */}
      <div style={{ marginBottom: 14 }}>
        <span style={lbl}>Priority (drag to reorder)</span>
        <div style={{ display: "flex", gap: 5 }}>
          {optPriority.map((key, idx) => {
            const opt = OPT.find(o => o.key === key)!;
            return (
              <div key={key} draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx === null || dragIdx === idx) return;
                  const next = [...optPriority];
                  next.splice(idx, 0, next.splice(dragIdx, 1)[0]);
                  setOptPriority(next); setDragIdx(null); clearPathOnly();
                }}
                onDragEnd={() => setDragIdx(null)}
                style={{ flex: 1, padding: "7px 3px", borderRadius: 8, cursor: "grab",
                  border: `1.5px solid ${idx === 0 ? "#2563eb" : "rgba(255,255,255,0.07)"}`,
                  background: idx === 0 ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.03)",
                  color: idx === 0 ? "#60a5fa" : "#4a5568",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  opacity: dragIdx === idx ? 0.4 : 1, userSelect: "none" }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: idx === 0 ? "#2563eb" : "#3d4f66",
                  background: idx === 0 ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.06)",
                  borderRadius: 4, padding: "1px 5px", marginBottom: 1 }}>#{idx + 1}</span>
                <span style={{ fontSize: 15 }}>{opt.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 700 }}>{opt.label.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* From / To */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>From</span>
          <select style={{ ...inp, borderColor: from ? "rgba(59,130,246,0.4)" : undefined }} value={from} onChange={e => updateFrom(e.target.value)}>
            {nodes.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, color: "#3d4f66" }}>→</div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>To</span>
          <select style={{ ...inp, borderColor: to ? "rgba(139,92,246,0.4)" : undefined }} value={to} onChange={e => updateTo(e.target.value)}>
            {nodes.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <button style={{ ...primaryBtn, flex: 2 }} onClick={submit} disabled={loading}>
          {loading ? "SEARCHING…" : "FIND PATH"}
        </button>
        <button onClick={compareAll} disabled={comparing}
          style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#6b7280", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          {comparing ? "…" : "Compare"}
        </button>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 11, marginTop: 8 }}>{error}</div>}

      {/* Active path */}
      {path && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8 }}>Route Found</span>
            <button onClick={clearResults} style={{ background: "none", border: "none", color: "#3d4f66", cursor: "pointer", fontSize: 11 }}>✕ Clear</button>
          </div>
          {path.pathNodes?.map((seg: any, i: number) => {
            const edgeDef = edgeTypes.find(e => e.key === seg.relationship.transportType);
            return (
              <div key={i} style={{ padding: "9px 11px", marginBottom: 6, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ fontSize: 12, color: "#e2f0ff" }}>
                    <span style={{ color: "#38bdf8" }}>{seg.startNode.id}</span>
                    <span style={{ color: "#3d4f66", margin: "0 5px" }}>→</span>
                    <span style={{ color: "#38bdf8" }}>{seg.endNode.id}</span>
                  </div>
                  <span style={{ fontSize: 14 }}>{edgeDef?.icon ?? "🚚"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px" }}>
                  {[
                    { label: "Distance", val: `${Number(seg.relationship.distance ?? 0).toFixed(0)} mi` },
                    { label: "Time",     val: `${Number(seg.relationship.timeTaken ?? 0).toFixed(1)} h`  },
                    { label: "Cost",     val: `$${Number(seg.relationship.moneyCost ?? 0).toFixed(0)}`   },
                    { label: "CO₂",      val: `${Number(seg.relationship.co2Emission ?? 0).toFixed(1)} kg` },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ fontSize: 10, color: "#4a5568" }}>
                      {label}: <span style={{ color: "#94a3b8" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {totals && (
            <div style={{ padding: "10px 11px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 8, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Totals</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
                {[
                  { label: "Distance", val: `${totals.distance.toFixed(0)} mi`,     icon: "📏" },
                  { label: "Time",     val: `${totals.timeTaken.toFixed(1)} h`,       icon: "⏱️" },
                  { label: "Cost",     val: `$${totals.moneyCost.toFixed(0)}`,        icon: "💰" },
                  { label: "CO₂",      val: `${totals.co2Emission.toFixed(1)} kg`,    icon: "🌱" },
                ].map(({ label, val, icon }) => (
                  <div key={label} style={{ fontSize: 12, color: "#c8d8f0" }}>
                    <span style={{ marginRight: 4 }}>{icon}</span>
                    <span style={{ fontWeight: 700 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison view */}
      {comparisons && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>All-Route Comparison</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {OPT.map(({ key, label, icon }) => {
              const r = comparisons[key];
              if (!r) return (
                <div key={key} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#3d4f66" }}>{icon} {label}</div>
                  <div style={{ fontSize: 10, color: "#3d4f66", marginTop: 4 }}>No path</div>
                </div>
              );
              const s = sumPath(r.pathNodes ?? []);
              const keyVal = key === "distance" ? `${s.distance.toFixed(0)} mi`
                : key === "timeTaken"   ? `${s.timeTaken.toFixed(1)} h`
                : key === "moneyCost"   ? `$${s.moneyCost.toFixed(0)}`
                : `${s.co2Emission.toFixed(1)} kg`;
              const isActive = key === optPriority[0];
              return (
                <div key={key} style={{ padding: "9px 10px", background: isActive ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: isActive ? "#60a5fa" : "#4a5568", marginBottom: 4 }}>{icon} {label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isActive ? "#e2f0ff" : "#94a3b8", marginBottom: 4 }}>{keyVal}</div>
                  <div style={{ fontSize: 9, color: "#3d4f66", lineHeight: 1.4 }}>
                    {`${s.distance.toFixed(0)}mi · $${s.moneyCost.toFixed(0)} · ${s.timeTaken.toFixed(1)}h · ${s.co2Emission.toFixed(0)}kg`}
                  </div>
                  <div style={{ fontSize: 9, color: "#2d3f55", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {routeString(r.pathNodes ?? [])}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Node Inspector ────────────────────────────────────────────────────────────
function NodeInspector({ node, nodeTypes, onDone, onDeleted }: { node: any; nodeTypes: NodeTypeDef[]; onDone: () => void; onDeleted: () => void }) {
  const [id,      setId]      = useState<string>(node.id ?? "");
  const [address, setAddress] = useState<string>(node.address ?? "");
  const [type,    setType]    = useState<string>(node.type ?? nodeTypes[0]?.key ?? "factory");
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/updateNode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldId: node.id, id: id.trim(), address: address.trim(), type, allTypeKeys: nodeTypes.map(n => n.key) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDone();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete node "${node.id}" and all its routes?`)) return;
    try {
      const res = await fetch("/api/deleteNode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: node.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDeleted();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const currentDef = nodeTypes.find(n => n.key === node.type);

  return (
    <div>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", fontSize: 12, marginBottom: 14, padding: 0 }}>← Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{currentDef?.icon ?? "📦"}</span>
        <div>
          <div style={{ color: "#e2f0ff", fontWeight: 700, fontSize: 14 }}>{node.id}</div>
          <div style={{ color: currentDef?.stroke ?? "#888", fontSize: 11 }}>{node.type}</div>
        </div>
      </div>
      <div style={fld}>
        <span style={lbl}>Type</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {nodeTypes.map(nt => (
            <button key={nt.key} onClick={() => setType(nt.key)} style={{ ...iconBtn(type === nt.key, nt.stroke), minWidth: 52 }}>
              <span style={{ fontSize: 15 }}>{nt.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 700 }}>{nt.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={fld}>
        <span style={lbl}>Name / ID</span>
        <input style={inp} value={id} onChange={e => setId(e.target.value)} />
      </div>
      <div style={fld}>
        <span style={lbl}>Address</span>
        <input style={inp} value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <button style={{ ...primaryBtn, marginBottom: 8 }} onClick={save} disabled={saving}>{saving ? "SAVING…" : "SAVE CHANGES"}</button>
      <button style={dangerBtn} onClick={del}>DELETE NODE</button>
    </div>
  );
}

// ─── Edge Inspector ────────────────────────────────────────────────────────────
function EdgeInspector({ link, edgeTypes, onDone, onDeleted }: { link: any; edgeTypes: EdgeTypeDef[]; onDone: () => void; onDeleted: () => void }) {
  const srcId = typeof link.source === "object" ? link.source.id : link.source;
  const tgtId = typeof link.target === "object" ? link.target.id : link.target;

  const [transport, setTransport] = useState(link.transportType ?? edgeTypes[0]?.key ?? "trucks");
  const [distance,  setDistance]  = useState(String(link.distance ?? 0));
  const [cost,      setCost]      = useState(String(link.moneyCost ?? 0));
  const [time,      setTime]      = useState(String(link.timeTaken ?? 0));
  const [co2,       setCo2]       = useState(String(link.co2Emission ?? 0));
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/updateEdge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementId: link.elementId, distance: Number(distance), moneyCost: Number(cost), transportType: transport, co2Emission: Number(co2), timeTaken: Number(time) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDone();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm("Delete this route?")) return;
    try {
      const res = await fetch("/api/deleteEdge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementId: link.elementId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDeleted();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const currentDef = edgeTypes.find(e => e.key === link.transportType);

  return (
    <div>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", fontSize: 12, marginBottom: 14, padding: 0 }}>← Back</button>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#e2f0ff", fontWeight: 600, marginBottom: 3 }}>
          <span style={{ color: "#38bdf8" }}>{srcId}</span>
          <span style={{ color: "#3d4f66", margin: "0 6px" }}>→</span>
          <span style={{ color: "#38bdf8" }}>{tgtId}</span>
        </div>
        <div style={{ fontSize: 11, color: "#4a5568" }}>
          {currentDef?.icon ?? "🚚"} {link.transportType} · {link.distance} mi · ${link.moneyCost}
        </div>
      </div>
      <div style={fld}>
        <span style={lbl}>Transport Type</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {edgeTypes.map(et => (
            <button key={et.key} onClick={() => setTransport(et.key)} style={{ ...iconBtn(transport === et.key), minWidth: 52 }}>
              <span style={{ fontSize: 16 }}>{et.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 700 }}>{et.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Distance (mi)</span>
          <input style={inp} value={distance} onChange={e => setDistance(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Cost ($)</span>
          <input style={inp} value={cost} onChange={e => setCost(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Time (h)</span>
          <input style={inp} value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>CO₂ (kg)</span>
          <input style={inp} value={co2} onChange={e => setCo2(e.target.value)} />
        </div>
      </div>
      <button style={{ ...primaryBtn, marginBottom: 8 }} onClick={save} disabled={saving}>{saving ? "SAVING…" : "SAVE CHANGES"}</button>
      <button style={dangerBtn} onClick={del}>DELETE ROUTE</button>
    </div>
  );
}

// ─── Types Manager ─────────────────────────────────────────────────────────────
const SHAPES = ["hexagon", "roundrect", "circle", "diamond"] as const;
const SHAPE_ICONS: Record<string, string> = { hexagon: "⬡", roundrect: "▭", circle: "●", diamond: "◆" };

function TypesManager({
  nodeTypes, edgeTypes, onNodeTypesChange, onEdgeTypesChange,
}: {
  nodeTypes: NodeTypeDef[];
  edgeTypes: EdgeTypeDef[];
  onNodeTypesChange: (v: NodeTypeDef[]) => void;
  onEdgeTypesChange: (v: EdgeTypeDef[]) => void;
}) {
  const [editingNode, setEditingNode] = useState<NodeTypeDef | null>(null);
  const [editingEdge, setEditingEdge] = useState<EdgeTypeDef | null>(null);
  const [isNewNode,   setIsNewNode]   = useState(false);
  const [isNewEdge,   setIsNewEdge]   = useState(false);

  // ── Node type form ──────────────────────────────────────────────────────────
  const NodeForm = () => {
    if (!editingNode) return null;
    const set = (patch: Partial<NodeTypeDef>) => setEditingNode({ ...editingNode, ...patch });
    const save = () => {
      if (!editingNode.key.trim() || !editingNode.label.trim()) { alert("Key and label required"); return; }
      const safeKey = editingNode.key.replace(/[^a-zA-Z0-9_]/g, "");
      if (!safeKey) { alert("Key must be alphanumeric"); return; }
      const updated = { ...editingNode, key: safeKey };
      if (isNewNode) {
        onNodeTypesChange([...nodeTypes, updated]);
      } else {
        onNodeTypesChange(nodeTypes.map(n => n.key === editingNode.key ? updated : n));
      }
      setEditingNode(null);
    };
    return (
      <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, marginBottom: 10 }}>{isNewNode ? "New Node Type" : "Edit Node Type"}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Key (ID)</span>
            <input style={inp} value={editingNode.key} onChange={e => set({ key: e.target.value })} placeholder="power_plant" disabled={!isNewNode} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Label</span>
            <input style={inp} value={editingNode.label} onChange={e => set({ label: e.target.value })} placeholder="Power Plant" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Icon (emoji)</span>
            <input style={inp} value={editingNode.icon} onChange={e => set({ icon: e.target.value })} placeholder="⚡" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Shape</span>
            <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
              {SHAPES.map(sh => (
                <button key={sh} onClick={() => set({ shape: sh })}
                  style={{ flex: 1, padding: "5px 2px", borderRadius: 6, border: `1px solid ${editingNode.shape === sh ? "#60a5fa" : "rgba(255,255,255,0.08)"}`, background: editingNode.shape === sh ? "rgba(96,165,250,0.15)" : "transparent", color: editingNode.shape === sh ? "#60a5fa" : "#4a5568", cursor: "pointer", fontSize: 12 }}>
                  {SHAPE_ICONS[sh]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={lbl}>Color</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {TYPE_COLORS.map((c, i) => (
              <button key={i} onClick={() => set({ fill: c.fill, stroke: c.stroke, rgb: c.rgb })}
                style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${editingNode.stroke === c.stroke ? "#fff" : "transparent"}`, background: c.stroke, cursor: "pointer" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ ...primaryBtn, flex: 2, padding: "8px" }} onClick={save}>SAVE</button>
          <button onClick={() => setEditingNode(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#4a5568", cursor: "pointer", fontSize: 11 }}>Cancel</button>
        </div>
      </div>
    );
  };

  // ── Edge type form ──────────────────────────────────────────────────────────
  const EdgeForm = () => {
    if (!editingEdge) return null;
    const set = (patch: Partial<EdgeTypeDef>) => setEditingEdge({ ...editingEdge, ...patch });
    const save = () => {
      if (!editingEdge.key.trim() || !editingEdge.label.trim()) { alert("Key and label required"); return; }
      const safeKey = editingEdge.key.replace(/[^a-zA-Z0-9_]/g, "");
      if (!safeKey) { alert("Key must be alphanumeric"); return; }
      const updated = { ...editingEdge, key: safeKey };
      if (isNewEdge) {
        onEdgeTypesChange([...edgeTypes, updated]);
      } else {
        onEdgeTypesChange(edgeTypes.map(e => e.key === editingEdge.key ? updated : e));
      }
      setEditingEdge(null);
    };
    return (
      <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, marginBottom: 10 }}>{isNewEdge ? "New Edge Type" : "Edit Edge Type"}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Key (ID)</span>
            <input style={inp} value={editingEdge.key} onChange={e => set({ key: e.target.value })} placeholder="pipeline" disabled={!isNewEdge} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Label</span>
            <input style={inp} value={editingEdge.label} onChange={e => set({ label: e.target.value })} placeholder="Pipeline" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Icon (emoji)</span>
            <input style={inp} value={editingEdge.icon} onChange={e => set({ icon: e.target.value })} placeholder="🔧" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={lbl}>Speed (mph)</span>
            <input style={inp} value={editingEdge.speedMph} onChange={e => set({ speedMph: Number(e.target.value) })} placeholder="55" />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={lbl}>CO₂ (kg / tonne-mile)</span>
          <input style={inp} value={editingEdge.co2PerTonneMile} onChange={e => set({ co2PerTonneMile: Number(e.target.value) })} placeholder="0.1661" />
          <div style={{ fontSize: 9, color: "#2d3f55", marginTop: 3 }}>DEFRA defaults: truck 0.1661 · plane 1.7916 · train 0.0451 · EV 0.0346</div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4a5568", cursor: "pointer" }}>
            <input type="checkbox" checked={editingEdge.isFuelDependent} onChange={e => set({ isFuelDependent: e.target.checked })} />
            Fuel-dependent cost
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4a5568", cursor: "pointer" }}>
            <input type="checkbox" checked={editingEdge.isCongestionDependent} onChange={e => set({ isCongestionDependent: e.target.checked })} />
            Congestion-dependent time
          </label>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ ...primaryBtn, flex: 2, padding: "8px" }} onClick={save}>SAVE</button>
          <button onClick={() => setEditingEdge(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#4a5568", cursor: "pointer", fontSize: 11 }}>Cancel</button>
        </div>
      </div>
    );
  };

  const sectionHead = (text: string) => (
    <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 8 }}>{text}</div>
  );

  const typeChip = (label: string, icon: string, stroke: string, onEdit: () => void, onDelete: () => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "rgba(255,255,255,0.03)", border: `1px solid ${stroke}33`, borderRadius: 7, marginBottom: 5 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 11, color: stroke }}>{label}</span>
      <button onClick={onEdit} title="Edit" style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 5, cursor: "pointer",
        border: "1px solid rgba(96,165,250,0.25)",
        background: "rgba(96,165,250,0.08)", color: "#60a5fa",
        fontSize: 10, fontWeight: 600, lineHeight: 1,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        Edit
      </button>
      <button onClick={onDelete} title="Delete" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22, borderRadius: 5, cursor: "pointer",
        border: "1px solid rgba(239,68,68,0.2)",
        background: "rgba(239,68,68,0.06)", color: "#ef4444aa",
        fontSize: 11, lineHeight: 1, padding: 0,
      }}>✕</button>
    </div>
  );

  return (
    <div>
      {/* Node types */}
      <div style={{ marginBottom: 18 }}>
        {sectionHead("Node Types")}
        {NodeForm()}
        {!editingNode && nodeTypes.map(nt =>
          typeChip(nt.label, nt.icon, nt.stroke,
            () => { setEditingNode({ ...nt }); setIsNewNode(false); },
            () => { if (nodeTypes.length <= 1) { alert("Need at least one node type"); return; } if (confirm(`Delete node type "${nt.label}"?`)) onNodeTypesChange(nodeTypes.filter(n => n.key !== nt.key)); }
          )
        )}
        {!editingNode && (
          <button onClick={() => { setEditingNode({ key: "", label: "", icon: "📦", fill: TYPE_COLORS[0].fill, stroke: TYPE_COLORS[0].stroke, rgb: TYPE_COLORS[0].rgb, shape: "circle" }); setIsNewNode(true); }}
            style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: "#3d4f66", cursor: "pointer", fontSize: 11 }}>
            + Add Node Type
          </button>
        )}
      </div>

      {/* Edge types */}
      <div>
        {sectionHead("Edge Types")}
        {EdgeForm()}
        {!editingEdge && edgeTypes.map(et =>
          typeChip(et.label, et.icon, "#38bdf8",
            () => { setEditingEdge({ ...et }); setIsNewEdge(false); },
            () => { if (edgeTypes.length <= 1) { alert("Need at least one edge type"); return; } if (confirm(`Delete edge type "${et.label}"?`)) onEdgeTypesChange(edgeTypes.filter(e => e.key !== et.key)); }
          )
        )}
        {!editingEdge && (
          <button onClick={() => { setEditingEdge({ key: "", label: "", icon: "🔗", co2PerTonneMile: 0.1661, speedMph: 55, isFuelDependent: false, isCongestionDependent: false }); setIsNewEdge(true); }}
            style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: "#3d4f66", cursor: "pointer", fontSize: 11 }}>
            + Add Edge Type
          </button>
        )}
      </div>

      {/* Reset */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={() => { if (confirm("Reset all types to defaults?")) { onNodeTypesChange(DEFAULT_NODE_TYPES); onEdgeTypesChange(DEFAULT_EDGE_TYPES); } }}
          style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)", color: "#ef444488", cursor: "pointer", fontSize: 10 }}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar shell ─────────────────────────────────────────────────────────────
const SIDEBAR_MIN = 230;
const SIDEBAR_MAX = 540;
const SIDEBAR_DEFAULT = 295;

type SidebarProps = {
  refreshKey: number;
  onDataChanged: () => void;
  onClearGraph: () => void;
  onRefreshGraph: () => void;
  onSelectionChange: (from: string | null, to: string | null) => void;
  onPathFound: (path: ActivePath) => void;
  selectedNode?: any;
  selectedLink?: any;
  onClearInspector: () => void;
  conditions: Conditions;
  onConditionsChange: (c: Conditions) => void;
  nodeTypes: NodeTypeDef[];
  edgeTypes: EdgeTypeDef[];
  onNodeTypesChange: (v: NodeTypeDef[]) => void;
  onEdgeTypesChange: (v: EdgeTypeDef[]) => void;
  onWidthChange?: (w: number) => void;
  isGuest?: boolean;
};

export default function Sidebar({
  refreshKey, onDataChanged, onClearGraph, onRefreshGraph,
  onSelectionChange, onPathFound,
  selectedNode, selectedLink, onClearInspector,
  conditions, onConditionsChange,
  nodeTypes, edgeTypes, onNodeTypesChange, onEdgeTypesChange,
  onWidthChange, isGuest,
}: SidebarProps) {
  const [open,  setOpen]  = useState(true);
  const [tab,   setTab]   = useState<Tab>("node");
  const { signOut } = useClerk();
  const [width, setWidth] = useState(SIDEBAR_DEFAULT);
  const widthRef = useRef(SIDEBAR_DEFAULT);
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;
    setResizing(true);
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW + (startX - ev.clientX)));
      widthRef.current = newW;
      setWidth(newW);
      onWidthChange?.(newW);
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onWidthChange]);

  const showInspector = !!(selectedNode || selectedLink);
  const handleInspectorDone = () => { onClearInspector(); onDataChanged(); };
  const handleDeleted       = () => { onClearInspector(); onDataChanged(); };

  const tabs: { key: Tab; label: string }[] = [
    { key: "node",  label: "Node"  },
    { key: "route", label: "Route" },
    { key: "path",  label: "Path"  },
    { key: "types", label: "Types" },
  ];

  if (!open) return (
    <button onClick={() => setOpen(true)} title="Open controls" style={{
      position: "fixed", top: 20, right: 20, zIndex: 1000,
      width: 44, height: 44, borderRadius: 10,
      background: "rgba(7,9,15,0.9)", color: "#c8d8f0",
      border: "1px solid rgba(255,255,255,0.08)",
      cursor: "pointer", fontSize: 18, backdropFilter: "blur(10px)",
    }}>☰</button>
  );

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width, height: "100vh",
      background: "rgba(7,9,15,0.95)", backdropFilter: "blur(16px)",
      borderLeft: "1px solid rgba(255,255,255,0.05)", color: "#c8d8f0",
      display: "flex", flexDirection: "column", zIndex: 999,
      boxShadow: "-8px 0 48px rgba(0,0,0,0.7)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      userSelect: resizing ? "none" : undefined,
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        title="Drag to resize"
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 6,
          cursor: "col-resize", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: resizing ? "rgba(96,165,250,0.15)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        <div style={{
          width: 2, height: 40, borderRadius: 2,
          background: resizing ? "rgba(96,165,250,0.7)" : "rgba(255,255,255,0.08)",
          transition: "background 0.15s",
        }} />
      </div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 3, color: "#e8f0ff" }}>ASTRAPATH</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: "#2d3f55", letterSpacing: 0.8 }}>Supply Chain Graph</span>
            {isGuest && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                padding: "1px 6px", borderRadius: 4,
                background: "rgba(251,191,36,0.1)", color: "#fbbf24",
                border: "1px solid rgba(251,191,36,0.25)",
              }}>GUEST</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => {
              if (isGuest) {
                document.cookie = "guestId=; path=/; Max-Age=0";
                window.location.href = "/login";
              } else {
                signOut({ redirectUrl: "/login" });
              }
            }}
            title={isGuest ? "Exit guest session" : "Sign out"}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 9px", borderRadius: 6, cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)", color: "#3d4f66",
              fontSize: 10, fontWeight: 600,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {isGuest ? "Exit" : "Sign out"}
          </button>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#2d3f55", cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" }}>
        {nodeTypes.map(nt => (
          <div key={nt.key} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#3d4f66" }}>
            <span style={{ color: nt.stroke, fontSize: 11 }}>{SHAPE_ICONS[nt.shape] ?? "●"}</span>{nt.label}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#2d3f55" }}>click to edit</div>
      </div>

      {/* Inspector or tabs */}
      {showInspector ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {selectedNode && <NodeInspector node={selectedNode} nodeTypes={nodeTypes} onDone={handleInspectorDone} onDeleted={handleDeleted} />}
          {selectedLink && !selectedNode && <EdgeInspector link={selectedLink} edgeTypes={edgeTypes} onDone={handleInspectorDone} onDeleted={handleDeleted} />}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "10px 2px", background: "none", border: "none",
                borderBottom: `2px solid ${tab === key ? "#2563eb" : "transparent"}`,
                color: tab === key ? "#60a5fa" : "#2d3f55",
                cursor: "pointer", fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {tab === "node"  && <AddNodeForm  onDone={onDataChanged} nodeTypes={nodeTypes} />}
            {tab === "route" && <AddRouteForm onDone={onDataChanged} refreshKey={refreshKey} edgeTypes={edgeTypes} />}
            {tab === "path"  && <FindPathForm onSelectionChange={onSelectionChange} onPathFound={onPathFound} conditions={conditions} onConditionsChange={onConditionsChange} edgeTypes={edgeTypes} />}
            {tab === "types" && <TypesManager nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodeTypesChange={onNodeTypesChange} onEdgeTypesChange={onEdgeTypesChange} />}
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
        <button onClick={onRefreshGraph} style={{
          flex: 1, padding: "9px", borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)",
          color: "#3d4f66", cursor: "pointer", fontSize: 11, fontWeight: 600,
        }}>↺ Refresh</button>
        <button onClick={onClearGraph} style={{
          flex: 1, padding: "9px", borderRadius: 7,
          border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.05)",
          color: "#ef4444", cursor: "pointer", fontSize: 11, fontWeight: 600,
        }}>✕ Clear</button>
      </div>
    </div>
  );
}
