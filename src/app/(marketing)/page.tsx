import { MarketingNav } from '@/components/marketing/MarketingNav'
import { Hero } from '@/components/marketing/Hero'
import { FeatureNetWorth } from '@/components/marketing/FeatureNetWorth'
import { FeatureEverydayTracking } from '@/components/marketing/FeatureEverydayTracking'
import { FeatureBudgets } from '@/components/marketing/FeatureBudgets'
import { FeatureLedger } from '@/components/marketing/FeatureLedger'
import { ReportsBento } from '@/components/marketing/ReportsBento'
import { FeatureDevices } from '@/components/marketing/FeatureDevices'
import { TechStrip } from '@/components/marketing/TechStrip'
import { ClosingCta } from '@/components/marketing/ClosingCta'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

/**
 * The public landing page at `/`, built to the approved eleven-section design
 * (`.gsd/landing-and-demo-spec.md` Amendments 1 through 4): capsule nav, centred hero,
 * net worth, everyday tracking, budgets, event ledger, reports, capture/study device
 * section, tech strip, closing CTA, grouped-column footer.
 *
 * The standalone credit-card callout section was removed in Amendment 4; its
 * screenshots stay on disk because the README gallery still uses them.
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
      <FeatureEverydayTracking />
      <FeatureBudgets />
      <FeatureLedger />
      <ReportsBento />
      <FeatureDevices />
      <TechStrip />
      <ClosingCta />
      <MarketingFooter />
    </>
  )
}
