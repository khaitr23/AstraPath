# AstraPath

AstraPath is a supply chain route optimization application that helps logistics teams model and navigate complex distribution networks.

## Purpose

AstraPath lets users map out a real-world supply chain as a graph of locations and routes, then find the most efficient path between any two points based on their priorities, whether that's speed, cost, distance, or environmental impact.

## What It Allows Users To Do

- **Model their supply chain network** by adding locations categorized as factories, warehouses, or endpoints
- **Create routes between locations** by specifying the mode of transport (truck, plane, train, or EV) and distance. CO2 emissions and travel time are auto-calculated
- **Find the optimal path** between any two locations using one of four criteria:
  - Shortest **distance**
  - Lowest **CO2 emissions**
  - Cheapest **monetary cost**
  - Fastest **travel time**
- **Visualize the entire network** as an interactive graph showing all nodes and connections

## Tech Stack

- **Frontend:** Next.js + React + TypeScript
- **Database:** Neo4j AuraDB (cloud-hosted graph database)
- **Graph Visualization:** Neovis.js
- **Pathfinding:** Cypher query with `reduce()` over variable-length relationships

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
