import React, { useEffect, useRef, useState } from "react";
import { ForceGraph2D } from "react-force-graph";

type GraphData = {
  nodes: { id: string; name?: string; [key: string]: any }[];
  links: { source: string; target: string; type?: string }[];
};

export type ActivePath = {
  nodes: string[];
  links: Array<{ source: string; target: string }>;
} | null;

// ── Node visual config per type ───────────────────────────────────────────────
const NODE_CFG: Record<string, { fill: string; stroke: string; rgb: [number, number, number] }> = {
  factory:   { fill: "#78350f", stroke: "#f59e0b", rgb: [245, 158, 11]  },
  warehouse: { fill: "#1e3a8a", stroke: "#3b82f6", rgb: [59,  130, 246] },
  endpoint:  { fill: "#4c1d95", stroke: "#8b5cf6", rgb: [139, 92,  246] },
  default:   { fill: "#1e293b", stroke: "#475569", rgb: [71,  85,  105] },
};

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
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Component ─────────────────────────────────────────────────────────────────
const GraphVisualizer: React.FC<{
  refreshKey?: number;
  onDataChanged?: () => void;
  selectedOrigin?: string | null;
  selectedDestination?: string | null;
  activePath?: ActivePath;
  selectedEditId?: string | null;
  onNodeClick?: (node: any) => void;
  onLinkClick?: (link: any) => void;
}> = ({ refreshKey, onDataChanged, selectedOrigin, selectedDestination, activePath, selectedEditId, onNodeClick, onLinkClick }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const fetchGraph = () => {
    fetch("/api/getGraph")
      .then(res => res.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setError(null);
        const r = Math.min(dimensions.width, dimensions.height) * 0.27;
        data.nodes.forEach((node: any, i: number) => {
          const angle = (i / data.nodes.length) * 2 * Math.PI;
          node.x = Math.cos(angle) * r;
          node.y = Math.sin(angle) * r;
          node.fx = node.x;
          node.fy = node.y;
        });
        // Curvature for parallel / bidirectional edges
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
      })
      .catch(err => setError(err.message));
  };

  useEffect(() => { fetchGraph(); }, [refreshKey]);

  // ── Path helpers ─────────────────────────────────────────────────────────────
  const nodeId = (n: any): string => (typeof n === "object" ? n?.id : n) ?? "";

  const linkOnPath = (link: any): boolean => {
    if (!activePath) return false;
    const s = nodeId(link.source), t = nodeId(link.target);
    return activePath.links.some(l => l.source === s && l.target === t);
  };

  const linkColor = (link: any) =>
    !activePath ? "rgba(120,150,200,0.55)" : linkOnPath(link) ? "#38bdf8" : "rgba(50,60,80,0.1)";

  const linkWidth = (link: any) =>
    !activePath ? 2 : linkOnPath(link) ? 3.5 : 0.8;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {error && (
        <div style={{
          position: "absolute", top: 14, left: 14, zIndex: 10,
          color: "#fca5a5", background: "rgba(0,0,0,0.75)",
          padding: "6px 14px", borderRadius: 8, fontSize: 12,
          border: "1px solid rgba(239,68,68,0.3)",
        }}>
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%", width: "100%", background: "#07090f" }}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width - 300}
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
            const type: string = node.type ?? "default";
            const cfg = NODE_CFG[type] ?? NODE_CFG.default;
            const [r, g, b] = cfg.rgb;

            const isOrigin = node.id === selectedOrigin;
            const isDest   = node.id === selectedDestination;
            const isSelected = isOrigin || isDest;
            const onPath  = !activePath || activePath.nodes.includes(node.id);
            const dimmed  = !!activePath && !onPath;

            // Size scale by type
            const typeScale = type === "factory" ? 1.15 : type === "endpoint" ? 0.88 : 1.0;
            const fontSize  = Math.max(11 / globalScale, 2.5) * typeScale;
            const lines     = [node.id, node.address ?? ""].filter(Boolean);
            const lineH     = fontSize * 1.35;
            const pad       = fontSize * 0.75;

            // Measure text to size the shape
            const maxW = Math.max(...lines.map((l, i) => {
              ctx.font = i === 0 ? `bold ${fontSize}px Sans-Serif` : `${fontSize * 0.78}px Sans-Serif`;
              return ctx.measureText(l).width;
            }));
            const radius = Math.max(maxW / 2 + pad, lines.length * lineH / 2 + pad);
            node.__r = radius;

            ctx.save();
            ctx.globalAlpha = dimmed ? 0.08 : 1;

            // White selection ring when node is being edited
            if (node.id === selectedEditId) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5 / globalScale, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255,255,255,0.85)";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            // Pulse rings for selected origin / destination
            if (isSelected && !dimmed) {
              const now = Date.now();
              for (const offset of [0, 900]) {
                const t = ((now + offset) % 1800) / 1800;
                const ringR = radius * (1 + t * 1.1);
                const alpha = (1 - t) * 0.6;
                ctx.beginPath();
                ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }
            }

            // Glow
            if (!dimmed) {
              ctx.shadowColor = cfg.stroke;
              ctx.shadowBlur  = onPath && activePath ? 20 : isSelected ? 15 : 7;
            }

            // Shape per type
            if (type === "factory") {
              drawHexagon(ctx, node.x, node.y, radius);
            } else if (type === "warehouse") {
              drawRoundedRect(ctx, node.x, node.y, radius * 2.1, radius * 1.55, radius * 0.2);
            } else {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            }

            ctx.fillStyle   = cfg.fill;
            ctx.fill();
            ctx.strokeStyle = cfg.stroke;
            ctx.lineWidth   = (isSelected ? 2.5 : 1.5) / globalScale;
            ctx.stroke();
            ctx.shadowBlur  = 0;

            // Label text
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            const totalH = lines.length * lineH;
            lines.forEach((line, i) => {
              ctx.font      = i === 0 ? `bold ${fontSize}px Sans-Serif` : `${fontSize * 0.78}px Sans-Serif`;
              ctx.fillStyle = i === 0 ? "#f0f6ff" : "rgba(200,220,255,0.6)";
              ctx.fillText(line, node.x, node.y - totalH / 2 + lineH * i + lineH / 2);
            });

            ctx.restore();
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const type = (node.type as string) ?? "default";
            const r = node.__r ?? 20;
            ctx.fillStyle = color;
            if (type === "factory") {
              drawHexagon(ctx, node.x, node.y, r); ctx.fill();
            } else if (type === "warehouse") {
              drawRoundedRect(ctx, node.x, node.y, r * 2.1, r * 1.55, r * 0.2); ctx.fill();
            } else {
              ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill();
            }
          }}
          onNodeClick={(node: any) => onNodeClick?.(node)}
          onLinkClick={(link: any) => onLinkClick?.(link)}
          onNodeDragEnd={(node: any) => { node.fx = node.x; node.fy = node.y; }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            const onPath = linkOnPath(link);
            if (activePath && !onPath) return; // skip labels for dimmed links

            const start = link.source, end = link.target;
            if (!start?.x || !end?.x) return;

            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const fontSize = Math.max(9 / globalScale, 2);
            const lines = [
              link.transportType ?? "",
              link.distance    != null ? `${link.distance} mi` : "",
              link.moneyCost   != null ? `$${link.moneyCost}`  : "",
            ].filter(Boolean);
            if (!lines.length) return;

            const dx = end.x - start.x, dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len, perpY = dx / len;
            const curv  = link.curvature ?? 0;
            const totalOffset = curv * len / 2 + (curv >= 0 ? 1 : -1) * fontSize * 2;
            const lx = midX - perpX * totalOffset;
            const ly = midY - perpY * totalOffset;

            const lineH = fontSize * 1.3;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            lines.forEach((line, i) => {
              const y = ly + (i - (lines.length - 1) / 2) * lineH;
              ctx.shadowColor = "rgba(0,0,0,0.9)";
              ctx.shadowBlur  = 5;
              ctx.fillStyle   = onPath && activePath ? "#7dd3fc" : "rgba(160,190,230,0.75)";
              ctx.fillText(line, lx, y);
            });
            ctx.shadowBlur = 0;
          }}
        />
      </div>
    </div>
  );
};

export default GraphVisualizer;
