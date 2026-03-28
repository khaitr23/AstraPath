import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.body;
  const session = getSession();
  try {
    await session.run(`MATCH (n {id: $id, tenantId: $tenantId}) DETACH DELETE n`, { id, tenantId });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
