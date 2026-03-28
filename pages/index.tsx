import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "../components/Sidebar";
import { ActivePath } from "../components/GraphVisualizer";
import { NodeTypeDef, EdgeTypeDef, DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES } from "../lib/types";

const GraphVisualizer = dynamic(() => import("../components/GraphVisualizer"), { ssr: false });

export type Conditions = { fuelIndex: number; congestion: number; weather: number; payload: number };

export default function Home() {
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [selectedOrigin, setOrigin]     = useState<string | null>(null);
  const [selectedDest,   setDest]       = useState<string | null>(null);
  const [activePath,     setActivePath] = useState<ActivePath>(null);
  const [selectedNode,   setSelectedNode] = useState<any>(null);
  const [selectedLink,   setSelectedLink] = useState<any>(null);
  const [conditions,     setConditions]   = useState<Conditions>({ fuelIndex: 1, congestion: 1, weather: 1, payload: 10 });
  const [nodeTypes,      setNodeTypesRaw] = useState<NodeTypeDef[]>(DEFAULT_NODE_TYPES);
  const [edgeTypes,      setEdgeTypesRaw] = useState<EdgeTypeDef[]>(DEFAULT_EDGE_TYPES);
  const [sidebarWidth,   setSidebarWidth] = useState(295);

  // Load types from Neo4j on mount
  useEffect(() => {
    fetch("/api/getTypes")
      .then(r => r.json())
      .then(data => {
        if (data.nodeTypes) setNodeTypesRaw(data.nodeTypes);
        if (data.edgeTypes) setEdgeTypesRaw(data.edgeTypes);
      })
      .catch(() => {/* keep defaults on network error */});
  }, []);

  const saveTypes = (nodeT: NodeTypeDef[], edgeT: EdgeTypeDef[]) => {
    fetch("/api/saveTypes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeTypes: nodeT, edgeTypes: edgeT }),
    }).catch(() => {});
  };

  const setNodeTypes = (v: NodeTypeDef[]) => {
    setNodeTypesRaw(v);
    saveTypes(v, edgeTypes);
  };
  const setEdgeTypes = (v: EdgeTypeDef[]) => {
    setEdgeTypesRaw(v);
    saveTypes(nodeTypes, v);
  };

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

  const handleNodeClick = (node: any) => { setSelectedNode(node); setSelectedLink(null); };
  const handleLinkClick = (link: any) => { setSelectedLink(link); setSelectedNode(null); };
  const handleClearInspector = () => { setSelectedNode(null); setSelectedLink(null); };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GraphVisualizer
        refreshKey={refreshKey}
        onDataChanged={handleDataChanged}
        selectedOrigin={selectedOrigin}
        selectedDestination={selectedDest}
        activePath={activePath}
        selectedEditId={selectedNode?.id ?? null}
        selectedLink={selectedLink}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        conditions={conditions}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        sidebarWidth={sidebarWidth}
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
        conditions={conditions}
        onConditionsChange={setConditions}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeTypesChange={setNodeTypes}
        onEdgeTypesChange={setEdgeTypes}
        onWidthChange={setSidebarWidth}
      />
    </div>
  );
}
