/**
 * Captures the primary app surfaces from a running demo server, desktop and mobile,
 * with each surface driven into the exact UI state it is supposed to show rather than
 * just navigated to.
 *
 *   Terminal 1:  npm run build && npm run start:demo
 *   Terminal 2:  npm run screenshots
 *
 * Capture must run against a PRODUCTION build (`next start`), not `next dev`: the Next
 * dev-mode indicator badge does not exist in a production build, and there is no
 * on-demand route compilation to race against.
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

import { chromium, type Page, type BrowserContextOptions } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./seed";

const OUT_ROOT = join(process.cwd(), "public", "screenshots");

interface DeviceProfile {
  slug: "desktop" | "mobile";
  contextOptions: BrowserContextOptions;
}

/** Crisp enough for a README on a retina display. */
const DESKTOP: DeviceProfile = {
  slug: "desktop",
  contextOptions: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  },
};

/**
 * A real device profile, not a narrow desktop viewport - `isMobile` + `hasTouch` is
 * what makes the app render its separate mobile layout (BottomBar instead of the
 * sidebar), matching an iPhone 14-class device.
 */
const MOBILE: DeviceProfile = {
  slug: "mobile",
  contextOptions: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    reducedMotion: "reduce",
  },
};

const DEVICES: DeviceProfile[] = [DESKTOP, MOBILE];

interface Surface {
  slug: string;
  /**
   * Navigates to the surface and drives it into the exact state to capture. Must wait
   * for that state to actually take effect and throw a descriptive error if it does
   * not - a screenshot silently captured in the wrong state is the failure this script
   * exists to prevent.
   */
  prepare: (page: Page, base: string) => Promise<void>;
}

/** `--base-url=...` overrides the default. argv, not an environment read. */
function baseUrl(): string {
  const flag = process.argv.find((a) => a.startsWith("--base-url="));
  return (flag ? flag.slice("--base-url=".length) : "http://localhost:3000").replace(/\/$/, "");
}

async function goto(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
}

/**
 * Polls `check` until it returns true, or throws a descriptive error. Used after every
 * interaction that is supposed to change the page's state, so a capture never proceeds
 * on a state that silently failed to take effect.
 */
async function assertEventually(
  page: Page,
  description: string,
  check: () => Promise<boolean>,
  timeoutMs = 20000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await page.waitForTimeout(200);
  }
  throw new Error(`State assertion failed - ${description}`);
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

// --- Per-surface state preparation ------------------------------------------------

/** A plain navigation: no interaction beyond waiting for content to be ready. */
function navOnly(path: string, ready: string): Surface["prepare"] {
  return async (page, base) => {
    await goto(page, `${base}${path}`);
    await page.waitForSelector(ready, { timeout: 30000 });
    await waitForSkeletonsGone(page);
  };
}

/** Reports net-worth overview, 1Y period selected (default is 3M). */
async function prepareNetWorth(page: Page, base: string): Promise<void> {
  await goto(page, `${base}/reports`);
  const toggle = page
    .locator('[aria-label="Select comparison period"] button')
    .filter({ hasText: "1Y" });
  await toggle.waitFor({ state: "visible", timeout: 30000 });
  await toggle.click();
  await assertEventually(
    page,
    "net-worth 1Y toggle did not become active",
    async () => (await toggle.getAttribute("data-state")) === "on",
  );
}

/** Transactions calendar with a day that has activity clicked, panel populated. */
async function prepareCalendar(page: Page, base: string): Promise<void> {
  await goto(page, `${base}/transactions?view=calendar`);
  await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 30000 });
  await waitForSkeletonsGone(page);

  const activeDay = page
    .locator('[data-slot="calendar-day-cell"][data-has-activity="true"]')
    .first();
  await activeDay.waitFor({ state: "visible", timeout: 20000 });
  await activeDay.click();

  await assertEventually(
    page,
    "calendar day click did not populate the day detail panel",
    async () => {
      const selected = await page
        .locator('[data-slot="calendar-day-cell"][data-selected="true"]')
        .count();
      const populated = await page.locator('[data-testid="calendar-day-net"]').count();
      return selected > 0 && populated > 0;
    },
  );
}

/** An individual credit card's detail page, not the cards index. */
async function prepareCardDetail(page: Page, base: string): Promise<void> {
  await goto(page, `${base}/cards`);
  await page.waitForSelector("main", { timeout: 30000 });
  await waitForSkeletonsGone(page);

  // `:visible` matters: grouped cards render this same class inside a collapsed
  // GroupCard section, and clicking one of those would hang waiting for something
  // that never becomes interactable without expanding the group first.
  const card = page.locator(".money-map-card-interactive:visible").first();
  await card.waitFor({ state: "visible", timeout: 20000 });
  await card.click();

  await assertEventually(
    page,
    "clicking a card did not navigate to its individual detail page",
    async () => /\/cards\/(?!groups\/)[^/]+$/.test(page.url()),
  );
  await page.getByText("Statement Overview", { exact: true }).waitFor({ timeout: 20000 });
  await waitForSkeletonsGone(page);
}

/** Event Ledger filtered to the Japan Trip tag, with real merged results on screen. */
async function prepareEventLedger(page: Page, base: string): Promise<void> {
  await goto(page, `${base}/reports`);
  const ledgerTitle = page.locator('[data-slot="card-title"]', { hasText: "Event Ledger" });
  await ledgerTitle.waitFor({ state: "visible", timeout: 30000 });
  await ledgerTitle.scrollIntoViewIfNeeded();

  // The Transaction Analyzer directly above this card has its own "Select tags"
  // popover, so every locator here is scoped to the Event Ledger's own <Card>
  // container rather than the whole page - a page-wide lookup resolves to two
  // buttons and throws a strict-mode violation.
  const ledgerCard = page.locator('[data-slot="card"]', { has: ledgerTitle });

  const tagTrigger = ledgerCard.getByRole("button", { name: "Select tags" });
  await tagTrigger.click();

  const searchInput = page.getByPlaceholder("Search tags...");
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill("Japan");

  const japanOption = page.getByRole("option", { name: "Japan Trip" });
  await japanOption.waitFor({ state: "visible", timeout: 10000 });
  await japanOption.click();

  // Explicit-trigger query pattern (`enabled: false`): results do not exist until
  // "View Ledger" is clicked, so the tag alone is not enough to capture.
  await page.keyboard.press("Escape");
  const viewLedgerButton = ledgerCard.getByRole("button", { name: "View Ledger" });
  await viewLedgerButton.click();

  const summarySentence = ledgerCard.getByText("You spent", { exact: false });

  await assertEventually(
    page,
    "Event Ledger did not render real Japan Trip results after View Ledger",
    async () => {
      const empty = await ledgerCard.getByText("No transactions found").count();
      const summary = await summarySentence.count();
      return empty === 0 && summary > 0;
    },
    20000,
  );

  // Center the results sentence rather than re-scrolling to the card title: the title
  // sits above the tag picker and the summary cards, so scrolling back to it would push
  // the actual merged results - the entire point of this capture - below the fold.
  await summarySentence.evaluate((el) => el.scrollIntoView({ block: "center" }));
}

/** The breakdown charts and annual summary, scrolled past net worth. */
async function prepareReports(page: Page, base: string): Promise<void> {
  await goto(page, `${base}/reports`);
  await page.waitForSelector("main", { timeout: 30000 });
  await waitForSkeletonsGone(page);

  const breakdownHeading = page.getByText("Category Breakdown", { exact: true });
  await breakdownHeading.waitFor({ state: "visible", timeout: 20000 });
  // `block: "start"` rather than scrollIntoViewIfNeeded's "nearest": the heading is
  // already close enough to the viewport that "nearest" barely scrolls, leaving this
  // capture looking almost identical to the net-worth one. Pinning it to the top pushes
  // the net-worth card off-screen and brings the actual breakdown chart and annual
  // summary into view, which is the content this surface is supposed to show.
  await breakdownHeading.evaluate((el) => el.scrollIntoView({ block: "start" }));
}

const SURFACES: Surface[] = [
  { slug: "net-worth", prepare: prepareNetWorth },
  { slug: "calendar", prepare: prepareCalendar },
  { slug: "card-detail", prepare: prepareCardDetail },
  { slug: "event-ledger", prepare: prepareEventLedger },
  { slug: "reports", prepare: prepareReports },
  { slug: "dashboard", prepare: navOnly("/dashboard", "main, [data-slot='card']") },
  { slug: "transactions", prepare: navOnly("/transactions", "main") },
  { slug: "budgets", prepare: navOnly("/budgets", "main") },
  { slug: "accounts", prepare: navOnly("/accounts", "main") },
];

async function captureDevice(
  browser: import("@playwright/test").Browser,
  device: DeviceProfile,
  base: string,
): Promise<void> {
  const outDir = join(OUT_ROOT, device.slug);
  mkdirSync(outDir, { recursive: true });

  const context = await browser.newContext(device.contextOptions);
  const page = await context.newPage();

  try {
    console.log(`\n  [${device.slug}] signing in\n`);
    await signIn(page, base);

    for (const surface of SURFACES) {
      console.log(`  [${device.slug}] ${surface.slug}`);
      await surface.prepare(page, base);
      await waitForSkeletonsGone(page);
      await waitForVisualSettle(page);

      const file = join(outDir, `${surface.slug}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      console.log(`    -> public/screenshots/${device.slug}/${surface.slug}.png`);
    }
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const base = baseUrl();
  console.log(`\n  Capturing from ${base}\n`);

  const browser = await chromium.launch();
  try {
    for (const device of DEVICES) {
      await captureDevice(browser, device, base);
    }
    console.log(
      `\n  Captured ${SURFACES.length} surfaces x ${DEVICES.length} device sets to public/screenshots/\n`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\n  Screenshot capture failed.");
  console.error("  Is `npm run start:demo` (a production build) running and the demo database seeded?\n");
  console.error(error);
  process.exitCode = 1;
});
