import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";

async function runMigrate() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in environment variables.");
  }

  console.log("Running migrations...");

  const poolOptions: mysql.PoolOptions = {
    uri: databaseUrl,
    connectionLimit: 1,
    ...(process.env.DATABASE_SSL === "true"
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };

  const connection = await mysql.createConnection(poolOptions);

  const db = drizzle(connection);

  try {
    // Resolve path to the drizzle folder
    // In production (built Next.js with standalone), we need to ensure the path is correct
    // We will copy the drizzle folder to the root of the app in the Docker container
    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    console.log(`Using migrations folder: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });

    console.log("Migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed!", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrate().catch((err) => {
  console.error("Unhandled error during migration", err);
  process.exit(1);
});
