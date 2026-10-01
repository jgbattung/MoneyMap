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
  slug: "desktop" | "mobile" | "desktop-compact";
  /** Directory under public/screenshots/ this profile's captures are written to.
   *  Defaults to `slug` - only set where it differs, which today is just
   *  `desktop-compact`: its captures still belong in `public/screenshots/desktop/`,
   *  since that is where `FeatureDevices` and every other desktop consumer looks. */
  outSlug?: "desktop" | "mobile";
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

/**
 * Amendment 5: `FeatureDevices` fixes both its frames at 420px tall so the desktop and
 * phone captures sit at equal height, which shrinks the standard 1440-wide desktop
 * capture to a 672px-wide frame - 47% scale, with body text landing near 7px. That is a
 * scale problem, not a resolution one, so more pixels cannot fix it. This profile
 * instead captures the same page at a narrower 1120x700 viewport (preserving the
 * section's 1.6 aspect ratio, so the equal-height layout needs no change): at 672px
 * wide that is 60% scale, with less content competing for the space. Desktop-only,
 * and used for the Accounts surface alone - the existing 1440x900 `accounts` capture
 * stays untouched for the README gallery.
 */
const DESKTOP_COMPACT: DeviceProfile = {
  slug: "desktop-compact",
  outSlug: "desktop",
  contextOptions: {
    viewport: { width: 1120, height: 700 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  },
};

const DEVICES: DeviceProfile[] = [DESKTOP, MOBILE, DESKTOP_COMPACT];

interface Surface {
  slug: string;
  /**
   * Navigates to the surface and drives it into the exact state to capture. Must wait
   * for that state to actually take effect and throw a descriptive error if it does
   * not - a screenshot silently captured in the wrong state is the failure this script
   * exists to prevent.
   */
  prepare: (page: Page, base: string) => Promise<void>;
  /** Restricts capture to a subset of devices. Omit to capture on every device. */
  devices?: Array<DeviceProfile["slug"]>;
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

  // The net worth card and breakdown charts above this one are still interpolating
  // their SVG geometry at this point, which changes their rendered height and shifts
  // everything below - settle those first so nothing moves out from under the scroll
  // position this function is about to compute further down.
  await waitForVisualSettle(page);
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

  // The section copy promises a TAGGED total ("Tag anything ... and get one total"), so
  // the selected "Japan Trip" chip must be in frame together with the totals - a capture
  // of the totals alone shows an untagged total, which is what got this capture rejected
  // the first time round. The chip renders at the top of the tag field, well above the
  // summary tiles, so pin it to the top edge of the viewport (rather than centering on
  // the results) and let the tiles and the first rows fall into the remaining space below.
  const tagChip = ledgerCard
    .locator(".flex.flex-wrap.gap-1")
    .getByText("Japan Trip", { exact: true });
  await tagChip.waitFor({ state: "visible", timeout: 10000 });

  // The "Hotel overcharge refund" row is what makes "minus whatever came back" literally
  // true, so it must stay in frame too, not just any transaction row.
  const refundRow = ledgerCard.getByText("Hotel overcharge refund", { exact: false });
  await refundRow.waitFor({ state: "visible", timeout: 10000 });

  // Re-scrolls on every check rather than once: other widgets on /reports (the net
  // worth chart, breakdown charts) are still settling geometry at this point, and a
  // height change above the ledger card shifts everything below it, silently
  // invalidating a one-shot scroll. Re-issuing the scroll each iteration converges once
  // the page actually stops moving, instead of racing it.
  //
  // `el.scrollIntoView` (not `window.scrollBy`) because the app's own scroll container
  // is a nested div, not the window - `body` is `overflow-hidden` in globals.css, so a
  // window-level scroll is a silent no-op here. `scrollIntoView({block:"start"})` alone
  // puts the chip at scroll-position 0, which is mathematically "in viewport" but is
  // actually hidden UNDER `PageHeader`'s `sticky top-0 z-10 bg-background` title bar,
  // which occupies that same visual region and paints over it - so nudge the scroll
  // back up by the sticky header's own height afterward, revealing the chip below it.
  await assertEventually(
    page,
    "the Japan Trip chip and the refund row were not both in frame (and clear of the sticky page header) after scrolling",
    async () => {
      const headerHeight = await tagChip.evaluate((el) => {
        el.scrollIntoView({ block: "start" });
        const header = document.querySelector<HTMLElement>(".sticky.top-0.z-10");
        const height = header?.getBoundingClientRect().height ?? 0;
        let ancestor: HTMLElement | null = el.parentElement;
        while (ancestor) {
          const style = getComputedStyle(ancestor);
          if (/(auto|scroll)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight) {
            ancestor.scrollTop -= height;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        return height;
      });
      const viewport = page.viewportSize();
      const chipBox = await tagChip.boundingBox();
      const refundBox = await refundRow.boundingBox();
      if (!viewport || !chipBox || !refundBox) return false;
      // The chip must clear the sticky header, not merely have a non-negative y -
      // y >= 0 alone would also be true while it sits underneath the header, painted over.
      const inView = (box: { y: number; height: number }, minY = 0) =>
        box.y >= minY && box.y + box.height <= viewport.height;
      return inView(chipBox, headerHeight) && inView(refundBox);
    },
  );

  // Confirm the page has genuinely stopped moving before returning control to the
  // capture loop, so the settle wait it runs next has nothing left to invalidate this
  // scroll position.
  await waitForVisualSettle(page);
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

/**
 * The Category Breakdown widget, desktop only, with its own heading clear of the
 * sticky page header (Phase 8 / Amendment 3).
 *
 * This is a second, independent instance of the same fix `prepareEventLedger` needed:
 * `PageHeader` renders `sticky top-0 z-10 bg-background` and paints over whatever sits
 * at scroll-position 0, so "the heading's bounding box has y >= 0" is not sufficient -
 * it must clear the header's own height. Kept as a separate, self-contained
 * implementation rather than extracted into a shared helper, so the working, already
 * verified `prepareEventLedger` is not touched by this change.
 */
async function prepareCategoryBreakdown(page: Page, base: string): Promise<void> {
  await goto(page, `${base}/reports`);
  await page.waitForSelector("main", { timeout: 30000 });
  await waitForSkeletonsGone(page);

  const breakdownHeading = page.getByText("Category Breakdown", { exact: true });
  await breakdownHeading.waitFor({ state: "visible", timeout: 20000 });
  await waitForVisualSettle(page);

  // Amendment 5: the original capture cleared the sticky header by exactly its own
  // height, which left the heading sitting flush against it - "too close to the top
  // edge." This adds a fixed extra margin on top of that clearance so there is visible
  // breathing room above the heading. The chart and legend have fixed height regardless
  // of scroll position, so the only cost is a few rows trimmed off the bottom of the
  // ranked list, which still shows several ranked rows after the change.
  const EXTRA_HEADROOM = 56;

  await assertEventually(
    page,
    "the Category Breakdown heading did not have clear headroom above it after scrolling",
    async () => {
      const headerHeight = await breakdownHeading.evaluate((el, extra) => {
        el.scrollIntoView({ block: "start" });
        const header = document.querySelector<HTMLElement>(".sticky.top-0.z-10");
        const height = header?.getBoundingClientRect().height ?? 0;
        let ancestor: HTMLElement | null = el.parentElement;
        while (ancestor) {
          const style = getComputedStyle(ancestor);
          if (/(auto|scroll)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight) {
            ancestor.scrollTop -= height + extra;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        return height;
      }, EXTRA_HEADROOM);
      const viewport = page.viewportSize();
      const headingBox = await breakdownHeading.boundingBox();
      if (!viewport || !headingBox) return false;
      return (
        headingBox.y >= headerHeight + EXTRA_HEADROOM - 2 &&
        headingBox.y + headingBox.height <= viewport.height
      );
    },
  );

  await waitForVisualSettle(page);
}

/** Every surface predating Amendment 5 was captured on both devices by omitting
 *  `devices` entirely, which meant "no restriction" - but that default would now also
 *  pull each of them into the new `desktop-compact` profile, overwriting the real
 *  1440x900 desktop captures with 1120x700 ones. Listed explicitly instead so adding a
 *  device profile can never silently widen which surfaces it captures. */
const STANDARD_DEVICES: Array<DeviceProfile["slug"]> = ["desktop", "mobile"];

const ALL_SURFACES: Surface[] = [
  { slug: "net-worth", prepare: prepareNetWorth, devices: STANDARD_DEVICES },
  { slug: "calendar", prepare: prepareCalendar, devices: STANDARD_DEVICES },
  { slug: "card-detail", prepare: prepareCardDetail, devices: STANDARD_DEVICES },
  { slug: "event-ledger", prepare: prepareEventLedger, devices: STANDARD_DEVICES },
  { slug: "reports", prepare: prepareReports, devices: STANDARD_DEVICES },
  { slug: "dashboard", prepare: navOnly("/dashboard", "main, [data-slot='card']"), devices: STANDARD_DEVICES },
  { slug: "transactions", prepare: navOnly("/transactions", "main"), devices: STANDARD_DEVICES },
  { slug: "budgets", prepare: navOnly("/budgets", "main"), devices: STANDARD_DEVICES },
  { slug: "accounts", prepare: navOnly("/accounts", "main"), devices: STANDARD_DEVICES },
  { slug: "category-breakdown", prepare: prepareCategoryBreakdown, devices: ["desktop"] },
  { slug: "accounts-compact", prepare: navOnly("/accounts", "main"), devices: ["desktop-compact"] },
];

/** `--only=slug1,slug2` restricts capture to a subset, for iterating on one surface's
 *  `prepare` step without re-running the full ~9-surface x 2-device pass every time. */
function selectedSurfaces(): Surface[] {
  const flag = process.argv.find((a) => a.startsWith("--only="));
  if (!flag) return ALL_SURFACES;
  const slugs = new Set(flag.slice("--only=".length).split(","));
  const selected = ALL_SURFACES.filter((s) => slugs.has(s.slug));
  if (selected.length === 0) {
    throw new Error(`--only= matched no surface (have: ${ALL_SURFACES.map((s) => s.slug).join(", ")})`);
  }
  return selected;
}

const SURFACES: Surface[] = selectedSurfaces();

async function captureDevice(
  browser: import("@playwright/test").Browser,
  device: DeviceProfile,
  base: string,
): Promise<void> {
  const outSlug = device.outSlug ?? device.slug;
  const outDir = join(OUT_ROOT, outSlug);
  mkdirSync(outDir, { recursive: true });

  const context = await browser.newContext(device.contextOptions);
  const page = await context.newPage();

  try {
    console.log(`\n  [${device.slug}] signing in\n`);
    await signIn(page, base);

    const surfacesForDevice = SURFACES.filter(
      (s) => !s.devices || s.devices.includes(device.slug),
    );

    for (const surface of surfacesForDevice) {
      console.log(`  [${device.slug}] ${surface.slug}`);
      await surface.prepare(page, base);
      await waitForSkeletonsGone(page);
      await waitForVisualSettle(page);

      const file = join(outDir, `${surface.slug}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      console.log(`    -> public/screenshots/${outSlug}/${surface.slug}.png`);
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
