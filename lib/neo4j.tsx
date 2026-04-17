import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
  {
    // Serverless-friendly: don't hold open a large pool across cold starts
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 10_000, // 10s — fail fast if DB is paused
    maxTransactionRetryTime: 5_000,
  }
);

export const getSession = () => driver.session();
export default driver;
