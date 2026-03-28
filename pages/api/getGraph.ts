import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = getSession();
    try {
      const result = await session.run(`
            MATCH (n) WHERE NOT n:_AstraConfig
            OPTIONAL MATCH (n)-[r]->(m) WHERE NOT m:_AstraConfig
            RETURN n, r, m
     `);

      const nodes = []
      const links = []

      result.records.forEach(record => {
        const sourceNode = record.get('n');
        const source = { ...sourceNode.properties, type: sourceNode.labels[0] };
        const relNode = record.get('m');
        const rel = record.get('r');

        if (!nodes.find(node => node.id === source.id)) {
          nodes.push(source);
        }
        if (relNode && rel) {
          const target = { ...relNode.properties, type: relNode.labels[0] };
          if (!nodes.find(node => node.id === target.id)) {
            nodes.push(target);
          }
          links.push({ source: source.id, target: target.id, type: rel.type, elementId: rel.elementId, ...rel.properties });
        }
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
