/**
 * Behavioural tests for `runDrill` in `scripts/backup/restore-drill.ts`.
 *
 * `child_process` is mocked so no test ever runs `age` or `docker`, and `fs.rmSync` is
 * replaced by a spy so a regression in the "only delete inside the OS temp folder" guard
 * can never delete a real folder while these tests run. What is asserted is the exact
 * sequence of commands the drill would run: every one targets the pinned local
 * container and drill database, the restore never uses --clean, and cleanup (drop the
 * drill database, delete the artifact folder) runs on success and on every failure.
 *
 * Companion to `backup-safety.test.ts`, which holds the source-text invariants.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { tmpdir } from "os";
import { join, sep } from "path";

const realFs = await vi.importActual<typeof import("fs")>("fs");

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  const mocked = { ...actual, rmSync: vi.fn() };
  return { ...mocked, default: mocked };
});

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof import("child_process")>("child_process");
  const mocked = { ...actual, spawn: vi.fn(), execFileSync: vi.fn() };
  return { ...mocked, default: mocked };
});

const fs = await import("fs");
const childProcess = await import("child_process");
const { runDrill } = await import("../../scripts/backup/restore-drill");

const rmSpy = vi.mocked(fs.rmSync);
const spawnMock = vi.mocked(childProcess.spawn);
const execFileSyncMock = vi.mocked(childProcess.execFileSync);

const PLAINTEXT = Buffer.from("PGDMP fake dump for the drill test");

interface SpawnCall {
  command: string;
  args: string[];
  piped: boolean;
}

let calls: SpawnCall[];
let dirs: string[];
let manifestSha: string;
let responder: (args: string[]) => { code: number; stdout?: string };

const sha256 = async (data: Buffer) => {
  const { createHash } = await vi.importActual<typeof import("crypto")>("crypto");
  return createHash("sha256").update(data).digest("hex");
};

/** Builds an artifact folder in the OS temp folder, nested the way `gh run download` does. */
const makeArtifact = (manifest: Record<string, unknown> = {}) => {
  const dir = realFs.mkdtempSync(join(tmpdir(), "mm-drill-test-"));
  dirs.push(dir);
  const nested = join(dir, "production-backup-2026-11-08-1");
  realFs.mkdirSync(nested);
  realFs.writeFileSync(join(nested, "backup.dump.age"), "age-encryption.org/v1\nfake ciphertext");
  realFs.writeFileSync(
    join(nested, "manifest.json"),
    JSON.stringify({
      createdAtUtc: "2026-11-08T18:00:00Z",
      serverVersionNum: 170002,
      pgMajor: 17,
      pgDumpVersion: "pg_dump (PostgreSQL) 17.2",
      sha256: manifestSha,
      dumpBytes: PLAINTEXT.length,
      tables: { _prisma_migrations: 3, user: 1 },
      runId: "1",
      ...manifest,
    }),
  );
  return dir;
};

/** Default fake Postgres: the drill database answers, the restore yields the manifest counts. */
const defaultResponder = (args: string[]) => {
  if (args.includes("select current_database()")) return { code: 0, stdout: "money_map_restore_drill\n" };
  if (args.includes("-F")) return { code: 0, stdout: "_prisma_migrations\t3\nuser\t1\n" };
  return { code: 0 };
};

/** The tool part of a docker call, after the image name. */
const toolOf = (call: SpawnCall) => call.args.slice(call.args.findIndex((a) => a.endsWith("-alpine")) + 1);

beforeEach(async () => {
  calls = [];
  dirs = [];
  manifestSha = await sha256(PLAINTEXT);
  responder = defaultResponder;
  rmSpy.mockReset();

  // `age -d -i <key> -o <out> <in>`: write the known plaintext to <out>.
  execFileSyncMock.mockReset();
  execFileSyncMock.mockImplementation(((command: string, args: string[]) => {
    if (command === "age") {
      realFs.writeFileSync(args[args.indexOf("-o") + 1], PLAINTEXT);
      return Buffer.alloc(0);
    }
    throw new Error(`unexpected execFileSync: ${command}`);
  }) as unknown as typeof childProcess.execFileSync);

  spawnMock.mockReset();
  spawnMock.mockImplementation(((command: string, args: string[]) => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      stdin: PassThrough;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = new PassThrough();
    const call: SpawnCall = { command, args, piped: false };
    calls.push(call);
    child.stdin.on("data", () => (call.piped = true));
    child.stdin.resume();
    child.stdin.on("finish", () => {
      const { code, stdout } = responder(args);
      setImmediate(() => {
        if (stdout) child.stdout.emit("data", stdout);
        child.emit("close", code);
      });
    });
    return child;
  }) as unknown as typeof childProcess.spawn);
});

afterEach(() => {
  for (const dir of dirs) realFs.rmSync(dir, { recursive: true, force: true });
});

describe("restore drill: refuses to work outside the OS temp folder", () => {
  const assertRepoIsNotInTmp = () => {
    const root = realFs.realpathSync(tmpdir());
    const cwd = realFs.realpathSync(process.cwd());
    // If the repo itself lived under tmp these cases would not prove anything.
    expect(cwd.startsWith(root + sep)).toBe(false);
  };

  it.each([
    ["a folder inside the repository", () => join(process.cwd(), "scripts", "backup")],
    ["the OS temp folder itself", () => tmpdir()],
    ["the parent of the OS temp folder", () => join(tmpdir(), "..")],
    ["a sibling path that only shares the temp prefix", () => `${tmpdir()}-not-tmp`],
    ["a folder that does not exist", () => join(tmpdir(), "mm-drill-test-missing", "x")],
  ])("refuses %s without deleting or running anything", async (_name, target) => {
    assertRepoIsNotInTmp();
    await expect(runDrill({ artifactDir: target(), identity: "unused", log: () => undefined })).rejects.toThrow(
      /inside the OS temp folder/,
    );
    expect(rmSpy).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });
});

describe("restore drill: orchestration", () => {
  it("passes when every count matches, and runs only against the pinned local target", async () => {
    const dir = makeArtifact();
    const logs: string[] = [];
    const result = await runDrill({ artifactDir: dir, identity: join(dir, "key.txt"), log: (m) => logs.push(m) });

    expect(result).toEqual({ pass: true, tableCount: 2, mismatches: [], createdAtUtc: "2026-11-08T18:00:00Z" });
    expect(logs.some((l) => l.startsWith("PASS: 2 tables"))).toBe(true);

    // Every command is a docker client container joined to the local compose database.
    for (const call of calls) {
      expect(call.command).toBe("docker");
      expect(call.args.slice(0, 6)).toEqual(["run", "--rm", "-i", "--network", "container:money_map_postgres", "postgres:17-alpine"]);
      expect(call.args).toEqual(expect.arrayContaining(["-h", "localhost", "-p", "5432", "-U", "postgres"]));
      expect(call.args.join(" ")).not.toMatch(/--clean|money_map_dev|money_map_demo/);
    }

    expect(calls.map((c) => toolOf(c)[0])).toEqual(["dropdb", "createdb", "psql", "psql", "pg_restore", "psql", "dropdb"]);
    const [dropFirst, create, who, prepare, restore, count, dropLast] = calls;
    expect(toolOf(dropFirst)).toEqual(["dropdb", "--if-exists", "-h", "localhost", "-p", "5432", "-U", "postgres", "money_map_restore_drill"]);
    expect(toolOf(create).at(-1)).toBe("money_map_restore_drill");
    expect(toolOf(who)).toEqual(expect.arrayContaining(["-d", "money_map_restore_drill", "select current_database()"]));
    expect(toolOf(prepare)).toEqual(expect.arrayContaining(["-d", "money_map_restore_drill", "DROP SCHEMA public"]));
    expect(toolOf(restore)).toEqual(
      expect.arrayContaining(["--exit-on-error", "--no-owner", "--no-privileges", "-d", "money_map_restore_drill"]),
    );
    expect(restore.piped).toBe(true);
    expect(toolOf(count)).toEqual(expect.arrayContaining(["-d", "money_map_restore_drill", "-F", "\t"]));
    expect(count.piped).toBe(true);
    expect(dropLast.args).toEqual(dropFirst.args);

    // The artifact folder (key, ciphertext, decrypted dump) is deleted, and nothing else.
    expect(rmSpy).toHaveBeenCalledTimes(1);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("fails with counts-only mismatches and still cleans up", async () => {
    const dir = makeArtifact({ tables: { _prisma_migrations: 3, user: 2, ghost: 0 } });
    const logs: string[] = [];
    const result = await runDrill({ artifactDir: dir, identity: "k", log: (m) => logs.push(m) });

    expect(result.pass).toBe(false);
    expect(result.mismatches).toEqual(["ghost: missing from the restore (manifest has 0)", "user: manifest 2, restored 1"]);
    expect(logs.some((l) => l.startsWith("FAIL: 2 difference(s)"))).toBe(true);
    expect(toolOf(calls.at(-1)!)[0]).toBe("dropdb");
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("refuses to restore if the connected database is not the drill database", async () => {
    responder = (args) =>
      args.includes("select current_database()") ? { code: 0, stdout: "money_map_dev\n" } : defaultResponder(args);
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(
      /connected database is not the drill database/,
    );
    expect(calls.some((c) => toolOf(c)[0] === "pg_restore")).toBe(false);
    expect(toolOf(calls.at(-1)!)[0]).toBe("dropdb");
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("stops before touching the database when decryption fails", async () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error("age: no identity matched any of the recipients");
    });
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/Decryption failed/);
    // Only the cleanup drop runs.
    expect(calls.map((c) => toolOf(c)[0])).toEqual(["dropdb"]);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("stops before touching the database when the checksum does not match", async () => {
    manifestSha = "f".repeat(64);
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/checksum/);
    expect(calls.map((c) => toolOf(c)[0])).toEqual(["dropdb"]);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("surfaces a failed pg_restore and still cleans up", async () => {
    responder = (args) => (args.includes("pg_restore") ? { code: 1 } : defaultResponder(args));
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/pg_restore failed/);
    expect(calls.some((c) => toolOf(c)[0] === "psql" && c.args.includes("-F"))).toBe(false);
    expect(toolOf(calls.at(-1)!)[0]).toBe("dropdb");
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("warns, and still deletes the folder, when the cleanup drop fails", async () => {
    let drops = 0;
    responder = (args) => {
      if (args.includes("dropdb") && ++drops === 2) return { code: 1 };
      return defaultResponder(args);
    };
    const dir = makeArtifact();
    const logs: string[] = [];

    await runDrill({ artifactDir: dir, identity: "k", log: (m) => logs.push(m) });
    expect(logs.some((l) => l.startsWith("WARNING: could not drop money_map_restore_drill"))).toBe(true);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("rejects an artifact without the expected files and still cleans up", async () => {
    const dir = realFs.mkdtempSync(join(tmpdir(), "mm-drill-test-"));
    dirs.push(dir);

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(
      /does not contain manifest\.json and backup\.dump\.age/,
    );
    // No manifest, so cleanup falls back to the local container's major.
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toContain("postgres:15-alpine");
    expect(toolOf(calls[0])[0]).toBe("dropdb");
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("rejects an invalid manifest before decrypting", async () => {
    const dir = makeArtifact({ pgMajor: 14 });

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/pgMajor/);
    expect(execFileSyncMock).not.toHaveBeenCalled();
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });
});

