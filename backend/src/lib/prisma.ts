import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/** Temporary: log every SQL statement the pg driver sends for this Prisma client. */
const pool = new Pool({ connectionString: databaseUrl });
const originalQuery = pool.query.bind(pool);
pool.query = ((queryTextOrConfig: unknown, values?: unknown, callback?: unknown) => {
  const text =
    typeof queryTextOrConfig === "string"
      ? queryTextOrConfig
      : queryTextOrConfig &&
          typeof queryTextOrConfig === "object" &&
          "text" in queryTextOrConfig
        ? String((queryTextOrConfig as { text: unknown }).text)
        : undefined;

  console.log("[pg-sql] ----------------------------------------");
  console.log("[pg-sql]", text ?? String(queryTextOrConfig));
  if (Array.isArray(values)) {
    console.log("[pg-params]", JSON.stringify(values));
  } else if (
    queryTextOrConfig &&
    typeof queryTextOrConfig === "object" &&
    "values" in queryTextOrConfig
  ) {
    console.log(
      "[pg-params]",
      JSON.stringify((queryTextOrConfig as { values: unknown }).values),
    );
  }

  // Preserve all pg.Pool#query overloads.
  if (typeof values === "function") {
    return originalQuery(queryTextOrConfig as never, values as never);
  }
  if (typeof callback === "function") {
    return originalQuery(
      queryTextOrConfig as never,
      values as never,
      callback as never,
    );
  }
  return originalQuery(queryTextOrConfig as never, values as never);
}) as typeof pool.query;

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});

prisma.$on("query", (event) => {
  console.log("[prisma-query-event] ----------------------------------------");
  console.log("[prisma-query-event] sql:", event.query);
  console.log("[prisma-query-event] params:", event.params);
  console.log("[prisma-query-event] duration_ms:", event.duration);
});
