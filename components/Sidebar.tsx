import React, { useState, useEffect } from "react";
import { ActivePath } from "./GraphVisualizer";

type OptMode = "distance" | "co2Emission" | "moneyCost" | "timeTaken";
type Tab = "node" | "route" | "path";
type NodeKind = "factory" | "warehouse" | "endpoint";
type Transport = "trucks" | "plane" | "train" | "EV";

const co2rates: Record<string, number> = { trucks: 1.3, plane: 53, train: 0.17, EV: 0 };
const speeds:   Record<string, number> = { trucks: 55,  plane: 550, train: 75,  EV: 55 };

const NODE_COLORS: Record<NodeKind, { border: string; bg: string; text: string }> = {
  factory:   { border: "#f59e0b", bg: "rgba(245,158,11,0.18)",  text: "#fbbf24" },
  warehouse: { border: "#3b82f6", bg: "rgba(59,130,246,0.18)",  text: "#60a5fa" },
  endpoint:  { border: "#8b5cf6", bg: "rgba(139,92,246,0.18)", text: "#a78bfa" },
};

const NODE_ICON: Record<string, string> = { factory: "🏭", warehouse: "🏢", endpoint: "📍" };
const TRANSPORT_ICON: Record<string, string> = { trucks: "🚛", plane: "✈️", train: "🚂", EV: "⚡" };

const OPT: { key: OptMode; label: string; icon: string; unit: string }[] = [
  { key: "distance",    label: "Shortest",  icon: "📏", unit: "mi"  },
  { key: "timeTaken",   label: "Fastest",   icon: "⏱️", unit: "h"   },
  { key: "moneyCost",   label: "Cheapest",  icon: "💰", unit: "$"   },
  { key: "co2Emission", label: "Greenest",  icon: "🌱", unit: "kg"  },
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 7,
  color: "#c8d8f0", padding: "8px 11px", fontSize: 13, outline: "none",
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

function iconBtn(active: boolean, colors?: { border: string; bg: string; text: string }): React.CSSProperties {
  return {
    flex: 1, padding: "8px 4px", borderRadius: 8,
    border: `1.5px solid ${active ? (colors?.border ?? "#2563eb") : "rgba(255,255,255,0.07)"}`,
    background: active ? (colors?.bg ?? "rgba(37,99,235,0.15)") : "transparent",
    color: active ? (colors?.text ?? "#60a5fa") : "#3d4f66",
    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
  };
}

// ─── Add Node ──────────────────────────────────────────────────────────────────
function AddNodeForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<NodeKind | null>(null);
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
        <div style={{ display: "flex", gap: 7 }}>
          {(["factory","warehouse","endpoint"] as NodeKind[]).map(k => (
            <button key={k} onClick={() => setKind(k)} style={iconBtn(kind === k, NODE_COLORS[k])}>
              <span style={{ fontSize: 18 }}>{NODE_ICON[k]}</span>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{k.toUpperCase()}</span>
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
function AddRouteForm({ onDone, refreshKey }: { onDone: () => void; refreshKey: number }) {
  const [nodes, setNodes] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [transport, setTransport] = useState<Transport>("trucks");
  const [distance, setDistance] = useState(0);
  const [cost, setCost] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    fetch("/api/getAllNodes").then(r => r.json()).then((data: any[]) => {
      const ids = Array.from(new Set<string>(data.map(n => n.id)));
      setNodes(ids);
      setStart(s => s || ids[0] || "");
      setEnd(e => e || ids[1] || "");
    }).catch(() => {});
  }, [refreshKey]);

  const submit = async () => {
    if (!start || !end) { alert("Choose origin and destination"); return; }
    if (start === end)  { alert("Origin and destination must differ"); return; }
    const co2  = distance * (co2rates[transport] ?? 0);
    const time = distance / (speeds[transport] ?? 55);
    try {
      const res = await fetch("/api/addEdge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: start, toId: end, co2Emission: co2, timeTaken: time, distance, moneyCost: cost, transportType: transport }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDistance(0); setCost(0);
      setFlash(true); setTimeout(() => setFlash(false), 2000);
      onDone();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  return (
    <div>
      <div style={fld}>
        <span style={lbl}>Transport</span>
        <div style={{ display: "flex", gap: 7 }}>
          {(["trucks","plane","train","EV"] as Transport[]).map(k => (
            <button key={k} onClick={() => setTransport(k)} style={iconBtn(transport === k)}>
              <span style={{ fontSize: 18 }}>{TRANSPORT_ICON[k]}</span>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{k.toUpperCase()}</span>
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
          <input style={inp} type="number" min={0} value={distance} onChange={e => setDistance(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Cost ($)</span>
          <input style={inp} type="number" min={0} value={cost} onChange={e => setCost(Number(e.target.value))} />
        </div>
      </div>
      <button style={primaryBtn} onClick={submit}>ADD ROUTE</button>
      {flash && <div style={{ color: "#4ade80", fontSize: 11, textAlign: "center", marginTop: 8 }}>Route added ✓</div>}
    </div>
  );
}

// ─── Route metrics helpers ─────────────────────────────────────────────────────
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
  const ids = [pathNodes[0].startNode.id, ...pathNodes.map((s: any) => s.endNode.id)];
  return ids.join(" → ");
}

// ─── Find Path ─────────────────────────────────────────────────────────────────
function FindPathForm({
  onSelectionChange, onPathFound,
}: {
  onSelectionChange: (from: string | null, to: string | null) => void;
  onPathFound: (path: ActivePath) => void;
}) {
  const [optMode,     setOptMode]     = useState<OptMode>("distance");
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [nodes,       setNodes]       = useState<string[]>([]);
  const [path,        setPath]        = useState<any>(null);
  const [comparisons, setComparisons] = useState<Record<OptMode, any> | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [comparing,   setComparing]   = useState(false);
  const [error,       setError]       = useState("");

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

  const runQuery = async (criteria: OptMode, fromId: string, toId: string) => {
    const res = await fetch("/api/findShortestPath", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startId: fromId, endId: toId, criteria }),
    });
    if (!res.ok) throw new Error("Path not found");
    const data = await res.json();
    return data[0] ?? null;
  };

  const submit = async () => {
    if (!from || !to) { alert("Enter both node IDs"); return; }
    setLoading(true); setError(""); clearPathOnly();
    try {
      const result = await runQuery(optMode, from, to);
      setPath(result);
      if (result) {
        const nodeSet = new Set<string>();
        const links: Array<{ source: string; target: string }> = [];
        result.pathNodes?.forEach((seg: any) => {
          nodeSet.add(seg.startNode.id); nodeSet.add(seg.endNode.id);
          links.push({ source: seg.startNode.id, target: seg.endNode.id });
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
      const results = await Promise.all(modes.map(m => runQuery(m, from, to).catch(() => null)));
      const cmp: any = {};
      modes.forEach((m, i) => { cmp[m] = results[i]; });
      setComparisons(cmp);
    } catch (e: any) { setError(e.message); }
    finally { setComparing(false); }
  };

  const totals = path ? sumPath(path.pathNodes ?? []) : null;

  return (
    <div>
      {/* Optimization mode toggle */}
      <div style={{ marginBottom: 14 }}>
        <span style={lbl}>Optimize for</span>
        <div style={{ display: "flex", gap: 6 }}>
          {OPT.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setOptMode(key)} style={iconBtn(optMode === key)}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* From / To */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>From</span>
          <select style={{ ...inp, borderColor: from ? "rgba(59,130,246,0.4)" : undefined }}
            value={from} onChange={e => updateFrom(e.target.value)}>
            {nodes.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, color: "#3d4f66" }}>→</div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>To</span>
          <select style={{ ...inp, borderColor: to ? "rgba(139,92,246,0.4)" : undefined }}
            value={to} onChange={e => updateTo(e.target.value)}>
            {nodes.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <button style={{ ...primaryBtn, flex: 2 }} onClick={submit} disabled={loading}>
          {loading ? "SEARCHING…" : "FIND PATH"}
        </button>
        <button
          onClick={compareAll} disabled={comparing}
          style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#6b7280", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
        >
          {comparing ? "…" : "Compare"}
        </button>
      </div>

      {error && <div style={{ color: "#f87171", fontSize: 11, marginTop: 8 }}>{error}</div>}

      {/* ── Active path breakdown ── */}
      {path && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8 }}>Route Found</span>
            <button onClick={clearResults} style={{ background: "none", border: "none", color: "#3d4f66", cursor: "pointer", fontSize: 11 }}>✕ Clear</button>
          </div>

          {/* Legs */}
          {path.pathNodes?.map((seg: any, i: number) => (
            <div key={i} style={{ padding: "9px 11px", marginBottom: 6, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ fontSize: 12, color: "#e2f0ff" }}>
                  <span style={{ color: "#38bdf8" }}>{seg.startNode.id}</span>
                  <span style={{ color: "#3d4f66", margin: "0 5px" }}>→</span>
                  <span style={{ color: "#38bdf8" }}>{seg.endNode.id}</span>
                </div>
                <span style={{ fontSize: 14 }}>{TRANSPORT_ICON[seg.relationship.transportType] ?? "🚚"}</span>
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
          ))}

          {/* Totals */}
          {totals && (
            <div style={{ padding: "10px 11px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 8, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Totals</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
                {[
                  { label: "Distance", val: `${totals.distance.toFixed(0)} mi`,        icon: "📏" },
                  { label: "Time",     val: `${totals.timeTaken.toFixed(1)} h`,          icon: "⏱️" },
                  { label: "Cost",     val: `$${totals.moneyCost.toFixed(0)}`,           icon: "💰" },
                  { label: "CO₂",      val: `${totals.co2Emission.toFixed(1)} kg`,       icon: "🌱" },
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

      {/* ── Comparison view ── */}
      {comparisons && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            All-Route Comparison
          </div>
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
              const isActive = key === optMode;
              return (
                <div key={key} style={{
                  padding: "9px 10px",
                  background: isActive ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8, cursor: "pointer",
                }} onClick={() => setOptMode(key)}>
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

// ─── Node Inspector (edit / delete) ───────────────────────────────────────────
function NodeInspector({ node, onDone, onDeleted }: { node: any; onDone: () => void; onDeleted: () => void }) {
  const [id,      setId]      = useState<string>(node.id ?? "");
  const [address, setAddress] = useState<string>(node.address ?? "");
  const [type,    setType]    = useState<NodeKind>((node.type as NodeKind) ?? "factory");
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/updateNode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldId: node.id, id: id.trim(), address: address.trim(), type }),
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

  return (
    <div>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", fontSize: 12, marginBottom: 14, padding: 0 }}>
        ← Back
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{NODE_ICON[node.type] ?? "📦"}</span>
        <div>
          <div style={{ color: "#e2f0ff", fontWeight: 700, fontSize: 14 }}>{node.id}</div>
          <div style={{ color: NODE_COLORS[node.type as NodeKind]?.text ?? "#888", fontSize: 11 }}>{node.type}</div>
        </div>
      </div>

      <div style={fld}>
        <span style={lbl}>Type</span>
        <div style={{ display: "flex", gap: 7 }}>
          {(["factory","warehouse","endpoint"] as NodeKind[]).map(k => (
            <button key={k} onClick={() => setType(k)} style={iconBtn(type === k, NODE_COLORS[k])}>
              <span style={{ fontSize: 15 }}>{NODE_ICON[k]}</span>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{k.toUpperCase()}</span>
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
      <button style={{ ...primaryBtn, marginBottom: 8 }} onClick={save} disabled={saving}>
        {saving ? "SAVING…" : "SAVE CHANGES"}
      </button>
      <button style={dangerBtn} onClick={del}>DELETE NODE</button>
    </div>
  );
}

// ─── Edge Inspector (edit / delete) ───────────────────────────────────────────
function EdgeInspector({ link, onDone, onDeleted }: { link: any; onDone: () => void; onDeleted: () => void }) {
  const srcId = typeof link.source === "object" ? link.source.id : link.source;
  const tgtId = typeof link.target === "object" ? link.target.id : link.target;

  const [transport, setTransport] = useState<Transport>((link.transportType as Transport) ?? "trucks");
  const [distance,  setDistance]  = useState<number>(Number(link.distance ?? 0));
  const [cost,      setCost]      = useState<number>(Number(link.moneyCost ?? 0));
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    setSaving(true);
    const co2  = distance * (co2rates[transport] ?? 0);
    const time = distance / (speeds[transport] ?? 55);
    try {
      const res = await fetch("/api/updateEdge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementId: link.elementId, distance, moneyCost: cost, transportType: transport, co2Emission: co2, timeTaken: time }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDone();
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete this route?`)) return;
    try {
      const res = await fetch("/api/deleteEdge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementId: link.elementId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onDeleted();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  return (
    <div>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", fontSize: 12, marginBottom: 14, padding: 0 }}>
        ← Back
      </button>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#e2f0ff", fontWeight: 600, marginBottom: 3 }}>
          <span style={{ color: "#38bdf8" }}>{srcId}</span>
          <span style={{ color: "#3d4f66", margin: "0 6px" }}>→</span>
          <span style={{ color: "#38bdf8" }}>{tgtId}</span>
        </div>
        <div style={{ fontSize: 11, color: "#4a5568" }}>
          {TRANSPORT_ICON[link.transportType] ?? "🚚"} {link.transportType} · {link.distance} mi · ${link.moneyCost}
        </div>
      </div>

      <div style={fld}>
        <span style={lbl}>Transport</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["trucks","plane","train","EV"] as Transport[]).map(k => (
            <button key={k} onClick={() => setTransport(k)} style={iconBtn(transport === k)}>
              <span style={{ fontSize: 16 }}>{TRANSPORT_ICON[k]}</span>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{k.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Distance (mi)</span>
          <input style={inp} type="number" min={0} value={distance} onChange={e => setDistance(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={lbl}>Cost ($)</span>
          <input style={inp} type="number" min={0} value={cost} onChange={e => setCost(Number(e.target.value))} />
        </div>
      </div>
      <button style={{ ...primaryBtn, marginBottom: 8 }} onClick={save} disabled={saving}>
        {saving ? "SAVING…" : "SAVE CHANGES"}
      </button>
      <button style={dangerBtn} onClick={del}>DELETE ROUTE</button>
    </div>
  );
}

// ─── Sidebar shell ─────────────────────────────────────────────────────────────
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
};

export default function Sidebar({
  refreshKey, onDataChanged, onClearGraph, onRefreshGraph,
  onSelectionChange, onPathFound,
  selectedNode, selectedLink, onClearInspector,
}: SidebarProps) {
  const [open, setOpen] = useState(true);
  const [tab,  setTab]  = useState<Tab>("node");

  const showInspector = !!(selectedNode || selectedLink);

  const handleInspectorDone = () => { onClearInspector(); onDataChanged(); };
  const handleDeleted       = () => { onClearInspector(); onDataChanged(); };

  const tabs: { key: Tab; label: string }[] = [
    { key: "node",  label: "Add Node"  },
    { key: "route", label: "Add Route" },
    { key: "path",  label: "Find Path" },
  ];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Open controls" style={{
        position: "fixed", top: 20, right: 20, zIndex: 1000,
        width: 44, height: 44, borderRadius: 10,
        background: "rgba(7,9,15,0.9)", color: "#c8d8f0",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer", fontSize: 18, backdropFilter: "blur(10px)",
      }}>
        ☰
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0,
      width: 295, height: "100vh",
      background: "rgba(7,9,15,0.95)",
      backdropFilter: "blur(16px)",
      borderLeft: "1px solid rgba(255,255,255,0.05)",
      color: "#c8d8f0",
      display: "flex", flexDirection: "column",
      zIndex: 999,
      boxShadow: "-8px 0 48px rgba(0,0,0,0.7)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 16px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 3, color: "#e8f0ff" }}>ASTRAPATH</div>
          <div style={{ fontSize: 10, color: "#2d3f55", letterSpacing: 0.8, marginTop: 2 }}>Supply Chain Graph</div>
        </div>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: "#2d3f55", cursor: "pointer", fontSize: 14, padding: 4,
        }}>✕</button>
      </div>

      {/* ── Node type legend ── */}
      <div style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {[
          { label: "Factory",   color: "#f59e0b", shape: "⬡" },
          { label: "Warehouse", color: "#3b82f6", shape: "▭" },
          { label: "Endpoint",  color: "#8b5cf6", shape: "●" },
        ].map(({ label, color, shape }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#3d4f66" }}>
            <span style={{ color, fontSize: 11 }}>{shape}</span>{label}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#2d3f55" }}>click to edit</div>
      </div>

      {/* ── Inspector or tab content ── */}
      {showInspector ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {selectedNode && (
            <NodeInspector node={selectedNode} onDone={handleInspectorDone} onDeleted={handleDeleted} />
          )}
          {selectedLink && !selectedNode && (
            <EdgeInspector link={selectedLink} onDone={handleInspectorDone} onDeleted={handleDeleted} />
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "11px 4px",
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === key ? "#2563eb" : "transparent"}`,
                color: tab === key ? "#60a5fa" : "#2d3f55",
                cursor: "pointer", fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.6,
              }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {tab === "node"  && <AddNodeForm  onDone={onDataChanged} />}
            {tab === "route" && <AddRouteForm onDone={onDataChanged} refreshKey={refreshKey} />}
            {tab === "path"  && <FindPathForm onSelectionChange={onSelectionChange} onPathFound={onPathFound} />}
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
        <button onClick={onRefreshGraph} style={{
          flex: 1, padding: "9px", borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.03)",
          color: "#3d4f66", cursor: "pointer", fontSize: 11, fontWeight: 600,
        }}>
          ↺ Refresh
        </button>
        <button onClick={onClearGraph} style={{
          flex: 1, padding: "9px", borderRadius: 7,
          border: "1px solid rgba(239,68,68,0.2)",
          background: "rgba(239,68,68,0.04)",
          color: "#7f3030", cursor: "pointer", fontSize: 11, fontWeight: 600,
        }}>
          ✕ Clear
        </button>
      </div>
    </div>
  );
}
