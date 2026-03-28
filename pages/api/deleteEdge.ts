import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { elementId } = req.body;
  const session = getSession();
  try {
    // Verify ownership via adjacent nodes before deleting
    await session.run(
      `MATCH (a {tenantId: $tenantId})-[r]->(b {tenantId: $tenantId})
       WHERE elementId(r) = $elementId DELETE r`,
      { elementId, tenantId }
    );
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
