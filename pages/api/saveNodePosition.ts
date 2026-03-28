import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { id, x, y } = req.body;
  if (!id || x == null || y == null) return res.status(400).json({ error: "id, x, y required" });

  const session = getSession();
  try {
    await session.run(
      `MATCH (n {id: $id, tenantId: $tenantId}) SET n.x = $x, n.y = $y`,
      { id, tenantId, x: Number(x), y: Number(y) }
    );
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
