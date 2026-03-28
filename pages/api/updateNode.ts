import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { oldId, id, address, type, allTypeKeys = [] } = req.body;

  // Only alphanumeric + underscore allowed in Neo4j label identifiers
  const safeType = String(type).replace(/[^a-zA-Z0-9_]/g, "");
  if (!safeType) return res.status(400).json({ error: "Invalid type" });

  const safeAllKeys: string[] = (allTypeKeys as string[])
    .map((k: string) => String(k).replace(/[^a-zA-Z0-9_]/g, ""))
    .filter(Boolean);

  // Remove every known type label then set the new one
  const removeClause = (safeAllKeys.length ? safeAllKeys : ["factory", "warehouse", "endpoint"])
    .map(k => `REMOVE n:\`${k}\``)
    .join(" ");

  const query = `
    MATCH (n {id: $oldId})
    ${removeClause}
    SET n:\`${safeType}\`
    SET n.id = $id, n.address = $address
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
