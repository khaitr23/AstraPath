import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import React from "react";
import { AddNodePage } from "./AddNode";
import { AddEdgePage } from "./AddEdge";
import ShortestPath from "./ShortestPath";

export default function Home() {
  return (
    <div>
      <AddNodePage />
      <AddEdgePage />
      <ShortestPath />
    </div>
  );
}
