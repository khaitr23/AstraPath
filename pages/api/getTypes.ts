import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { DEFAULT_NODE_TYPES, DEFAULT_EDGE_TYPES } from "../../lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:_AstraConfig {id: "types"}) RETURN c.nodeTypes AS nodeTypes, c.edgeTypes AS edgeTypes`
    );
    const record = result.records[0];
    const nodeTypes = record?.get("nodeTypes") ? JSON.parse(record.get("nodeTypes")) : DEFAULT_NODE_TYPES;
    const edgeTypes = record?.get("edgeTypes") ? JSON.parse(record.get("edgeTypes")) : DEFAULT_EDGE_TYPES;
    res.status(200).json({ nodeTypes, edgeTypes });
  } catch (err: any) {
    // Fall back to defaults if Neo4j unreachable or no config stored yet
    res.status(200).json({ nodeTypes: DEFAULT_NODE_TYPES, edgeTypes: DEFAULT_EDGE_TYPES });
  } finally {
    await session.close();
  }
}
