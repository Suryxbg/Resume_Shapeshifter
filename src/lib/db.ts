import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "WARNING: DATABASE_URL is missing in environment variables. Database queries will fail at runtime."
  );
}

const poolConnection = mysql.createPool(
  databaseUrl || "mysql://placeholder-user:placeholder-pass@127.0.0.1:3306/placeholder-db"
);

export const db = drizzle(poolConnection);

