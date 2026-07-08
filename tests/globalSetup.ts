/**
 * Vitest GLOBAL setup — runs ONCE before all test files.
 *
 * Heavy one-time work that doesn't need to repeat per file:
 *   1. Delete any stale `prisma/test.db`.
 *   2. `prisma generate` the SQLite test client.
 *   3. `prisma db push` to create tables in the SQLite file.
 *
 * Per-file concerns (instantiating PrismaClient, setting globalThis.prisma,
 * exposing helpers) live in `tests/setup.ts`.
 */
import { execSync } from "node:child_process"
import { existsSync, rmSync, mkdirSync } from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(__dirname, "..")
const testDbPath = path.join(repoRoot, "prisma", "test.db")
const testDbSchema = path.join(repoRoot, "prisma", "schema.test.prisma")

export default function globalSetup() {
  // Set env for the prisma CLI subprocesses (they read .env which has the
  // production Supabase URL — we override it to point at the SQLite file).
  const env = {
    ...process.env,
    DATABASE_URL: "file:./prisma/test.db",
    DIRECT_DATABASE_URL: "file:./prisma/test.db",
  }

  // Detect the package runner: prefer bunx (faster), fall back to npx.
  let pmRunner = "npx"
  try {
    execSync("which bun", { stdio: "ignore", env })
    pmRunner = "bunx"
  } catch {
    // bun not available — use npx (npm)
  }

  // 1) Wipe stale DB + journal/wal/shm siblings.
  if (existsSync(testDbPath)) rmSync(testDbPath)
  for (const suffix of ["-journal", "-wal", "-shm"]) {
    const p = testDbPath + suffix
    if (existsSync(p)) rmSync(p)
  }
  mkdirSync(path.dirname(testDbPath), { recursive: true })

  // 2) Generate the SQLite-aware PrismaClient.
  execSync(`${pmRunner} prisma generate --schema "${testDbSchema}"`, {
    stdio: "inherit",
    cwd: repoRoot,
    env,
  })

  // 3) Push the schema to the SQLite file.
  execSync(`${pmRunner} prisma db push --schema "${testDbSchema}" --skip-generate`, {
    stdio: "inherit",
    cwd: repoRoot,
    env,
  })
}
