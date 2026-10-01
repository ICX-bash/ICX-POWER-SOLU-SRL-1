import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "node:path";
import { createDatabasePool } from "../server/db";

async function main() {
  const pool = createDatabasePool();
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    console.log("Database migrations completed successfully.");
  } catch (error) {
    console.error("Database migration failed. Verify DATABASE_URL, TLS, database permissions, and the TiDB IP allowlist.");
    console.error(error instanceof Error ? error.message : "Unknown migration error");
    process.exitCode = 1;
  } finally {
    await pool.promise().end();
  }
}

void main().catch(error => {
  console.error("Database migration could not start.");
  console.error(error instanceof Error ? error.message : "Unknown migration error");
  process.exitCode = 1;
});
