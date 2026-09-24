import { MarketingNav } from '@/components/marketing/MarketingNav'
import { Hero } from '@/components/marketing/Hero'
import { FeatureNetWorth } from '@/components/marketing/FeatureNetWorth'
import { FeatureEverydayTracking } from '@/components/marketing/FeatureEverydayTracking'
import { FeatureBudgets } from '@/components/marketing/FeatureBudgets'
import { FeatureCards } from '@/components/marketing/FeatureCards'
import { FeatureLedger } from '@/components/marketing/FeatureLedger'
import { ReportsBento } from '@/components/marketing/ReportsBento'
import { TechStrip } from '@/components/marketing/TechStrip'
import { ClosingCta } from '@/components/marketing/ClosingCta'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

/**
 * The public landing page at `/`, built to the approved eleven-section design
 * (`.gsd/landing-and-demo-spec.md` Amendment 1 and 2): capsule nav, centred hero, net
 * worth, everyday tracking, budgets, cards, event ledger, reports bento, tech strip,
 * closing CTA, grouped-column footer.
 *
 * This is the one route in the app that has to work with no session at all, so nothing
 * here calls an authenticated API route or reads a session. Every section is a Server
 * Component; the only client code is the `Reveal` motion leaf and the `DeviceShot`
 * toggle.
 */
export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <Hero />
      <FeatureNetWorth />
      <FeatureEverydayTracking />
      <FeatureBudgets />
      <FeatureCards />
      <FeatureLedger />
      <ReportsBento />
      <TechStrip />
      <ClosingCta />
      <MarketingFooter />
    </>
  )
}
