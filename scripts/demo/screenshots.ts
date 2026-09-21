/**
 * Captures the primary app surfaces from a running demo server.
 *
 *   Terminal 1:  npm run dev:demo
 *   Terminal 2:  npm run screenshots
 *
 * Drives the Playwright API directly rather than running as a spec under
 * `tests/e2e/`. That is deliberate: a spec would load `playwright.config.ts`, which
 * loads `playwright/.env.test` and points everything at `money_map_dev` - the E2E
 * database that gets wiped on every run. This script inherits none of that.
 *
 * It signs in through the real form with the demo credentials the seed created, rather
 * than injecting a hand-minted session cookie. Minting one would need the auth secret
 * read from the environment inside `scripts/demo/`, which Safety Layer 1 forbids, and
 * going through the form has the side benefit of exercising the actual auth path.
 *
 * This script only ever READS the database, through the app.
 */

import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./seed";

/** Matches the plan's capture spec: crisp enough for a README on a retina display. */
const VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE_FACTOR = 2;

const OUT_DIR = join(process.cwd(), "public", "screenshots");

interface Surface {
  /** File name, without extension. */
  slug: string;
  path: string;
  /** A selector that only exists once the surface has real content on it. */
  ready: string;
}

const SURFACES: Surface[] = [
  { slug: "dashboard", path: "/dashboard", ready: "main, [data-slot='card']" },
  { slug: "accounts", path: "/accounts", ready: "main" },
  { slug: "cards", path: "/cards", ready: "main" },
  { slug: "transactions", path: "/transactions", ready: "table, [role='table'], main" },
  { slug: "budgets", path: "/budgets", ready: "main" },
  { slug: "calendar", path: "/transactions?view=calendar", ready: "[role='grid'], main" },
  { slug: "reports", path: "/reports", ready: "main" },
];

/** `--base-url=...` overrides the dev:demo default. argv, not an environment read. */
function baseUrl(): string {
  const flag = process.argv.find((a) => a.startsWith("--base-url="));
  return (flag ? flag.slice("--base-url=".length) : "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Waits until the page has stopped redrawing.
 *
 * Recharts animates on mount over ~1.5s by interpolating SVG path geometry, and the
 * count-up numbers animate through Framer Motion. Neither is stopped by disabling CSS
 * animations, and neither is covered by `networkidle` - a naive capture catches
 * half-drawn charts and numbers mid-count. So instead of guessing a delay, sample a
 * signature of the things that actually animate and wait for it to stop changing.
 */
async function waitForVisualSettle(page: Page, timeoutMs = 20000): Promise<void> {
  const signature = () =>
    page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll("svg path, svg rect, svg circle"))
        .map((el) => el.getAttribute("d") ?? `${el.getAttribute("width")},${el.getAttribute("height")},${el.getAttribute("y")}`)
        .join("|");
      const numbers = Array.from(document.querySelectorAll(".text-numeric"))
        .map((el) => el.textContent ?? "")
        .join("|");
      return `${paths}::${numbers}`;
    });

  const started = Date.now();
  let previous = await signature();
  let stableRounds = 0;

  while (Date.now() - started < timeoutMs) {
    await page.waitForTimeout(300);
    const current = await signature();
    if (current === previous) {
      stableRounds++;
      // Three consecutive identical samples: charts drawn, counters finished.
      if (stableRounds >= 3) return;
    } else {
      stableRounds = 0;
    }
    previous = current;
  }

  console.warn("    (visual settle timed out; capturing anyway)");
}

/** Loading skeletons must be gone, or the screenshot documents a loading state. */
async function waitForSkeletonsGone(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () => document.querySelectorAll("[data-slot='skeleton']").length === 0,
      undefined,
      { timeout: 20000 },
    );
  } catch {
    console.warn("    (skeletons still present after 20s)");
  }
}

async function signIn(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#pwd", DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
}

async function main(): Promise<void> {
  const base = baseUrl();
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: "dark",
    // The app honours prefers-reduced-motion in globals.css, so this quietens
    // everything that respects it and leaves only the chart geometry to settle.
    reducedMotion: "reduce",
  });

  const page = await context.newPage();

  try {
    console.log(`\n  Capturing from ${base}\n`);
    await signIn(page, base);
    console.log(`  Signed in as ${DEMO_EMAIL}\n`);

    for (const surface of SURFACES) {
      console.log(`  ${surface.slug}`);
      await page.goto(`${base}${surface.path}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForSelector(surface.ready, { timeout: 30000 });
      await waitForSkeletonsGone(page);
      await waitForVisualSettle(page);

      const file = join(OUT_DIR, `${surface.slug}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      console.log(`    -> public/screenshots/${surface.slug}.png`);
    }

    console.log(`\n  Captured ${SURFACES.length} surfaces to public/screenshots/\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\n  Screenshot capture failed.");
  console.error("  Is `npm run dev:demo` running and the demo database seeded?\n");
  console.error(error);
  process.exitCode = 1;
});
