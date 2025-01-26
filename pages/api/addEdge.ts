import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const {
      fromId,
      toId,
      co2Emission,
      timeTaken,
      distance,
      moneyCost,
      transportType,
    } = req.body;
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (a {id: $fromId}), (b {id: $toId})
        CREATE (a)-[r:ROUTE {
          co2Emission: $co2Emission,
          timeTaken: $timeTaken,
          distance: $distance,
          moneyCost: $moneyCost,
          transportType: $transportType
        }]->(b)
        RETURN r
        `,
        {
          fromId,
          toId,
          co2Emission,
          timeTaken,
          distance,
          moneyCost,
          transportType,
        }
      );
      res.status(200).json(result.records[0].get("r").properties);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  }
}
