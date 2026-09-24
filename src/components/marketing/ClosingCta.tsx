import Link from 'next/link'
import { IconArrowRight } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Reveal } from './Reveal'

/**
 * Layout family: centred band. The one centred moment on the page, which is what
 * makes it read as an ending rather than another section. No subhead - the locked
 * copy for this section is the headline and the CTA, nothing else.
 *
 * The headline carries a deliberately distinct display treatment (Amendment 3): every
 * other h2 on the page is `text-3xl/4xl font-semibold`, and with no subhead to carry
 * it, this section read as the page's quietest beat rather than its last one. Geist
 * Mono, already loaded for the Monospace Money Rule, at a much larger and heavier
 * scale gives it a distinct voice without adding decoration.
 *
 * Amendment 4 puts this section on a full-bleed `bg-primary` (Instrument Teal) field,
 * a deliberate exception to the Rationed Accent Rule for the page's closing beat (see
 * the note in `DESIGN.md`). The button is inverted - light fill, primary-token text -
 * so it still reads as the primary action against a teal field rather than
 * disappearing into it, since the default button variant is itself teal-on-white.
 */
export function ClosingCta() {
  return (
    <section className="border-b border-border/60 bg-primary py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
        <Reveal>
          <h2
            className="text-5xl font-medium leading-[1.15] tracking-tight text-primary-foreground sm:text-6xl md:text-7xl"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Still guessing?
          </h2>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="bg-foreground text-primary hover:bg-foreground/90">
              <Link href="/sign-up">
                Start tracking
                <IconArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
