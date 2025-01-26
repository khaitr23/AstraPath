import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { startId, endId, criteria } = req.body;
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (from {id: $fromId}), (to {id: $toId})
        MATCH path = (from)-[r:ROUTE*1..100]->(to)
        WITH path, 
            reduce(totalWeight = 0, rel IN r | totalWeight + rel[$criterion]) AS totalWeight
        RETURN path, totalWeight
        ORDER BY totalWeight ASC
        LIMIT 1;
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
