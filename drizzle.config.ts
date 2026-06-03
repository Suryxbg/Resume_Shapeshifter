import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "mysql://placeholder-user:placeholder-pass@127.0.0.1:3306/placeholder-db",
  },
});

