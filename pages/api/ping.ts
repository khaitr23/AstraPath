import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "../../lib/neo4j";

/**
 * Lightweight keepalive endpoint. Runs a no-op Cypher query to prevent
 * Neo4j AuraDB free tier from auto-pausing due to inactivity.
 * Called on a schedule by Vercel Cron (see vercel.json).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow GET (Vercel cron uses GET) or internal POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify the request is from Vercel Cron in production
  const authHeader = req.headers["authorization"];
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = getSession();
  try {
    await session.run("RETURN 1");
    const ts = new Date().toISOString();
    console.log(`[ping] Neo4j keepalive ok at ${ts}`);
    res.status(200).json({ ok: true, timestamp: ts });
  } catch (err: any) {
    console.error("[ping] Neo4j keepalive failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    await session.close();
  }
}
