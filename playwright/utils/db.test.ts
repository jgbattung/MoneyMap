import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// db.ts must run the guard at module load, before any client exists, and bind
// Prisma to the asserted URL. The client is mocked so nothing ever connects.
const { PrismaClient } = vi.hoisted(() => ({ PrismaClient: vi.fn() }));
vi.mock("@prisma/client", () => ({ PrismaClient }));

const GOOD = "postgresql://postgres:local_dev_password@localhost:5433/money_map_dev";

describe("playwright/utils/db module load", () => {
  beforeEach(() => {
    vi.resetModules();
    PrismaClient.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws and never constructs a client when DATABASE_URL is unset", async () => {
    // stubEnv cannot unset in vitest 1.x (it stores "undefined"), so delete directly.
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(import("./db")).rejects.toThrow(/empty or unset/);
      expect(PrismaClient).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });

  it("throws and never constructs a client for a hosted URL", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:pw@db.abc.supabase.co:5432/postgres");
    await expect(import("./db")).rejects.toThrow(/hosted/);
    expect(PrismaClient).not.toHaveBeenCalled();
  });

  it("throws and never constructs a client for another local database", async () => {
    vi.stubEnv("DATABASE_URL", GOOD.replace("money_map_dev", "money_map_demo"));
    await expect(import("./db")).rejects.toThrow(/database/);
    expect(PrismaClient).not.toHaveBeenCalled();
  });

  it("binds the client to exactly the asserted URL", async () => {
    vi.stubEnv("DATABASE_URL", GOOD);
    await import("./db");
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(PrismaClient).toHaveBeenCalledWith({ datasourceUrl: GOOD });
  });
});
