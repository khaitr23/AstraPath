import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = getSession();
    try {
      const result = await session.run(`
        MATCH (start)-[r]->(end)
        RETURN r, start.id AS startId, end.id AS endId
      `);

      const edges = result.records.map((record) => {
        const relationship = record.get("r");
        return {
          type: relationship.type,
          properties: relationship.properties,
          start: record.get("startId"),
          end: record.get("endId"),
        };
      });

      res.status(200).json(edges);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
