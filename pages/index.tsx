import Head from "next/head";
import Layout, { siteTitle } from "../components/layout";
import utilStyles from "../styles/utils.module.css";
import React from "react";
import { AddNodePage } from "./AddNode";

export default function Home() {
  return (
    <AddNodePage/>
  );
}
