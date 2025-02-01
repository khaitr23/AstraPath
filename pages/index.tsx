import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import React from "react";
import { AddNodePage } from "../components/AddNode";
import { AddEdgePage } from "../components/AddEdge";
import ShortestPath from "../components/ShortestPath";
import dynamic from "next/dynamic";

const GraphVisualizer = dynamic(() => import("../components/GraphVisualizer"), {
  ssr: false, // Disable SSR for this component
});
export default function Home() {
  const query = `
    MATCH (start)-[r]->(end)
    RETURN start, r, end
  `;
  return (
    <div>
      <GraphVisualizer query={query} />
      <AddNodePage />
      <AddEdgePage />
      <ShortestPath />
    </div>
  );
}
