import ConditionalLayout from "@/components/layouts/ConditionalLayout";

/**
 * The authenticated app shell: sidebar on desktop, bottom bar on mobile, and a fixed
 * viewport height with its own internal scroll container.
 *
 * This lived in the root layout until the public landing page was added. It had to move
 * down here because a route group layout nests INSIDE the root layout and therefore
 * cannot escape it: any page rendered under the old root sat next to ConditionalLayout's
 * 224px phantom sidebar with no page-level scroll. Putting the shell in its own group
 * means marketing and auth routes simply never opt into it.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen overflow-hidden">
      <ConditionalLayout>{children}</ConditionalLayout>
    </main>
  );
}
