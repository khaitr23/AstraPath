import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = getSession();
  try {
    await session.run("MATCH (n) DETACH DELETE n");
    res.status(200).json({ message: "Graph cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
}
