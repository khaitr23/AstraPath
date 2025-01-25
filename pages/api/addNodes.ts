import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { id, address, type } = req.body;
    const session = getSession();
    try {
      const result = await session.run(
        `CREATE (n:${type} {id: $id, address: $address}) RETURN n`,
        { id, address }
      );
      res.status(200).json(result.records[0].get("n").properties);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  }
}
