import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import React from "react";
import { AddNodePage } from "./AddNode";
import { AddEdgePage } from "./AddEdge";
import ShortestPath from "./ShortestPath";
import { ForceGraph2D } from "react-force-graph";
import { GraphPage } from "./Graph";

export default function Home() {
  return (
    <div>
      <GraphPage/>
      <AddNodePage />
      <AddEdgePage />
      <ShortestPath />
    </div>
  );
}
