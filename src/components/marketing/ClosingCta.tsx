import Link from 'next/link'
import { IconArrowRight } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Reveal } from './Reveal'

/** Layout family: centred band. The one centred moment on the page, which is what
 *  makes it read as an ending rather than another section. No subhead - the locked
 *  copy for this section is the headline and the CTA, nothing else. */
export function ClosingCta() {
  return (
    <section className="border-b border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Still guessing?
          </h2>
          <div className="mt-9 flex justify-center">
            <Button asChild size="lg">
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
