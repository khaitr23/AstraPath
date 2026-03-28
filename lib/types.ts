export type NodeTypeDef = {
  key: string;
  label: string;
  icon: string;
  fill: string;
  stroke: string;
  rgb: [number, number, number];
  shape: "hexagon" | "roundrect" | "circle" | "diamond";
};

export type EdgeTypeDef = {
  key: string;
  label: string;
  icon: string;
  co2PerTonneMile: number; // DEFRA 2023 kg CO2e per tonne-mile
  speedMph: number;
  isFuelDependent: boolean;      // fuelIndex multiplier applies to cost
  isCongestionDependent: boolean; // congestion multiplier applies to time
};

// ── Defaults (preserve backward-compat with existing Neo4j data) ──────────────

export const DEFAULT_NODE_TYPES: NodeTypeDef[] = [
  { key: "factory",   label: "Factory",   icon: "🏭", fill: "#78350f", stroke: "#f59e0b", rgb: [245, 158, 11],  shape: "hexagon"   },
  { key: "warehouse", label: "Warehouse", icon: "🏢", fill: "#1e3a8a", stroke: "#3b82f6", rgb: [59,  130, 246], shape: "roundrect" },
  { key: "endpoint",  label: "Endpoint",  icon: "📍", fill: "#4c1d95", stroke: "#8b5cf6", rgb: [139, 92,  246], shape: "circle"    },
];

// DEFRA 2023 GHG factors (kg CO2e / tonne-km × 1.60934 → per tonne-mile)
export const DEFAULT_EDGE_TYPES: EdgeTypeDef[] = [
  { key: "trucks", label: "Trucks", icon: "🚛", co2PerTonneMile: 0.1661, speedMph: 55,  isFuelDependent: true,  isCongestionDependent: false },
  { key: "plane",  label: "Plane",  icon: "✈️", co2PerTonneMile: 1.7916, speedMph: 550, isFuelDependent: false, isCongestionDependent: true  },
  { key: "train",  label: "Train",  icon: "🚂", co2PerTonneMile: 0.0451, speedMph: 75,  isFuelDependent: false, isCongestionDependent: false },
  { key: "EV",     label: "EV",     icon: "⚡", co2PerTonneMile: 0.0346, speedMph: 55,  isFuelDependent: true,  isCongestionDependent: false },
];

// ── Color palette for custom types ───────────────────────────────────────────
export const TYPE_COLORS: { fill: string; stroke: string; rgb: [number, number, number] }[] = [
  { fill: "#78350f", stroke: "#f59e0b", rgb: [245, 158, 11]  }, // amber
  { fill: "#1e3a8a", stroke: "#3b82f6", rgb: [59,  130, 246] }, // blue
  { fill: "#4c1d95", stroke: "#8b5cf6", rgb: [139, 92,  246] }, // purple
  { fill: "#064e3b", stroke: "#10b981", rgb: [16,  185, 129] }, // green
  { fill: "#7f1d1d", stroke: "#ef4444", rgb: [239, 68,  68]  }, // red
  { fill: "#164e63", stroke: "#06b6d4", rgb: [6,   182, 212] }, // cyan
  { fill: "#831843", stroke: "#ec4899", rgb: [236, 72,  153] }, // pink
  { fill: "#7c2d12", stroke: "#f97316", rgb: [249, 115, 22]  }, // orange
];
