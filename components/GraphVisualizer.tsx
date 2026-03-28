import React, { useEffect, useRef, useState } from "react";
import { ForceGraph2D } from "react-force-graph";
import { Conditions } from "../pages/index";
import { NodeTypeDef, EdgeTypeDef, DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES } from "../lib/types";

type GraphData = {
  nodes: { id: string; name?: string; [key: string]: any }[];
  links: { source: string; target: string; type?: string }[];
};

export type ActivePath = {
  nodes: string[];
  links: Array<{ source: string; target: string; elementId?: string }>;
} | null;

const DEFAULT_CFG = { fill: "#1e293b", stroke: "#475569", rgb: [71, 85, 105] as [number,number,number], shape: "circle" as const };

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
            : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r: number) {
  const x = cx - w / 2, y = cy - h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, r: number) {
  if (shape === "hexagon")   drawHexagon(ctx, x, y, r);
  else if (shape === "roundrect") drawRoundedRect(ctx, x, y, r * 2.1, r * 1.55, r * 0.2);
  else if (shape === "diamond")   drawDiamond(ctx, x, y, r);
  else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
}

// ── Component ──────────────────────────────────────────────────────────────────
const GraphVisualizer: React.FC<{
  refreshKey?: number;
  onDataChanged?: () => void;
  selectedOrigin?: string | null;
  selectedDestination?: string | null;
  activePath?: ActivePath;
  selectedEditId?: string | null;
  selectedLink?: any;
  onNodeClick?: (node: any) => void;
  onLinkClick?: (link: any) => void;
  conditions?: Conditions;
  nodeTypes?: NodeTypeDef[];
  edgeTypes?: EdgeTypeDef[];
  sidebarWidth?: number;
}> = ({ refreshKey, onDataChanged, selectedOrigin, selectedDestination, activePath,
        selectedEditId, selectedLink, onNodeClick, onLinkClick, conditions, nodeTypes, edgeTypes, sidebarWidth }) => {

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const fetchGraph = () => {
    fetch("/api/getGraph").then(r => r.json()).then(data => {
      if (data.error) { setError(data.error); return; }
      setError(null);
      const rad = Math.min(dimensions.width, dimensions.height) * 0.27;
      data.nodes.forEach((node: any, i: number) => {
        const angle = (i / data.nodes.length) * 2 * Math.PI;
        node.x = Math.cos(angle) * rad; node.y = Math.sin(angle) * rad;
        node.fx = node.x; node.fy = node.y;
      });
      const pairCount: Record<string, number> = {};
      const pairIndex: Record<string, number> = {};
      data.links.forEach((link: any) => {
        pairCount[`${link.source}--${link.target}`] = (pairCount[`${link.source}--${link.target}`] ?? 0) + 1;
      });
      data.links.forEach((link: any) => {
        const key = `${link.source}--${link.target}`;
        const rev = `${link.target}--${link.source}`;
        const idx = pairIndex[key] ?? 0;
        link.curvature = (pairCount[key] === 1 && !pairCount[rev]) ? 0 : 0.3 + idx * 0.25;
        pairIndex[key] = idx + 1;
      });
      setGraphData(data);
      setTimeout(() => fgRef.current?.zoomToFit(400, 60), 50);
    }).catch(err => setError(err.message));
  };

  useEffect(() => { fetchGraph(); }, [refreshKey]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const nodeId = (n: any): string => (typeof n === "object" ? n?.id : n) ?? "";

  const linkOnPath = (link: any): boolean => {
    if (!activePath) return false;
    const s = nodeId(link.source), t = nodeId(link.target);
    return activePath.links.some(l => {
      if (l.elementId && link.elementId) return l.elementId === link.elementId;
      return l.source === s && l.target === t;
    });
  };

  const isLinkSelected = (link: any): boolean => {
    if (!selectedLink) return false;
    if (selectedLink.elementId && link.elementId) return selectedLink.elementId === link.elementId;
    const s = nodeId(link.source), t = nodeId(link.target);
    const ss = typeof selectedLink.source === "object" ? selectedLink.source?.id : selectedLink.source;
    const st = typeof selectedLink.target === "object" ? selectedLink.target?.id : selectedLink.target;
    return s === ss && t === st;
  };

  const linkColor = (link: any) => {
    if (isLinkSelected(link)) return "#fbbf24";
    return !activePath ? "rgba(120,150,200,0.55)" : linkOnPath(link) ? "#38bdf8" : "rgba(50,60,80,0.1)";
  };

  const linkWidth = (link: any) => {
    if (isLinkSelected(link)) return 4;
    return !activePath ? 2 : linkOnPath(link) ? 3.5 : 0.8;
  };

  // Build lookup maps from the current type definitions
  const nodeCfgMap = (nodeTypes ?? DEFAULT_NODE_TYPES).reduce<Record<string, NodeTypeDef>>((m, t) => {
    m[t.key] = t; return m;
  }, {});
  const edgeCfgMap = (edgeTypes ?? DEFAULT_EDGE_TYPES).reduce<Record<string, EdgeTypeDef>>((m, t) => {
    m[t.key] = t; return m;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {error && (
        <div style={{
          position: "absolute", top: 14, left: 14, zIndex: 10,
          color: "#fca5a5", background: "rgba(0,0,0,0.75)",
          padding: "6px 14px", borderRadius: 8, fontSize: 12,
          border: "1px solid rgba(239,68,68,0.3)",
        }}>{error}</div>
      )}
      <div ref={containerRef} style={{ height: "100%", width: "100%", background: "#07090f" }}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width - (sidebarWidth ?? 295)}
          height={dimensions.height}
          cooldownTime={Infinity}
          nodeLabel={(node: any) => `${node.id}${node.address ? " · " + node.address : ""}`}
          linkLabel=""
          linkCurvature="curvature"
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalArrowLength={13}
          linkDirectionalArrowRelPos={0.82}
          linkDirectionalArrowColor={linkColor}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const typeKey: string = node.type ?? "default";
            const def = nodeCfgMap[typeKey];
            const cfg = def ?? DEFAULT_CFG;
            const [r, g, b] = cfg.rgb;
            const shape = def?.shape ?? "circle";

            const isOrigin   = node.id === selectedOrigin;
            const isDest     = node.id === selectedDestination;
            const isSelected = isOrigin || isDest;
            const onPath     = !activePath || activePath.nodes.includes(node.id);
            const dimmed     = !!activePath && !onPath;

            const fontSize = Math.max(11 / globalScale, 2.5);
            const lines    = [node.id, node.address ?? ""].filter(Boolean);
            const lineH    = fontSize * 1.35;
            const pad      = fontSize * 0.75;

            const maxW = Math.max(...lines.map((l, i) => {
              ctx.font = i === 0 ? `bold ${fontSize}px Sans-Serif` : `${fontSize * 0.78}px Sans-Serif`;
              return ctx.measureText(l).width;
            }));
            const radius = Math.max(maxW / 2 + pad, lines.length * lineH / 2 + pad);
            node.__r = radius;

            ctx.save();
            ctx.globalAlpha = dimmed ? 0.08 : 1;

            if (node.id === selectedEditId) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5 / globalScale, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255,255,255,0.85)";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            if (isSelected && !dimmed) {
              const now = Date.now();
              for (const offset of [0, 900]) {
                const t = ((now + offset) % 1800) / 1800;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius * (1 + t * 1.1), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - t) * 0.6})`;
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }
            }

            if (!dimmed) {
              ctx.shadowColor = cfg.stroke;
              ctx.shadowBlur  = onPath && activePath ? 20 : isSelected ? 15 : 7;
            }

            drawShape(ctx, shape, node.x, node.y, radius);
            ctx.fillStyle   = cfg.fill;
            ctx.fill();
            ctx.strokeStyle = cfg.stroke;
            ctx.lineWidth   = (isSelected ? 2.5 : 1.5) / globalScale;
            ctx.stroke();
            ctx.shadowBlur  = 0;

            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            const totalH = lines.length * lineH;
            lines.forEach((line, i) => {
              ctx.font      = i === 0 ? `bold ${fontSize}px Sans-Serif` : `${fontSize * 0.78}px Sans-Serif`;
              ctx.fillStyle = i === 0 ? "#f0f6ff" : "rgba(200,220,255,0.6)";
              ctx.fillText(line, node.x, node.y - totalH / 2 + lineH * i + lineH / 2);
            });
            ctx.restore();
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const typeKey = (node.type as string) ?? "default";
            const shape = nodeCfgMap[typeKey]?.shape ?? "circle";
            const r = node.__r ?? 20;
            ctx.fillStyle = color;
            drawShape(ctx, shape, node.x, node.y, r);
            ctx.fill();
          }}
          onNodeClick={(node: any) => onNodeClick?.(node)}
          onLinkClick={(link: any) => onLinkClick?.(link)}
          onNodeDragEnd={(node: any) => { node.fx = node.x; node.fy = node.y; }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            const onPath = linkOnPath(link);
            if (activePath && !onPath) return;

            const start = link.source, end = link.target;
            if (!start?.x || !end?.x) return;

            const transportKey = link.transportType ?? "";
            const edgeDef = edgeCfgMap[transportKey];

            // Condition multipliers
            const fi = conditions?.fuelIndex ?? 1;
            const cg = conditions?.congestion ?? 1;
            const wt = conditions?.weather ?? 1;
            const pl = conditions?.payload ?? 10;

            const costMult = edgeDef?.isFuelDependent      ? fi : 1;
            const timeMult = (edgeDef?.isCongestionDependent ? cg : 1) * wt;
            const co2Rate  = edgeDef?.co2PerTonneMile ?? 0.1661;

            const baseCost = Number(link.moneyCost  ?? 0);
            const baseTime = Number(link.timeTaken  ?? 0);
            const baseDist = Number(link.distance   ?? 0);

            const effCost = baseCost * costMult;
            const effTime = baseTime * timeMult;
            const effCO2  = baseDist * co2Rate * pl;

            const costChanged = Math.abs(costMult - 1) > 0.001;
            const timeChanged = Math.abs(timeMult - 1) > 0.001;
            const co2Changed  = Math.abs(pl - 10) > 0.1;

            const costLabel = link.moneyCost != null
              ? `$${effCost.toFixed(0)}${costChanged ? " ↑" : ""}` : "";
            const timeLabel = link.timeTaken != null
              ? `${effTime.toFixed(1)}h${timeChanged ? " ↑" : ""}` : "";
            const co2Label  = `${effCO2.toFixed(0)}kg${co2Changed ? " ↑" : ""}`;

            const rows: { text: string; color: string }[] = [
              { text: transportKey, color: "" },
              { text: baseDist > 0 ? `${baseDist} mi` : "", color: "" },
              { text: costLabel, color: costChanged ? "rgba(251,191,36,0.95)" : "" },
              { text: timeLabel, color: timeChanged ? "rgba(251,191,36,0.95)" : "" },
              { text: co2Label,  color: co2Changed  ? "rgba(167,139,250,0.95)" : "" },
            ].filter(r => r.text);
            if (!rows.length) return;

            const fontSize = Math.max(9 / globalScale, 2);
            const lineH = fontSize * 1.3;

            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const dx = end.x - start.x, dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len, perpY = dx / len;
            const curv = link.curvature ?? 0;
            const totalOffset = curv * len / 2 + (curv >= 0 ? 1 : -1) * fontSize * 2;
            const lx = midX - perpX * totalOffset;
            const ly = midY - perpY * totalOffset;

            const baseTextColor = "rgba(160,190,230,0.75)";
            const pathColor     = "#7dd3fc";

            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";

            rows.forEach((row, i) => {
              const y = ly + (i - (rows.length - 1) / 2) * lineH;
              ctx.shadowColor = "rgba(0,0,0,0.9)";
              ctx.shadowBlur  = 5;
              ctx.fillStyle = onPath && activePath
                ? pathColor
                : (row.color || baseTextColor);
              ctx.fillText(row.text, lx, y);
            });
            ctx.shadowBlur = 0;
          }}
        />
      </div>
    </div>
  );
};

export default GraphVisualizer;
