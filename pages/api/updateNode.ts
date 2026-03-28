import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { oldId, id, address, type, allTypeKeys = [] } = req.body;

  const safeType = String(type).replace(/[^a-zA-Z0-9_]/g, "");
  if (!safeType) return res.status(400).json({ error: "Invalid type" });

  const safeAllKeys: string[] = (allTypeKeys as string[])
    .map((k: string) => String(k).replace(/[^a-zA-Z0-9_]/g, ""))
    .filter(Boolean);

  const removeClause = (safeAllKeys.length ? safeAllKeys : ["factory", "warehouse", "endpoint"])
    .map(k => `REMOVE n:\`${k}\``)
    .join(" ");

  const query = `
    MATCH (n {id: $oldId, tenantId: $tenantId})
    ${removeClause}
    SET n:\`${safeType}\`
    SET n.id = $id, n.address = $address
    RETURN n
  `;

  const session = getSession();
  try {
    const result = await session.run(query, { oldId, id, address, tenantId });
    const node = result.records[0]?.get("n");
    return res.status(200).json({ node: node?.properties ?? null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
