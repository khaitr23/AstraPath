import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { nodeTypes, edgeTypes } = req.body;
  if (!Array.isArray(nodeTypes) || !Array.isArray(edgeTypes))
    return res.status(400).json({ error: "nodeTypes and edgeTypes must be arrays" });

  const session = getSession();
  try {
    await session.run(
      `MERGE (c:_AstraConfig {id: "types", tenantId: $tenantId})
       SET c.nodeTypes = $nodeTypes, c.edgeTypes = $edgeTypes`,
      { tenantId, nodeTypes: JSON.stringify(nodeTypes), edgeTypes: JSON.stringify(edgeTypes) }
    );
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
