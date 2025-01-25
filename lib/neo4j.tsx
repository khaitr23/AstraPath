import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "neo4j+s://62eb7145.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "618HpDJ8LN0CtFCRq_lDf0KKF6CK8F8vQU-p9efJsvQ")
);

export const getSession = () => driver.session();
export default driver;
