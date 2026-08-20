import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { ensureMySqlTls } from "./shared/mysqlConnection";

const connectionString = process.env.DATABASE_URL ? ensureMySqlTls(process.env.DATABASE_URL) : undefined;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
