import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI (migrate, db push, generate schema ops) must use a direct Postgres
 * connection. Supabase transaction-pooler URLs (`:6543?pgbouncer=true`) break
 * migrations. Runtime Prisma Client in src/lib/prisma.ts still uses DATABASE_URL
 * (pooled) via @prisma/adapter-pg.
 *
 * On Render/Supabase set both:
 * - DATABASE_URL = transaction pooler (6543, ?pgbouncer=true)
 * - DIRECT_URL   = session pooler or direct (5432, no pgbouncer)
 *
 * Local Homebrew Postgres can set both to the same URL.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
