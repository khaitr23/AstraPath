import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";
import { DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES } from "../../lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:_AstraConfig {id: "types", tenantId: $tenantId})
       RETURN c.nodeTypes AS nodeTypes, c.edgeTypes AS edgeTypes`,
      { tenantId }
    );
    const record = result.records[0];
    const nodeTypes = record?.get("nodeTypes") ? JSON.parse(record.get("nodeTypes")) : DEFAULT_NODE_TYPES;
    const edgeTypes = record?.get("edgeTypes") ? JSON.parse(record.get("edgeTypes")) : DEFAULT_EDGE_TYPES;
    res.status(200).json({ nodeTypes, edgeTypes });
  } catch {
    res.status(200).json({ nodeTypes: DEFAULT_NODE_TYPES, edgeTypes: DEFAULT_EDGE_TYPES });
  } finally {
    await session.close();
  }
}
