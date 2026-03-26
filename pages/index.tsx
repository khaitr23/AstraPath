import React, { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "../components/Sidebar";
import { ActivePath } from "../components/GraphVisualizer";

const GraphVisualizer = dynamic(() => import("../components/GraphVisualizer"), { ssr: false });

export default function Home() {
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [selectedOrigin, setOrigin]     = useState<string | null>(null);
  const [selectedDest,   setDest]       = useState<string | null>(null);
  const [activePath,     setActivePath] = useState<ActivePath>(null);
  const [selectedNode,   setSelectedNode] = useState<any>(null);
  const [selectedLink,   setSelectedLink] = useState<any>(null);

  const handleDataChanged = () => setRefreshKey(k => k + 1);

  const handleSelectionChange = (from: string | null, to: string | null) => {
    setOrigin(from);
    setDest(to);
    setActivePath(null);
  };

  const handleClearGraph = async () => {
    if (!confirm("Clear all nodes and edges?")) return;
    await fetch("/api/clearGraph", { method: "POST" });
    setOrigin(null); setDest(null); setActivePath(null);
    handleDataChanged();
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    setSelectedLink(null);
  };

  const handleLinkClick = (link: any) => {
    setSelectedLink(link);
    setSelectedNode(null);
  };

  const handleClearInspector = () => {
    setSelectedNode(null);
    setSelectedLink(null);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GraphVisualizer
        refreshKey={refreshKey}
        onDataChanged={handleDataChanged}
        selectedOrigin={selectedOrigin}
        selectedDestination={selectedDest}
        activePath={activePath}
        selectedEditId={selectedNode?.id ?? null}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
      />
      <Sidebar
        refreshKey={refreshKey}
        onDataChanged={handleDataChanged}
        onClearGraph={handleClearGraph}
        onRefreshGraph={handleDataChanged}
        onSelectionChange={handleSelectionChange}
        onPathFound={setActivePath}
        selectedNode={selectedNode}
        selectedLink={selectedLink}
        onClearInspector={handleClearInspector}
      />
    </div>
  );
}
