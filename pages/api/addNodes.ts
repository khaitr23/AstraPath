import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const { id, address, type } = req.body;
  const safeType = String(type).replace(/[^a-zA-Z0-9_]/g, "");
  if (!safeType) return res.status(400).json({ error: "Invalid type" });

  const session = getSession();
  try {
    const result = await session.run(
      `MERGE (n:\`${safeType}\` {id: $id, tenantId: $tenantId})
       ON CREATE SET n.address = $address
       RETURN n`,
      { id, address, tenantId }
    );
    res.status(200).json(result.records[0].get("n").properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
