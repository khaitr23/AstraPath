import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { fromId, toId, co2Emission, timeTaken, distance, moneyCost, transportType } = req.body;
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (a {id: $fromId, tenantId: $tenantId}), (b {id: $toId, tenantId: $tenantId})
       CREATE (a)-[r:ROUTE {
         co2Emission: $co2Emission, timeTaken: $timeTaken,
         distance: $distance, moneyCost: $moneyCost, transportType: $transportType
       }]->(b)
       RETURN r`,
      { fromId, toId, co2Emission, timeTaken, distance, moneyCost, transportType, tenantId }
    );
    res.status(200).json(result.records[0].get("r").properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
