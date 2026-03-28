import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nodeTypes, edgeTypes } = req.body;
  if (!Array.isArray(nodeTypes) || !Array.isArray(edgeTypes))
    return res.status(400).json({ error: "nodeTypes and edgeTypes must be arrays" });

  const session = getSession();
  try {
    await session.run(
      `MERGE (c:_AstraConfig {id: "types"})
       SET c.nodeTypes = $nodeTypes, c.edgeTypes = $edgeTypes`,
      { nodeTypes: JSON.stringify(nodeTypes), edgeTypes: JSON.stringify(edgeTypes) }
    );
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
