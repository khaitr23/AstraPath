import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import React, { useState } from "react";
import { AddNodePage } from "../components/AddNode";
import { AddEdgePage } from "../components/AddEdge";
import ShortestPath from "../components/ShortestPath";
import dynamic from "next/dynamic";

const GraphVisualizer = dynamic(() => import("../components/GraphVisualizer"), {
  ssr: false, // Disable SSR for this component
});
export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleDataChanged = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      <GraphVisualizer refreshKey={refreshKey} onDataChanged={handleDataChanged} />
      <AddNodePage onDataChanged={handleDataChanged} />
      <AddEdgePage onDataChanged={handleDataChanged} refreshKey={refreshKey} />
      <ShortestPath />
    </div>
  );
}
