import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    // Heavy one-time work (delete test.db, prisma generate, prisma db push)
    // runs in globalSetup so it isn't repeated for every test file.
    globalSetup: ["./tests/globalSetup.ts"],
    // Per-file setup: set env, instantiate PrismaClient, set globalThis.prisma,
    // expose helpers.
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    testTimeout: 30000,
    // SQLite is a single file — running test files in parallel would cause
    // `SQLITE_BUSY` errors. Run them sequentially within one worker.
    fileParallelism: false,
    pool: "forks",
    singleFork: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
