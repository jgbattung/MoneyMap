/**
 * Behavioural tests for `runDrill` in `scripts/backup/restore-drill.ts`.
 *
 * `child_process` is mocked so no test ever runs `age` or `docker`, and `fs.rmSync` is
 * replaced by a spy so a regression in the "only delete inside the OS temp folder" guard
 * can never delete a real folder while these tests run. What is asserted is the exact
 * sequence of commands the drill would run: it starts its own `postgres:<major>-alpine`
 * container with `--network none` and the drill label, runs everything inside it via
 * `docker exec`, never references `money_map_postgres`, `container:` networking, `dropdb`
 * or `--clean`, and force-removes the container (and deletes the artifact folder) on
 * success and on every failure path, including a readiness timeout and a failed guard.
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
const { preflight, runDrill } = await import("../../scripts/backup/restore-drill");

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

/** Fake `docker inspect` output for the throwaway container, in the drill's `-f` template shape. */
const inspectOutput = (name: string, overrides: { network?: string; labels?: Record<string, string>; image?: string } = {}) =>
  [
    JSON.stringify(`/${name}`),
    JSON.stringify(overrides.labels ?? { "moneymap.drill": "1" }),
    JSON.stringify(overrides.network ?? "none"),
    JSON.stringify(overrides.image ?? "postgres:17-alpine"),
  ].join("|") + "\n";

/** Default fake Docker: the container is healthy and the drill database restores the manifest counts. */
const defaultResponder = (args: string[]) => {
  if (args[0] === "inspect") return { code: 0, stdout: inspectOutput(args.at(-1)!) };
  if (args.includes("select current_database()")) return { code: 0, stdout: "money_map_restore_drill\n" };
  if (args.includes("-F")) return { code: 0, stdout: "_prisma_migrations\t3\nuser\t1\n" };
  return { code: 0 };
};

/** What a call does: "run", "inspect", "rm", or for `docker exec` the tool inside the container. */
const kindOf = (call: SpawnCall) => (call.args[0] === "exec" ? call.args[3] : call.args[0]);

/** Name of the container the drill started (from `docker run --name`). */
const startedName = () => calls.find((c) => c.args[0] === "run")!.args[calls.find((c) => c.args[0] === "run")!.args.indexOf("--name") + 1];

/** Every path must end by force-removing the container it started, and by deleting the artifact folder. */
const expectCleanedUp = (dir: string) => {
  const name = startedName();
  expect(calls.at(-1)!.args).toEqual(["rm", "-f", name]);
  expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
};

/** Nothing the drill spawns may reference the compose database, another container's network, or dropdb. */
const expectNoForbiddenCommands = () => {
  for (const call of calls) {
    expect(call.command).toBe("docker");
    expect(call.args.join(" ")).not.toMatch(
      /money_map_postgres|money_map_dev|money_map_demo|container:|dropdb|--clean|--network host|--network bridge|-p \d|--publish/,
    );
  }
};


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
  const NAME_PATTERN = /^moneymap-drill-[0-9a-f]{16}$/;

  it("passes when every count matches, restoring only into its own no-network container", async () => {
    const dir = makeArtifact();
    const logs: string[] = [];
    const result = await runDrill({ artifactDir: dir, identity: join(dir, "key.txt"), log: (m) => logs.push(m) });

    expect(result).toEqual({ pass: true, tableCount: 2, mismatches: [], createdAtUtc: "2026-11-08T18:00:00Z" });
    expect(logs.some((l) => l.startsWith("PASS: 2 tables"))).toBe(true);
    expect(logs.some((l) => l.includes("removed the throwaway container"))).toBe(true);
    expectNoForbiddenCommands();

    expect(calls.map(kindOf)).toEqual([
      "run",
      "pg_isready",
      "inspect",
      "createdb",
      "psql",
      "psql",
      "pg_restore",
      "psql",
      "rm",
    ]);
    const [start, ready, inspect, create, who, prepare, restore, count, remove] = calls;

    const name = startedName();
    expect(name).toMatch(NAME_PATTERN);
    expect(start.args.slice(0, 9)).toEqual(["run", "-d", "--name", name, "--label", "moneymap.drill=1", "--network", "none", "-e"]);
    expect(start.args[9]).toMatch(/^POSTGRES_PASSWORD=[0-9a-f]{32}$/);
    expect(start.args.slice(10)).toEqual(["postgres:17-alpine"]);

    // Everything else runs inside that container, never on the host or another container.
    for (const call of [ready, create, who, prepare, restore, count]) {
      expect(call.args.slice(0, 3)).toEqual(["exec", "-i", name]);
    }
    expect(ready.args.slice(3)).toEqual(["pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-q"]);
    expect(inspect.args.at(-1)).toBe(name);
    expect(create.args.slice(3)).toEqual(["createdb", "-U", "postgres", "money_map_restore_drill"]);
    expect(who.args).toEqual(expect.arrayContaining(["-d", "money_map_restore_drill", "select current_database()"]));
    expect(prepare.args).toEqual(expect.arrayContaining(["-d", "money_map_restore_drill", "DROP SCHEMA public"]));
    expect(restore.args.slice(3)).toEqual([
      "pg_restore",
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      "-U",
      "postgres",
      "-d",
      "money_map_restore_drill",
    ]);
    expect(restore.piped).toBe(true);
    expect(count.args).toEqual(expect.arrayContaining(["-d", "money_map_restore_drill", "-F", "\t"]));
    expect(count.piped).toBe(true);
    expect(remove.args).toEqual(["rm", "-f", name]);

    // The artifact folder (key, ciphertext, decrypted dump) is deleted, and nothing else.
    expect(rmSpy).toHaveBeenCalledTimes(1);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it.each([15, 16, 17, 18])("starts a server of the backup's own major (%i)", async (major) => {
    responder = (args) =>
      args[0] === "inspect" ? { code: 0, stdout: inspectOutput(args.at(-1)!, { image: `postgres:${major}-alpine` }) } : defaultResponder(args);
    const dir = makeArtifact({ pgMajor: major });

    const result = await runDrill({ artifactDir: dir, identity: "k", log: () => undefined });
    expect(result.pass).toBe(true);
    expect(calls[0].args.at(-1)).toBe(`postgres:${major}-alpine`);
    expectCleanedUp(dir);
  });

  it("uses a fresh container name and password on every run", async () => {
    await runDrill({ artifactDir: makeArtifact(), identity: "k", log: () => undefined });
    const first = calls[0].args;
    calls.length = 0;
    await runDrill({ artifactDir: makeArtifact(), identity: "k", log: () => undefined });
    const second = calls[0].args;

    expect(second[3]).not.toBe(first[3]);
    expect(second[9]).not.toBe(first[9]);
  });

  it("fails with counts-only mismatches and still removes the container", async () => {
    const dir = makeArtifact({ tables: { _prisma_migrations: 3, user: 2, ghost: 0 } });
    const logs: string[] = [];
    const result = await runDrill({ artifactDir: dir, identity: "k", log: (m) => logs.push(m) });

    expect(result.pass).toBe(false);
    expect(result.mismatches).toEqual(["ghost: missing from the restore (manifest has 0)", "user: manifest 2, restored 1"]);
    expect(logs.some((l) => l.startsWith("FAIL: 2 difference(s)"))).toBe(true);
    expectNoForbiddenCommands();
    expectCleanedUp(dir);
  });

  it("refuses to restore if the connected database is not the drill database", async () => {
    responder = (args) =>
      args.includes("select current_database()") ? { code: 0, stdout: "postgres\n" } : defaultResponder(args);
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(
      /connected database is not the drill database/,
    );
    expect(calls.some((c) => kindOf(c) === "pg_restore")).toBe(false);
    expectCleanedUp(dir);
  });

  it("stops before starting any container when decryption fails", async () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error("age: no identity matched any of the recipients");
    });
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/Decryption failed/);
    expect(calls).toEqual([]);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("stops before starting any container when the checksum does not match", async () => {
    manifestSha = "f".repeat(64);
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/checksum/);
    expect(calls).toEqual([]);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("removes the container when it never becomes ready", async () => {
    // Each Date.now() call jumps 40 s, so the 90 s deadline passes after a few real 1 s polls.
    let clock = 0;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => (clock += 40_000));
    try {
      responder = (args) => (args.includes("pg_isready") ? { code: 2 } : defaultResponder(args));
      const dir = makeArtifact();

      const outcome = runDrill({ artifactDir: dir, identity: "k", log: () => undefined }).then(
        () => "resolved",
        (error: Error) => error.message,
      );

      expect(await outcome).toMatch(/did not become ready/);
      expect(calls.filter((c) => kindOf(c) === "pg_isready").length).toBeGreaterThan(1);
      expect(calls.some((c) => ["inspect", "createdb", "pg_restore"].includes(kindOf(c)!))).toBe(false);
      expectCleanedUp(dir);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("removes the container when docker run itself fails", async () => {
    responder = (args) => (args[0] === "run" ? { code: 125 } : defaultResponder(args));
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(
      /Starting the throwaway container failed/,
    );
    expect(calls.map(kindOf)).toEqual(["run", "rm"]);
    expectCleanedUp(dir);
  });

  it.each([
    ["it is attached to a network", { network: "bridge" }, /networkMode/],
    ["it is on another container's network", { network: "container:money_map_postgres" }, /networkMode/],
    ["it lacks the drill label", { labels: {} }, /label/],
    ["it is the wrong image", { image: "postgres:15-alpine" }, /image/],
  ])("refuses to restore, and removes the container, when %s", async (_why, overrides, message) => {
    responder = (args) =>
      args[0] === "inspect" ? { code: 0, stdout: inspectOutput(args.at(-1)!, overrides) } : defaultResponder(args);
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(message);
    expect(calls.some((c) => ["createdb", "psql", "pg_restore"].includes(kindOf(c)!))).toBe(false);
    expectCleanedUp(dir);
  });

  it("refuses to restore when docker reports a different container name", async () => {
    responder = (args) =>
      args[0] === "inspect" ? { code: 0, stdout: inspectOutput("money_map_postgres") } : defaultResponder(args);
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/field "name"/);
    expect(calls.some((c) => kindOf(c) === "pg_restore")).toBe(false);
    expectCleanedUp(dir);
  });

  it("surfaces a failed pg_restore and still removes the container", async () => {
    responder = (args) => (args.includes("pg_restore") ? { code: 1 } : defaultResponder(args));
    const dir = makeArtifact();

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/pg_restore failed/);
    expect(calls.some((c) => kindOf(c) === "psql" && c.args.includes("-F"))).toBe(false);
    expectCleanedUp(dir);
  });

  it("warns with a manual command, and still deletes the folder, when the container cannot be removed", async () => {
    responder = (args) => (args[0] === "rm" ? { code: 1 } : defaultResponder(args));
    const dir = makeArtifact();
    const logs: string[] = [];

    await runDrill({ artifactDir: dir, identity: "k", log: (m) => logs.push(m) });
    expect(logs.some((l) => l.startsWith("WARNING: could not remove the throwaway container") && l.includes(`docker rm -f ${startedName()}`))).toBe(true);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("rejects an artifact without the expected files before starting anything", async () => {
    const dir = realFs.mkdtempSync(join(tmpdir(), "mm-drill-test-"));
    dirs.push(dir);

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(
      /does not contain manifest\.json and backup\.dump\.age/,
    );
    expect(calls).toEqual([]);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });

  it("rejects an invalid manifest before decrypting or starting anything", async () => {
    const dir = makeArtifact({ pgMajor: 14 });

    await expect(runDrill({ artifactDir: dir, identity: "k", log: () => undefined })).rejects.toThrow(/pgMajor/);
    expect(execFileSyncMock).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(rmSpy).toHaveBeenCalledWith(dir, { recursive: true, force: true });
  });
});

describe("restore drill: preflight", () => {
  let checked: string[];
  const fakeTools = (failing?: string) => {
    checked = [];
    execFileSyncMock.mockImplementation(((command: string, args: string[]) => {
      const line = [command, ...args].join(" ");
      checked.push(line);
      if (line === failing) throw new Error("ENOENT");
      return Buffer.alloc(0);
    }) as unknown as typeof childProcess.execFileSync);
  };

  it("needs only age, docker, gh and a running Docker, never the compose container", () => {
    fakeTools();
    expect(() => preflight({ needGh: true })).not.toThrow();
    expect(checked).toEqual(["age --version", "docker --version", "gh --version", "docker info"]);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("skips gh when the caller does not need it", () => {
    fakeTools();
    preflight({ needGh: false });
    expect(checked).toEqual(["age --version", "docker --version", "docker info"]);
  });

  it("names a missing tool", () => {
    fakeTools("age --version");
    expect(() => preflight({ needGh: true })).toThrow(/"age" is not installed or not on PATH/);
  });

  it("asks for Docker Desktop when docker info fails", () => {
    fakeTools("docker info");
    expect(() => preflight({ needGh: true })).toThrow(/Docker is not running/);
  });
});
