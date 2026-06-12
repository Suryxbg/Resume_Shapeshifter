import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

function createPool() {
  if (!databaseUrl) {
    console.warn(
      "WARNING: DATABASE_URL is missing in environment variables. Database queries will fail at runtime."
    );
    return mysql.createPool(
      "mysql://placeholder-user:placeholder-pass@127.0.0.1:3306/placeholder-db"
    );
  }

  const poolOptions = {
    uri: databaseUrl,
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
    ...(process.env.DATABASE_SSL === "true"
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };

  return mysql.createPool(poolOptions);
}

export const db = drizzle(createPool());

