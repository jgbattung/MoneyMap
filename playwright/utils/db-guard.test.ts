import { describe, it, expect } from "vitest";
import { assertE2eDatabaseUrl } from "./db-guard";

const GOOD = "postgresql://postgres:local_dev_password@localhost:5433/money_map_dev";
const GOOD_IP = "postgresql://postgres:local_dev_password@127.0.0.1:5433/money_map_dev";

describe("assertE2eDatabaseUrl", () => {
  describe("accepts", () => {
    it("the local docker test database on localhost", () => {
      expect(assertE2eDatabaseUrl(GOOD)).toBe(GOOD);
    });

    it("the 127.0.0.1 variant", () => {
      expect(assertE2eDatabaseUrl(GOOD_IP)).toBe(GOOD_IP);
    });

    it("the postgres:// protocol alias", () => {
      const url = GOOD.replace("postgresql://", "postgres://");
      expect(assertE2eDatabaseUrl(url)).toBe(url);
    });
  });

  describe("rejects", () => {
    it("undefined", () => {
      expect(() => assertE2eDatabaseUrl(undefined)).toThrow(/empty or unset/);
    });

    it("an empty string", () => {
      expect(() => assertE2eDatabaseUrl("")).toThrow(/empty or unset/);
    });

    it("a whitespace-only string", () => {
      expect(() => assertE2eDatabaseUrl("   ")).toThrow(/empty or unset/);
    });

    it("a Supabase pooler URL", () => {
      expect(() =>
        assertE2eDatabaseUrl(
          "postgresql://postgres.abc:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
        )
      ).toThrow(/hosted/);
    });

    it("a Supabase direct URL", () => {
      expect(() =>
        assertE2eDatabaseUrl(
          "postgresql://postgres:secret@db.abcdefgh.supabase.co:5432/postgres"
        )
      ).toThrow(/hosted/);
    });

    it("a hosted marker anywhere, even on an otherwise valid URL", () => {
      expect(() =>
        assertE2eDatabaseUrl(`${GOOD}?host=x.supabase.co`)
      ).toThrow(/hosted/);
    });

    it("hosted markers case-insensitively (pooler, amazonaws)", () => {
      expect(() => assertE2eDatabaseUrl(`${GOOD}?a=POOLER`)).toThrow(/hosted/);
      expect(() => assertE2eDatabaseUrl(`${GOOD}?a=AmazonAWS`)).toThrow(/hosted/);
    });

    it("the wrong port", () => {
      expect(() =>
        assertE2eDatabaseUrl(GOOD.replace(":5433", ":5432"))
      ).toThrow(/port/);
    });

    it("a missing port", () => {
      expect(() =>
        assertE2eDatabaseUrl("postgresql://postgres:pw@localhost/money_map_dev")
      ).toThrow(/port/);
    });

    it("the demo database name", () => {
      expect(() =>
        assertE2eDatabaseUrl(GOOD.replace("money_map_dev", "money_map_demo"))
      ).toThrow(/database/);
    });

    it("the local development database name", () => {
      expect(() =>
        assertE2eDatabaseUrl(GOOD.replace("money_map_dev", "money_map_local"))
      ).toThrow(/database/);
    });

    it("a missing database name", () => {
      expect(() =>
        assertE2eDatabaseUrl("postgresql://postgres:pw@localhost:5433/")
      ).toThrow(/database/);
    });

    it("a non-postgres protocol", () => {
      expect(() =>
        assertE2eDatabaseUrl("mysql://localhost:5433/money_map_dev")
      ).toThrow(/protocol/);
    });

    it("an unparseable string", () => {
      expect(() => assertE2eDatabaseUrl("not a url")).toThrow(/not a valid URL/);
    });

    it("a non-local host", () => {
      expect(() =>
        assertE2eDatabaseUrl(
          "postgresql://postgres:pw@db.example.com:5433/money_map_dev"
        )
      ).toThrow(/host/);
    });
  });

  describe("redaction", () => {
    const capture = (input: string | undefined): string => {
      try {
        assertE2eDatabaseUrl(input);
      } catch (e) {
        return (e as Error).message;
      }
      throw new Error("expected assertE2eDatabaseUrl to throw");
    };

    it("never leaks the password for a parsed URL", () => {
      const msg = capture(GOOD.replace(":5433", ":5432"));
      expect(msg).not.toContain("local_dev_password");
      expect(msg).toContain("***");
    });

    it("never leaks the password for a hosted-marker rejection", () => {
      const msg = capture(
        "postgresql://postgres.abc:SuperSecretPw1@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
      );
      expect(msg).not.toContain("SuperSecretPw1");
    });

    it("does not echo unparseable input at all", () => {
      const msg = capture("not a url hunter2");
      expect(msg).not.toContain("hunter2");
    });
  });
});
