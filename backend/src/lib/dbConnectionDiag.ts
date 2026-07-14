import { Client } from 'pg'
import { prisma } from './prisma.js'

export type DbProbeRow = {
  current_database: string | null
  current_schema: string | null
  inet_server_addr: string | null
  inet_server_port: number | null
  version: string | null
}

const PROBE_SQL = `
  SELECT
    current_database()::text AS current_database,
    current_schema()::text AS current_schema,
    host(inet_server_addr())::text AS inet_server_addr,
    inet_server_port() AS inet_server_port,
    version()::text AS version
`

/** Redact credentials; keep host/port/db for comparing targets. */
function summarizeUrl(raw: string | undefined, label: string): string {
  if (!raw?.trim()) return `${label}: <missing>`
  try {
    const u = new URL(raw)
    return `${label}: ${u.protocol}//${u.hostname}:${u.port || '(default)'}${u.pathname}${u.search}`
  } catch {
    return `${label}: <unparseable>`
  }
}

function formatProbe(row: DbProbeRow): string {
  return [
    `  current_database(): ${row.current_database}`,
    `  current_schema():    ${row.current_schema}`,
    `  inet_server_addr():  ${row.inet_server_addr}`,
    `  inet_server_port():  ${row.inet_server_port}`,
    `  version():           ${row.version}`,
  ].join('\n')
}

/**
 * Temporary diagnostics: compare DATABASE_URL (runtime PrismaClient) vs
 * DIRECT_URL (Prisma CLI / migrate datasource in prisma.config.ts).
 * Logging only — does not change request handling.
 */
export async function logPrismaDatasourceComparison(): Promise<void> {
  console.log('[db-diag] --- connection string targets (credentials redacted) ---')
  console.log(`[db-diag] ${summarizeUrl(process.env.DATABASE_URL, 'DATABASE_URL (runtime)')}`)
  console.log(`[db-diag] ${summarizeUrl(process.env.DIRECT_URL, 'DIRECT_URL (migrate CLI)')}`)

  // 1) Runtime PrismaClient → DATABASE_URL via @prisma/adapter-pg
  try {
    const rows = await prisma.$queryRawUnsafe<DbProbeRow[]>(PROBE_SQL)
    const row = rows[0]
    console.log('[db-diag] --- 1) PrismaClient runtime (DATABASE_URL) ---')
    console.log(row ? formatProbe(row) : '  <no row returned>')
  } catch (err) {
    console.error('[db-diag] PrismaClient runtime probe FAILED:', err)
  }

  // 2) Same target Prisma CLI / migrate uses (DIRECT_URL from prisma.config.ts)
  const directUrl = process.env.DIRECT_URL?.trim()
  if (!directUrl) {
    console.error('[db-diag] DIRECT_URL is missing — cannot probe migrate datasource')
    return
  }

  const client = new Client({ connectionString: directUrl })
  try {
    await client.connect()
    const result = await client.query<DbProbeRow>(PROBE_SQL)
    const row = result.rows[0]
    console.log('[db-diag] --- 2) Migrate datasource via pg (DIRECT_URL) ---')
    console.log(row ? formatProbe(row) : '  <no row returned>')
  } catch (err) {
    console.error('[db-diag] DIRECT_URL / migrate probe FAILED:', err)
  } finally {
    await client.end().catch(() => undefined)
  }

  console.log('[db-diag] Compare current_database / inet_server_addr / inet_server_port above.')
  console.log('[db-diag] If they differ, migrate and runtime are not the same Postgres instance.')
}
