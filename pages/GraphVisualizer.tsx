import React, { useEffect, useRef, useState } from "react";

const GraphVisualizer: React.FC<{ query: string }> = ({ query }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [neovis, setNeovis] = useState<any>(null); // Store Neovis class here

  useEffect(() => {
    // Dynamically import Neovis.js to ensure it runs only on the client side
    import("neovis.js")
      .then((Neovis) => {
        const config = {
          containerId: "neo4j-graph-container",
          neo4j: {
            serverUrl: "neo4j://62eb7145.databases.neo4j.io",
            serverUser: "neo4j",
            serverPassword: "618HpDJ8LN0CtFCRq_lDf0KKF6CK8F8vQU-p9efJsvQ",
          },
          visConfig: {
            nodes: { shape: "dot", font: { size: 12 } },
            edges: { width: 0.1, font: { size: 10, align: "middle" } },
          },
          labels: {},
          relationships: {},
          initialCypher: query,
          nonFlat: true,
        } as const; // Add 'as const' to enforce the exact types for the config object

        const viz = new Neovis.default(config);
        console.log("Neovis instance created:", viz);
        setNeovis(viz); // Store the instance in state
        viz.render(); // Render the visualization
        console.log("Rendered network", viz.network);

        // Cleanup on unmount
        return () => {
          if (viz) {
            viz.clearNetwork();
          }
        };
      })
      .catch((error) => {
        console.error("Error loading Neovis: ", error);
      });
  }, [query]);

  return (
    <div
      ref={containerRef}
      id="neo4j-graph-container"
      style={{ height: "600px", width: "100%", backgroundColor: "lightgray" }}
    />
  );
};

export default GraphVisualizer;
