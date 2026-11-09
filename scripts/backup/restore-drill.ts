/**
 * Restore drill: proves a real nightly backup can be decrypted and restored.
 *
 *   npm run backup:drill                  restore the latest successful nightly backup
 *   npm run backup:drill -- --run <id>    restore a specific backup-production run
 *
 * It downloads the artifact with `gh`, decrypts it with the age secret key you type at a
 * hidden prompt, checks the checksum, restores into the LOCAL Docker Postgres
 * (`money_map_postgres`, database `money_map_restore_drill`), compares row counts with
 * the manifest, and always cleans up (drops the database, deletes the temp folder with
 * the key, the ciphertext and the decrypted dump).
 *
 * SAFETY: this script needs no production credential and has none. The restore target is
 * the literal in `drill-lib.ts`. It reads no environment variable, loads no env file and
 * uses no Prisma client. Everything is written under the OS temp folder, never inside the
 * repository (the repo is synced by OneDrive). `runDrill` takes the artifact folder and
 * key as arguments so tests can drive it without `gh`; the CLI always downloads via `gh`.
 */

import { execFileSync, spawn } from "child_process";
import { createHash } from "crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve, sep } from "path";
import {
  DRILL_HOST_PORT,
  DRILL_TARGET,
  assertDrillTarget,
  assertSha256,
  compareCounts,
  parseCountsTsv,
  parseManifest,
} from "./drill-lib";

export interface DrillOptions {
  /** Folder holding manifest.json and backup.dump.age (found recursively). Deleted at the end. */
  artifactDir: string;
  /** Path to a file holding the age secret key. */
  identity: string;
  log?: (message: string) => void;
}

export interface DrillResult {
  pass: boolean;
  tableCount: number;
  mismatches: string[];
  createdAtUtc: string;
}

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

const ROW_COUNTS_SQL = join(__dirname, "row-counts.sql");

function tail(text: string, lines = 15): string {
  return text.trim().split(/\r?\n/).slice(-lines).join("\n");
}

function insideTmp(path: string): boolean {
  const root = realpathSync(tmpdir());
  const target = realpathSync(resolve(path));
  return target.startsWith(root + sep);
}

function findFile(dir: string, name: string): string | undefined {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry === name) {
      return full;
    }
  }
  return undefined;
}

function sha256File(path: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolvePromise(hash.digest("hex")))
      .on("error", reject);
  });
}

/** Runs a command with an argument array (no shell). Optionally pipes a file to stdin. */
function run(command: string, args: string[], stdinFile?: string): Promise<CommandResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ code: code ?? 1, stdout, stderr }));
    child.stdin.on("error", () => undefined);
    if (stdinFile) {
      createReadStream(stdinFile).pipe(child.stdin);
    } else {
      child.stdin.end();
    }
  });
}

/** Runs a Postgres client tool from a matching-major image inside the container's network. */
function postgresTool(major: number, tool: string[], stdinFile?: string): Promise<CommandResult> {
  const t = DRILL_TARGET;
  return run(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "--network",
      `container:${t.container}`,
      `postgres:${major}-alpine`,
      ...tool,
    ],
    stdinFile,
  );
}

function connectionFlags(): string[] {
  const t = DRILL_TARGET;
  return ["-h", t.host, "-p", t.port, "-U", t.user];
}

async function mustSucceed(what: string, result: Promise<CommandResult>): Promise<CommandResult> {
  const r = await result;
  if (r.code !== 0) {
    throw new Error(`${what} failed (exit ${r.code}):\n${tail(r.stderr)}`);
  }
  return r;
}

export function preflight(options: { needGh: boolean }): void {
  const tools: [string, string[]][] = [
    ["age", ["--version"]],
    ["docker", ["--version"]],
  ];
  if (options.needGh) tools.push(["gh", ["--version"]]);
  for (const [tool, args] of tools) {
    try {
      execFileSync(tool, args, { stdio: "ignore" });
    } catch {
      throw new Error(`"${tool}" is not installed or not on PATH. See the Restore drill section of the README.`);
    }
  }

  const running = (() => {
    try {
      return execFileSync("docker", ["inspect", "-f", "{{.State.Running}}", DRILL_TARGET.container], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return "";
    }
  })();
  if (running !== "true") {
    throw new Error(`Container ${DRILL_TARGET.container} is not running. Start it with: docker compose up -d`);
  }

  const published = execFileSync(
    "docker",
    ["inspect", "-f", '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', DRILL_TARGET.container],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
  if (published !== DRILL_HOST_PORT) {
    throw new Error(
      `Container ${DRILL_TARGET.container} does not publish 5432 on host port ${DRILL_HOST_PORT}. ` +
        "This is not the local compose database, so the drill will not run.",
    );
  }
}

export async function runDrill(options: DrillOptions): Promise<DrillResult> {
  const log = options.log ?? ((m: string) => console.log(m));
  const artifactDir = resolve(options.artifactDir);
  if (!existsSync(artifactDir) || !insideTmp(artifactDir)) {
    throw new Error("The artifact folder must exist and be inside the OS temp folder, never inside the repository.");
  }

  const cleaned: string[] = [];
  try {
    const manifestPath = findFile(artifactDir, "manifest.json");
    const cipherPath = findFile(artifactDir, "backup.dump.age");
    if (!manifestPath || !cipherPath) {
      throw new Error("The artifact does not contain manifest.json and backup.dump.age.");
    }
    const manifest = parseManifest(readFileSync(manifestPath, "utf8"));
    log(`Backup created ${manifest.createdAtUtc} (Postgres ${manifest.pgMajor}, run ${manifest.runId || "unknown"}).`);

    const dumpPath = join(artifactDir, "decrypted.dump");
    try {
      execFileSync("age", ["-d", "-i", options.identity, "-o", dumpPath, cipherPath], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      throw new Error("Decryption failed. Wrong key, or the file was tampered with.");
    }
    log("Decrypted.");

    assertSha256(await sha256File(dumpPath), manifest.sha256);
    log("Checksum matches the manifest.");

    assertDrillTarget(DRILL_TARGET);
    const db = DRILL_TARGET.database;
    const major = manifest.pgMajor;
    const flags = connectionFlags();

    await mustSucceed(
      "Dropping any previous drill database",
      postgresTool(major, ["dropdb", "--if-exists", ...flags, db]),
    );
    await mustSucceed("Creating the drill database", postgresTool(major, ["createdb", ...flags, db]));

    const who = await mustSucceed(
      "Checking the target database",
      postgresTool(major, ["psql", ...flags, "-d", db, "-v", "ON_ERROR_STOP=1", "-tA", "-c", "select current_database()"]),
    );
    if (who.stdout.trim() !== db) {
      throw new Error("Refusing to restore: connected database is not the drill database.");
    }

    // The dump contains CREATE SCHEMA public; the new database already has an empty one.
    await mustSucceed(
      "Preparing the drill database",
      postgresTool(major, ["psql", ...flags, "-d", db, "-v", "ON_ERROR_STOP=1", "-q", "-c", "DROP SCHEMA public"]),
    );

    log("Restoring...");
    await mustSucceed(
      "pg_restore",
      postgresTool(major, ["pg_restore", "--exit-on-error", "--no-owner", "--no-privileges", ...flags, "-d", db], dumpPath),
    );

    const counted = await mustSucceed(
      "Counting rows",
      postgresTool(major, ["psql", ...flags, "-d", db, "-v", "ON_ERROR_STOP=1", "-tA", "-F", "\t"], ROW_COUNTS_SQL),
    );
    const actual = parseCountsTsv(counted.stdout);
    const mismatches = compareCounts(manifest.tables, actual);
    const tableCount = Object.keys(actual).length;

    if (mismatches.length === 0) {
      log(`PASS: ${tableCount} tables restored and every row count matches the manifest.`);
    } else {
      log(`FAIL: ${mismatches.length} difference(s) between the manifest and the restore:`);
      for (const line of mismatches) log(`  ${line}`);
    }
    return { pass: mismatches.length === 0, tableCount, mismatches, createdAtUtc: manifest.createdAtUtc };
  } finally {
    // Cleanup runs on success and on every failure above.
    try {
      assertDrillTarget(DRILL_TARGET);
      const major = (() => {
        const m = findFile(artifactDir, "manifest.json");
        try {
          return m ? parseManifest(readFileSync(m, "utf8")).pgMajor : 15;
        } catch {
          return 15;
        }
      })();
      const dropped = await postgresTool(major, ["dropdb", "--if-exists", ...connectionFlags(), DRILL_TARGET.database]);
      if (dropped.code === 0) {
        cleaned.push(`dropped database ${DRILL_TARGET.database}`);
      } else {
        log(`WARNING: could not drop ${DRILL_TARGET.database}. Drop it by hand: docker exec ${DRILL_TARGET.container} dropdb -U ${DRILL_TARGET.user} --if-exists ${DRILL_TARGET.database}`);
      }
    } catch {
      log(`WARNING: could not drop ${DRILL_TARGET.database}. Drop it by hand: docker exec ${DRILL_TARGET.container} dropdb -U ${DRILL_TARGET.user} --if-exists ${DRILL_TARGET.database}`);
    }
    rmSync(artifactDir, { recursive: true, force: true });
    cleaned.push("deleted the downloaded backup and the decrypted dump");
    log(`Cleanup: ${cleaned.join("; ")}.`);
  }
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error("The drill needs an interactive terminal to ask for the key."));
      return;
    }
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolvePromise(value);
          return;
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

function parseArgs(argv: string[]): { runId?: string } {
  const args = argv.slice(2);
  if (args.length === 0) return {};
  if (args.length === 2 && args[0] === "--run" && /^\d+$/.test(args[1])) return { runId: args[1] };
  throw new Error("Usage: npm run backup:drill [-- --run <run-id>]");
}

async function main(): Promise<number> {
  const { runId: requestedRun } = parseArgs(process.argv);
  preflight({ needGh: true });

  let runId = requestedRun;
  if (!runId) {
    const listed = JSON.parse(
      execFileSync(
        "gh",
        ["run", "list", "--workflow", "backup-production.yml", "--status", "success", "--limit", "1", "--json", "databaseId"],
        { encoding: "utf8" },
      ),
    ) as { databaseId: number }[];
    if (listed.length === 0) {
      throw new Error("No successful backup-production run found yet.");
    }
    runId = String(listed[0].databaseId);
  }
  console.log(`Using backup-production run ${runId}.`);

  const root = mkdtempSync(join(tmpdir(), "moneymap-drill-"));
  try {
    const artifactDir = join(root, "artifact");
    mkdirSync(artifactDir);
    execFileSync("gh", ["run", "download", runId, "-D", artifactDir, "-p", "production-backup-*"], {
      stdio: ["ignore", "inherit", "inherit"],
    });

    const key = (await promptHidden("Paste the age secret key (input is hidden): ")).trim();
    if (!/^AGE-SECRET-KEY-1[0-9A-Z]+$/.test(key)) {
      throw new Error("That does not look like an age secret key (AGE-SECRET-KEY-1...).");
    }
    const identity = join(root, "key.txt");
    writeFileSync(identity, key + "\n", { mode: 0o600 });

    const result = await runDrill({ artifactDir, identity });
    return result.pass ? 0 : 1;
  } finally {
    rmSync(root, { recursive: true, force: true });
    console.log("Deleted the temporary folder (key, ciphertext, decrypted dump).");
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
