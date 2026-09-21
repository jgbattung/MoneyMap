import Link from 'next/link'
import { IconArrowRight } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Reveal } from './Reveal'

/** Layout family: centred band. The one centred moment on the page, which is what
 *  makes it read as an ending rather than another section. */
export function ClosingCta() {
  return (
    <section className="border-b border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-4 text-center md:px-8">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Start with one account
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-base leading-relaxed text-muted-foreground">
            Add a balance, record a few days of spending, and the rest of the picture
            fills itself in.
          </p>
          <div className="mt-9 flex justify-center">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Create account
                <IconArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
