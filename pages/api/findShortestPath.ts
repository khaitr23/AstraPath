import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { startId, endId, criteria } = req.body;
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (from {id: $startId}), (to {id: $endId})
        MATCH path = (from)-[r:ROUTE*1..100]->(to)
        WITH path, 
            reduce(totalWeight = 0, rel IN r | totalWeight + rel[$criteria]) AS totalWeight
        RETURN path, totalWeight
        ORDER BY totalWeight ASC
        LIMIT 1;
        `,
        { startId, endId, criteria }
      );

      // Map over the path and return the node information
      const path = result.records.map((record) => {
        const pathNodes = record.get("path").segments.map((segment) => {
          return {
            startNode: segment.start.properties,
            endNode: segment.end.properties,
            relationship: segment.relationship.properties,
          };
        });
        return { pathNodes, totalWeight: record.get("totalWeight") };
      });

      res.status(200).json(path);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  }
}
