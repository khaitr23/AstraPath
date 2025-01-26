import React, { useState } from "react";

const ShortestPath: React.FC = () => {
  // State for input fields
  const [startId, setStartId] = useState<string>("");
  const [endId, setEndId] = useState<string>("");
  const [criteria, setCriteria] = useState<string>("distance"); // Default criteria to "distance"
  const [path, setPath] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPath(null);

    try {
      const response = await fetch("/api/findShortestPath", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startId, endId, criteria }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch the shortest path.");
      }

      const data = await response.json();
      setPath(data[0]); // Since we limit to one result, we use data[0]
    } catch (err: any) {
      setError(err.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Find the Shortest Path</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Start Location ID:</label>
          <input
            type="text"
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            required
          />
        </div>

        <div>
          <label>End Location ID:</label>
          <input
            type="text"
            value={endId}
            onChange={(e) => setEndId(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Criteria:</label>
          <select
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            required
          >
            <option value="distance">distance</option>
            <option value="co2Emission">CO2 Emission</option>
            <option value="moneyCost">moneyCost</option>
            <option value="timeTaken">timeTaken</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Find Shortest Path"}
        </button>
      </form>

      {error && <div style={{ color: "red" }}>{error}</div>}

      {path && (
        <div>
          <h2>Shortest Path</h2>
          <div>
            <strong>Total {criteria}:</strong> {path.totalWeight}
          </div>
          <h3>Path Details:</h3>
          <ul>
            {path.pathNodes.map((segment: any, index: number) => (
              <li key={index}>
                <div>
                  <strong>Start Node:</strong> {segment.startNode.name} (ID:{" "}
                  {segment.startNode.id})
                </div>
                <div>
                  <strong>End Node:</strong> {segment.endNode.name} (ID:{" "}
                  {segment.endNode.id})
                </div>
                <div>
                  <strong>Relationship:</strong> Distance:{" "}
                  {segment.relationship.distance}, CO2 Emission:{" "}
                  {segment.relationship.co2Emission}, moneyCost:{" "}
                  {segment.relationship.moneyCost},timeTaken:{" "}
                  {segment.relationship.timeTaken}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ShortestPath;
