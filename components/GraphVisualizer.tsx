import React, { useEffect, useRef, useState } from "react";
import { ForceGraph2D } from "react-force-graph";

type GraphData = {
  nodes: { id: string; name?: string; [key: string]: any }[];
  links: { source: string; target: string; type?: string }[];
};

const GraphVisualizer: React.FC<{ refreshKey?: number; onDataChanged?: () => void }> = ({ refreshKey, onDataChanged }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const fetchGraph = () => {
    fetch("/api/getGraph")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setError(null);
          setGraphData(data);
        }
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    fetchGraph();
  }, [refreshKey]);

  return (
    <div>
      {error && <div style={{ color: "red", padding: "0.5rem" }}>Graph error: {error}</div>}
      <button onClick={fetchGraph} style={{ margin: "0.5rem" }}>Refresh Graph</button>
      <button
        onClick={() => {
          if (!confirm("Clear all nodes and edges?")) return;
          fetch("/api/clearGraph", { method: "POST" })
            .then(() => { fetchGraph(); onDataChanged?.(); })
            .catch((err) => setError(err.message));
        }}
        style={{ margin: "0.5rem" }}
      >
        Clear Graph
      </button>
      <div ref={containerRef} style={{ height: "400px", width: "100%", backgroundColor: "lightgray", overflow: "hidden" }}>
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="id"
          linkLabel="type"
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const fontSize = Math.max(12 / globalScale, 3);
            const lines = [node.id, node.type ?? "", node.address ?? ""].filter(Boolean);
            const lineHeight = fontSize * 1.4;
            const padding = fontSize * 0.6;

            ctx.font = `bold ${fontSize}px Sans-Serif`;
            const maxWidth = Math.max(...lines.map((l, i) => {
              ctx.font = i === 0 ? `bold ${fontSize}px Sans-Serif` : `${fontSize * 0.85}px Sans-Serif`;
              return ctx.measureText(l).width;
            }));

            const radius = Math.max(maxWidth / 2 + padding, lines.length * lineHeight / 2 + padding);

            // Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = "#4a80b5";
            ctx.fill();
            ctx.strokeStyle = "#2c5282";
            ctx.lineWidth = 1.5 / globalScale;
            ctx.stroke();

            // Text centered in circle
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const totalTextH = lines.length * lineHeight;
            lines.forEach((line, i) => {
              ctx.font = i === 0 ? `bold ${fontSize}px Sans-Serif` : `${fontSize * 0.85}px Sans-Serif`;
              ctx.fillText(line, node.x, node.y - totalTextH / 2 + lineHeight * i + lineHeight / 2);
            });

            node.__r = radius;
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.__r ?? 20, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            const start = link.source;
            const end = link.target;
            if (!start?.x || !end?.x) return;
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            const fontSize = Math.max(10 / globalScale, 2);
            const lines = [
              link.transportType ?? "",
              link.distance != null ? `${link.distance} mi` : "",
              link.moneyCost != null ? `$${link.moneyCost}` : "",
            ].filter(Boolean);
            if (!lines.length) return;

            // Offset text perpendicular to the edge so the arrow stays visible
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len;
            const perpY = dx / len;
            const offset = fontSize * lines.length * 0.8;
            const labelX = midX + perpX * offset;
            const labelY = midY + perpY * offset;

            const lineHeight = fontSize * 1.3;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            lines.forEach((line, i) => {
              const ly = labelY + (i - (lines.length - 1) / 2) * lineHeight;
              ctx.shadowColor = "rgba(255,255,255,0.9)";
              ctx.shadowBlur = 3;
              ctx.fillStyle = "#333";
              ctx.fillText(line, labelX, ly);
            });
            ctx.shadowBlur = 0;
          }}
        />
      </div>
    </div>
  );
};

export default GraphVisualizer;
