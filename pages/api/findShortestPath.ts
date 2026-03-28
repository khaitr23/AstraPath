import { getSession } from "../../lib/neo4j";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { startId, endId, criteriaOrder, conditions } = req.body;
    const { fuelIndex = 1, congestion = 1, weather = 1, payload = 10 } = conditions ?? {};

    // Edge type definitions passed from client (with DEFRA 2023 CO2 factors + condition deps)
    const edgeTypes: { key: string; co2PerTonneMile: number; isFuelDependent: boolean; isCongestionDependent: boolean }[] =
      req.body.edgeTypes ?? [
        { key: "trucks", co2PerTonneMile: 0.1661, isFuelDependent: true,  isCongestionDependent: false },
        { key: "plane",  co2PerTonneMile: 1.7916, isFuelDependent: false, isCongestionDependent: true  },
        { key: "train",  co2PerTonneMile: 0.0451, isFuelDependent: false, isCongestionDependent: false },
        { key: "EV",     co2PerTonneMile: 0.0346, isFuelDependent: true,  isCongestionDependent: false },
      ];

    // Build safe CASE expressions from edge types (keys sanitised to alphanum + underscore)
    const safe = edgeTypes.map(e => ({
      ...e,
      safeKey: String(e.key).replace(/[^a-zA-Z0-9_]/g, ""),
      co2: Number(e.co2PerTonneMile) || 0.1661,
    })).filter(e => e.safeKey);

    const fuelCase = safe.map(e => e.isFuelDependent ? `WHEN '${e.safeKey}' THEN $fuelIndex` : "").filter(Boolean).join(" ");
    const congCase = safe.map(e => e.isCongestionDependent ? `WHEN '${e.safeKey}' THEN $congestion` : "").filter(Boolean).join(" ");
    const co2Case  = safe.map(e => `WHEN '${e.safeKey}' THEN ${e.co2}`).join(" ");
    const defaultCO2 = safe[0]?.co2 ?? 0.1661;

    const session = getSession();

    const VALID = ["distance", "moneyCost", "timeTaken", "co2Emission"];
    const order: string[] = (Array.isArray(criteriaOrder) ? criteriaOrder : [criteriaOrder])
      .filter((c: string) => VALID.includes(c));
    if (!order.length) order.push(...VALID);

    const varMap: Record<string, string> = {
      distance:    "totalDistance",
      moneyCost:   "totalCost",
      timeTaken:   "totalTime",
      co2Emission: "totalCO2",
    };
    // Any criteria not in the user's order go at the end
    const remaining = VALID.filter(c => !order.includes(c));
    const fullOrder = [...order, ...remaining];
    const orderBy = fullOrder.map(c => `${varMap[c]} ASC`).join(", ");

    try {
      const result = await session.run(
        `
        MATCH (from {id: $startId}), (to {id: $endId})
        MATCH path = (from)-[r:ROUTE*1..100]->(to)
        WITH path, r,
            reduce(w = 0, rel IN r | w + rel.distance) AS totalDistance,
            reduce(w = 0, rel IN r |
              w + rel.moneyCost * CASE rel.transportType ${fuelCase} ELSE 1.0 END
            ) AS totalCost,
            reduce(w = 0, rel IN r |
              w + rel.timeTaken
                * CASE rel.transportType ${congCase} ELSE 1.0 END
                * $weather
            ) AS totalTime,
            reduce(w = 0, rel IN r |
              w + rel.distance * $payload *
              CASE rel.transportType ${co2Case} ELSE ${defaultCO2} END
            ) AS totalCO2
        RETURN path, ${varMap[fullOrder[0]]} AS primaryWeight
        ORDER BY ${orderBy}
        LIMIT 1
        `,
        { startId, endId, fuelIndex, congestion, weather, payload }
      );

      // Map over the path and return the node information
      const path = result.records.map((record) => {
        const pathNodes = record.get("path").segments.map((segment) => {
          return {
            startNode: segment.start.properties,
            endNode: segment.end.properties,
            relationship: { ...segment.relationship.properties, elementId: segment.relationship.elementId },
          };
        });
        return { pathNodes, totalWeight: record.get("primaryWeight") };
      });

      res.status(200).json(path);
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await session.close();
    }
  }
}
