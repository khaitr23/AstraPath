import { getSession } from "../../lib/neo4j";
import { getTenantId } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const tenantId = await getTenantId(req, res);
  if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

  const session = getSession();
  try {
    await session.run(
      `MATCH (n) WHERE NOT n:_AstraConfig AND n.tenantId = $tenantId DETACH DELETE n`,
      { tenantId }
    );
    res.status(200).json({ message: "Graph cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
