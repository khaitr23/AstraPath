import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { elementId } = req.body;
  const session = getSession();
  try {
    await session.run(
      `MATCH ()-[r]->() WHERE elementId(r) = $elementId DELETE r`,
      { elementId }
    );
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
}
