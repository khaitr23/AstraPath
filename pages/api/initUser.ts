import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

const DEFAULT_NODES = [
  { id: "Factory1",   type: "factory",   address: "Oregon, WA"  },
  { id: "Warehouse1", type: "warehouse", address: "Tacoma, WA"  },
  { id: "Endpoint1",  type: "endpoint",  address: "Seattle, WA" },
];

// co2 = distance * co2PerTonneMile * 10t payload
// time = distance / speedMph
const DEFAULT_EDGES = [
  { from: "Factory1",   to: "Warehouse1", transport: "trucks", distance: 300, cost: 1500, time: 300/55,   co2: 300 * 0.1661 * 10 },
  { from: "Factory1",   to: "Warehouse1", transport: "train",  distance: 300, cost: 1500, time: 300/75,   co2: 300 * 0.0451 * 10 },
  { from: "Warehouse1", to: "Endpoint1",  transport: "trucks", distance: 40,  cost: 1000, time: 40/55,    co2: 40  * 0.1661 * 10 },
  { from: "Factory1",   to: "Endpoint1",  transport: "EV",     distance: 350, cost: 750,  time: 350/55,   co2: 350 * 0.0346 * 10 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const session = getSession();
  try {
    // Only seed if the user has no nodes yet
    const check = await session.run(
      `MATCH (n) WHERE NOT n:_AstraConfig AND n.tenantId = $tenantId RETURN count(n) AS cnt`,
      { tenantId }
    );
    const count = check.records[0].get("cnt").toNumber();
    if (count > 0) return res.status(200).json({ seeded: false });

    // Create nodes
    for (const n of DEFAULT_NODES) {
      const safeType = n.type.replace(/[^a-zA-Z0-9_]/g, "");
      await session.run(
        `CREATE (n:\`${safeType}\` {id: $id, address: $address, tenantId: $tenantId})`,
        { id: n.id, address: n.address, tenantId }
      );
    }

    // Create edges
    for (const e of DEFAULT_EDGES) {
      await session.run(
        `MATCH (a {id: $from, tenantId: $tenantId}), (b {id: $to, tenantId: $tenantId})
         CREATE (a)-[:ROUTE {
           transportType: $transport, distance: $distance,
           moneyCost: $cost, timeTaken: $time, co2Emission: $co2
         }]->(b)`,
        { from: e.from, to: e.to, transport: e.transport,
          distance: e.distance, cost: e.cost, time: e.time, co2: e.co2, tenantId }
      );
    }

    res.status(200).json({ seeded: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
