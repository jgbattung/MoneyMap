/**
 * Regression tests for the screenshot pipeline's OUTPUTS, as opposed to the landing
 * page's markup.
 *
 * `LandingPage.test.tsx` asserts that each section renders the right `src` STRING.
 * That is necessary and not sufficient: a path string is green whether or not a PNG
 * exists behind it. The landing page is the public surface a resume link points at,
 * so a missing capture is this branch's most expensive silent failure - it renders as
 * a broken image box for every visitor while the whole unit suite stays green.
 *
 * Two invariants are locked here:
 *   1. Every screenshot path the app or the README references resolves to a real file.
 *   2. Every capture surface declares which device profiles it is captured on, so a
 *      newly added profile cannot silently overwrite existing committed captures.
 *
 * Both are filesystem/source-text checks rather than behavioural ones, following the
 * precedent set by `src/test/demo-safety.test.ts`, because neither invariant is
 * observable from rendered markup.
 */

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { SHOTS_DESKTOP, SHOTS_MOBILE } from '@/components/marketing/constants'

const ROOT = process.cwd()
const PUBLIC_DIR = join(ROOT, 'public')
const SCREENSHOTS_SOURCE = join(ROOT, 'scripts', 'demo', 'screenshots.ts')

/** Strips block and line comments so assertions apply to code, not prose about code.
 *  Same helper shape as `demo-safety.test.ts`, for the same reason. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** `/screenshots/desktop/dashboard.png` -> `<repo>/public/screenshots/desktop/dashboard.png` */
const publicPathFor = (webPath: string): string =>
  join(PUBLIC_DIR, webPath.replace(/^\//, ''))

// ---------------------------------------------------------------------------
// 1. Every referenced screenshot exists on disk
// ---------------------------------------------------------------------------

describe('screenshot assets: every referenced capture exists', () => {
  const entries = [
    ...Object.entries(SHOTS_DESKTOP).map(([slug, path]) => ({ set: 'desktop', slug, path })),
    ...Object.entries(SHOTS_MOBILE).map(([slug, path]) => ({ set: 'mobile', slug, path })),
  ]

  it('has screenshot constants to check', () => {
    // Guards against the whole suite below silently passing over an empty map.
    expect(entries.length).toBeGreaterThan(0)
  })

  it.each(entries)('$set/$slug resolves to a real file under public/', ({ path }) => {
    expect(
      existsSync(publicPathFor(path)),
      `${path} is referenced by src/components/marketing/constants.ts but no file exists ` +
        `at public${path}. Re-run the capture pipeline (npm run build, npm run start:demo, ` +
        `npm run screenshots) or correct the constant - a dangling path renders as a ` +
        `broken image on the public landing page and breaks no other test.`,
    ).toBe(true)
  })

  it('every screenshot the README gallery links to exists', () => {
    // The README is the other consumer of these captures and is rendered on GitHub,
    // where a dangling relative path is equally visible and equally untested.
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
    const referenced = [...new Set(readme.match(/public\/screenshots\/[\w/-]+\.png/g) ?? [])]

    expect(referenced.length).toBeGreaterThan(0)
    for (const relative of referenced) {
      expect(
        existsSync(join(ROOT, relative)),
        `README.md links to ${relative}, which does not exist.`,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Every capture surface declares its device profiles
// ---------------------------------------------------------------------------

describe('screenshot pipeline: every surface declares its devices', () => {
  const source = stripComments(readFileSync(SCREENSHOTS_SOURCE, 'utf8'))

  /** The body of the `ALL_SURFACES` array literal. */
  const surfacesBlock = (): string => {
    const match = source.match(/const ALL_SURFACES[^=]*=\s*\[([\s\S]*?)\n\];/)
    expect(match, 'could not locate the ALL_SURFACES array in screenshots.ts').toBeTruthy()
    return match![1]
  }

  /** One chunk of source text per surface entry, each starting at its `slug:`. */
  const surfaceChunks = (): Array<{ slug: string; text: string }> =>
    surfacesBlock()
      .split(/\{\s*slug:/)
      .slice(1)
      .map((text) => ({ slug: (text.match(/^\s*["'`]([\w-]+)["'`]/) ?? [, '?'])[1]!, text }))

  it('finds the surface list', () => {
    expect(surfaceChunks().length).toBeGreaterThan(0)
  })

  it('declares `devices` on every surface, never relying on the omit-means-all default', () => {
    // This is not style. `captureDevice` treats a missing `devices` as "capture on
    // every profile", and `desktop-compact` writes into `public/screenshots/desktop/`
    // via `outSlug`. A surface that omits `devices` is therefore captured at 1120x700
    // as well and OVERWRITES its own committed 1440x900 desktop capture under the same
    // filename. This was caught by inspection during Phase 10, not by any test.
    for (const { slug, text } of surfaceChunks()) {
      expect(
        text,
        `Surface "${slug}" in scripts/demo/screenshots.ts does not declare \`devices\`. ` +
          `Omitting it means "capture on EVERY device profile", which makes ` +
          `desktop-compact (1120x700) overwrite the committed 1440x900 desktop capture ` +
          `of the same name. Add \`devices: STANDARD_DEVICES\` or an explicit subset.`,
      ).toMatch(/devices\s*:/)
    }
  })

  it('only ever names device profiles that actually exist', () => {
    const declared = [...source.matchAll(/slug:\s*["'`]([\w-]+)["'`],\s*(?:outSlug|contextOptions)/g)].map(
      (m) => m[1],
    )
    expect(declared.length).toBeGreaterThan(0)

    const referenced = new Set<string>()
    for (const { text } of surfaceChunks()) {
      const inline = text.match(/devices:\s*\[([^\]]*)\]/)
      if (inline) {
        for (const name of inline[1].matchAll(/["'`]([\w-]+)["'`]/g)) referenced.add(name[1])
      }
    }
    // Plus the shared constant the standard surfaces point at.
    const standard = source.match(/const STANDARD_DEVICES[^=]*=\s*\[([^\]]*)\]/)
    if (standard) {
      for (const name of standard[1].matchAll(/["'`]([\w-]+)["'`]/g)) referenced.add(name[1])
    }

    for (const name of referenced) {
      expect(declared, `"${name}" is captured but no DeviceProfile declares that slug`).toContain(
        name,
      )
    }
  })
})
