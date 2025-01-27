import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import React from "react";
import { AddNodePage } from "./AddNode";
import { AddEdgePage } from "./AddEdge";
import ShortestPath from "./ShortestPath";
import { ForceGraph2D } from "react-force-graph";
import { GraphPage } from "./Graph";
import dynamic from "next/dynamic";

const GraphVisualizer = dynamic(() => import("./GraphVisualizer"), {
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
