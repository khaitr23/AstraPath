import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { startId, endId, criteria } = req.body;
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (start {id: $startId}), (end {id: $endId})
        MATCH p = shortestPath((start)-[:ROUTE*]-(end))
        UNWIND relationships(p) AS rel
        RETURN nodes(p) AS path, SUM(rel[$criteria]) AS totalCost
        ORDER BY totalCost
        LIMIT 1
        `,
        { startId, endId, criteria }
      );
      const path = result.records.map(
        (record) => record.get("node").properties
      );
      res.status(200).json(path);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  }
}
