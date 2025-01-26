import driver from "../../lib/neo4j";

export default async function handler(req, res) {
  const session = driver.session();

  try {
    const result = await session.run(`RETURN 'Hello, AuraDB!' AS message`);
    const message = result.records[0].get("message");
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
