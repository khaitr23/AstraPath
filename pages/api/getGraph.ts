import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = getSession();
    try {
      const result = await session.run(`
            MATCH (n)-[r]->(m)
            RETURN n, r, m
     `);

      const nodes = []
      const links = []

      result.records.forEach(record => {
        const source = record.get('n').properties;
        const target = record.get('m').properties;
        const relationship = record.get('r').type;
      
        if (!nodes.find(node => node.id === source.id)) {
          nodes.push(source);
        }
        if (!nodes.find(node => node.id === target.id)) {
          nodes.push(target);
        }
        links.push({ source: source.id, target: target.id, type: relationship });
      })

      res.status(200).json({nodes, links});
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
