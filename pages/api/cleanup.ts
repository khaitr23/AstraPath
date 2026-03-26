import { getSession } from "../../lib/neo4j";

// One-time cleanup: removes duplicate nodes keeping only one per (label, id)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = getSession();
  try {
    await session.run(`
      MATCH (n)
      WITH n.id AS id, labels(n)[0] AS label, collect(n) AS nodes
      WHERE size(nodes) > 1
      UNWIND nodes[1..] AS dup
      DETACH DELETE dup
    `);
    res.status(200).json({ message: "Cleanup complete" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
