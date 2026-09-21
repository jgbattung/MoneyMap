import { MarketingNav } from '@/components/marketing/MarketingNav'
import { Hero } from '@/components/marketing/Hero'
import { FeatureNetWorth } from '@/components/marketing/FeatureNetWorth'
import { FeatureAccounts } from '@/components/marketing/FeatureAccounts'
import { FeatureBudgets } from '@/components/marketing/FeatureBudgets'
import { FeatureLedger } from '@/components/marketing/FeatureLedger'
import { TechStrip } from '@/components/marketing/TechStrip'
import { ClosingCta } from '@/components/marketing/ClosingCta'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

/**
 * The public landing page at `/`.
 *
 * This is the one route in the app that has to work with no session at all, so nothing
 * here calls an authenticated API route or reads a session. Every section is a Server
 * Component; the only client code is the `Reveal` motion leaf.
 */
export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <Hero />
      <FeatureNetWorth />
      <FeatureAccounts />
      <FeatureBudgets />
      <FeatureLedger />
      <TechStrip />
      <ClosingCta />
      <MarketingFooter />
    </>
  )
}
