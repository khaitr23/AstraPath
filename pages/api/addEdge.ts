import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { fromId, toId, metrics } = req.body;
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (a {id: $fromId}), (b {id: $toId})
        CREATE (a)-[r:ROUTE $metrics]->(b)
        RETURN r
        `,
        { fromId, toId, metrics }
      );
      res.status(200).json(result.records[0].get("r").properties);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  }
}
