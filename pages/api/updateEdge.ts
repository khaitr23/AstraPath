import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { elementId, distance, moneyCost, transportType, co2Emission, timeTaken } = req.body;

  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (a {tenantId: $tenantId})-[r]->(b {tenantId: $tenantId})
       WHERE elementId(r) = $elementId
       SET r.distance = $distance, r.moneyCost = $moneyCost, r.transportType = $transportType,
           r.co2Emission = $co2Emission, r.timeTaken = $timeTaken
       RETURN r`,
      { elementId, distance, moneyCost, transportType, co2Emission, timeTaken, tenantId }
    );
    const rel = result.records[0]?.get("r");
    return res.status(200).json({ relationship: rel?.properties ?? null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
