import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = getSession();
    try {
      const result = await session.run(`
        MATCH (n)
        RETURN n
      `);

      const nodes = result.records.map((record) => record.get("n").properties);

      res.status(200).json(nodes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
