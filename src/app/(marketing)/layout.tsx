import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MoneyMap - Stay on top of your money",
  description:
    "Every account, card and budget in one place, so you always know what's safe to spend.",
};

/**
 * The public marketing shell.
 *
 * Deliberately does NOT render ConditionalLayout and does NOT inherit the app's
 * `h-screen overflow-hidden` flex shell, so the landing page is full width with normal
 * page scroll rather than sitting beside a phantom sidebar.
 *
 * `globals.css` sets `overflow-hidden` on `body`, so the scroll container is owned here.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-background">
      {children}
    </main>
  );
}
