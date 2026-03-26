import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";

const VALID_TYPES = ["factory", "warehouse", "endpoint"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { oldId, id, address, type } = req.body;

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` });
  }

  const query = `
    MATCH (n {id: $oldId})
    REMOVE n:factory REMOVE n:warehouse REMOVE n:endpoint
    SET n:${type} SET n.id = $id, n.address = $address
    RETURN n
  `;

  const session = getSession();
  try {
    const result = await session.run(query, { oldId, id, address });
    const node = result.records[0]?.get("n");
    return res.status(200).json({ node: node?.properties ?? null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
