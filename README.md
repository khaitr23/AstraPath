# AstraPath

A full-stack supply chain route optimizer built on Neo4j AuraDB. Users visually model distribution networks as interactive graphs and find Pareto-dominant paths across cost, speed, distance, and CO₂ emissions, with real-time market condition simulation and per-user isolated workspaces.

**Live demo:** [astra-path-routeiq.vercel.app](https://astra-path-routeiq.vercel.app)

---

## Features

- **Interactive graph canvas**: drag nodes, add locations and routes, pan and zoom
- **Pareto-dominant pathfinding**: drag-to-reorder 4 optimization criteria (shortest, fastest, cheapest, greenest); tiebreakers applied in priority order via multi-column Cypher `ORDER BY`
- **Market condition simulation**: fuel price, congestion, weather, and payload sliders update edge weights and CO₂ labels live using DEFRA 2023 GHG conversion factors (trucks, rail, air, EV)
- **User-definable node and edge types**: custom categories with emoji icons, shapes, colors, CO₂ rates, and speed values; persisted per user in Neo4j
- **Persistent layout**: node positions saved to Neo4j on drag, restored on hard reload
- **Multi-tenant isolation**: each authenticated user gets a private graph workspace scoped by `tenantId`; all Cypher queries filter by tenant
- **Guest mode**: session-cookie-based access with no account required; data scoped to the session and lost when the browser closes
- **Edge inspector**: click any edge to view and edit distance, cost, time, and CO₂ inline
- **Compare routes**: run all four optimization modes simultaneously and compare results side-by-side
- **Resizable sidebar**: drag handle with min/max constraints

## Tech Stack

| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| Frontend            | Next.js 15 · React · TypeScript               |
| Graph visualization | react-force-graph (canvas/WebGL)              |
| Database            | Neo4j AuraDB (Cypher)                         |
| Auth                | Clerk (Google + GitHub OAuth, guest sessions) |
| Deployment          | Vercel                                        |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env.local` file:

```env
# Neo4j AuraDB
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=your-username
NEO4J_PASSWORD=your-password

# Clerk: https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/

# Optional OAuth providers (configured in Clerk dashboard, no app registration needed)
# GITHUB_ID / GITHUB_SECRET
# GOOGLE_ID / GOOGLE_SECRET
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

New users are automatically seeded with a default graph (Factory1 → Warehouse1 → Endpoint1) across four route types.

## Project Structure

```
pages/
  index.tsx              # Main app shell, auth gate, state management
  login.tsx              # Clerk SignIn + guest entry
  api/
    getGraph.ts          # Fetch nodes + edges (tenant-scoped)
    findShortestPath.ts  # Pareto pathfinding with dynamic Cypher CASE expressions
    initUser.ts          # Seed default graph for new users
    getTypes.ts          # Load custom node/edge type definitions
    saveTypes.ts         # Persist custom types to Neo4j
    saveNodePosition.ts  # Persist node (x, y) on drag
    addNodes.ts          # Create node with tenantId
    addEdge.ts           # Create edge between tenant-owned nodes
    updateNode.ts        # Edit node label/type/address
    updateEdge.ts        # Edit edge metrics
    deleteNode.ts        # Delete node (tenant-verified)
    deleteEdge.ts        # Delete edge (tenant-verified)
    clearGraph.ts        # Delete all tenant nodes
components/
  GraphVisualizer.tsx    # Canvas renderer, edge labels, node shapes, highlight logic
  Sidebar.tsx            # All UI panels: node/route/path/types tabs, inspectors
lib/
  neo4j.tsx              # Neo4j driver singleton
  auth.ts                # getTenantId helper (Clerk + guest cookie)
  types.ts               # NodeTypeDef, EdgeTypeDef, DEFRA defaults
middleware.ts            # Clerk middleware: protects routes, allows guests
```

## Emission Factors

CO₂ values use **DEFRA 2023 GHG Conversion Factors**:

| Mode                | kg CO₂e / tonne-mile   |
| ------------------- | ---------------------- |
| Trucks (HGV)        | 0.1661                 |
| Train (freight)     | 0.0451                 |
| Plane (air freight) | 1.7916 (ICAO RFI ×1.9) |
| EV                  | 0.0346                 |
